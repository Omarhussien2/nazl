"""Real Whisper-based transcription via Groq.

Replaces the placeholder ``scribe_v2`` mock that ``routers/download.py`` was
calling. Uses Groq's Whisper-Large-V3 endpoint, which is OpenAI-compatible
and free at MVP volume.

The Groq SDK accepts either a local file (``file=`` parameter) or a public
URL (``url=`` parameter). We prefer ``url=`` because:
- yt-dlp already returns a direct CDN URL for the audio stream;
- it saves us a full audio round-trip through this server (cheaper, faster);
- the audio never touches our disk, simplifying compliance.

For sources that don't yield a directly fetchable URL (rare: paywalled
content, signed URLs that expire mid-flight) we fall back to a
download-then-upload path.
"""

from __future__ import annotations

import logging
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import httpx
from groq import APIError, AsyncGroq

logger = logging.getLogger(__name__)

# Groq Whisper-Large-V3 hard limit: 25 MB per request when using file upload.
# When using url= the limit is higher but we still cap to be safe.
_MAX_AUDIO_BYTES = 25 * 1024 * 1024


def _model_name() -> str:
    """Resolve the Groq Whisper model name (env-overridable)."""
    return os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3")


@dataclass
class TranscriptionResult:
    text: str
    language: Optional[str]
    duration_seconds: Optional[float]
    model: str


class TranscriptionError(RuntimeError):
    """User-facing transcription failure."""


class TranscriptionService:
    """Thin async wrapper around Groq's audio transcription endpoint."""

    def __init__(self, api_key: Optional[str] = None):
        key = api_key or os.getenv("GROQ_API_KEY")
        if not key:
            raise TranscriptionError(
                "GROQ_API_KEY is not configured; cannot transcribe."
            )
        self._client = AsyncGroq(api_key=key)
        self._model = _model_name()

    async def transcribe_url(
        self,
        audio_url: str,
        *,
        language: str = "ar",
        prompt: Optional[str] = None,
    ) -> TranscriptionResult:
        """Transcribe a publicly-fetchable audio URL via Groq.

        ``language`` defaults to Arabic (the platform's primary language)
        because Whisper's auto-detection sometimes misclassifies short
        Arabic clips as Persian or Urdu.
        """
        try:
            response = await self._client.audio.transcriptions.create(
                url=audio_url,
                model=self._model,
                language=language,
                response_format="verbose_json",
                prompt=prompt,
            )
        except APIError as exc:
            logger.error(
                "Groq transcription failed (status=%s): %s",
                getattr(exc, "status_code", "?"),
                exc,
            )
            # Try the file-upload fallback if Groq could not fetch the URL itself.
            if _looks_like_url_fetch_failure(exc):
                logger.info("Falling back to file-upload path for transcription")
                return await self._transcribe_via_download(
                    audio_url, language=language, prompt=prompt
                )
            raise TranscriptionError(_translate_groq_error(exc)) from exc

        return _to_result(response, model=self._model)

    async def _transcribe_via_download(
        self,
        audio_url: str,
        *,
        language: str,
        prompt: Optional[str],
    ) -> TranscriptionResult:
        """Download audio locally and upload to Groq.

        Used only when Groq's server-side fetch fails (e.g. signed URL not
        resolvable from their network). We still cap downloads at 25 MB to
        match Groq's request limit.
        """
        tmp_dir = Path(tempfile.mkdtemp(prefix="nazl-audio-"))
        tmp_path = tmp_dir / "audio.bin"
        try:
            try:
                await _stream_to_file(audio_url, tmp_path, max_bytes=_MAX_AUDIO_BYTES)
            except httpx.HTTPStatusError as exc:
                raise TranscriptionError(
                    f"رابط الصوت غير متاح حالياً (HTTP {exc.response.status_code})."
                ) from exc
            except httpx.HTTPError as exc:
                raise TranscriptionError(
                    "ما قدرنا نوصل لرابط الصوت، جرّب رابط ثاني."
                ) from exc

            with tmp_path.open("rb") as fh:
                response = await self._client.audio.transcriptions.create(
                    file=("audio.m4a", fh.read()),
                    model=self._model,
                    language=language,
                    response_format="verbose_json",
                    prompt=prompt,
                )
            return _to_result(response, model=self._model)
        except APIError as exc:
            logger.error("Groq transcription (file path) failed: %s", exc)
            raise TranscriptionError(_translate_groq_error(exc)) from exc
        finally:
            try:
                tmp_path.unlink(missing_ok=True)
                tmp_dir.rmdir()
            except OSError:
                pass


def _to_result(response, *, model: str) -> TranscriptionResult:
    text = getattr(response, "text", "") or ""
    if not text.strip():
        raise TranscriptionError("Whisper returned an empty transcript.")
    return TranscriptionResult(
        text=text.strip(),
        language=getattr(response, "language", None),
        duration_seconds=getattr(response, "duration", None),
        model=model,
    )


def _looks_like_url_fetch_failure(exc: APIError) -> bool:
    """Heuristic: does the Groq error suggest *they* couldn't fetch the URL?

    Groq surfaces errors like
        ``{'error': {'message': 'failed to retrieve media: received status code: 403'}}``
    when their fetcher hits a redirect, geo-block, or bot-protection page.
    In that case the audio URL is still likely fetchable from our network
    (yt-dlp's CDN URLs often allow redirects and don't block our IP), so we
    fall back to downloading + re-uploading.
    """
    body = (str(exc) or "").lower()
    if getattr(exc, "status_code", None) == 400 and "failed to retrieve media" in body:
        return True
    return any(
        marker in body
        for marker in ("could not fetch", "unable to download", "failed to fetch", "invalid url")
    )


def _translate_groq_error(exc: APIError) -> str:
    """Map Groq SDK errors to a short, user-facing Arabic message."""
    status = getattr(exc, "status_code", None)
    if status == 401:
        return "إعدادات الخدمة غير مكتملة (مفتاح Groq غير صالح)."
    if status == 413 or "too large" in str(exc).lower():
        return "حجم الملف أكبر من اللي تقبله الخدمة، جرّب حلقة أقصر."
    if status == 429:
        return "الخدمة وصلت لحدها لليوم، جرّب بعد قليل."
    if status and 500 <= status < 600:
        return "خدمة التفريغ مؤقتاً مش متاحة، جرّب بعد قليل."
    return "ما قدرنا نفرّغ الصوت، جرّب رابط ثاني أو حاول لاحقاً."


async def _stream_to_file(url: str, dest: Path, *, max_bytes: int) -> None:
    """Stream ``url`` to ``dest``, aborting if it would exceed ``max_bytes``.

    We use a streaming download instead of ``response.aread()`` so a hostile
    or just-too-big source can't blow our memory before we notice.
    """
    written = 0
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        async with client.stream("GET", url) as resp:
            resp.raise_for_status()
            with dest.open("wb") as fh:
                async for chunk in resp.aiter_bytes():
                    written += len(chunk)
                    if written > max_bytes:
                        raise TranscriptionError(
                            "حجم الصوت أكبر من اللي نقدر نعالجه (25MB)؛ جرّب حلقة أقصر."
                        )
                    fh.write(chunk)
