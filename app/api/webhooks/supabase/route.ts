import { timingSafeEqual } from "node:crypto"
import { after } from "next/server"
import { notifyBookingStatus, notifyJobStatus } from "@/server/notifications"
import type { JobStatus } from "@/types/domain"

/**
 * Receives Supabase Database Webhooks (UPDATE on service_bookings and
 * job_orders) and fans out customer emails/SMS. Configure in the Supabase
 * dashboard → Database → Webhooks with header `x-webhook-secret`
 * = SUPABASE_WEBHOOK_SECRET. See README "Notifications".
 *
 * Status changes from anywhere (admin UI, mechanics, SQL) trigger the same
 * emails. Resend idempotency keys make re-deliveries harmless.
 */

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE"
  table: string
  schema: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}

function authorized(req: Request) {
  const expected = process.env.SUPABASE_WEBHOOK_SECRET
  const got = req.headers.get("x-webhook-secret")
  if (!expected || !got) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(got)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 })

  let payload: WebhookPayload
  try {
    payload = (await req.json()) as WebhookPayload
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 })
  }

  const { type, table, schema, record, old_record } = payload
  if (schema !== "public" || type !== "UPDATE" || !record) return Response.json({ ignored: true })

  const id = typeof record.id === "string" ? record.id : null
  const status = typeof record.status === "string" ? record.status : null
  const changed = status !== null && status !== old_record?.status
  // A reschedule can keep status "rescheduled" but move the time — treat as a change.
  const moved = table === "service_bookings" && status === "rescheduled" && record.scheduled_at !== old_record?.scheduled_at

  if (!id || !(changed || moved)) return Response.json({ ignored: true })

  if (table === "service_bookings") {
    after(() => notifyBookingStatus(id, status!))
  } else if (table === "job_orders") {
    after(() => notifyJobStatus(id, status as JobStatus))
  } else {
    return Response.json({ ignored: true })
  }
  return Response.json({ queued: true })
}
