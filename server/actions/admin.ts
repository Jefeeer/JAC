"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { parseCsv } from "@/lib/csv"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parseCompat, parseKeyValues, jobItemSchema, noteSchema, partSchema, quoteResponseSchema, truckSchema, type PartForm, type QuoteResponseInput, type TruckForm } from "@/lib/validation/admin"
import { getSession } from "@/server/auth"
import { repoFor } from "@/server/admin/context"
import { can, type Capability } from "@/server/admin/permissions"
import type { PartInput } from "@/server/admin/types"
import { notifyQuoteReady } from "@/server/notifications"
import { renderDocumentPdf } from "@/server/pdf/documents"
import { callPython, pythonConfigured } from "@/server/python"
import type { JobStatus, QuoteStatus } from "@/types/domain"

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> }

/** Resolve staff session + capability; never trust the UI to hide buttons. */
type StaffCtx = { error: string } | { session: NonNullable<Awaited<ReturnType<typeof getSession>>>; repo: Awaited<ReturnType<typeof repoFor>> }
async function staff(cap: Capability): Promise<StaffCtx> {
  const session = await getSession()
  if (!session?.isStaff) return { error: "Please sign in with a staff account." }
  if (!can(session.profile.role, cap)) return { error: "Your role isn't allowed to do that." }
  return { session, repo: await repoFor(session) }
}

const invalid = (e: z.ZodError): Result => ({ ok: false, error: "Please check the highlighted fields.", fieldErrors: z.flattenError(e).fieldErrors })
const done = (...paths: string[]) => {
  revalidatePath("/admin", "layout")
  for (const p of paths) revalidatePath(p)
}

/* ---------------------------------- trucks --------------------------------- */

export async function saveTruckAction(input: TruckForm): Promise<Result<{ id: string }>> {
  const parsed = truckSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ctx = await staff("trucks.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const v = parsed.data
  const existing = v.id ? await ctx.repo.getTruck(v.id) : null
  const res = await ctx.repo.saveTruck({
    id: v.id,
    slug: v.slug,
    stockNumber: v.stockNumber,
    title: v.title,
    brand: v.brand,
    model: v.model,
    series: v.series,
    variant: v.variant,
    bodyType: v.bodyType,
    year: v.year,
    condition: v.condition,
    availability: v.availability,
    payloadTons: v.payloadTons,
    gvwKg: v.gvwKg,
    wheelConfig: v.wheelConfig,
    engine: v.engine,
    displacementCc: v.displacementCc,
    horsepower: v.horsepower,
    torqueNm: v.torqueNm,
    transmission: v.transmission,
    fuelType: v.fuelType,
    emissionStandard: v.emissionStandard,
    wheelbaseMm: v.wheelbaseMm,
    mileageKm: v.mileageKm,
    color: v.color,
    price: v.price,
    priceOnRequest: v.priceOnRequest,
    summary: v.summary,
    description: v.description,
    features: v.featuresText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30),
    specs: parseKeyValues(v.specsText),
    branchSlug: v.branchSlug,
    isFeatured: v.isFeatured,
    isPublished: existing?.isPublished ?? false,
  })
  if (!res.ok) return res
  done("/trucks", `/trucks/${res.data.slug}`, "/", ...(existing && existing.slug !== res.data.slug ? [`/trucks/${existing.slug}`] : []))
  return { ok: true, data: { id: res.data.id } }
}

