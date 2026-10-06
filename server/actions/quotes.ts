"use server"

import { after } from "next/server"
import { z } from "zod"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { siteConfig } from "@/lib/config/site"
import {
  partQuoteSchema,
  truckQuoteSchema,
  type ActionResult,
  type PartQuoteInput,
  type TruckQuoteInput,
} from "@/lib/validation/quote"
import { resolveCustomerId } from "@/server/customers"
import { notifyQuoteCreated } from "@/server/notifications"
import { getClientIp, looksLikeBot, rateLimit } from "@/server/security/guards"

const UNAVAILABLE = `Online requests are temporarily unavailable. Please call ${siteConfig.contact.phoneDisplay} or message us on Viber — we'll take it from there.`
const RATE_LIMITED = "You've sent several requests in a short time. Please wait a few minutes, or call us directly."

function servicesReady() {
  return isSupabaseConfigured && Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function invalid(error: z.ZodError): ActionResult<never> {
  return { ok: false, error: "Please check the highlighted fields.", fieldErrors: z.flattenError(error).fieldErrors }
}

async function branchId(admin: ReturnType<typeof createSupabaseAdminClient>, slug?: string) {
  if (!slug) return null
  const { data } = await admin.from("branches").select("id").eq("slug", slug).maybeSingle()
  return data?.id ?? null
}

/* -------------------------------------------------------------------------- */
/*  Truck quote                                                               */
/* -------------------------------------------------------------------------- */

export async function submitTruckQuote(input: TruckQuoteInput): Promise<ActionResult<{ reference: string }>> {
  const parsed = truckQuoteSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const v = parsed.data

  // Bots get a convincing success so they don't retry with tweaks.
  if (looksLikeBot(v)) return { ok: true, data: { reference: "Q-RECEIVED" } }

  const ip = await getClientIp()
  if (!(await rateLimit(`quote:${ip}`, 5, 600))) return { ok: false, error: RATE_LIMITED }
  if (!servicesReady()) return { ok: false, error: UNAVAILABLE }

  try {
    const admin = createSupabaseAdminClient()
    const { data: truck } = await admin
      .from("trucks")
      .select("id, title, branch_id")
      .eq("slug", v.truckSlug)
      .eq("is_published", true)
      .maybeSingle()
    if (!truck) return { ok: false, error: "This unit is no longer listed. Please call us for similar stock." }

    const customerId = await resolveCustomerId(admin, v)
    const { data: quote, error } = await admin
      .from("quotes")
      .insert({
        quote_type: "truck",
        customer_id: customerId,
        truck_id: truck.id,
        branch_id: (await branchId(admin, v.branch || undefined)) ?? truck.branch_id,
        contact_name: v.name,
        contact_email: v.email,
        contact_phone: v.phone,
        company_name: v.company || null,
        message: v.message || null,
        quantity: 1,
        financing: v.financing ?? null,
        trade_in: v.tradeIn && (v.tradeIn.make || v.tradeIn.model) ? v.tradeIn : null,
        source: "website",
      })
      .select("id, reference")
      .single()
    if (error) throw error

    after(() => notifyQuoteCreated(quote.id))
    return { ok: true, data: { reference: quote.reference } }
  } catch (e) {
    console.error("[submitTruckQuote]", e)
    return { ok: false, error: UNAVAILABLE }
  }
}

/* -------------------------------------------------------------------------- */
/*  Parts quote                                                               */
/* -------------------------------------------------------------------------- */

export async function submitPartQuote(input: PartQuoteInput): Promise<ActionResult<{ reference: string }>> {
  const parsed = partQuoteSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const v = parsed.data

  if (looksLikeBot(v)) return { ok: true, data: { reference: "Q-RECEIVED" } }

  const ip = await getClientIp()
  if (!(await rateLimit(`quote:${ip}`, 5, 600))) return { ok: false, error: RATE_LIMITED }
  if (!servicesReady()) return { ok: false, error: UNAVAILABLE }

  try {
    const admin = createSupabaseAdminClient()
    const { data: part } = await admin
      .from("parts")
      .select("id, part_number, name")
      .eq("slug", v.partSlug)
      .eq("is_published", true)
      .maybeSingle()
    if (!part) return { ok: false, error: "This part is no longer listed. Please call our parts counter." }

    const vehicle = [v.truckModel && `Truck: ${v.truckModel}`, v.plateNumber && `Plate: ${v.plateNumber}`, v.vin && `VIN: ${v.vin}`]
      .filter(Boolean)
      .join(" · ")

    const customerId = await resolveCustomerId(admin, v)
    const { data: quote, error } = await admin
      .from("quotes")
      .insert({
        quote_type: "part",
        customer_id: customerId,
        part_id: part.id,
        branch_id: await branchId(admin, v.branch || undefined),
        contact_name: v.name,
        contact_email: v.email,
        contact_phone: v.phone,
        company_name: v.company || null,
        quantity: v.quantity,
        message: [vehicle, v.message].filter(Boolean).join("\n\n") || null,
        attachment_paths: v.photoPaths,
        source: "website",
      })
      .select("id, reference")
      .single()
    if (error) throw error

    after(() => notifyQuoteCreated(quote.id))
    return { ok: true, data: { reference: quote.reference } }
  } catch (e) {
    console.error("[submitPartQuote]", e)
    return { ok: false, error: UNAVAILABLE }
  }
}
