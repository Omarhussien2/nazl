import asyncio
import logging
import os
import tempfile
from typing import Optional

import yt_dlp

logger = logging.getLogger(__name__)


YOUTUBE_PROXY_ERROR = (
    "يوتيوب طلب تحقق من تسجيل الدخول. "
    "اضبط YTDLP_COOKIES_TXT بمحتوى cookies.txt (Netscape) أو "
    "YTDLP_PROXY_URL ببروكسي سكني (Residential) لتجاوز الحجب."
)

# YouTube player clients yt-dlp should try, in priority order. The default
# ``web`` client is heavily fingerprinted and routinely blocked on
# datacenter IPs (Cloud Run, AWS, etc.) with the famous
# ``Sign in to confirm you're not a bot`` error. The mobile-web and TV
# clients use simpler endpoints that pass for most public videos without
# cookies. ``web`` stays at the end as a last-ditch fallback.
_YOUTUBE_PLAYER_CLIENTS = ["mweb", "tv_simply", "tv", "web"]

# Cached path to the cookies file we wrote from YTDLP_COOKIES_TXT.
_COOKIES_PATH: Optional[str] = None


def _ensure_cookies_file() -> Optional[str]:
    """Materialise the cookies file from env vars (once per process).

    Operators can ship a Netscape-format ``cookies.txt`` either inline via
    the ``YTDLP_COOKIES_TXT`` env var (friendliest for ``gcloud run
    services update --update-env-vars``) or by mounting a file and
    pointing ``YTDLP_COOKIES_PATH`` at it (friendliest for Secret Manager
    mounts). The first hit wins; subsequent calls reuse the same path.
    """
    global _COOKIES_PATH
    if _COOKIES_PATH and os.path.exists(_COOKIES_PATH):
        return _COOKIES_PATH

    # Accept either YTDLP_COOKIES_PATH (preferred, matches yt-dlp docs) or
    # YTDLP_COOKIES_FILE (the name shipped in our .env.example).
    explicit_path = (
        os.getenv("YTDLP_COOKIES_PATH", "").strip()
        or os.getenv("YTDLP_COOKIES_FILE", "").strip()
    )
    if explicit_path and os.path.exists(explicit_path):
        _COOKIES_PATH = explicit_path
        return _COOKIES_PATH

    cookies_content = os.getenv("YTDLP_COOKIES_TXT", "")
    if not cookies_content.strip():
        return None

    try:
        fd, path = tempfile.mkstemp(prefix="ytdlp_cookies_", suffix=".txt")
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(cookies_content)
            if not cookies_content.endswith("\n"):
                fh.write("\n")
        _COOKIES_PATH = path
        logger.info("yt-dlp cookies materialised at %s", path)
        return _COOKIES_PATH
    except Exception:
        logger.exception("Failed to write yt-dlp cookies file")
        return None


def _finalize_opts(opts: dict) -> dict:
    """Decorate a yt-dlp options dict with the runtime knobs we control.

    - ``YTDLP_PROXY_URL`` routes the call through an HTTP(S)/SOCKS proxy.
    - ``YTDLP_COOKIES_TXT`` / ``YTDLP_COOKIES_PATH`` ship a cookies jar.
    - ``extractor_args.youtube.player_client`` reorders the YouTube
      player clients yt-dlp uses, dodging anti-bot guards on datacenter
      IPs even without cookies.
    """
    proxy_url = os.getenv("YTDLP_PROXY_URL", "").strip()
    if proxy_url:
        opts["proxy"] = proxy_url

    cookies = _ensure_cookies_file()
    if cookies:
        opts["cookiefile"] = cookies

    extractor_args = dict(opts.get("extractor_args") or {})
    youtube_args = dict(extractor_args.get("youtube") or {})
    youtube_args.setdefault("player_client", _YOUTUBE_PLAYER_CLIENTS)
    extractor_args["youtube"] = youtube_args
    opts["extractor_args"] = extractor_args

    return opts