export async function setTruckPublishedAction(id: string, published: boolean): Promise<Result> {
  const ctx = await staff("trucks.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const res = await ctx.repo.setTruckPublished(id, published)
  const t = await ctx.repo.getTruck(id)
  done("/trucks", "/", ...(t ? [`/trucks/${t.slug}`] : []))
  return res
}

export async function deleteTruckAction(id: string): Promise<void> {
  const ctx = await staff("trucks.delete")
  if ("error" in ctx) redirect("/admin/trucks?error=permission")
  const t = await ctx.repo.getTruck(id)
  await ctx.repo.deleteTruck(id)
  done("/trucks", "/", ...(t ? [`/trucks/${t.slug}`] : []))
  redirect("/admin/trucks")
}

const imageSchema = z.object({
  truckId: z.string().min(1),
  url: z.string().min(1).max(600).refine((u) => u.startsWith("/images/") || /^https:\/\//.test(u), "Use an uploaded image or a site photo"),
  alt: z.string().trim().max(200).default(""),
  storagePath: z.string().max(300).nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
})

export async function addTruckImageAction(input: z.input<typeof imageSchema>): Promise<Result> {
  const parsed = imageSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid image" }
  const ctx = await staff("trucks.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const t = await ctx.repo.getTruck(parsed.data.truckId)
  const res = await ctx.repo.addTruckImage(parsed.data.truckId, { ...parsed.data, alt: parsed.data.alt || t?.title || "JAC truck" })
  done(...(t ? [`/trucks/${t.slug}`, "/trucks"] : []))
  return res
}

export async function removeTruckImageAction(truckId: string, url: string): Promise<Result> {
  const ctx = await staff("trucks.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const res = await ctx.repo.removeTruckImage(truckId, url)
  const t = await ctx.repo.getTruck(truckId)
  done(...(t ? [`/trucks/${t.slug}`, "/trucks"] : []))
  return res
}

export async function setPrimaryTruckImageAction(truckId: string, url: string): Promise<Result> {
  const ctx = await staff("trucks.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const res = await ctx.repo.setPrimaryTruckImage(truckId, url)
  const t = await ctx.repo.getTruck(truckId)
  done(...(t ? [`/trucks/${t.slug}`, "/trucks", "/"] : []))
  return res
}

/* ----------------------------------- parts --------------------------------- */

function toPartInput(v: z.output<typeof partSchema>): PartInput {
  return {
    id: v.id,
    slug: v.slug,
    partNumber: v.partNumber.toUpperCase(),
    oemNumber: v.oemNumber,
    name: v.name,
    brand: v.brand,
    categorySlug: v.categorySlug,
    summary: v.summary,
    description: v.description,
    specs: parseKeyValues(v.specsText),
    price: v.price,
    priceOnRequest: v.priceOnRequest,
    unit: v.unit,
    stockQty: v.stockQty,
    reorderLevel: v.reorderLevel,
    leadTimeDays: v.leadTimeDays,
    weightKg: v.weightKg,
    imageUrl: v.imageUrl,
    isPublished: v.isPublished,
    compatibility: parseCompat(v.compatText),
  }
}

export async function savePartAction(input: PartForm): Promise<Result<{ id: string }>> {
  const parsed = partSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ctx = await staff("parts.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const res = await ctx.repo.savePart(toPartInput(parsed.data))
  if (!res.ok) return res
  done("/parts", `/parts/${res.data.slug}`)
  return { ok: true, data: { id: res.data.id } }
}

export async function setPartStockAction(id: string, qty: number): Promise<Result> {
  if (!Number.isFinite(qty) || qty < 0 || qty > 1_000_000) return { ok: false, error: "Enter a valid quantity" }
  const ctx = await staff("parts.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const res = await ctx.repo.setPartStock(id, qty)
  const p = await ctx.repo.getPart(id)
  done("/parts", ...(p ? [`/parts/${p.slug}`] : []))
  return res
}

export async function setPartPublishedAction(id: string, published: boolean): Promise<Result> {
  const ctx = await staff("parts.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const res = await ctx.repo.setPartPublished(id, published)
  const p = await ctx.repo.getPart(id)
  done("/parts", ...(p ? [`/parts/${p.slug}`] : []))
  return res
}

/**
 * Bulk parts import. Forwards the file to the Python service when configured
 * (CSV + Excel, server-side upsert); otherwise parses CSV here.
 * Columns: part_number, name, category, price, stock_qty, reorder_level,
 * oem_number, brand, unit, summary, compatible_models (";"-separated).
 */
export async function importPartsAction(form: FormData): Promise<Result<{ inserted: number; updated: number; skipped: string[] }>> {
  const ctx = await staff("parts.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a CSV file." }
  if (file.size > 3 * 1024 * 1024) return { ok: false, error: "File is larger than 3 MB." }

  if (pythonConfigured() && !ctx.session.isDemo) {
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await callPython<{ inserted: number; updated: number; skipped: string[] }>("/import/parts", { method: "POST", body }, 120_000)
      done("/parts")
      return { ok: true, data: res }
    } catch (e) {
      return { ok: false, error: `Import service error: ${(e as Error).message}` }
    }
  }

  if (!/\.csv$/i.test(file.name)) return { ok: false, error: "Without the Python service only .csv files can be imported (Excel needs the service)." }
  const { headers, rows } = parseCsv(await file.text())
  if (!headers.includes("part_number") || !headers.includes("name")) return { ok: false, error: "CSV needs at least part_number and name columns." }
  if (rows.length > 2000) return { ok: false, error: "Import up to 2,000 rows at a time." }

  const skipped: string[] = []
  const inputs: PartInput[] = []
  for (const [i, r] of rows.entries()) {
    const price = r.price ? Number(r.price.replace(/[,₱\s]/g, "")) : null
    const qty = Number(r.stock_qty || 0)
    const reorder = Number(r.reorder_level || 5)
    if (!r.part_number || !r.name || (price !== null && !Number.isFinite(price)) || !Number.isFinite(qty)) {
      skipped.push(`Row ${i + 2}: ${r.part_number || "(no part number)"}`)
      continue
    }
    inputs.push({
      slug: "",
      partNumber: r.part_number.toUpperCase(),
      oemNumber: r.oem_number || null,
      name: r.name,
      brand: r.brand || "JAC Genuine",
      categorySlug: (r.category || "engine-filtration").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      summary: r.summary || null,
      description: null,
      specs: {},
      price,
      priceOnRequest: price === null,
      unit: r.unit || "pc",
      stockQty: Math.max(0, Math.round(qty)),
      reorderLevel: Math.max(0, Math.round(reorder)),
      leadTimeDays: r.lead_time_days ? Number(r.lead_time_days) : null,
      weightKg: null,
      imageUrl: null,
      isPublished: true,
      compatibility: (r.compatible_models || "")
        .split(/[;|]/)
        .map((m) => m.trim())
        .filter(Boolean)
        .map((model) => ({ model })),
    })
  }
  const res = await ctx.repo.importParts(inputs)
  if (!res.ok) return res
  done("/parts")
  return { ok: true, data: { ...res.data, skipped } }
}

/* ---------------------------------- quotes --------------------------------- */

export async function saveQuoteAction(input: QuoteResponseInput): Promise<Result> {
  const parsed = quoteResponseSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const ctx = await staff("quotes.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const v = parsed.data
  const res = await ctx.repo.saveQuote(v.id, {
    items: v.items,
    discount: v.discount,
    validUntil: v.validUntil,
    terms: v.terms || null,
    responseMessage: v.responseMessage || null,
    assignedTo: v.assignedTo || null,
  })
  done(`/admin/quotes/${v.id}`, "/account/quotes")
  return res
}

export async function setQuoteStatusAction(id: string, status: QuoteStatus): Promise<Result> {
  const ctx = await staff("quotes.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const res = await ctx.repo.setQuoteStatus(id, status)
  if (res.ok && status === "quoted" && !ctx.session.isDemo) after(() => notifyQuoteReady(id))
  done(`/admin/quotes/${id}`, "/account/quotes", `/account/quotes/${id}`)
  return res
}

/** Render + store the quote PDF (Python service when configured, Node fallback otherwise). */
export async function generateQuotePdfAction(id: string): Promise<Result<{ url: string }>> {
  const ctx = await staff("quotes.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const q = await ctx.repo.getQuote(id)
  if (!q) return { ok: false, error: "Quote not found." }
  if (!q.items.length) return { ok: false, error: "Add line items first." }

  if (!ctx.session.isDemo) {
    try {
      if (pythonConfigured()) {
        await callPython<{ url: string; path: string }>(`/quotes/${id}/pdf`, { method: "POST" })
      } else {
        const bytes = await renderDocumentPdf(await quoteDocData(q, ctx.session.profile.fullName))
        const path = `customers/${q.customerId ?? "walk-in"}/quotes/${q.reference}.pdf`
        const admin = createSupabaseAdminClient()
        const up = await admin.storage.from("documents").upload(path, bytes, { contentType: "application/pdf", upsert: true })
        if (up.error) return { ok: false, error: `Upload failed: ${up.error.message}` }
        await ctx.repo.markQuotePdf(id, path)
      }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  }
  done(`/admin/quotes/${id}`, `/account/quotes/${id}`)
  return { ok: true, data: { url: `/api/documents/quotes/${id}` } }
}

async function quoteDocData(q: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof repoFor>>["getQuote"]>>>, preparedBy: string | null) {
  return {
    kind: "QUOTATION" as const,
    reference: q.reference,
    date: q.respondedAt ?? q.createdAt,
    validUntil: q.validUntil,
    billTo: { name: q.contactName, company: q.company, email: q.contactEmail, phone: q.contactPhone },
    subject: q.subject,
    intro: q.responseMessage,
    lines: q.items,
    discount: q.discount,
    vatRate: q.vatRate,
    terms: q.terms,
    branchSlug: q.branchSlug,
    preparedBy: q.assignedTo?.name ?? preparedBy,
  }
}

/* --------------------------------- bookings -------------------------------- */

const bookingUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["confirmed", "rescheduled", "cancelled", "no_show", "completed"]),
  scheduledAt: z.string().max(40).nullable().optional(),
  cancelReason: z.string().trim().max(300).nullable().optional(),
})

export async function updateBookingAction(input: z.input<typeof bookingUpdateSchema>): Promise<Result> {
  const parsed = bookingUpdateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid booking update" }
  const v = parsed.data
  if ((v.status === "confirmed" || v.status === "rescheduled") && !v.scheduledAt) return { ok: false, error: "Set the drop-off date and time." }
  const scheduledAt = v.scheduledAt ? new Date(v.scheduledAt.length === 16 ? `${v.scheduledAt}:00+08:00` : v.scheduledAt).toISOString() : undefined
  const ctx = await staff("bookings.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const res = await ctx.repo.updateBooking(v.id, { status: v.status, scheduledAt, cancelReason: v.cancelReason ?? null })
  done(`/admin/bookings/${v.id}`, "/account/bookings")
  return res
}

const convertSchema = z.object({ id: z.string().min(1), mechanicId: z.string().nullable().optional(), promisedAt: z.string().max(40).nullable().optional() })

export async function convertBookingAction(input: z.input<typeof convertSchema>): Promise<Result<{ jobId: string }>> {
  const parsed = convertSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid request" }
  const ctx = await staff("bookings.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const v = parsed.data
  const res = await ctx.repo.convertBooking(v.id, {
    mechanicId: v.mechanicId || null,
    promisedAt: v.promisedAt ? new Date(v.promisedAt.length === 16 ? `${v.promisedAt}:00+08:00` : v.promisedAt).toISOString() : null,
  })
  done("/admin/jobs", `/admin/bookings/${v.id}`, "/account")
  return res
}

/* ----------------------------------- jobs ---------------------------------- */

export async function setJobStatusAction(id: string, status: JobStatus, note?: string): Promise<Result> {
  const ctx = await staff("jobs.status")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const res = await ctx.repo.setJobStatus(id, status, note?.trim() ? note.trim().slice(0, 500) : null)
  done(`/admin/jobs/${id}`, "/admin/jobs", `/account/jobs/${id}`, "/account")
  return res
}

const jobUpdateSchema = z.object({
  id: z.string().min(1),
  mechanicId: z.string().nullable().optional(),
  diagnosis: z.string().trim().max(3000).nullable().optional(),
  recommendation: z.string().trim().max(3000).nullable().optional(),
  customerNotes: z.string().trim().max(3000).nullable().optional(),
  promisedAt: z.string().max(40).nullable().optional(),
})

export async function updateJobAction(input: z.input<typeof jobUpdateSchema>): Promise<Result> {
  const parsed = jobUpdateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid update" }
  const ctx = await staff("jobs.status")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const { id, promisedAt, ...rest } = parsed.data
  const patch = {
    ...rest,
    ...(promisedAt !== undefined ? { promisedAt: promisedAt ? new Date(promisedAt.length === 16 ? `${promisedAt}:00+08:00` : promisedAt).toISOString() : null } : {}),
  }
  for (const k of Object.keys(patch) as (keyof typeof patch)[]) if (patch[k] === "") (patch as Record<string, unknown>)[k] = null
  const res = await ctx.repo.updateJob(id, patch)
  done(`/admin/jobs/${id}`, `/account/jobs/${id}`)
  return res
}

export async function addJobItemAction(input: z.input<typeof jobItemSchema>): Promise<Result> {
  const parsed = jobItemSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item" }
  const ctx = await staff("jobs.items")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const v = parsed.data
  const res = await ctx.repo.addJobItem(v.jobId, { type: v.type, description: v.description, quantity: v.quantity, unitPrice: v.unitPrice, partId: v.partId ?? null })
  done(`/admin/jobs/${v.jobId}`, `/account/jobs/${v.jobId}`)
  return res
}

export async function removeJobItemAction(jobId: string, itemId: string): Promise<Result> {
  const ctx = await staff("jobs.items")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const res = await ctx.repo.removeJobItem(jobId, itemId)
  done(`/admin/jobs/${jobId}`, `/account/jobs/${jobId}`)
  return res
}

export async function createInvoiceAction(jobId: string): Promise<Result<{ id: string; reference: string }>> {
  const ctx = await staff("invoices.write")
  if ("error" in ctx) return { ok: false, error: ctx.error }
  const res = await ctx.repo.createInvoice(jobId)
  if (res.ok && pythonConfigured() && !ctx.session.isDemo) {
    after(async () => {
      try {
        await callPython(`/invoices/${res.data.id}/pdf`, { method: "POST" })
      } catch (e) {
        console.error("[invoice pdf]", e)
      }
    })
  }
  done(`/admin/jobs/${jobId}`)
  return res
}

/* ------------------------------ notes / notifications ------------------------------ */

export async function addNoteAction(input: z.input<typeof noteSchema>): Promise<Result> {
  const parsed = noteSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note" }
  const session = await getSession()
  if (!session?.isStaff) return { ok: false, error: "Staff only." }
  const repo = await repoFor(session)
  const res = await repo.addNote(parsed.data.entityType, parsed.data.entityId, parsed.data.body)
  revalidatePath("/admin", "layout")
  return res
}

export async function markAdminNotificationsReadAction(): Promise<Result> {
  const session = await getSession()
  if (!session?.isStaff) return { ok: false, error: "Staff only." }
  await (await repoFor(session)).markNotificationsRead()
  revalidatePath("/admin", "layout")
  return { ok: true }
}

