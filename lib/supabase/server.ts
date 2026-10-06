import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env"

/**
 * Per-request client bound to the signed-in user's session (RLS applies as
 * that user). Use in Server Components, Server Actions and Route Handlers.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component — the proxy refreshes the session instead.
        }
      },
    },
  })
}
