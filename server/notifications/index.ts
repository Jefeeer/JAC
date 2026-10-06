import "server-only"

import { branches } from "@/lib/config/branches"
import { siteConfig } from "@/lib/config/site"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { FinancingEstimate, TradeInDetails } from "@/lib/validation/quote"
import type { JobStatus } from "@/types/domain"
import { sendEmail, staffRecipients } from "@/server/email/send"
import {
  TIME_SLOT_LABELS,
  bookingNewStaff,
  bookingReceivedCustomer,
  bookingStatusCustomer,
  jobStatusCustomer,
  quoteNewStaff,
  quoteReceivedCustomer,
  type BookingEmailData,
  type QuoteEmailData,
} from "@/server/email/templates"
import { sendSms } from "@/server/sms"

/**
 * Notification fan-out (email + optional SMS). In-app notifications are
 * written by database triggers, so they also fire for changes made outside
 * the app. Every function here is best-effort and never throws.
 */

const branchBySlug = (slug: string | null | undefined) => branches.find((b) => b.slug === slug) ?? null

function safe<T extends unknown[]>(name: string, fn: (...args: T) => Promise<void>) {
  return async (...args: T) => {
    try {
      await fn(...args)
    } catch (e) {
      console.error(`[notify] ${name} failed`, e)
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Quotes                                                                    */
/* -------------------------------------------------------------------------- */

export const notifyQuoteCreated = safe("notifyQuoteCreated", async (quoteId: string) => {
  const admin = createSupabaseAdminClient()
  const { data: q, error } = await admin
    .from("quotes")
    .select(
      "id, reference, quote_type, contact_name, contact_email, contact_phone, company_name, quantity, message, financing, trade_in, attachment_paths, truck:trucks(title, stock_number), part:parts(name, part_number), branch:branches(slug)",
    )
    .eq("id", quoteId)
    .single()
  if (error || !q) throw error ?? new Error("quote not found")

  const truck = q.truck as unknown as { title: string; stock_number: string | null } | null
  const part = q.part as unknown as { name: string; part_number: string } | null
  const data: QuoteEmailData = {
    id: q.id,
    reference: q.reference,
    type: q.quote_type,
    contactName: q.contact_name,
    contactEmail: q.contact_email,
    contactPhone: q.contact_phone,
    company: q.company_name,
    subjectLine: truck ? truck.title : part ? `${part.part_number} · ${part.name}` : "General enquiry",
    quantity: q.quantity,
    message: q.message,
    financing: q.financing as FinancingEstimate | null,
    tradeIn: q.trade_in as TradeInDetails | null,
    branch: branchBySlug((q.branch as unknown as { slug: string } | null)?.slug),
    attachments: (q.attachment_paths as string[] | null)?.length ?? 0,
  }

  const team = q.quote_type === "part" ? "parts" : q.quote_type === "service" ? "service" : "sales"
  await Promise.all([
    sendEmail(quoteReceivedCustomer(data), {
      to: data.contactEmail,
      replyTo: siteConfig.contact.email,
      idempotencyKey: `quote-created-customer-${q.id}`,
      tags: { kind: "quote_received" },
    }),
    sendEmail(quoteNewStaff(data), {
      to: staffRecipients(team),
      replyTo: data.contactEmail,
      idempotencyKey: `quote-created-staff-${q.id}`,
      tags: { kind: "quote_staff" },
    }),
  ])
})

/* -------------------------------------------------------------------------- */
/*  Bookings                                                                  */
/* -------------------------------------------------------------------------- */

async function loadBooking(bookingId: string): Promise<BookingEmailData> {
  const admin = createSupabaseAdminClient()
  const { data: b, error } = await admin
    .from("service_bookings")
    .select(
      "id, reference, status, contact_name, contact_email, contact_phone, company_name, truck_make, truck_model, truck_year, plate_number, mileage_km, issue_description, is_breakdown, preferred_date, preferred_time_slot, scheduled_at, cancel_reason, photo_paths, service:services(name), branch:branches(slug)",
    )
    .eq("id", bookingId)
    .single()
  if (error || !b) throw error ?? new Error("booking not found")
  return {
    id: b.id,
    reference: b.reference,
    status: b.status,
    contactName: b.contact_name,
    contactEmail: b.contact_email,
    contactPhone: b.contact_phone,
    company: b.company_name,
    truckMake: b.truck_make,
    truckModel: b.truck_model,
    truckYear: b.truck_year,
    plateNumber: b.plate_number,
    mileageKm: b.mileage_km,
    serviceName: (b.service as unknown as { name: string } | null)?.name ?? null,
    issue: b.issue_description,
    isBreakdown: b.is_breakdown,
    preferredDate: b.preferred_date,
    timeSlot: b.preferred_time_slot,
    scheduledAt: b.scheduled_at,
    cancelReason: b.cancel_reason,
    branch: branchBySlug((b.branch as unknown as { slug: string } | null)?.slug),
    photos: (b.photo_paths as string[] | null)?.length ?? 0,
  }
}

export const notifyBookingCreated = safe("notifyBookingCreated", async (bookingId: string) => {
  const b = await loadBooking(bookingId)
  await Promise.all([
    b.contactEmail
      ? sendEmail(bookingReceivedCustomer(b), {
          to: b.contactEmail,
          replyTo: siteConfig.contact.email,
          idempotencyKey: `booking-created-customer-${b.id}`,
          tags: { kind: "booking_received" },
        })
      : Promise.resolve(),
    sendEmail(bookingNewStaff(b), {
      to: staffRecipients("service"),
      replyTo: b.contactEmail ?? undefined,
      idempotencyKey: `booking-created-staff-${b.id}`,
      tags: { kind: b.isBreakdown ? "booking_breakdown" : "booking_staff" },
    }),
    b.isBreakdown
      ? sendSms(b.contactPhone, `JAC Motors: breakdown request ${b.reference} received. Our team will call you shortly. Urgent? Call ${siteConfig.contact.breakdownPhoneDisplay}.`)
      : Promise.resolve(),
  ])
})

export const notifyBookingStatus = safe("notifyBookingStatus", async (bookingId: string, status: string) => {
  if (!["confirmed", "rescheduled", "cancelled"].includes(status)) return
  const b = await loadBooking(bookingId)
  if (b.status !== status) return // stale webhook delivery
  const stamp = b.scheduledAt ?? b.preferredDate
  await Promise.all([
    b.contactEmail
      ? sendEmail(bookingStatusCustomer(b), {
          to: b.contactEmail,
          replyTo: siteConfig.contact.email,
          idempotencyKey: `booking-${status}-${b.id}-${stamp}`,
          tags: { kind: `booking_${status}` },
        })
      : Promise.resolve(),
    status !== "cancelled"
      ? sendSms(
          b.contactPhone,
          `JAC Motors: ${b.reference} ${status}. ${
            b.scheduledAt
              ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(b.scheduledAt))
              : `${b.preferredDate} ${TIME_SLOT_LABELS[b.timeSlot] ?? ""}`
          } at ${b.branch ? b.branch.name : "your branch"}.`,
        )
      : Promise.resolve(),
  ])
})

/* -------------------------------------------------------------------------- */
/*  Job orders                                                                */
/* -------------------------------------------------------------------------- */

export const notifyJobStatus = safe("notifyJobStatus", async (jobId: string, status: JobStatus) => {
  const admin = createSupabaseAdminClient()
  const { data: j, error } = await admin
    .from("job_orders")
    .select("id, reference, status, truck_model, plate_number, customer_notes, diagnosis, grand_total, customer:customers(full_name, email, phone), branch:branches(slug)")
    .eq("id", jobId)
    .single()
  if (error || !j) throw error ?? new Error("job not found")
  if (j.status !== status) return // stale webhook delivery

  const customer = j.customer as unknown as { full_name: string; email: string | null; phone: string | null } | null
  if (!customer) return

  const email = jobStatusCustomer({
    id: j.id,
    reference: j.reference,
    status: j.status,
    customerName: customer.full_name,
    truckModel: j.truck_model,
    plateNumber: j.plate_number,
    customerNotes: j.customer_notes,
    diagnosis: j.status === "diagnosing" || j.status === "awaiting_parts" ? j.diagnosis : null,
    grandTotal: j.grand_total === null ? null : Number(j.grand_total),
    branch: branchBySlug((j.branch as unknown as { slug: string } | null)?.slug),
  })

  await Promise.all([
    customer.email
      ? sendEmail(email, {
          to: customer.email,
          replyTo: siteConfig.contact.email,
          idempotencyKey: `job-${j.id}-${status}`,
          tags: { kind: `job_${status}` },
        })
      : Promise.resolve(),
    status === "ready"
      ? sendSms(customer.phone, `JAC Motors: your JAC ${j.truck_model}${j.plate_number ? ` (${j.plate_number})` : ""} is ready for release. Ref ${j.reference}.`)
      : Promise.resolve(),
  ])
})
