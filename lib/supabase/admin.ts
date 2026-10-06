import "server-only"

import { createClient } from "@supabase/supabase-js"
import { SUPABASE_URL } from "./env"

/**
 * Service-role client — BYPASSES RLS. Server-only (the `server-only` import
 * makes any client-bundle import a build error). Use exclusively inside
 * Server Actions / Route Handlers after validating input and authorising the
 * caller, e.g. for public form submissions and notification fan-out.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !key) {
    throw new Error("Supabase service credentials are not configured (SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY).")
  }
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
