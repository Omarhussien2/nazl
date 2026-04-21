import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.download_service import fetch_video_info
from services.aihub import AIHubService
from schemas.aihub import TranscribeAudioRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/download", tags=["download"])


class DownloadRequest(BaseModel):
    url: str
    quality: str = "1080"
    audio_only: bool = False


class TranscribeRequest(BaseModel):
    url: str


@router.post("/fetch")
async def fetch_download(request: DownloadRequest):
    """Fetch video info and download link from cobalt API"""
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
async def transcribe_video(request: TranscribeRequest):
    """Download audio from video URL and transcribe it using AI"""
    try:
        # Step 1: Get audio download link from cobalt
        audio_result = await fetch_video_info(
            url=request.url,
            quality="720",
            audio_only=True,
        )

        if not audio_result.get("success"):
            return {
                "success": False,
                "error": audio_result.get("error", "ما قدرنا نحصل على رابط الصوت"),
                "text": None,
            }

        audio_data = audio_result.get("data", {})
        audio_url = audio_data.get("url")

        if not audio_url:
            # Try picker if direct URL not available
            picker = audio_data.get("picker", [])
            if picker and len(picker) > 0:
                audio_url = picker[0].get("url")

        if not audio_url:
            return {
                "success": False,
                "error": "ما قدرنا نستخرج الصوت من الرابط هذا، جرب رابط ثاني",
                "text": None,
            }

        # Step 2: Transcribe the audio using AIHubService
        service = AIHubService()
        transcribe_req = TranscribeAudioRequest(
            audio=audio_url,
            model="scribe_v2",
        )
        response = await service.transcribe(transcribe_req)
        transcript_text = response.text

        return {
            "success": True,
            "text": transcript_text,
            "error": None,
        }

    except Exception as e:
        logger.error(f"Transcribe error: {e}")
        return {
            "success": False,
            "error": f"صار خطأ أثناء التفريغ: {str(e)}",
            "text": None,
        }