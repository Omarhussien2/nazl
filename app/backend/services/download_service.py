import asyncio
import logging
from typing import Optional
import yt_dlp

logger = logging.getLogger(__name__)

# yt-dlp options templates
def _build_ydl_opts(quality: str = "1080", audio_only: bool = False) -> dict:
    """Build yt-dlp options based on requested quality and mode."""
    if audio_only:
        return {
            "format": "bestaudio/best",
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
        }
    
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
    
    return {
        "format": fmt,
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
    }


def _extract_video_info_sync(url: str, quality: str = "1080", audio_only: bool = False) -> dict:
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
            acodec = f.get("acodec", "none")
            filesize = f.get("filesize")
            tbr = f.get("tbr")
            
            # Skip formats without useful info
            if not height and vcodec == "none":
                continue
            
            resolution = f"{height}p" if height else "audio"
            if resolution in seen_resolutions:
                continue
            seen_resolutions.add(resolution)
            
            picker.append({
                "url": f_url,
                "type": "video" if vcodec != "none" else "audio",
                "resolution": resolution,
                "ext": ext,
                "filesize": filesize,
                "tbr": tbr,
            })
        
        # For audio_only mode, get the best audio URL
        audio_url = None
        if audio_only:
            for f in reversed(formats):
                if f.get("acodec") != "none" and f.get("vcodec") == "none" and f.get("url"):
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
                if (f.get("vcodec") != "none" and f.get("acodec") != "none" 
                    and f.get("url") and f.get("height")):
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
            "filename": f"{title}.{formats[0].get('ext', 'mp4') if formats else 'mp4'}" if title else "",
        }
        
        return {"success": True, "data": data}


async def fetch_video_info(url: str, quality: str = "1080", audio_only: bool = False) -> dict:
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
        error_msg = str(e)
        # Translate common errors to Arabic
        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            return {"success": False, "error": "الرابط غير موجود أو محذوف"}
        if "private" in error_msg.lower():
            return {"success": False, "error": "الفيديو خاص وما ينتحمل"}
        if "age" in error_msg.lower():
            return {"success": False, "error": "الفيديو محتوى مقيد بالعمر"}
        if "sign in" in error_msg.lower() or "login" in error_msg.lower():
            return {"success": False, "error": "الفيديو يتطلب تسجيل دخول"}
        if "geo" in error_msg.lower() or "country" in error_msg.lower():
            return {"success": False, "error": "الفيديو غير متوفر في منطقتك"}
        if "Unsupported URL" in error_msg:
            return {"success": False, "error": "الرابط غير مدعوم، جرب رابط من موقع مدعوم"}
        return {"success": False, "error": f"ما قدرنا نحمّل: {error_msg}"}
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
            opts = {
                "format": "bestaudio/best",
                "quiet": True,
                "no_warnings": True,
            }
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if info is None:
                    return {"success": False, "error": "ما قدرنا نستخرج معلومات من الرابط"}
                
                # Try to get direct audio URL
                audio_url = info.get("url")
                
                # Search through formats for best audio-only stream
                formats = info.get("formats", [])
                for f in reversed(formats):
                    if (f.get("acodec") != "none" 
                        and f.get("vcodec") == "none" 
                        and f.get("url")):
                        audio_url = f["url"]
                        break
                
                if not audio_url:
                    return {"success": False, "error": "ما قدرنا نحصل على رابط الصوت"}
                
                title = info.get("title", "")
                
                return {
                    "success": True,
                    "data": {
                        "url": audio_url,
                        "title": title,
                    }
                }
        
        return await asyncio.to_thread(_get_audio_url_sync)
    
    except yt_dlp.utils.DownloadError as e:
        logger.error(f"yt-dlp audio extraction error: {e}")
        return {"success": False, "error": f"ما قدرنا نستخرج الصوت: {str(e)}"}
    except Exception as e:
        logger.error(f"Audio URL fetch error: {e}")
        return {"success": False, "error": f"صار خطأ: {str(e)}"}