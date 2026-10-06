import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type Contact = { name: string; email: string; phone: string; company?: string }

/**
 * Resolve the customer record for a form submission.
 *
 * - Signed-in user → their own linked customer row.
 * - Anonymous → reuse an *unlinked* row with the same email, else create one.
 *   We never attach anonymous submissions to a registered account (anyone can
 *   type an email). When the owner signs up / logs in via magic link, the
 *   `handle_new_user` trigger merges unlinked rows into their account.
 */
export async function resolveCustomerId(admin: SupabaseClient, contact: Contact): Promise<string> {
  const userId = await currentUserId()
  if (userId) {
    const { data } = await admin.from("customers").select("id").eq("profile_id", userId).maybeSingle()
    if (data) return data.id
  }

  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .is("profile_id", null)
    .ilike("email", escapeLike(contact.email)) // case-insensitive exact match
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await admin
    .from("customers")
    .insert({
      full_name: contact.name,
      email: contact.email,
      phone: contact.phone,
      notes: contact.company ? `Company (from web form): ${contact.company}` : null,
    })
    .select("id")
    .single()
  if (error) throw error
  return created.id
}

async function currentUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

/** Escape LIKE wildcards so `ilike` acts as a case-insensitive equality. */
const escapeLike = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`)
