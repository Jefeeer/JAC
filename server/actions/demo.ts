"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { DEMO_MODE, demoAccount } from "@/lib/demo/accounts"
import { safeNext } from "@/server/auth"
import { DEMO_COOKIE, demoCookieValue } from "@/server/demo/session"
import { advanceLiveJob, demoDb, resetDemoDb } from "@/server/demo/store"

/** Sign in as a demo persona (DEMO MODE only). */
export async function demoSignIn(accountId: string, next?: string) {
  if (!DEMO_MODE) redirect("/login")
  const account = demoAccount(accountId)
  if (!account) redirect("/login")
  ;(await cookies()).set(DEMO_COOKIE, demoCookieValue(account.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  })
  const target = next && next !== "/account" ? safeNext(next) : account.home
  // Customers can't use /admin; staff landing defaults to /admin.
  redirect(account.role === "customer" && target.startsWith("/admin") ? "/account" : target)
}

export async function demoSignOut() {
  ;(await cookies()).delete(DEMO_COOKIE)
  redirect("/login")
}

export async function demoAdvanceJob() {
  if (!DEMO_MODE) return
  advanceLiveJob(demoDb())
  revalidatePath("/", "layout")
}

export async function demoReset() {
  if (!DEMO_MODE) return
  resetDemoDb()
  revalidatePath("/", "layout")
}
