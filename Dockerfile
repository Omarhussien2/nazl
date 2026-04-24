# syntax=docker/dockerfile:1.7
# ============================================================================
# نزل (Nuzul) — backend Docker image
# Designed for Cloud Run / Fly.io / any container host.
# ============================================================================

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps:
#   - ffmpeg: required by yt-dlp for audio/video post-processing
#   - ca-certificates/curl: TLS + healthchecks
#   - build-essential: some Python wheels need a compiler at install time
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        ca-certificates \
        curl \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for better layer caching
COPY app/backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip \
 && pip install -r /app/requirements.txt

# Copy backend source
COPY app/backend /app

# Uploads directory (mount a volume in prod)
RUN mkdir -p /app/uploads

ENV HOST=0.0.0.0 \
    PORT=8000 \
    UPLOADS_DIR=/app/uploads

EXPOSE 8000

# Cloud Run passes $PORT at runtime; fall back to 8000 locally.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]
