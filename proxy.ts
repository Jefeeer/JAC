import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

/**
 * Refreshes the Supabase session cookie and does an *optimistic* auth gate
 * for /account and /admin. Real authorisation happens in layouts
 * (server/auth.ts) and in Postgres RLS — never rely on this alone.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const { pathname, search } = request.nextUrl
  const isProtected = pathname.startsWith("/account") || pathname.startsWith("/admin")
  // DEMO MODE personas carry a signed cookie instead of a Supabase session (verified in the layout).
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "1" && request.cookies.has("jac_demo")
  const toLogin = () => {
    const login = request.nextUrl.clone()
    login.pathname = "/login"
    login.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(login)
  }

  if (!url || !key) return isProtected && !demo ? toLogin() : NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // Do not run code between createServerClient and getUser — it refreshes the token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isProtected && !user && !demo) return toLogin()
  if (pathname === "/login" && user) {
    const next = request.nextUrl.searchParams.get("next")
    const dest = request.nextUrl.clone()
    dest.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next.split("?")[0] : "/account"
    dest.search = ""
    return NextResponse.redirect(dest)
  }

  return response
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/login", "/auth/:path*"],
}
