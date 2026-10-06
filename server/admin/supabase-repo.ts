import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { SessionContext } from "@/server/auth"
import { sanitizeSearch } from "@/lib/validation/catalog"
import { TRUCK_SELECT, mapPart, mapTruck } from "@/server/queries/catalog"
import type { FleetUnit } from "@/server/queries/portal"
import type { JobStatus, UserRole } from "@/types/domain"
import type {
  AdminBooking,
  AdminBookingRow,
  AdminCustomer,
  AdminCustomerRow,
  AdminJob,
  AdminJobRow,
  AdminQuote,
  AdminQuoteRow,
  AdminRepo,
  AdminStats,
  Fail,
  StaffNote,
  StaffRef,
} from "./types"

/**
 * Supabase admin repository. Every call runs with the staff member's own
 * session — RLS + guard triggers decide what each role may read/write.
 */

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))
const fail = (e: { message?: string; code?: string } | null | undefined, fallback: string): Fail => {
  if (e?.code === "23505") return { ok: false, error: "That value is already in use (duplicate slug, stock or part number)." }
  if (e?.code === "42501") return { ok: false, error: "Your role isn't allowed to do that." }
  if (e) console.error("[admin]", e)
  return { ok: false, error: e?.message && e.message.length < 140 ? e.message : fallback }
}
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)

type Prof = { id: string; full_name: string | null; role: UserRole } | null
const ref = (p: Prof): StaffRef | null => (p ? { id: p.id, name: p.full_name ?? "Staff", role: p.role } : null)

const QUOTE_ROW =
  "id, reference, quote_type, status, created_at, contact_name, contact_email, contact_phone, company_name, total, branch:branches(slug), attachment_paths, truck:trucks(title, slug), part:parts(name, part_number, slug), assigned:profiles!quotes_assigned_to_fkey(id, full_name, role)"
const BOOKING_ROW =
  "id, reference, status, created_at, contact_name, contact_phone, contact_email, company_name, truck_make, truck_model, plate_number, is_breakdown, preferred_date, preferred_time_slot, scheduled_at, service:services(name), branch:branches(slug), job:job_orders(id)"
const JOB_ROW =
  "id, reference, status, truck_make, truck_model, plate_number, received_at, promised_at, grand_total, complaint, branch:branches(slug), customer:customers(full_name, email, phone), mechanic:profiles!job_orders_mechanic_id_fkey(id, full_name, role), advisor:profiles!job_orders_service_advisor_id_fkey(id, full_name, role)"

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST embed shapes */
const quoteRow = (r: any): AdminQuoteRow => ({
  id: r.id,
  reference: r.reference,
  type: r.quote_type,
  status: r.status,
  createdAt: r.created_at,
  contactName: r.contact_name,
  contactEmail: r.contact_email,
  contactPhone: r.contact_phone,
  company: r.company_name,
  subject: r.truck?.title ?? (r.part ? `${r.part.part_number} · ${r.part.name}` : "Service enquiry"),
  total: n(r.total),
  assignedTo: ref(r.assigned),
  branchSlug: r.branch?.slug ?? null,
  attachments: r.attachment_paths?.length ?? 0,
})
const bookingRow = (r: any): AdminBookingRow => ({
  id: r.id,
  reference: r.reference,
  status: r.status,
  createdAt: r.created_at,
  contactName: r.contact_name,
  contactPhone: r.contact_phone,
  contactEmail: r.contact_email,
  company: r.company_name,
  truckLabel: `${r.truck_make} ${r.truck_model}`,
  plateNumber: r.plate_number,
  serviceName: r.service?.name ?? null,
  isBreakdown: r.is_breakdown,
  preferredDate: r.preferred_date,
  timeSlot: r.preferred_time_slot,
  scheduledAt: r.scheduled_at,
  branchSlug: r.branch?.slug ?? null,
  jobId: (Array.isArray(r.job) ? r.job[0]?.id : r.job?.id) ?? null,
})
const jobRow = (r: any): AdminJobRow => ({
  id: r.id,
  reference: r.reference,
  status: r.status,
  truckLabel: `${r.truck_make} ${r.truck_model}`,
  plateNumber: r.plate_number,
  customerName: r.customer?.full_name ?? "Walk-in",
  branchSlug: r.branch?.slug ?? null,
  mechanic: ref(r.mechanic),
  advisor: ref(r.advisor),
  receivedAt: r.received_at,
  promisedAt: r.promised_at,
  grandTotal: n(r.grand_total),
  complaint: r.complaint,
})
const noteRows = (rows: any[] | null): StaffNote[] =>
  (rows ?? []).map((x) => ({ id: x.id, body: x.body, author: x.author?.full_name ?? "Staff", at: x.created_at }))
