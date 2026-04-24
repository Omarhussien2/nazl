"""
OIDC Discovery document fetcher with in-memory cache.

Replaces the previous hard-coded OIDC endpoint pattern
(`<issuer>/authorize`, `<issuer>/token`, `<issuer>/.well-known/jwks.json`)
which only works for providers that happen to follow that convention.
Google's endpoints, for example, live on different hosts (`accounts.google.com`
for authorization, `oauth2.googleapis.com` for tokens, `www.googleapis.com`
for JWKS), so we must look them up via the standard OIDC discovery document
at `<issuer>/.well-known/openid-configuration`.

Usage:
    discovery = await get_oidc_discovery()
    auth_url = discovery["authorization_endpoint"]
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, Optional

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

# Cache the discovery document for this many seconds; providers rotate keys
# but rarely change the discovery URLs themselves. One hour is conservative.
_CACHE_TTL_SECONDS = 3600

_cache: Dict[str, Dict[str, Any]] = {}
_cache_expiry: Dict[str, float] = {}
_lock = asyncio.Lock()


def _discovery_url() -> str:
    """Return the discovery document URL.

    Prefers an explicit ``OIDC_DISCOVERY_URL`` env var if set (useful for
    providers whose issuer string does not directly host the discovery doc),
    otherwise falls back to ``<OIDC_ISSUER_URL>/.well-known/openid-configuration``.
    """
    explicit = getattr(settings, "oidc_discovery_url", None) if _has_setting("oidc_discovery_url") else None
    if explicit:
        return explicit
    issuer = settings.oidc_issuer_url.rstrip("/")
    return f"{issuer}/.well-known/openid-configuration"


def _has_setting(name: str) -> bool:
    try:
        getattr(settings, name)
        return True
    except AttributeError:
        return False


async def get_oidc_discovery(force_refresh: bool = False) -> Dict[str, Any]:
    """Fetch the OIDC discovery document, cached in-process for ``_CACHE_TTL_SECONDS``.

    Raises ``RuntimeError`` if the document cannot be fetched or is malformed.
    """
    url = _discovery_url()
    now = time.monotonic()

    if not force_refresh and url in _cache and _cache_expiry.get(url, 0) > now:
        return _cache[url]

    async with _lock:
        # Re-check after acquiring the lock (another coroutine may have refreshed).
        if not force_refresh and url in _cache and _cache_expiry.get(url, 0) > now:
            return _cache[url]

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                doc = response.json()
        except httpx.HTTPError as exc:
            logger.error("OIDC discovery fetch failed for %s: %s", url, exc)
            raise RuntimeError(f"Unable to fetch OIDC discovery document from {url}") from exc

        required = ("authorization_endpoint", "token_endpoint", "jwks_uri", "issuer")
        missing = [k for k in required if not doc.get(k)]
        if missing:
            raise RuntimeError(
                f"OIDC discovery document from {url} missing required fields: {missing}"
            )

        _cache[url] = doc
        _cache_expiry[url] = now + _CACHE_TTL_SECONDS
        logger.info(
            "Cached OIDC discovery from %s (issuer=%s)", url, doc.get("issuer")
        )
        return doc


async def get_discovery_field(field: str) -> str:
    """Convenience accessor for a single discovery field."""
    doc = await get_oidc_discovery()
    value = doc.get(field)
    if not value:
        raise RuntimeError(f"OIDC discovery document does not contain '{field}'")
    return value


def clear_cache() -> None:
    """Clear the in-memory discovery cache (useful in tests)."""
    _cache.clear()
    _cache_expiry.clear()


# Back-compat export for code importing from this module directly.
__all__ = [
    "get_oidc_discovery",
    "get_discovery_field",
    "clear_cache",
]


async def get_logout_url() -> Optional[str]:
    """Return the provider's RP-initiated logout endpoint if any.

    Google does not advertise one (as of 2025-01) so this may return ``None``;
    callers should fall back to local-only logout in that case.
    """
    try:
        doc = await get_oidc_discovery()
    except RuntimeError:
        return None
    return doc.get("end_session_endpoint")
