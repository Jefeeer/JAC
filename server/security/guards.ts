import "server-only"

import { headers } from "next/headers"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/env"

/** Best-effort client IP (Vercel sets x-forwarded-for / x-real-ip). */
export async function getClientIp() {
  const h = await headers()
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown"
}

// Dev-only fallback when Supabase isn't configured (single process, resets on restart).
const memoryHits = new Map<string, { windowStart: number; hits: number }>()

/**
 * Fixed-window rate limit backed by public.hit_rate_limit() so it holds
 * across serverless instances. Returns true when the request is allowed.
 * Fails open (allows) if the limiter itself errors, and logs it.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (!isSupabaseConfigured || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    const now = Date.now()
    const windowStart = Math.floor(now / (windowSeconds * 1000))
    const entry = memoryHits.get(key)
    if (!entry || entry.windowStart !== windowStart) {
      memoryHits.set(key, { windowStart, hits: 1 })
      return true
    }
    entry.hits += 1
    return entry.hits <= limit
  }

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.rpc("hit_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error("[rateLimit] limiter error — allowing request", error.message)
    return true
  }
  return data === true
}

/**
 * Honeypot + timing check. Returns true when the submission looks automated:
 * the hidden `website` field was filled, or the form was submitted faster
 * than a human could (under 2.5 s) or with a timestamp from the future.
 */
export function looksLikeBot(input: { website?: string; startedAt: number }) {
  if (input.website && input.website.trim() !== "") return true
  const elapsed = Date.now() - input.startedAt
  return elapsed < 2500 || elapsed > 1000 * 60 * 60 * 24
}