/* eslint-enable @typescript-eslint/no-explicit-any */

export function supabaseAdminRepo(session: SessionContext, sb: SupabaseClient): AdminRepo {
  const role = session.profile.role
  const notes = async (type: string, id: string) =>
    noteRows((await sb.from("staff_notes").select("id, body, created_at, author:profiles(full_name)").eq("entity_type", type).eq("entity_id", id).order("created_at", { ascending: false })).data)
  const signed = async (bucket: string, paths: string[]) => {
    if (!paths.length) return []
    const { data } = await sb.storage.from(bucket).createSignedUrls(paths, 60 * 60)
    return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[]
  }

  return {
    async stats(): Promise<AdminStats> {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date())
      const month = today.slice(0, 7)
      const start = new Date(`${month}-01T00:00:00+08:00`)
      start.setUTCMonth(start.getUTCMonth() - 5)
      const head = { count: "exact" as const, head: true }
      const [pub, total, avail, openQ, newQ, active, ready, pending, breakdown, todays, invoices, low, out] = await Promise.all([
        sb.from("trucks").select("id", head).eq("is_published", true),
        sb.from("trucks").select("id", head),
        sb.from("trucks").select("id", head).eq("is_published", true).eq("availability", "available"),
        sb.from("quotes").select("id", head).in("status", ["new", "in_review", "quoted"]),
        sb.from("quotes").select("id", head).eq("status", "new"),
        sb.from("job_orders").select("id", head).not("status", "in", "(released,cancelled)"),
        sb.from("job_orders").select("id", head).eq("status", "ready"),
        sb.from("service_bookings").select("id", head).eq("status", "pending"),
        sb.from("service_bookings").select("id", head).eq("status", "pending").eq("is_breakdown", true),
        sb.from("service_bookings").select("id", head).in("status", ["confirmed", "rescheduled"]).eq("preferred_date", today),
        sb.from("invoices").select("total, issued_at").not("status", "in", "(draft,void)").gte("issued_at", start.toISOString()),
        sb.from("parts").select("id", head).eq("stock_status", "low_stock"),
        sb.from("parts").select("id", head).eq("stock_status", "out_of_stock"),
      ])
      const inv = (invoices.data ?? []) as { total: number; issued_at: string }[]
      const ym = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" }).format(new Date(iso)).slice(0, 7)
      const trend: { month: string; total: number }[] = []
      for (let k = 5; k >= 0; k--) {
        const d = new Date(`${month}-01T00:00:00Z`)
        d.setUTCMonth(d.getUTCMonth() - k)
        const m = d.toISOString().slice(0, 7)
        trend.push({ month: m, total: Math.round(inv.filter((i) => ym(i.issued_at) === m).reduce((s, i) => s + n(i.total), 0)) })
      }
      return {
        trucksPublished: pub.count ?? 0,
        trucksTotal: total.count ?? 0,
        trucksAvailable: avail.count ?? 0,
        openQuotes: openQ.count ?? 0,
        newQuotes: newQ.count ?? 0,
        jobsActive: active.count ?? 0,
        jobsReady: ready.count ?? 0,
        pendingBookings: pending.count ?? 0,
        breakdownBookings: breakdown.count ?? 0,
        todaysBookings: todays.count ?? 0,
        monthSales: trend.at(-1)?.total ?? 0,
        monthInvoices: inv.filter((i) => ym(i.issued_at) === month).length,
        lowStock: low.count ?? 0,
        outOfStock: out.count ?? 0,
        salesTrend: trend,
      }
    },

    async staff(r) {
      let q = sb.from("profiles").select("id, full_name, role").neq("role", "customer").eq("is_active", true).order("full_name")
      if (r) q = q.eq("role", r)
      const { data } = await q
      return (data ?? []).map((p) => ({ id: p.id, name: p.full_name ?? "Staff", role: p.role }))
    },

    async notifications(limit = 50) {
      const { data } = await sb.from("notifications").select("id, type, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(limit)
      return (data ?? []).map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, link: r.link, readAt: r.read_at, createdAt: r.created_at }))
    },
    async unreadCount() {
      const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)
      return count ?? 0
    },
    async markNotificationsRead() {
      // RLS lets recipients mark their own rows; role broadcasts stay as a shared feed.
      await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", session.userId).is("read_at", null)
    },

    /* --------------------------------- trucks --------------------------------- */

    async listTrucks({ q: raw, status }) {
      const q = sanitizeSearch(raw)
      let query = sb.from("trucks").select(TRUCK_SELECT).order("created_at", { ascending: false }).limit(500)
      if (q) query = query.or(`title.ilike.%${q}%,model.ilike.%${q}%,stock_number.ilike.%${q}%`)
      if (status === "published") query = query.eq("is_published", true)
      if (status === "draft") query = query.eq("is_published", false)
      if (status === "sold") query = query.eq("availability", "sold")
      const { data, error } = await query
      if (error) throw error
      return (data as unknown as Parameters<typeof mapTruck>[0][]).map(mapTruck)
    },
    async getTruck(id) {
      const { data } = await sb.from("trucks").select(TRUCK_SELECT).eq("id", id).maybeSingle()
      return data ? mapTruck(data as unknown as Parameters<typeof mapTruck>[0]) : null
    },
    async saveTruck(t) {
      const slug = t.slug ? slugify(t.slug) : slugify(`${t.title}-${t.year}`)
      const { data: branch } = t.branchSlug ? await sb.from("branches").select("id").eq("slug", t.branchSlug).maybeSingle() : { data: null }
      const row = {
        slug,
        stock_number: t.stockNumber || null,
        title: t.title,
        brand: t.brand,
        model: t.model,
        series: t.series,
        variant: t.variant,
        body_type: t.bodyType,
        year: t.year,
        condition: t.condition,
        availability: t.availability,
        payload_tons: t.payloadTons,
        gvw_kg: t.gvwKg,
        wheel_config: t.wheelConfig,
        engine: t.engine,
        displacement_cc: t.displacementCc,
        horsepower: t.horsepower,
        torque_nm: t.torqueNm,
        transmission: t.transmission,
        fuel_type: t.fuelType,
        emission_standard: t.emissionStandard,
        wheelbase_mm: t.wheelbaseMm,
        mileage_km: t.mileageKm,
        color: t.color,
        price: t.price,
        price_on_request: t.priceOnRequest,
        summary: t.summary,
        description: t.description,
        features: t.features,
        specs: t.specs,
        branch_id: branch?.id ?? null,
        is_featured: t.isFeatured,
      }
      const res = t.id
        ? await sb.from("trucks").update(row).eq("id", t.id).select("id").single()
        : await sb.from("trucks").insert({ ...row, is_published: false, created_by: session.userId }).select("id").single()
      if (res.error) return fail(res.error, "Couldn't save the truck.")
      return { ok: true, data: { id: res.data.id, slug } }
    },
    async setTruckPublished(id, published) {
      if (published) {
        const { count } = await sb.from("truck_images").select("id", { count: "exact", head: true }).eq("truck_id", id)
        if (!count) return { ok: false, error: "Add at least one photo before publishing." }
      }
      const { error } = await sb.from("trucks").update({ is_published: published }).eq("id", id)
      return error ? fail(error, "Couldn't update.") : { ok: true }
    },
    async deleteTruck(id) {
      const { error } = await sb.from("trucks").delete().eq("id", id)
      return error ? fail(error, "Couldn't delete.") : { ok: true }
    },
    async addTruckImage(truckId, img) {
      const { count } = await sb.from("truck_images").select("id", { count: "exact", head: true }).eq("truck_id", truckId)
      const { error } = await sb.from("truck_images").insert({
        truck_id: truckId,
        url: img.url,
        storage_path: img.storagePath ?? null,
        alt: img.alt,
        width: img.width ?? null,
        height: img.height ?? null,
        sort_order: count ?? 0,
        is_primary: !count,
      })
      return error ? fail(error, "Couldn't add the photo.") : { ok: true }
    },
    async removeTruckImage(truckId, url) {
      const { data } = await sb.from("truck_images").select("id, storage_path, is_primary").eq("truck_id", truckId).eq("url", url).maybeSingle()
      if (!data) return { ok: true }
      const { error } = await sb.from("truck_images").delete().eq("id", data.id)
      if (error) return fail(error, "Couldn't remove the photo.")
      if (data.storage_path) await sb.storage.from("truck-images").remove([data.storage_path])
      if (data.is_primary) {
        const { data: next } = await sb.from("truck_images").select("id").eq("truck_id", truckId).order("sort_order").limit(1).maybeSingle()
        if (next) await sb.from("truck_images").update({ is_primary: true }).eq("id", next.id)
        else await sb.from("trucks").update({ is_published: false }).eq("id", truckId)
      }
      return { ok: true }
    },
    async setPrimaryTruckImage(truckId, url) {
      await sb.from("truck_images").update({ is_primary: false }).eq("truck_id", truckId)
      const { error } = await sb.from("truck_images").update({ is_primary: true }).eq("truck_id", truckId).eq("url", url)
      return error ? fail(error, "Couldn't set the cover photo.") : { ok: true }
    },

    /* ---------------------------------- parts --------------------------------- */

    async listParts({ q: raw, stock, category }) {
      const q = sanitizeSearch(raw)
      const select = `id, slug, part_number, oem_number, name, brand, summary, description, specs, price, price_on_request, currency, unit, stock_qty, reorder_level, stock_status, lead_time_days, weight_kg, image_url, is_published, compat:part_compatibility(model, series, engine, year_from, year_to, notes), ${category ? "category:part_categories!inner(slug, name)" : "category:part_categories(slug, name)"}`
      let query = sb.from("parts").select(select).order("part_number").limit(1000)
      if (q) query = query.or(`part_number.ilike.%${q}%,oem_number.ilike.%${q}%,name.ilike.%${q}%`)
      if (stock === "out") query = query.eq("stock_status", "out_of_stock")
      if (stock === "low") query = query.neq("stock_status", "in_stock")
      if (category) query = query.eq("category.slug", category)
      const { data, error } = await query
      if (error) throw error
      return (data as unknown as Parameters<typeof mapPart>[0][]).map(mapPart)
    },
    async getPart(id) {
      const { data } = await sb
        .from("parts")
        .select(
          "id, slug, part_number, oem_number, name, brand, summary, description, specs, price, price_on_request, currency, unit, stock_qty, reorder_level, stock_status, lead_time_days, weight_kg, image_url, is_published, compat:part_compatibility(model, series, engine, year_from, year_to, notes), category:part_categories(slug, name)",
        )
        .eq("id", id)
        .maybeSingle()
      return data ? mapPart(data as unknown as Parameters<typeof mapPart>[0]) : null
    },
    async savePart(p) {
      const slug = p.slug ? slugify(p.slug) : slugify(`${p.name}-${p.partNumber}`)
      const { data: cat } = await sb.from("part_categories").select("id").eq("slug", p.categorySlug).maybeSingle()
      const row = {
        slug,
        part_number: p.partNumber,
        oem_number: p.oemNumber,
        name: p.name,
        brand: p.brand,
        category_id: cat?.id ?? null,
        summary: p.summary,
        description: p.description,
        specs: p.specs,
        price: p.price,
        price_on_request: p.priceOnRequest,
        unit: p.unit,
        stock_qty: p.stockQty,
        reorder_level: p.reorderLevel,
        lead_time_days: p.leadTimeDays,
        weight_kg: p.weightKg,
        image_url: p.imageUrl,
        is_published: p.isPublished,
      }
      const res = p.id
        ? await sb.from("parts").update(row).eq("id", p.id).select("id").single()
        : await sb.from("parts").insert({ ...row, created_by: session.userId }).select("id").single()
      if (res.error) return fail(res.error, "Couldn't save the part.")
      const id = res.data.id
      // replace compatibility rows
      await sb.from("part_compatibility").delete().eq("part_id", id)
      if (p.compatibility.length) {
        const { error } = await sb.from("part_compatibility").insert(
          p.compatibility.map((c) => ({ part_id: id, model: c.model, series: c.series ?? null, engine: c.engine ?? null, year_from: c.yearFrom ?? null, year_to: c.yearTo ?? null, notes: c.notes ?? null })),
        )
        if (error) return fail(error, "Saved, but compatibility couldn't be updated.")
      }
      return { ok: true, data: { id, slug } }
    },
    async setPartStock(id, qty) {
      const { error } = await sb.from("parts").update({ stock_qty: Math.max(0, Math.round(qty)) }).eq("id", id)
      return error ? fail(error, "Couldn't update stock.") : { ok: true }
    },
    async setPartPublished(id, published) {
      const { error } = await sb.from("parts").update({ is_published: published }).eq("id", id)
      return error ? fail(error, "Couldn't update.") : { ok: true }
    },
    async importParts(rows) {
      let inserted = 0
      let updated = 0
      for (const r of rows) {
        const { data: existing } = await sb.from("parts").select("id, slug").eq("part_number", r.partNumber).maybeSingle()
        const res = await this.savePart({ ...r, id: existing?.id, slug: existing?.slug ?? r.slug })
        if (!res.ok) return res
        if (existing) updated++
        else inserted++
      }
      return { ok: true, data: { inserted, updated } }
    },

    /* ---------------------------------- quotes -------------------------------- */

    async listQuotes({ status, type, q: raw }) {
      const q = sanitizeSearch(raw)
      let query = sb.from("quotes").select(QUOTE_ROW).order("created_at", { ascending: false }).limit(300)
      if (status === "open") query = query.in("status", ["new", "in_review", "quoted"])
      else if (status) query = query.eq("status", status)
      if (type) query = query.eq("quote_type", type)
      if (q) query = query.or(`reference.ilike.%${q}%,contact_name.ilike.%${q}%,contact_email.ilike.%${q}%,company_name.ilike.%${q}%`)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map(quoteRow)
    },
    async getQuote(id): Promise<AdminQuote | null> {
      const { data: r } = await sb
        .from("quotes")
        .select(
          `${QUOTE_ROW}, customer_id, message, quantity, financing, trade_in, subtotal, discount, vat_rate, vat_amount, valid_until, terms, response_message, responded_at, pdf_path, items:quote_items(id, description, quantity, unit_price, line_total, sort_order)`,
        )
        .eq("id", id)
        .maybeSingle()
      if (!r) return null
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const x = r as any
      return {
        ...quoteRow(x),
        customerId: x.customer_id,
        truckSlug: x.truck?.slug ?? null,
        partSlug: x.part?.slug ?? null,
        message: x.message,
        quantity: x.quantity,
        financing: x.financing,
        tradeIn: x.trade_in,
        items: [...(x.items ?? [])]
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((i: any) => ({ id: i.id, description: i.description, quantity: n(i.quantity), unitPrice: n(i.unit_price), lineTotal: n(i.line_total) })),
        subtotal: n(x.subtotal),
        discount: n(x.discount),
        vatRate: n(x.vat_rate),
        vatAmount: n(x.vat_amount),
        validUntil: x.valid_until,
        terms: x.terms,
        responseMessage: x.response_message,
        respondedAt: x.responded_at,
        hasPdf: Boolean(x.pdf_path),
        attachmentUrls: await signed("uploads", x.attachment_paths ?? []),
        notes: await notes("quote", id),
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    },
    async saveQuote(id, v) {
      const del = await sb.from("quote_items").delete().eq("quote_id", id)
      if (del.error) return fail(del.error, "Couldn't save line items.")
      if (v.items.length) {
        const ins = await sb.from("quote_items").insert(v.items.map((it, i) => ({ quote_id: id, description: it.description, quantity: it.quantity, unit_price: it.unitPrice, sort_order: i })))
        if (ins.error) return fail(ins.error, "Couldn't save line items.")
      }
      const { data: cur } = await sb.from("quotes").select("status").eq("id", id).single()
      const { error } = await sb
        .from("quotes")
        .update({
          discount: v.discount,
          valid_until: v.validUntil,
          terms: v.terms,
          response_message: v.responseMessage,
          assigned_to: v.assignedTo,
          ...(cur?.status === "new" ? { status: "in_review" } : {}),
        })
        .eq("id", id)
      return error ? fail(error, "Couldn't save the quote.") : { ok: true }
    },
    async setQuoteStatus(id, status) {
      if (status === "quoted") {
        const { count } = await sb.from("quote_items").select("id", { count: "exact", head: true }).eq("quote_id", id)
        if (!count) return { ok: false, error: "Add at least one line item before sending the quote." }
      }
      // Customer email + in-app notice are sent by the server action (service role).
      const { error } = await sb
        .from("quotes")
        .update({ status, ...(status === "quoted" ? { responded_at: new Date().toISOString() } : {}) })
        .eq("id", id)
      return error ? fail(error, "Couldn't update the status.") : { ok: true }
    },
    async markQuotePdf(id, path) {
      const { error } = await sb.from("quotes").update({ pdf_path: path }).eq("id", id)
      return error ? fail(error, "Couldn't save the PDF link.") : { ok: true }
    },

    /* --------------------------------- bookings ------------------------------- */

    async listBookings({ status, branch }) {
      let query = sb.from("service_bookings").select(BOOKING_ROW).order("created_at", { ascending: false }).limit(300)
      if (status === "open") query = query.in("status", ["pending", "confirmed", "rescheduled"])
      else if (status) query = query.eq("status", status)
      const { data, error } = await query
      if (error) throw error
      return (data ?? [])
        .map(bookingRow)
        .filter((b) => !branch || b.branchSlug === branch)
        .sort((a, b) => Number(b.isBreakdown && b.status === "pending") - Number(a.isBreakdown && a.status === "pending"))
    },
    async getBooking(id): Promise<AdminBooking | null> {
      const { data: r } = await sb
        .from("service_bookings")
        .select(`${BOOKING_ROW}, customer_id, fleet_unit_id, truck_year, mileage_km, issue_description, cancel_reason, photo_paths`)
        .eq("id", id)
        .maybeSingle()
      if (!r) return null
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const x = r as any
      return {
        ...bookingRow(x),
        customerId: x.customer_id,
        fleetUnitId: x.fleet_unit_id,
        truckMake: x.truck_make,
        truckModel: x.truck_model,
        truckYear: x.truck_year,
        mileageKm: x.mileage_km,
        issue: x.issue_description,
        cancelReason: x.cancel_reason,
        photoUrls: await signed("uploads", x.photo_paths ?? []),
        notes: await notes("booking", id),
      }
    },
    async updateBooking(id, v) {
      const { error } = await sb
        .from("service_bookings")
        .update({
          status: v.status,
          ...(v.scheduledAt !== undefined ? { scheduled_at: v.scheduledAt } : {}),
          ...(v.status === "confirmed" ? { confirmed_at: new Date().toISOString(), handled_by: session.userId } : {}),
          ...(v.status === "cancelled" ? { cancel_reason: v.cancelReason || "Cancelled by JAC Motors", cancelled_at: new Date().toISOString() } : {}),
        })
        .eq("id", id)
      return error ? fail(error, "Couldn't update the booking.") : { ok: true }
    },
    async convertBooking(id, v) {
      const { data: b, error: e1 } = await sb
        .from("service_bookings")
        .select("id, customer_id, fleet_unit_id, branch_id, truck_make, truck_model, plate_number, mileage_km, issue_description")
        .eq("id", id)
        .single()
      if (e1 || !b) return fail(e1, "Booking not found.")
      const { data: job, error } = await sb
        .from("job_orders")
        .insert({
          booking_id: b.id,
          customer_id: b.customer_id,
          fleet_unit_id: b.fleet_unit_id,
          branch_id: b.branch_id,
          truck_make: b.truck_make,
          truck_model: b.truck_model,
          plate_number: b.plate_number,
          mileage_in_km: b.mileage_km,
          complaint: b.issue_description,
          mechanic_id: v.mechanicId,
          service_advisor_id: session.userId,
          promised_at: v.promisedAt,
          created_by: session.userId,
        })
        .select("id")
        .single()
      if (error) return fail(error, "Couldn't open the job order.")
      await sb.from("service_bookings").update({ status: "converted" }).eq("id", id)
      return { ok: true, data: { jobId: job.id } }
    },

    /* ---------------------------------- jobs ---------------------------------- */

    async listJobs({ status, mechanicId, branch }) {
      let query = sb.from("job_orders").select(JOB_ROW).order("received_at", { ascending: false }).limit(300)
      if (status === "active") query = query.not("status", "in", "(released,cancelled)")
      else if (status) query = query.eq("status", status)
      if (mechanicId) query = query.eq("mechanic_id", mechanicId)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map(jobRow).filter((j) => !branch || j.branchSlug === branch)
    },
    async getJob(id): Promise<AdminJob | null> {
      const { data: r } = await sb
        .from("job_orders")
        .select(
          `${JOB_ROW}, customer_id, fleet_unit_id, booking_id, mileage_in_km, diagnosis, recommendation, customer_notes, labor_total, parts_total, misc_total,
           booking:service_bookings(reference),
           items:job_order_items(id, item_type, description, quantity, unit_price, line_total, sort_order),
           events:job_order_events(id, from_status, to_status, note, created_at, actor:profiles(full_name)),
           invoices(id, reference, status, total)`,
        )
        .eq("id", id)
        .maybeSingle()
      if (!r) return null
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const x = r as any
      const inv = Array.isArray(x.invoices) ? x.invoices[0] : x.invoices
      return {
        ...jobRow(x),
        customerId: x.customer_id,
        customerPhone: x.customer?.phone ?? null,
        customerEmail: x.customer?.email ?? null,
        fleetUnitId: x.fleet_unit_id,
        bookingId: x.booking_id,
        bookingReference: x.booking?.reference ?? null,
        mileageInKm: x.mileage_in_km,
        diagnosis: x.diagnosis,
        recommendation: x.recommendation,
        customerNotes: x.customer_notes,
        items: [...(x.items ?? [])]
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((i: any) => ({ id: i.id, type: i.item_type === "truck" ? "misc" : i.item_type, description: i.description, quantity: n(i.quantity), unitPrice: n(i.unit_price), lineTotal: n(i.line_total) })),
        laborTotal: n(x.labor_total),
        partsTotal: n(x.parts_total),
        miscTotal: n(x.misc_total),
        events: [...(x.events ?? [])]
          .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at))
          .map((e: any) => ({ id: e.id, from: e.from_status, to: e.to_status, note: e.note, actor: e.actor?.full_name ?? null, at: e.created_at })),
        notes: await notes("job_order", id),
        invoice: inv ? { id: inv.id, reference: inv.reference, status: inv.status, total: n(inv.total) } : null,
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    },
    async setJobStatus(id, status, note) {
      const { error } = await sb.from("job_orders").update({ status }).eq("id", id)
      if (error) return fail(error, role === "mechanic" ? "Only a service advisor can release or cancel a job." : "Couldn't change the status.")
      if (note) {
        // annotate the timeline event the status trigger just wrote (migration 0500 allows note-only updates)
        const { data: ev } = await sb.from("job_order_events").select("id").eq("job_order_id", id).eq("to_status", status as JobStatus).order("created_at", { ascending: false }).limit(1).maybeSingle()
        if (ev) await sb.from("job_order_events").update({ note }).eq("id", ev.id)
      }
      return { ok: true }
    },
    async updateJob(id, v) {
      const patch: Record<string, unknown> = {}
      if (v.mechanicId !== undefined) patch.mechanic_id = v.mechanicId
      if (v.diagnosis !== undefined) patch.diagnosis = v.diagnosis
      if (v.recommendation !== undefined) patch.recommendation = v.recommendation
      if (v.customerNotes !== undefined) patch.customer_notes = v.customerNotes
      if (v.promisedAt !== undefined) patch.promised_at = v.promisedAt
      const { error } = await sb.from("job_orders").update(patch).eq("id", id)
      return error ? fail(error, "Couldn't save the job.") : { ok: true }
    },
    async addJobItem(jobId, v) {
      const { count } = await sb.from("job_order_items").select("id", { count: "exact", head: true }).eq("job_order_id", jobId)
      const { error } = await sb.from("job_order_items").insert({
        job_order_id: jobId,
        item_type: v.type,
        part_id: v.partId ?? null,
        description: v.description,
        quantity: v.quantity,
        unit_price: v.unitPrice,
        sort_order: count ?? 0,
        created_by: session.userId,
      })
      return error ? fail(error, "Couldn't add the item.") : { ok: true }
    },
    async removeJobItem(jobId, itemId) {
      const { error } = await sb.from("job_order_items").delete().eq("id", itemId).eq("job_order_id", jobId)
      return error ? fail(error, "Couldn't remove the item.") : { ok: true }
    },
    async createInvoice(jobId) {
      const { data: existing } = await sb.from("invoices").select("id, reference").eq("job_order_id", jobId).maybeSingle()
      if (existing) return { ok: true, data: existing }
      const { data: j } = await sb
        .from("job_orders")
        .select("customer_id, branch_id, customer:customers(full_name, company:companies(name, tin, address, city)), items:job_order_items(item_type, part_id, description, quantity, unit_price, sort_order)")
        .eq("id", jobId)
        .single()
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const x = j as any
      if (!x?.items?.length) return { ok: false, error: "Add labour or parts before invoicing." }
      const co = x.customer?.company
      const { data: inv, error } = await sb
        .from("invoices")
        .insert({
          customer_id: x.customer_id,
          job_order_id: jobId,
          branch_id: x.branch_id,
          status: "issued",
          bill_to_name: x.customer?.full_name ?? "Walk-in customer",
          bill_to_company: co?.name ?? null,
          bill_to_tin: co?.tin ?? null,
          bill_to_address: co ? [co.address, co.city].filter(Boolean).join(", ") : null,
          issued_at: new Date().toISOString(),
          created_by: session.userId,
        })
        .select("id, reference")
        .single()
      if (error) return fail(error, "Couldn't create the invoice.")
      const ins = await sb.from("invoice_items").insert(
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        x.items.map((i: any) => ({ invoice_id: inv.id, item_type: i.item_type, part_id: i.part_id, description: i.description, quantity: i.quantity, unit_price: i.unit_price, sort_order: i.sort_order })),
      )
      if (ins.error) return fail(ins.error, "Invoice created without items — please retry.")
      return { ok: true, data: inv }
    },

    async addNote(entityType, entityId, body) {
      const { error } = await sb.from("staff_notes").insert({ entity_type: entityType, entity_id: entityId, body, author_id: session.userId })
      return error ? fail(error, "Couldn't add the note.") : { ok: true }
    },

    /* -------------------------------- customers ------------------------------- */

    async listCustomers({ q: raw }) {
      const q = sanitizeSearch(raw)
      let query = sb
        .from("customers")
        .select("id, full_name, email, phone, profile_id, created_at, company:companies(name), fleet:fleet_units(count), jobs:job_orders(status), quotes(count)")
        .order("created_at", { ascending: false })
        .limit(300)
      if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      const { data, error } = await query
      if (error) throw error
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return (data ?? []).map((c: any): AdminCustomerRow => ({
        id: c.id,
        fullName: c.full_name,
        email: c.email,
        phone: c.phone,
        company: c.company?.name ?? null,
        hasAccount: Boolean(c.profile_id),
        fleetCount: c.fleet?.[0]?.count ?? 0,
        openJobs: (c.jobs ?? []).filter((j: { status: string }) => !["released", "cancelled"].includes(j.status)).length,
        quoteCount: c.quotes?.[0]?.count ?? 0,
        createdAt: c.created_at,
      }))
    },
    async getCustomer(id): Promise<AdminCustomer | null> {
      const { data: c } = await sb.from("customers").select("id, full_name, email, phone, profile_id, created_at, company:companies(name, tin, industry, fleet_size, address, city)").eq("id", id).maybeSingle()
      if (!c) return null
      const [fleet, jobs, quotes, bookings, maint] = await Promise.all([
        sb.from("fleet_units").select("*").eq("customer_id", id),
        sb.from("job_orders").select(JOB_ROW).eq("customer_id", id).order("received_at", { ascending: false }),
        sb.from("quotes").select(QUOTE_ROW).eq("customer_id", id).order("created_at", { ascending: false }),
        sb.from("service_bookings").select(BOOKING_ROW).eq("customer_id", id).order("created_at", { ascending: false }),
        sb.from("fleet_unit_maintenance").select("*").eq("customer_id", id),
      ])
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const x = c as any
      const mById = new Map((maint.data ?? []).map((m: any) => [m.fleet_unit_id, m]))
      const fleetUnits: FleetUnit[] = (fleet.data ?? []).map((u: any) => {
        const m: any = mById.get(u.id)
        return {
          id: u.id,
          nickname: u.nickname,
          make: u.make,
          model: u.model,
          year: u.year,
          plateNumber: u.plate_number,
          vin: u.vin,
          engineNumber: u.engine_number,
          color: u.color,
          purchaseDate: u.purchase_date,
          currentMileageKm: u.current_mileage_km,
          mileageUpdatedAt: u.mileage_updated_at,
          lastServiceDate: u.last_service_date,
          lastServiceMileageKm: u.last_service_mileage_km,
          serviceIntervalKm: u.service_interval_km,
          serviceIntervalMonths: u.service_interval_months,
          remindersEnabled: u.reminders_enabled,
          notes: u.notes,
          maintenance: m ? { state: m.maintenance_state, nextServiceKm: m.next_service_mileage_km, nextServiceDate: m.next_service_date, kmRemaining: m.km_remaining } : null,
        }
      })
      const jobRows = (jobs.data ?? []).map(jobRow)
      return {
        id: x.id,
        fullName: x.full_name,
        email: x.email,
        phone: x.phone,
        company: x.company?.name ?? null,
        hasAccount: Boolean(x.profile_id),
        fleetCount: fleetUnits.length,
        openJobs: jobRows.filter((j) => !["released", "cancelled"].includes(j.status)).length,
        quoteCount: quotes.data?.length ?? 0,
        createdAt: x.created_at,
        companyDetail: x.company ? { name: x.company.name, tin: x.company.tin, industry: x.company.industry, fleetSize: x.company.fleet_size, address: x.company.address, city: x.company.city } : null,
        fleet: fleetUnits,
        jobs: jobRows,
        quotes: (quotes.data ?? []).map(quoteRow),
        bookings: (bookings.data ?? []).map(bookingRow),
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    },
  }
}
