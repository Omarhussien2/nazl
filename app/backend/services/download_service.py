import httpx
import logging

logger = logging.getLogger(__name__)

COBALT_API_URL = "https://api.cobalt.tools"

async def fetch_video_info(url: str, quality: str = "1080", audio_only: bool = False):
    """
    Call cobalt.tools API to get download links for a given URL.
    """
    try:
        payload = {
            "url": url,
            "downloadMode": "audio" if audio_only else "auto",
            "filenameStyle": "pretty",
            "videoQuality": quality,
        }

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{COBALT_API_URL}/",
                json=payload,
                headers=headers,
            )

            if response.status_code == 200:
                data = response.json()
                return {"success": True, "data": data}
            else:
                error_text = response.text
                logger.error(f"Cobalt API error: {response.status_code} - {error_text}")
                return {
                    "success": False,
                    "error": f"خطأ من الخدمة: {response.status_code}",
                    "details": error_text
                }

    except httpx.TimeoutException:
        return {"success": False, "error": "انتهت مهلة الاتصال، حاول مرة ثانية"}
    except Exception as e:
        logger.error(f"Download service error: {e}")
        return {"success": False, "error": f"صار خطأ: {str(e)}"}