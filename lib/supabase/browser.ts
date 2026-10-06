"use client"

import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env"

let client: ReturnType<typeof createBrowserClient> | undefined

/** Browser singleton — used for Realtime subscriptions and client-side auth. */
export function getSupabaseBrowserClient() {
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  return client
}
