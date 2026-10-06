"use server"

import { after } from "next/server"
import { z } from "zod"
import { siteConfig } from "@/lib/config/site"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { bookingSchema, type BookingInput } from "@/lib/validation/booking"
import type { ActionResult } from "@/lib/validation/quote"
import { resolveCustomerId } from "@/server/customers"
import { notifyBookingCreated } from "@/server/notifications"
import { getClientIp, looksLikeBot, rateLimit } from "@/server/security/guards"

export async function submitBooking(input: BookingInput): Promise<ActionResult<{ reference: string; isBreakdown: boolean }>> {
  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }
  const v = parsed.data

  if (looksLikeBot(v)) return { ok: true, data: { reference: "BK-RECEIVED", isBreakdown: v.isBreakdown } }

  const ip = await getClientIp()
  if (!(await rateLimit(`booking:${ip}`, 4, 600))) {
    return { ok: false, error: `You've sent several bookings in a short time. Please wait a few minutes or call ${siteConfig.contact.phoneDisplay}.` }
  }

  const unavailable = v.isBreakdown
    ? `Online booking is unavailable right now. For a breakdown, please call ${siteConfig.contact.breakdownPhoneDisplay} immediately.`
    : `Online booking is temporarily unavailable. Please call ${siteConfig.contact.phoneDisplay} or message us on Viber.`
  if (!isSupabaseConfigured || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return { ok: false, error: unavailable }
  }

  try {
    const admin = createSupabaseAdminClient()
    const [{ data: branch }, service] = await Promise.all([
      admin.from("branches").select("id").eq("slug", v.branch).maybeSingle(),
      v.serviceSlug
        ? admin.from("services").select("id").eq("slug", v.serviceSlug).eq("is_active", true).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    const customerId = await resolveCustomerId(admin, v)

    const { data: booking, error } = await admin
      .from("service_bookings")
      .insert({
        customer_id: customerId,
        service_id: service.data?.id ?? null,
        branch_id: branch?.id ?? null,
        status: "pending",
        contact_name: v.name,
        contact_email: v.email,
        contact_phone: v.phone,
        company_name: v.company || null,
        truck_make: v.truckMake,
        truck_model: v.truckModel,
        truck_year: v.truckYear ?? null,
        plate_number: v.plateNumber ? v.plateNumber.toUpperCase() : null,
        mileage_km: v.mileageKm ?? null,
        issue_description: v.issue,
        is_breakdown: v.isBreakdown,
        photo_paths: v.photoPaths,
        preferred_date: v.preferredDate,
        preferred_time_slot: v.timeSlot,
        source: "website",
      })
      .select("id, reference")
      .single()
    if (error) throw error

    after(() => notifyBookingCreated(booking.id))
    return { ok: true, data: { reference: booking.reference, isBreakdown: v.isBreakdown } }
  } catch (e) {
    console.error("[submitBooking]", e)
    return { ok: false, error: unavailable }
  }
}
