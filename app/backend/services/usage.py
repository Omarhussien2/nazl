"""Daily-quota enforcement for free-tier features.

This module implements the policy decisions Omar approved for the MVP:

  - Up to ``settings.daily_transcribe_quota`` (default 10) transcriptions per
    user per UTC day.
  - Each transcription clip must be \u2264 ``settings.max_transcribe_seconds``
    (default 3600 s = 60 minutes).
  - Downloads (yt-dlp / gallery-dl) are unmetered — they cost us nothing.
  - Anonymous visitors get exactly one free transcription, tracked by a
    signed cookie identifier.

All limits live in environment variables so they can be tuned without a
code change.

Usage from a router:

    quota = UsageService(db)
    await quota.ensure_can_transcribe(user_id, duration_seconds)
    # ... do the work ...
    await quota.record(user_id, "transcribe", duration_seconds)

The check and the record are intentionally separate so we can reject
oversize requests *before* spending any LLM/Whisper credits.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.usage import UsageEvent

logger = logging.getLogger(__name__)


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        logger.warning("Invalid integer for %s=%r; using default %d", name, raw, default)
        return default


@dataclass(frozen=True)
class Quota:
    """Daily-quota policy snapshot.

    Centralised so the values appear in error responses + admin endpoints
    without each call site having to read env vars itself.
    """

    daily_transcribe_quota: int
    max_transcribe_seconds: int
    anonymous_transcribe_quota: int

    @classmethod
    def from_env(cls) -> "Quota":
        return cls(
            daily_transcribe_quota=_env_int("DAILY_TRANSCRIBE_QUOTA", 10),
            max_transcribe_seconds=_env_int("MAX_TRANSCRIBE_SECONDS", 3600),
            anonymous_transcribe_quota=_env_int("ANONYMOUS_TRANSCRIBE_QUOTA", 1),
        )


class QuotaExceeded(HTTPException):
    """Raised when a user has hit their daily free-tier quota."""

    def __init__(self, message: str, *, used: int, limit: int):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": "quota_exceeded", "message": message, "used": used, "limit": limit},
        )


class DurationTooLong(HTTPException):
    """Raised when a single clip exceeds the per-clip ceiling."""

    def __init__(self, requested: int, limit: int):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "error": "clip_too_long",
                "message": (
                    f"Clip is {requested}s long; the free tier supports up to "
                    f"{limit}s per transcription."
                ),
                "requested": requested,
                "limit": limit,
            },
        )


class UsageService:
    """Quota lookup + recording, scoped to a single DB session."""

    def __init__(self, db: AsyncSession, quota: Optional[Quota] = None):
        self.db = db
        self.quota = quota or Quota.from_env()

    async def count_today(self, user_id: str, event_type: str) -> int:
        """Return the number of ``event_type`` events for ``user_id`` today (UTC)."""
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        stmt = (
            select(func.count(UsageEvent.id))
            .where(UsageEvent.user_id == user_id)
            .where(UsageEvent.event_type == event_type)
            .where(UsageEvent.created_at >= today_start)
        )
        result = await self.db.execute(stmt)
        return int(result.scalar_one() or 0)

    async def ensure_can_transcribe(
        self, user_id: str, duration_seconds: Optional[int], *, anonymous: bool = False
    ) -> None:
        """Reject the request if it would exceed the per-clip or per-day limit.

        ``duration_seconds`` may be ``None`` if the caller hasn't probed the
        media yet; in that case only the per-day quota is enforced.
        """
        if duration_seconds is not None and duration_seconds > self.quota.max_transcribe_seconds:
            raise DurationTooLong(duration_seconds, self.quota.max_transcribe_seconds)

        limit = (
            self.quota.anonymous_transcribe_quota
            if anonymous
            else self.quota.daily_transcribe_quota
        )
        used = await self.count_today(user_id, "transcribe")
        if used >= limit:
            raise QuotaExceeded(
                "Daily transcription quota reached. Try again tomorrow or sign in."
                if anonymous
                else "Daily transcription quota reached. Try again tomorrow.",
                used=used,
                limit=limit,
            )

    async def record(self, user_id: str, event_type: str, duration_seconds: Optional[int] = None) -> None:
        """Persist a usage event. Caller is responsible for committing."""
        event = UsageEvent(
            user_id=user_id,
            event_type=event_type,
            duration_seconds=duration_seconds,
        )
        self.db.add(event)
        await self.db.flush()

    async def reserve_transcribe_slot(
        self,
        user_id: str,
        duration_seconds: Optional[int],
        *,
        anonymous: bool = False,
    ) -> int:
        """Atomically reserve a transcription slot against today's quota.

        Serialises concurrent requests from the same ``user_id`` via a
        per-user PostgreSQL advisory lock so the check-and-insert is
        atomic; on SQLite the lock is a no-op, which is fine since
        SQLite is single-writer. Commits immediately so the reservation
        is visible to other sessions and returns the new event id so the
        caller can refund it if the downstream transcription fails.
        """
        if duration_seconds is not None and duration_seconds > self.quota.max_transcribe_seconds:
            raise DurationTooLong(duration_seconds, self.quota.max_transcribe_seconds)

        limit = (
            self.quota.anonymous_transcribe_quota
            if anonymous
            else self.quota.daily_transcribe_quota
        )

        await self._acquire_user_lock(user_id)

        used = await self.count_today(user_id, "transcribe")
        if used >= limit:
            # No slot to free — we never inserted.
            await self.db.rollback()
            raise QuotaExceeded(
                "Daily transcription quota reached. Try again tomorrow or sign in."
                if anonymous
                else "Daily transcription quota reached. Try again tomorrow.",
                used=used,
                limit=limit,
            )

        event = UsageEvent(
            user_id=user_id,
            event_type="transcribe",
            duration_seconds=duration_seconds,
        )
        self.db.add(event)
        await self.db.flush()
        event_id = int(event.id)
        # Commit to release the advisory lock and publish the reservation.
        await self.db.commit()
        return event_id

    async def refund(self, event_id: int) -> None:
        """Delete a reserved slot when the downstream work fails."""
        event = await self.db.get(UsageEvent, event_id)
        if event is None:
            return
        await self.db.delete(event)
        await self.db.commit()

    async def update_duration(self, event_id: int, duration_seconds: int) -> None:
        """Refine a reservation's duration once the real value is known."""
        event = await self.db.get(UsageEvent, event_id)
        if event is None:
            return
        event.duration_seconds = duration_seconds
        await self.db.commit()

    async def _acquire_user_lock(self, user_id: str) -> None:
        """Per-user advisory lock; no-op on non-PostgreSQL dialects."""
        bind = self.db.get_bind()
        dialect = getattr(bind, "dialect", None)
        if dialect is None or dialect.name != "postgresql":
            return
        await self.db.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:k))"),
            {"k": f"transcribe:{user_id}"},
        )
