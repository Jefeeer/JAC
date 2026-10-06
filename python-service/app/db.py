"""Supabase client (service role — bypasses RLS, server-side only)."""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

from .config import get_settings

if TYPE_CHECKING:  # pragma: no cover
    from supabase import Client


@lru_cache
def get_db() -> "Client":
    from supabase import create_client

    s = get_settings()
    if not s.supabase_url or not s.supabase_service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(s.supabase_url, s.supabase_service_key)
