"use server"

import { randomUUID } from "node:crypto"
import { z } from "zod"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { uploadRequestSchema, type ActionResult } from "@/lib/validation/quote"
import { getClientIp, rateLimit } from "@/server/security/guards"

/* -------------------------------------------------------------------------- */
/*  Photo uploads — signed upload URLs straight to the private bucket          */
/* -------------------------------------------------------------------------- */

export async function createUploadTargets(input: z.input<typeof uploadRequestSchema>): Promise<
  ActionResult<{ targets: { path: string; token: string }[] }>
> {
  const parsed = uploadRequestSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: z.flattenError(parsed.error).formErrors[0] ?? parsed.error.issues[0]?.message ?? "Invalid files" }

  const ip = await getClientIp()
  if (!(await rateLimit(`upload:${ip}`, 10, 600))) return { ok: false, error: "Too many uploads — please wait a few minutes." }
  if (!isSupabaseConfigured || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) return { ok: false, error: "Photo uploads are unavailable right now — you can send photos on Viber instead." }

  const admin = createSupabaseAdminClient()
  const folder = `public/${randomUUID()}`
  const targets: { path: string; token: string }[] = []
  for (const [i, file] of parsed.data.files.entries()) {
    const safe = file.name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(-60) || "photo"
    const path = `${folder}/${i}-${safe}`
    const { data, error } = await admin.storage.from("uploads").createSignedUploadUrl(path)
    if (error || !data) {
      console.error("[createUploadTargets]", error)
      return { ok: false, error: "Couldn't prepare the upload. Please try again." }
    }
    targets.push({ path: data.path, token: data.token })
  }
  return { ok: true, data: { targets } }
}
