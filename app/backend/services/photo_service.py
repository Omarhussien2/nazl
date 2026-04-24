"""
Photo / gallery extraction service.

Wraps `gallery-dl` to pull images (single photos, carousels, albums) from
Instagram, Twitter/X, Pinterest, Reddit, TikTok slideshows, and ~300 other
sites. Used as a fallback when yt-dlp does not recognise a URL as video.

The `gallery-dl` library exposes a Python API, but the most stable cross-
version interface is the CLI. We invoke it via `asyncio.create_subprocess_exec`
to avoid importing and wiring up its internal job runner.

This module only extracts *public* content. Private posts, DMs, or anything
requiring a user session on the source platform are intentionally unsupported
for legal / privacy reasons.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
from typing import Any

logger = logging.getLogger(__name__)

GALLERY_DL_BIN = shutil.which("gallery-dl") or "gallery-dl"


def _env_enabled() -> bool:
    return os.environ.get("GALLERY_DL_ENABLED", "true").lower() in {"1", "true", "yes"}


async def extract_gallery(url: str, max_items: int = 50) -> dict[str, Any]:
    """
    Extract a list of direct image URLs from a gallery-like link.

    Returns a dict with:
        success:  bool
        error:    str (only when success=False)
        data:
            items:    list[{url, filename, extractor}]
            count:    int
            extractor: str  (e.g. "instagram", "twitter", "pinterest")
            source:   str  (the original URL)
    """
    if not _env_enabled():
        return {"success": False, "error": "تنزيل الصور غير مُفعَّل على الخادم"}

    # `gallery-dl --simulate --dump-json` prints one JSON record per item to
    # stdout without downloading, which is exactly what we need to return
    # direct URLs to the client.
    # NB: `--` terminates gallery-dl's option parsing so that a user-supplied
    # URL starting with `--` (e.g. `--exec=id`) is treated as a positional
    # argument rather than a CLI flag. Without this separator, an attacker
    # could abuse flags like --exec, --extractors, --input-file, --write-log,
    # or --config to execute arbitrary code or read arbitrary files.
    cmd = [
        GALLERY_DL_BIN,
        "--simulate",
        "--dump-json",
        "--range",
        f"1-{max_items}",
        "--",
        url,
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except FileNotFoundError:
        logger.error("gallery-dl binary not found on PATH")
        return {"success": False, "error": "مكتبة gallery-dl غير مثبّتة على الخادم"}

    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
    except asyncio.TimeoutError:
        # `asyncio.wait_for` cancels `communicate()` but does NOT reap the
        # underlying OS process. Kill it and wait for it to exit so we don't
        # leak a gallery-dl process on every slow/hanging URL.
        proc.kill()
        try:
            await proc.wait()
        except Exception:  # noqa: BLE001 - best-effort cleanup
            pass
        logger.warning("gallery-dl timed out for %s", url)
        return {"success": False, "error": "انتهت المهلة أثناء استخراج الصور"}

    if proc.returncode != 0:
        err = stderr.decode("utf-8", errors="replace").strip()
        logger.warning("gallery-dl failed for %s: %s", url, err[:400])
        return {
            "success": False,
            "error": "ما قدرنا نستخرج صور من هذا الرابط (قد يكون خاصاً أو غير مدعوم)",
        }

    items: list[dict[str, Any]] = []
    extractor = ""
    for raw_line in stdout.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        # gallery-dl emits heterogeneous record types. Valid image records are
        # typically JSON *arrays* of shape [3, url, metadata] — we only care
        # about the URL and a few metadata fields for display.
        if isinstance(record, list) and len(record) >= 2 and record[0] == 3:
            item_url = record[1]
            meta = record[2] if len(record) >= 3 and isinstance(record[2], dict) else {}
            items.append(
                {
                    "url": item_url,
                    "filename": meta.get("filename") or meta.get("title") or "",
                    "extension": meta.get("extension", ""),
                    "width": meta.get("width"),
                    "height": meta.get("height"),
                }
            )
            if not extractor:
                extractor = meta.get("category") or meta.get("extractor") or ""

    if not items:
        return {
            "success": False,
            "error": "لم نجد أي صورة في هذا الرابط",
        }

    return {
        "success": True,
        "data": {
            "items": items,
            "count": len(items),
            "extractor": extractor,
            "source": url,
        },
    }
