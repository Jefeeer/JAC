"""Shared-secret authentication for calls from the Next.js server (and cron)."""

from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, status

from .config import get_settings


def secret_matches(expected: str, provided: str | None) -> bool:
    """Constant-time comparison; an unset expected secret never matches."""
    if not expected or not provided:
        return False
    return hmac.compare_digest(expected.encode(), provided.encode())


async def require_service_secret(x_service_secret: str | None = Header(default=None)) -> None:
    if not secret_matches(get_settings().shared_secret, x_service_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing X-Service-Secret")
