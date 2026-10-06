import "server-only"

import { createClient } from "@supabase/supabase-js"
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env"

/**
 * Cookie-less anonymous client for public catalog reads. Because it never
 * touches request cookies, pages using it stay statically renderable / ISR.
 * RLS limits it to published trucks + parts.
 */
export function createSupabasePublicClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