# Backwards-compatible alias kept for any callers that still import the
# old name. New code should call ``_finalize_opts`` directly.
_with_proxy = _finalize_opts


def _build_ydl_opts(quality: str = "1080", audio_only: bool = False) -> dict:
    """Build yt-dlp options based on requested quality and mode."""
    if audio_only:
        return _with_proxy(
            {
                "format": "bestaudio/best",
                "quiet": True,
                "no_warnings": True,
                "extract_flat": False,
            }
        )

    # Map quality string to yt-dlp format selector
    quality_map = {
        "2160": "bestvideo[height<=2160]+bestaudio/best[height<=2160]/best",
        "1440": "bestvideo[height<=1440]+bestaudio/best[height<=1440]/best",
        "1080": "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
        "720": "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
        "480": "bestvideo[height<=480]+bestaudio/best[height<=480]/best",
        "360": "bestvideo[height<=360]+bestaudio/best[height<=360]/best",
    }
    fmt = quality_map.get(quality, quality_map["1080"])

    return _with_proxy(
        {
            "format": fmt,
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
        }
    )


def _translate_download_error(error_msg: str, *, audio: bool = False) -> str:
    lower = error_msg.lower()
    if (
        "sign in to confirm" in lower
        or "not a bot" in lower
        or "confirm you're not a bot" in lower
        or "confirm you’re not a bot" in lower
    ):
        return YOUTUBE_PROXY_ERROR
    if "not found" in lower or "does not exist" in lower:
        return "الرابط غير موجود أو محذوف"
    if "private" in lower:
        return "الفيديو خاص وما ينتحمل"
    if "age" in lower:
        return "الفيديو محتوى مقيد بالعمر"
    if "sign in" in lower or "login" in lower:
        return "الفيديو يتطلب تسجيل دخول"
    if "geo" in lower or "country" in lower:
        return "الفيديو غير متوفر في منطقتك"
    if "Unsupported URL" in error_msg:
        return "الرابط غير مدعوم، جرب رابط من موقع مدعوم"
    if audio:
        return f"ما قدرنا نستخرج الصوت: {error_msg}"
    return f"ما قدرنا نحمّل: {error_msg}"


def _extract_video_info_sync(
    url: str, quality: str = "1080", audio_only: bool = False
) -> dict:
    """Synchronous yt-dlp extraction — run inside asyncio.to_thread."""
    opts = _build_ydl_opts(quality, audio_only)

    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)

        if info is None:
            return {"success": False, "error": "ما قدرنا نستخرج معلومات من الرابط هذا"}

        # Basic video metadata
        title = info.get("title", "")
        description = info.get("description", "")
        duration = info.get("duration")
        thumbnail = info.get("thumbnail", "")
        uploader = info.get("uploader", "")
        view_count = info.get("view_count")
        like_count = info.get("like_count")
        webpage_url = info.get("webpage_url", url)
        extractor = info.get("extractor", "")
        formats = info.get("formats", [])

        # Get the best direct URL
        direct_url = info.get("url", "")

        # Build a list of available formats for the picker
        picker = []
        seen_resolutions = set()
        for f in formats:
            f_url = f.get("url")
            if not f_url:
                continue
            height = f.get("height")
            ext = f.get("ext", "")
            vcodec = f.get("vcodec", "none")
            filesize = f.get("filesize")
            tbr = f.get("tbr")

            # Skip formats without useful info
            if not height and vcodec == "none":
                continue

            resolution = f"{height}p" if height else "audio"
            if resolution in seen_resolutions:
                continue
            seen_resolutions.add(resolution)

            picker.append(
                {
                    "url": f_url,
                    "type": "video" if vcodec != "none" else "audio",
                    "resolution": resolution,
                    "ext": ext,
                    "filesize": filesize,
                    "tbr": tbr,
                }
            )

        # For audio_only mode, get the best audio URL
        audio_url = None
        if audio_only:
            for f in reversed(formats):
                if (
                    f.get("acodec") != "none"
                    and f.get("vcodec") == "none"
                    and f.get("url")
                ):
                    audio_url = f["url"]
                    break
            # Fallback: try to get audio from combined formats
            if not audio_url and direct_url:
                audio_url = direct_url

        # For video mode, get the best video+audio URL
        video_url = None
        if not audio_only:
            # Try to find a combined format first
            for f in reversed(formats):
                if (
                    f.get("vcodec") != "none"
                    and f.get("acodec") != "none"
                    and f.get("url")
                    and f.get("height")
                ):
                    video_url = f["url"]
                    break
            if not video_url and direct_url:
                video_url = direct_url

        result_url = audio_url if audio_only else video_url

        data = {
            "url": result_url or direct_url,
            "title": title,
            "description": description,
            "duration": duration,
            "thumbnail": thumbnail,
            "uploader": uploader,
            "view_count": view_count,
            "like_count": like_count,
            "webpage_url": webpage_url,
            "extractor": extractor,
            "picker": picker[:20],  # Limit picker to 20 entries
            "audio_only": audio_only,
            "filename": f"{title}.{formats[0].get('ext', 'mp4') if formats else 'mp4'}"
            if title
            else "",
        }

        return {"success": True, "data": data}


