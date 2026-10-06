import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { DEMO_MODE } from "@/lib/demo/accounts"
import { STAFF_ROLES, type UserRole } from "@/types/domain"

export type SessionContext = {
  userId: string
  email: string
  profile: { fullName: string | null; phone: string | null; role: UserRole; branchId: string | null; isActive: boolean }
  customer: { id: string; companyId: string | null; fullName: string; phone: string | null } | null
  isStaff: boolean
  /** true for DEMO MODE personas (in-memory data, no Supabase) */
  isDemo: boolean
}

async function getDemoSession(): Promise<SessionContext | null> {
  const [{ getDemoAccount }, { demoDb }] = await Promise.all([import("@/server/demo/session"), import("@/server/demo/store")])
  const account = await getDemoAccount()
  if (!account) return null
  const db = demoDb()
  const profile = db.profiles.find((p) => p.id === account.id)
  const customer = db.customers.find((c) => c.profileId === account.id) ?? null
  return {
    userId: account.id,
    email: account.email,
    profile: { fullName: profile?.fullName ?? account.fullName, phone: profile?.phone ?? account.phone, role: account.role, branchId: account.branchSlug, isActive: true },
    customer: customer ? { id: customer.id, companyId: customer.companyId, fullName: customer.fullName, phone: customer.phone } : null,
    isStaff: (STAFF_ROLES as readonly string[]).includes(account.role),
    isDemo: true,
  }
}

/** Per-request session (deduped with React cache). `null` when signed out or Supabase isn't configured. */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  if (DEMO_MODE) {
    const demo = await getDemoSession()
    if (demo) return demo
  }
  if (!isSupabaseConfigured) return null
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: customer }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, role, branch_id, is_active").eq("id", user.id).maybeSingle(),
    supabase.from("customers").select("id, company_id, full_name, phone").eq("profile_id", user.id).maybeSingle(),
  ])
  if (!profile) return null

  const role = profile.role as UserRole
  return {
    userId: user.id,
    email: user.email ?? "",
    profile: { fullName: profile.full_name, phone: profile.phone, role, branchId: profile.branch_id, isActive: profile.is_active },
    customer: customer ? { id: customer.id, companyId: customer.company_id, fullName: customer.full_name, phone: customer.phone } : null,
    isStaff: (STAFF_ROLES as readonly string[]).includes(role) && profile.is_active,
    isDemo: false,
  }
})

/** Use in portal pages/layouts. Redirects to /login when signed out. */
export async function requireUser(nextPath: string): Promise<SessionContext> {
  const session = await getSession()
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  return session
}

/** Use in admin pages. Customers are bounced to the portal; inactive staff to login. */
export async function requireStaff(nextPath: string, roles?: readonly UserRole[]): Promise<SessionContext> {
  const session = await requireUser(nextPath)
  if (!session.isStaff) redirect("/account?denied=admin")
  if (roles && !roles.includes(session.profile.role) && session.profile.role !== "admin") redirect("/admin?denied=1")
  return session
}

/** Only allow same-site relative redirect targets. */
export function safeNext(next: string | null | undefined, fallback = "/account") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback
  return next
}
