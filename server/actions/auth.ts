"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { siteConfig } from "@/lib/config/site"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import type { ActionResult } from "@/lib/validation/quote"
import { safeNext } from "@/server/auth"
import { getClientIp, looksLikeBot, rateLimit } from "@/server/security/guards"

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(120),
  fullName: z.string().trim().max(80).optional().or(z.literal("")),
  next: z.string().max(300).optional(),
  website: z.string().max(200).optional(),
  startedAt: z.number().int().positive(),
})

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email"),
  next: z.string().max(300).optional(),
})

/** Prefer the configured site URL; fall back to the request host (dev / previews). Supabase also allow-lists redirect URLs. */
async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https")
  return host ? `${proto}://${host}` : siteConfig.url
}

/** Step 1: email a magic link + one-time code. Creates the account on first use. */
export async function requestSignIn(input: z.input<typeof requestSchema>): Promise<ActionResult<{ email: string }>> {
  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Please check your email address.", fieldErrors: z.flattenError(parsed.error).fieldErrors }
  const v = parsed.data
  if (looksLikeBot(v)) return { ok: true, data: { email: v.email } }
  if (!isSupabaseConfigured) return { ok: false, error: "Sign-in isn't available yet. Please call us for help with your account." }

  const ip = await getClientIp()
  if (!(await rateLimit(`login:${ip}`, 8, 900)) || !(await rateLimit(`login-email:${v.email}`, 4, 900))) {
    return { ok: false, error: "Too many sign-in attempts. Please wait a few minutes and try again." }
  }

  const supabase = await createSupabaseServerClient()
  const next = safeNext(v.next)
  const { error } = await supabase.auth.signInWithOtp({
    email: v.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent(next)}`,
      data: v.fullName ? { full_name: v.fullName } : undefined,
    },
  })
  if (error) {
    console.error("[requestSignIn]", error.message)
    // Don't reveal whether the address exists.
    if (error.status === 429) return { ok: false, error: "Please wait a minute before requesting another link." }
    return { ok: false, error: "We couldn't send the sign-in email. Please try again shortly." }
  }
  return { ok: true, data: { email: v.email } }
}

/** Step 2 (alternative to the link): verify the 6-digit code. */
export async function verifySignInCode(input: z.input<typeof verifySchema>): Promise<ActionResult> {
  const parsed = verifySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid code" }
  const v = parsed.data

  const ip = await getClientIp()
  if (!(await rateLimit(`otp:${ip}`, 10, 900))) return { ok: false, error: "Too many attempts. Please request a new code later." }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.verifyOtp({ email: v.email, token: v.code, type: "email" })
  if (error) return { ok: false, error: "That code is invalid or has expired. Request a new one." }
  redirect(safeNext(v.next))
}

export async function signOut() {
  // Clears a DEMO MODE session too (no-op otherwise).
  const { cookies } = await import("next/headers")
  ;(await cookies()).delete("jac_demo")
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
  }
  redirect("/")
}
