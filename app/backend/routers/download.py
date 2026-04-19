import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.download_service import fetch_video_info

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/download", tags=["download"])


class DownloadRequest(BaseModel):
    url: str
    quality: str = "1080"
    audio_only: bool = False


class DownloadResponse(BaseModel):
    success: bool
    data: dict = None
    error: str = None


@router.post("/fetch", response_model=DownloadResponse)
async def fetch_download(request: DownloadRequest):
    """Fetch video info and download link from cobalt API"""
    try:
        result = await fetch_video_info(
            url=request.url,
            quality=request.quality,
            audio_only=request.audio_only,
        )
        return DownloadResponse(
            success=result.get("success", False),
            data=result.get("data"),
            error=result.get("error"),
        )
    except Exception as e:
        logger.error(f"Fetch download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))