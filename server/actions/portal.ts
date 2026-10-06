"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { cancelBookingSchema, companySchema, fleetUnitSchema, mileageSchema, profileSchema, type FleetUnitInput } from "@/lib/validation/portal"
import type { ActionResult } from "@/lib/validation/quote"
import { getSession } from "@/server/auth"
import { demoMutations } from "@/server/demo/mutations"

/** DEMO MODE: run the in-memory equivalent instead of Supabase. */
async function demoSession() {
  const s = await getSession()
  return s?.isDemo ? s : null
}

/**
 * Customer self-service mutations. These use the user's own Supabase session,
 * so RLS + guard triggers decide what they can touch — never the service role.
 */

type Fail = { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> }
const invalid = (e: z.ZodError): Fail => ({ ok: false, error: "Please check the highlighted fields.", fieldErrors: z.flattenError(e).fieldErrors })
const blank = (v: string | undefined) => (v && v.length ? v : null)

async function context() {
  const session = await getSession()
  if (!session) redirect("/login?next=/account")
  if (!session.customer) throw new Error("No customer record for this account")
  return { session, customer: session.customer, supabase: await createSupabaseServerClient() }
}

function dbError(e: { code?: string; message: string } | null, fallback: string): Fail {
  if (e?.code === "23505") return { ok: false, error: "That plate number or VIN is already registered to another unit. Contact us if this is your truck." }
  if (e?.code === "42501") return { ok: false, error: "You don't have permission to do that." }
  console.error("[portal]", e)
  return { ok: false, error: fallback }
}

/* --------------------------------- Profile -------------------------------- */

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const demo = await demoSession()
  if (demo) {
    const r = demoMutations.updateProfile(demo, parsed.data)
    revalidatePath("/account", "layout")
    return r as ActionResult
  }
  const { session, customer, supabase } = await context()
  const v = parsed.data
  const [a, b] = await Promise.all([
    supabase.from("profiles").update({ full_name: v.fullName, phone: blank(v.phone) }).eq("id", session.userId),
    supabase.from("customers").update({ full_name: v.fullName, phone: blank(v.phone) }).eq("id", customer.id),
  ])
  if (a.error || b.error) return dbError(a.error ?? b.error, "Couldn't save your profile.")
  revalidatePath("/account", "layout")
  return { ok: true }
}

export async function saveCompany(input: z.input<typeof companySchema>): Promise<ActionResult> {
  const parsed = companySchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const demo = await demoSession()
  if (demo) {
    const r = demoMutations.saveCompany(demo, parsed.data)
    revalidatePath("/account", "layout")
    return r as ActionResult
  }
  const { session, customer, supabase } = await context()
  const v = parsed.data
  const row = {
    name: v.name,
    tin: blank(v.tin),
    industry: blank(v.industry),
    fleet_size: v.fleetSize ?? null,
    email: blank(v.email),
    phone: blank(v.phone),
    address: blank(v.address),
    city: blank(v.city),
    province: blank(v.province),
  }

  if (customer.companyId) {
    const { error } = await supabase.from("companies").update(row).eq("id", customer.companyId)
    if (error) return dbError(error, "Couldn't save company details.")
  } else {
    const { data, error } = await supabase.from("companies").insert({ ...row, created_by: session.userId }).select("id").single()
    if (error) return dbError(error, "Couldn't create the company.")
    const link = await supabase.from("customers").update({ company_id: data.id }).eq("id", customer.id)
    if (link.error) return dbError(link.error, "Couldn't link the company to your account.")
    // Existing fleet units become company units too
    await supabase.from("fleet_units").update({ company_id: data.id }).eq("customer_id", customer.id).is("company_id", null)
  }
  revalidatePath("/account", "layout")
  return { ok: true }
}

/* ---------------------------------- Fleet --------------------------------- */

