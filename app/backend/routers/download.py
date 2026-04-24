import logging
from typing import Optional

from core.database import get_db
from dependencies.identity import CallerIdentity, get_caller_identity
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from services.download_service import fetch_audio_url, fetch_video_info
from services.photo_service import extract_gallery
from services.transcription import TranscriptionError, TranscriptionService
from services.usage import DurationTooLong, QuotaExceeded, UsageService
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/download", tags=["download"])


class DownloadRequest(BaseModel):
    url: str
    quality: str = "1080"
    audio_only: bool = False


class TranscribeRequest(BaseModel):
    url: str
    language: str = Field(default="ar", min_length=2, max_length=8)


class PhotoRequest(BaseModel):
    url: str
    max_items: int = Field(default=50, ge=1, le=500)


@router.post("/photos")
async def fetch_photos(request: PhotoRequest):
    """Extract direct image URLs from an Instagram/Twitter/Pinterest/etc link."""
    try:
        result = await extract_gallery(url=request.url, max_items=request.max_items)
        return {
            "success": result.get("success", False),
            "data": result.get("data"),
            "error": result.get("error"),
        }
    except Exception as e:
        logger.error(f"Fetch photos error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fetch")
async def fetch_download(request: DownloadRequest):
    """Fetch video info and download link using yt-dlp."""
    try:
        result = await fetch_video_info(
            url=request.url,
            quality=request.quality,
            audio_only=request.audio_only,
        )
        return {
            "success": result.get("success", False),
            "data": result.get("data"),
            "error": result.get("error"),
        }
    except Exception as e:
        logger.error(f"Fetch download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe")
async def transcribe_video(
    request: TranscribeRequest,
    caller: CallerIdentity = Depends(get_caller_identity),
    db: AsyncSession = Depends(get_db),
):
    """Download the audio stream from any yt-dlp-supported URL and transcribe via Groq Whisper.

    Quota policy (from services/usage.py):
      - Authenticated users: ``DAILY_TRANSCRIBE_QUOTA`` per UTC day (default 10).
      - Anonymous: ``ANONYMOUS_TRANSCRIBE_QUOTA`` per browser-fingerprint
        per UTC day (default 1).
      - Per-clip ceiling: ``MAX_TRANSCRIBE_SECONDS`` (default 3600 s = 60 min).
    """
    usage = UsageService(db)

    audio_payload = await _resolve_audio(request.url)
    if audio_payload is None:
        return _error("ما قدرنا نستخرج الصوت من الرابط هذا، جرّب رابط ثاني.")
    audio_url, duration_seconds, source_title = audio_payload

    try:
        await usage.ensure_can_transcribe(
            caller.user_id,
            int(duration_seconds) if duration_seconds is not None else None,
            anonymous=caller.is_anonymous,
        )
    except DurationTooLong as exc:
        raise exc
    except QuotaExceeded as exc:
        raise exc

    try:
        service = TranscriptionService()
        result = await service.transcribe_url(audio_url, language=request.language)
    except TranscriptionError as exc:
        logger.warning("Transcription failed for %s: %s", request.url, exc)
        return _error(str(exc))
    except Exception as exc:  # noqa: BLE001 - we want to never leak internals
        logger.exception("Unexpected transcription error: %s", exc)
        return _error("صار خطأ غير متوقع أثناء التفريغ، جرّب بعد قليل.")

    # Only meter against the quota *after* a successful transcription — a
    # failure shouldn't burn one of the user's daily slots.
    await usage.record(
        caller.user_id,
        "transcribe",
        duration_seconds=int(result.duration_seconds or duration_seconds or 0) or None,
    )
    await db.commit()

    return {
        "success": True,
        "text": result.text,
        "language": result.language,
        "duration": result.duration_seconds or duration_seconds,
        "source_title": source_title,
        "model": result.model,
        "error": None,
    }


async def _resolve_audio(url: str) -> Optional[tuple[str, Optional[float], Optional[str]]]:
    """Return (audio_url, duration_s, title) for a given media URL, or None."""
    payload = await fetch_audio_url(url=url)
    if not payload.get("success"):
        return None
    data = payload.get("data") or {}
    audio_url = data.get("url")
    if not audio_url:
        return None
    return audio_url, data.get("duration"), data.get("title")


def _error(message: str) -> dict:
    return {
        "success": False,
        "text": None,
        "error": message,
    }
