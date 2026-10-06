import "server-only"

import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { requireStaff, type SessionContext } from "@/server/auth"
import { demoAdminRepo } from "./demo-repo"
import { can, type Capability } from "./permissions"
import { supabaseAdminRepo } from "./supabase-repo"
import type { AdminRepo } from "./types"

export async function repoFor(session: SessionContext): Promise<AdminRepo> {
  return session.isDemo ? demoAdminRepo(session) : supabaseAdminRepo(session, await createSupabaseServerClient())
}

/** For admin pages: staff session + capability check + repository. */
export async function adminPage(path: string, cap?: Capability) {
  const session = await requireStaff(path)
  if (cap && !can(session.profile.role, cap)) redirect("/admin?denied=1")
  return { session, repo: await repoFor(session), role: session.profile.role }
}