export async function saveFleetUnit(input: FleetUnitInput): Promise<ActionResult<{ id: string }>> {
  const parsed = fleetUnitSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const v = parsed.data

  if (v.lastServiceMileageKm !== undefined && v.currentMileageKm !== undefined && v.lastServiceMileageKm > v.currentMileageKm) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: { lastServiceMileageKm: ["Can't be higher than the current odometer"] } }
  }
  const demo = await demoSession()
  if (demo) {
    const r = demoMutations.saveFleetUnit(demo, v)
    revalidatePath("/account", "layout")
    return r as ActionResult<{ id: string }>
  }
  const { customer, supabase } = await context()

  const row = {
    nickname: blank(v.nickname),
    make: v.make,
    model: v.model,
    year: v.year ?? null,
    plate_number: v.plateNumber ? v.plateNumber.toUpperCase() : null,
    vin: v.vin ? v.vin.toUpperCase() : null,
    engine_number: blank(v.engineNumber),
    color: blank(v.color),
    purchase_date: blank(v.purchaseDate),
    current_mileage_km: v.currentMileageKm ?? 0,
    mileage_updated_at: new Date().toISOString(),
    last_service_date: blank(v.lastServiceDate),
    last_service_mileage_km: v.lastServiceMileageKm ?? null,
    service_interval_km: v.serviceIntervalKm ?? 10000,
    service_interval_months: v.serviceIntervalMonths ?? 6,
    reminders_enabled: v.remindersEnabled,
    notes: blank(v.notes),
  }

  if (v.id) {
    const { error } = await supabase.from("fleet_units").update(row).eq("id", v.id)
    if (error) return dbError(error, "Couldn't save this truck.")
    revalidatePath("/account", "layout")
    return { ok: true, data: { id: v.id } }
  }
  const { data, error } = await supabase
    .from("fleet_units")
    .insert({ ...row, customer_id: customer.id, company_id: customer.companyId })
    .select("id")
    .single()
  if (error) return dbError(error, "Couldn't add this truck.")
  revalidatePath("/account", "layout")
  return { ok: true, data: { id: data.id } }
}

export async function updateMileage(input: z.input<typeof mileageSchema>): Promise<ActionResult> {
  const parsed = mileageSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid odometer" }
  const demo = await demoSession()
  if (demo) {
    const r = demoMutations.updateMileage(demo, parsed.data.id, parsed.data.km)
    revalidatePath("/account", "layout")
    return r as ActionResult
  }
  const { supabase } = await context()
  const { data: unit } = await supabase.from("fleet_units").select("current_mileage_km").eq("id", parsed.data.id).maybeSingle()
  if (!unit) return { ok: false, error: "Truck not found." }
  if (parsed.data.km < unit.current_mileage_km) return { ok: false, error: `Odometer can't go below the last reading (${unit.current_mileage_km.toLocaleString("en-PH")} km).` }
  const { error } = await supabase
    .from("fleet_units")
    .update({ current_mileage_km: parsed.data.km, mileage_updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
  if (error) return dbError(error, "Couldn't update the odometer.")
  revalidatePath("/account", "layout")
  return { ok: true }
}

/** Form action (bound with the unit id). Redirects either way. */
export async function deleteFleetUnit(id: string): Promise<void> {
  if (!z.string().uuid().safeParse(id).success) redirect("/account/fleet")
  const demo = await demoSession()
  if (demo) {
    demoMutations.deleteFleetUnit(demo, id)
    revalidatePath("/account", "layout")
    redirect("/account/fleet")
  }
  const { supabase } = await context()
  const { error } = await supabase.from("fleet_units").delete().eq("id", id)
  if (error) {
    dbError(error, "")
    redirect(`/account/fleet/${id}?error=delete`)
  }
  revalidatePath("/account", "layout")
  redirect("/account/fleet")
}

/* -------------------------------- Bookings -------------------------------- */

export async function cancelBooking(input: z.input<typeof cancelBookingSchema>): Promise<ActionResult> {
  const parsed = cancelBookingSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid request" }
  const demo = await demoSession()
  if (demo) {
    const r = demoMutations.cancelBooking(demo, parsed.data.id, parsed.data.reason ?? "")
    revalidatePath("/account", "layout")
    return r as ActionResult
  }
  const { supabase } = await context()
  // RLS + bookings_guard: customers may only flip status → cancelled (+ reason) while pending/confirmed/rescheduled.
  const { data, error } = await supabase
    .from("service_bookings")
    .update({ status: "cancelled", cancel_reason: parsed.data.reason || "Cancelled by customer" })
    .eq("id", parsed.data.id)
    .select("id")
  if (error) return dbError(error, "Couldn't cancel this booking.")
  if (!data?.length) return { ok: false, error: "This booking can no longer be cancelled online — please call the branch." }
  revalidatePath("/account", "layout")
  return { ok: true }
}

/* ------------------------------ Notifications ----------------------------- */

export async function markNotificationsRead(ids?: string[]): Promise<ActionResult> {
  const demo = await demoSession()
  if (demo) {
    demoMutations.markNotificationsRead(demo, ids)
    revalidatePath("/account", "layout")
    return { ok: true }
  }
  const { session, supabase } = await context()
  let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", session.userId).is("read_at", null)
  if (ids?.length) q = q.in("id", ids.filter((i) => z.string().uuid().safeParse(i).success))
  const { error } = await q
  if (error) return dbError(error, "Couldn't update notifications.")
  revalidatePath("/account", "layout")
  return { ok: true }
}