async def fetch_video_info(
    url: str, quality: str = "1080", audio_only: bool = False
) -> dict:
    """
    Extract video info and download URLs using yt-dlp.
    Runs the synchronous yt-dlp in a thread pool.
    """
    try:
        result = await asyncio.to_thread(
            _extract_video_info_sync, url, quality, audio_only
        )
        return result
    except yt_dlp.utils.DownloadError as e:
        logger.error(f"yt-dlp DownloadError: {e}")
        return {"success": False, "error": _translate_download_error(str(e))}
    except yt_dlp.utils.ExtractorError as e:
        logger.error(f"yt-dlp ExtractorError: {e}")
        return {"success": False, "error": f"ما قدرنا نستخرج المعلومات: {str(e)}"}
    except Exception as e:
        logger.error(f"Download service error: {e}")
        return {"success": False, "error": f"صار خطأ: {str(e)}"}


async def fetch_audio_url(url: str) -> dict:
    """
    Extract only the direct audio URL from a video using yt-dlp.
    Used for transcription — returns the best audio-only stream URL.
    """
    try:

        def _get_audio_url_sync():
            opts = _with_proxy(
                {
                    "format": "bestaudio/best",
                    "quiet": True,
                    "no_warnings": True,
                }
            )
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if info is None:
                    return {
                        "success": False,
                        "error": "ما قدرنا نستخرج معلومات من الرابط",
                    }

                # Try to get direct audio URL
                audio_url = info.get("url")

                # Search through formats for best audio-only stream
                formats = info.get("formats", [])
                for f in reversed(formats):
                    if (
                        f.get("acodec") != "none"
                        and f.get("vcodec") == "none"
                        and f.get("url")
                    ):
                        audio_url = f["url"]
                        break

                if not audio_url:
                    return {"success": False, "error": "ما قدرنا نحصل على رابط الصوت"}

                title = info.get("title", "")
                duration = info.get("duration")

                return {
                    "success": True,
                    "data": {
                        "url": audio_url,
                        "title": title,
                        "duration": duration,
                    },
                }

        return await asyncio.to_thread(_get_audio_url_sync)

    except yt_dlp.utils.DownloadError as e:
        logger.error(f"yt-dlp audio extraction error: {e}")
        return {
            "success": False,
            "error": _translate_download_error(str(e), audio=True),
        }
    except Exception as e:
        logger.error(f"Audio URL fetch error: {e}")
        return {"success": False, "error": f"صار خطأ: {str(e)}"}
