"""Resolve the caller's identity for quota purposes.

Distinguishes between three cases:

  1. **Authenticated** — a valid bearer JWT in ``Authorization``. The user
     id is the OIDC subject (from ``users.id``).
  2. **Anonymous browser** — no token. We derive a stable per-browser
     identifier from a hash of (client IP, user-agent), prefixed with
     ``anon:``. Same browser visiting twice in a day counts as one
     anonymous identity, which is what we want for the
     "1 free transcription before signup" policy.
  3. **Pure anonymous** — no token *and* no usable headers. Falls back to
     a hash of just the IP. Worst case: a shared NAT might over-count, but
     that's acceptable because the cap is small (1) and the user can sign
     in to escape.

The cookie-based opaque-id flow lives in a follow-up PR; this module is
intentionally stateless so we can ship the quota check without any new
middleware.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Optional

from core.auth import AccessTokenError, decode_access_token
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

_optional_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CallerIdentity:
    """The identity used by the quota subsystem."""

    user_id: str
    is_anonymous: bool
    email: Optional[str] = None


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # X-Forwarded-For: client, proxy1, proxy2 — take the first.
        return forwarded.split(",", 1)[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _anonymous_id(request: Request) -> str:
    """Stable per-browser-ish identifier; safe for the anonymous quota.

    Uses SHA-256(IP + UA) so we never store the raw IP in usage_events.
    """
    ip = _client_ip(request)
    ua = request.headers.get("user-agent", "")
    digest = hashlib.sha256(f"{ip}|{ua}".encode("utf-8")).hexdigest()
    return f"anon:{digest[:24]}"


async def get_caller_identity(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
) -> CallerIdentity:
    """FastAPI dependency: resolve the caller (anonymous fallback)."""
    if credentials and credentials.scheme.lower() == "bearer":
        try:
            payload = decode_access_token(credentials.credentials)
        except AccessTokenError as exc:
            logger.debug("Bearer token rejected, treating caller as anonymous: %s", exc.message)
        else:
            user_id = payload.get("sub")
            if user_id:
                return CallerIdentity(
                    user_id=str(user_id),
                    is_anonymous=False,
                    email=payload.get("email"),
                )

    return CallerIdentity(
        user_id=_anonymous_id(request),
        is_anonymous=True,
    )
