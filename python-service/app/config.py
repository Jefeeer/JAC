"""Service settings, loaded from environment variables (see .env.example)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache


def _bool(v: str | None, default: bool = False) -> bool:
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    supabase_url: str = field(default_factory=lambda: os.environ.get("SUPABASE_URL", ""))
    # Server-side only. Bypasses RLS — never expose.
    supabase_service_key: str = field(
        default_factory=lambda: os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    )
    shared_secret: str = field(default_factory=lambda: os.environ.get("SERVICE_SHARED_SECRET", ""))
    resend_api_key: str = field(default_factory=lambda: os.environ.get("RESEND_API_KEY", ""))
    email_from: str = field(default_factory=lambda: os.environ.get("EMAIL_FROM", "JAC Motors <no-reply@jacmotors.ph>"))
    site_url: str = field(default_factory=lambda: os.environ.get("SITE_URL", "http://localhost:3000").rstrip("/"))
    timezone: str = field(default_factory=lambda: os.environ.get("TIMEZONE", "Asia/Manila"))
    enable_scheduler: bool = field(default_factory=lambda: _bool(os.environ.get("ENABLE_SCHEDULER"), False))
    reminder_hour: int = field(default_factory=lambda: int(os.environ.get("REMINDER_HOUR", "8")))
    reminder_cooldown_days: int = field(default_factory=lambda: int(os.environ.get("REMINDER_COOLDOWN_DAYS", "14")))
    documents_bucket: str = "documents"
    max_import_bytes: int = 10 * 1024 * 1024
    allowed_origins: tuple[str, ...] = field(
        default_factory=lambda: tuple(o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip())
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
