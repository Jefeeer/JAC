import "server-only"

import { Resend } from "resend"
import type { RenderedEmail } from "./templates"

let client: Resend | null = null
function resend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  client ??= new Resend(key)
  return client
}

export type SendResult = { ok: true; id?: string; skipped?: boolean } | { ok: false; error: string }

/**
 * Send one email. Never throws — notification failures must not break the
 * customer-facing action that triggered them.
 *
 * `idempotencyKey` makes retries (e.g. a re-delivered webhook) safe: Resend
 * drops duplicates with the same key for 24 h.
 */
export async function sendEmail(
  email: RenderedEmail,
  opts: { to: string | string[]; replyTo?: string; idempotencyKey?: string; tags?: Record<string, string> },
): Promise<SendResult> {
  const to = (Array.isArray(opts.to) ? opts.to : [opts.to]).filter(Boolean)
  if (!to.length) return { ok: true, skipped: true }

  const api = resend()
  if (!api) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] → ${to.join(", ")} · ${email.subject}`)
    } else {
      console.warn("[email] RESEND_API_KEY not set — email skipped:", email.subject)
    }
    return { ok: true, skipped: true }
  }

  try {
    const { data, error } = await api.emails.send(
      {
        from: process.env.EMAIL_FROM || "JAC Motors <no-reply@jacmotors.ph>",
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        replyTo: opts.replyTo,
        tags: opts.tags ? Object.entries(opts.tags).map(([name, value]) => ({ name, value: value.replace(/[^\w-]/g, "_") })) : undefined,
      },
      opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined,
    )
    if (error) {
      console.error("[email] send failed", email.subject, error)
      return { ok: false, error: error.message }
    }
    return { ok: true, id: data?.id }
  } catch (e) {
    console.error("[email] send threw", email.subject, e)
    return { ok: false, error: String(e) }
  }
}

/** Staff inboxes per team, falling back to STAFF_NOTIFY_EMAILS. */
export function staffRecipients(team: "sales" | "parts" | "service"): string[] {
  const specific = {
    sales: process.env.STAFF_NOTIFY_SALES,
    parts: process.env.STAFF_NOTIFY_PARTS,
    service: process.env.STAFF_NOTIFY_SERVICE,
  }[team]
  return (specific || process.env.STAFF_NOTIFY_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /.+@.+\..+/.test(s))
}
