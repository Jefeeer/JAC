import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { safeNext } from "@/server/auth"

/**
 * Magic-link landing. Supports both:
 *  - token_hash + type  (recommended email template; works across devices)
 *  - code               (default PKCE flow; same browser only)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const next = safeNext(searchParams.get("next"))
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const code = searchParams.get("code")

  const supabase = await createSupabaseServerClient()
  let ok = false
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    ok = !error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    ok = !error
  }

  const dest = request.nextUrl.clone()
  dest.search = ""
  if (ok) {
    dest.pathname = next.split("?")[0]
    const q = next.split("?")[1]
    if (q) dest.search = `?${q}`
  } else {
    dest.pathname = "/login"
    dest.search = `?error=link&next=${encodeURIComponent(next)}`
  }
  return NextResponse.redirect(dest)
}
