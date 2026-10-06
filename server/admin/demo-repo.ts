import "server-only"

import { randomUUID } from "node:crypto"
import type { SessionContext } from "@/server/auth"
import { jobTotals, mapFleet } from "@/server/demo/portal"
import { applyJobStatus, demoDb, nextReference, tickDemo, type DBooking, type DJob, type DQuote, type DemoDb } from "@/server/demo/store"
import { stockStatusFor, type JobStatus, type Part, type Truck, type UserRole } from "@/types/domain"
import { MECHANIC_STATUSES } from "./permissions"
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

/** DEMO MODE admin repository — in-memory equivalent of the Supabase one. */

const now = () => new Date().toISOString()
const fail = (error: string): Fail => ({ ok: false, error })
const round2 = (n: number) => Math.round(n * 100) / 100
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)

const serviceNames: Record<string, string> = {
  "pms-10000": "10,000 km Preventive Maintenance",
  "pms-40000": "40,000 km Major Service",
  "computer-diagnostics": "Computer Diagnostics & Troubleshooting",
  "brake-overhaul": "Brake System Overhaul",
  "clutch-replacement": "Clutch Replacement",
  "engine-overhaul": "Engine Overhaul",
  "fleet-care-plan": "Fleet Care Plan",
  "roadside-assistance": "Breakdown & Roadside Assistance",
}

export function demoAdminRepo(session: SessionContext): AdminRepo {
  const role = session.profile.role
  const db = () => {
    const d = demoDb()
    tickDemo(d)
    return d
  }
  const staffRef = (d: DemoDb, id: string | null): StaffRef | null => {
    const p = id ? d.profiles.find((x) => x.id === id) : null
    return p ? { id: p.id, name: p.fullName, role: p.role } : null
  }
  const notesFor = (d: DemoDb, type: string, id: string): StaffNote[] =>
    d.staffNotes
      .filter((n) => n.entityType === type && n.entityId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((n) => ({ id: n.id, body: n.body, author: d.profiles.find((p) => p.id === n.authorId)?.fullName ?? "Staff", at: n.createdAt }))
  const customerName = (d: DemoDb, id: string | null) => d.customers.find((c) => c.id === id)?.fullName ?? "Walk-in"

  const quoteTotal = (d: DemoDb, q: DQuote) => {
    const subtotal = round2(d.quoteItems.filter((i) => i.quoteId === q.id).reduce((s, i) => s + i.quantity * i.unitPrice, 0))
    const net = Math.max(subtotal - q.discount, 0)
    const vat = round2(net * q.vatRate)
    return { subtotal, vat, total: round2(net + vat) }
  }
  const quoteRow = (d: DemoDb, q: DQuote): AdminQuoteRow => {
    const truck = q.truckSlug ? d.trucks.find((t) => t.slug === q.truckSlug) : null
    const part = q.partSlug ? d.parts.find((p) => p.slug === q.partSlug) : null
    return {
      id: q.id,
      reference: q.reference,
      type: q.type,
      status: q.status,
      createdAt: q.createdAt,
      contactName: q.contactName,
      contactEmail: q.contactEmail,
      contactPhone: q.contactPhone,
      company: q.company,
      subject: truck?.title ?? (part ? `${part.partNumber} · ${part.name}` : "Service enquiry"),
      total: quoteTotal(d, q).total,
      assignedTo: staffRef(d, q.assignedTo),
      branchSlug: q.branchSlug,
      attachments: q.attachments,
    }
  }
  const bookingRow = (d: DemoDb, b: DBooking): AdminBookingRow => ({
    id: b.id,
    reference: b.reference,
    status: b.status,
    createdAt: b.createdAt,
    contactName: b.contactName,
    contactPhone: b.contactPhone,
    contactEmail: b.contactEmail,
    company: b.company,
    truckLabel: `${b.truckMake} ${b.truckModel}`,
    plateNumber: b.plateNumber,
    serviceName: b.serviceSlug ? (serviceNames[b.serviceSlug] ?? b.serviceSlug) : null,
    isBreakdown: b.isBreakdown,
    preferredDate: b.preferredDate,
    timeSlot: b.timeSlot,
    scheduledAt: b.scheduledAt,
    branchSlug: b.branchSlug,
    jobId: d.jobs.find((j) => j.bookingId === b.id)?.id ?? null,
  })
  const jobRow = (d: DemoDb, j: DJob): AdminJobRow => ({
    id: j.id,
    reference: j.reference,
    status: j.status,
    truckLabel: `${j.truckMake} ${j.truckModel}`,
    plateNumber: j.plateNumber,
    customerName: customerName(d, j.customerId),
    branchSlug: j.branchSlug,
    mechanic: staffRef(d, j.mechanicId),
    advisor: staffRef(d, j.advisorId),
    receivedAt: j.receivedAt,
    promisedAt: j.promisedAt,
    grandTotal: jobTotals(d, j).total,
    complaint: j.complaint,
  })
  const visibleJob = (j: DJob) => role !== "mechanic" || j.mechanicId === session.userId

  return {
    async stats(): Promise<AdminStats> {
      const d = db()
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date())
      const month = today.slice(0, 7)
      const invTotal = (id: string) => {
        const inv = d.invoices.find((i) => i.id === id)!
        const sub = d.invoiceItems.filter((i) => i.invoiceId === id).reduce((s, i) => s + i.quantity * i.unitPrice, 0)
        return Math.max(sub - inv.discount, 0) * (1 + inv.vatRate)
      }
      const issued = d.invoices.filter((i) => i.status !== "draft" && i.status !== "void" && i.issuedAt)
      const trend: { month: string; total: number }[] = []
      const base = new Date(`${month}-01T00:00:00Z`)
      for (let k = 5; k >= 0; k--) {
        const m = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - k, 1)).toISOString().slice(0, 7)
        trend.push({ month: m, total: Math.round(issued.filter((i) => i.issuedAt!.slice(0, 7) === m).reduce((s, i) => s + invTotal(i.id), 0)) })
      }
      const jobs = d.jobs.filter(visibleJob)
      return {
        trucksPublished: d.trucks.filter((t) => t.isPublished).length,
        trucksTotal: d.trucks.length,
        trucksAvailable: d.trucks.filter((t) => t.isPublished && t.availability === "available").length,
        openQuotes: d.quotes.filter((q) => ["new", "in_review", "quoted"].includes(q.status)).length,
        newQuotes: d.quotes.filter((q) => q.status === "new").length,
        jobsActive: jobs.filter((j) => !["released", "cancelled"].includes(j.status)).length,
        jobsReady: jobs.filter((j) => j.status === "ready").length,
        pendingBookings: d.bookings.filter((b) => b.status === "pending").length,
        breakdownBookings: d.bookings.filter((b) => b.status === "pending" && b.isBreakdown).length,
        todaysBookings: d.bookings.filter((b) => ["confirmed", "rescheduled"].includes(b.status) && (b.scheduledAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(b.scheduledAt)) : b.preferredDate) === today).length,
        monthSales: trend.at(-1)?.total ?? 0,
        monthInvoices: issued.filter((i) => i.issuedAt!.slice(0, 7) === month).length,
        lowStock: d.parts.filter((p) => stockStatusFor(p.stockQty, p.reorderLevel) === "low_stock").length,
        outOfStock: d.parts.filter((p) => p.stockQty <= 0).length,
        salesTrend: trend,
      }
    },

    async staff(r?: UserRole) {
      return db()
        .profiles.filter((p) => p.role !== "customer" && (!r || p.role === r))
        .map((p) => ({ id: p.id, name: p.fullName, role: p.role }))
    },

    async notifications(limit = 50) {
      return db()
        .notifications.filter((n) => n.recipientId === session.userId || n.recipientRole === role || (role === "admin" && n.recipientRole))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, readAt: n.readAt, createdAt: n.createdAt }))
    },
    async unreadCount() {
      return (await this.notifications(200)).filter((n) => !n.readAt).length
    },
    async markNotificationsRead() {
      for (const n of db().notifications) if (!n.readAt && (n.recipientId === session.userId || n.recipientRole === role || (role === "admin" && n.recipientRole))) n.readAt = now()
    },

    /* --------------------------------- trucks --------------------------------- */

    async listTrucks({ q, status }) {
      const needle = q?.toLowerCase()
      return db()
        .trucks.filter((t) => !needle || [t.title, t.model, t.stockNumber, t.variant].some((v) => v?.toLowerCase().includes(needle)))
        .filter((t) => !status || (status === "published" ? t.isPublished : status === "draft" ? !t.isPublished : t.availability === "sold"))
    },
    async getTruck(id) {
      return db().trucks.find((t) => t.id === id) ?? null
    },
    async saveTruck(input) {
      const d = db()
      const slug = input.slug ? slugify(input.slug) : slugify(`${input.title}-${input.year}`)
      if (d.trucks.some((t) => t.slug === slug && t.id !== input.id)) return fail("Another truck already uses that URL slug.")
      if (input.stockNumber && d.trucks.some((t) => t.stockNumber === input.stockNumber && t.id !== input.id)) return fail("Stock number already in use.")
      if (input.id) {
        const t = d.trucks.find((x) => x.id === input.id)
        if (!t) return fail("Truck not found.")
        Object.assign(t, { ...input, slug })
        return { ok: true, data: { id: t.id, slug } }
      }
      const id = randomUUID()
      d.trucks.unshift({ ...input, id, slug, currency: "PHP", images: [] } as Truck)
      return { ok: true, data: { id, slug } }
    },
    async setTruckPublished(id, published) {
      const t = db().trucks.find((x) => x.id === id)
      if (!t) return fail("Truck not found.")
      if (published && t.images.length === 0) return fail("Add at least one photo before publishing.")
      t.isPublished = published
      return { ok: true }
    },
    async deleteTruck(id) {
      const d = db()
      d.trucks = d.trucks.filter((t) => t.id !== id)
      return { ok: true }
    },
    async addTruckImage(truckId, img) {
      const t = db().trucks.find((x) => x.id === truckId)
      if (!t) return fail("Truck not found.")
      t.images.push({ url: img.url, alt: img.alt, width: img.width ?? null, height: img.height ?? null, isPrimary: t.images.length === 0 })
      return { ok: true }
    },
    async removeTruckImage(truckId, url) {
      const t = db().trucks.find((x) => x.id === truckId)
      if (!t) return fail("Truck not found.")
      t.images = t.images.filter((i) => i.url !== url)
      if (t.images.length && !t.images.some((i) => i.isPrimary)) t.images[0].isPrimary = true
      if (!t.images.length) t.isPublished = false
      return { ok: true }
    },
    async setPrimaryTruckImage(truckId, url) {
      const t = db().trucks.find((x) => x.id === truckId)
      if (!t) return fail("Truck not found.")
      t.images = t.images.map((i) => ({ ...i, isPrimary: i.url === url })).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      return { ok: true }
    },

    /* ---------------------------------- parts --------------------------------- */

    async listParts({ q, stock, category }) {
      const needle = q?.toLowerCase()
      return db()
        .parts.map((p) => ({ ...p, stockStatus: stockStatusFor(p.stockQty, p.reorderLevel) }))
        .filter((p) => !needle || [p.partNumber, p.oemNumber, p.name].some((v) => v?.toLowerCase().includes(needle)))
        .filter((p) => !category || p.categorySlug === category)
        .filter((p) => !stock || (stock === "out" ? p.stockStatus === "out_of_stock" : p.stockStatus !== "in_stock"))
        .sort((a, b) => a.partNumber.localeCompare(b.partNumber))
    },
    async getPart(id) {
      const p = db().parts.find((x) => x.id === id)
      return p ? { ...p, stockStatus: stockStatusFor(p.stockQty, p.reorderLevel) } : null
    },
    async savePart(input) {
      const d = db()
      const slug = input.slug ? slugify(input.slug) : slugify(`${input.name}-${input.partNumber}`)
      if (d.parts.some((p) => p.partNumber === input.partNumber && p.id !== input.id)) return fail("Part number already exists.")
      if (d.parts.some((p) => p.slug === slug && p.id !== input.id)) return fail("Another part already uses that URL slug.")
      const next = { ...input, slug, currency: "PHP", stockStatus: stockStatusFor(input.stockQty, input.reorderLevel) }
      if (input.id) {
        const p = d.parts.find((x) => x.id === input.id)
        if (!p) return fail("Part not found.")
        Object.assign(p, next)
        return { ok: true, data: { id: p.id, slug } }
      }
      const id = randomUUID()
      d.parts.unshift({ ...next, id } as Part)
      return { ok: true, data: { id, slug } }
    },
    async setPartStock(id, qty) {
      const p = db().parts.find((x) => x.id === id)
      if (!p) return fail("Part not found.")
      p.stockQty = Math.max(0, Math.round(qty))
      p.stockStatus = stockStatusFor(p.stockQty, p.reorderLevel)
      return { ok: true }
    },
    async setPartPublished(id, published) {
      const p = db().parts.find((x) => x.id === id)
      if (!p) return fail("Part not found.")
      p.isPublished = published
      return { ok: true }
    },
    async importParts(rows) {
      const d = db()
      let inserted = 0
      let updated = 0
      for (const r of rows) {
        const existing = d.parts.find((p) => p.partNumber === r.partNumber)
        if (existing) {
          Object.assign(existing, { ...r, id: existing.id, slug: existing.slug, stockStatus: stockStatusFor(r.stockQty, r.reorderLevel) })
          updated++
        } else {
          d.parts.push({ ...r, id: randomUUID(), slug: slugify(`${r.name}-${r.partNumber}`), currency: "PHP", stockStatus: stockStatusFor(r.stockQty, r.reorderLevel) } as Part)
          inserted++
        }
      }
      return { ok: true, data: { inserted, updated } }
    },

    /* ---------------------------------- quotes -------------------------------- */

    async listQuotes({ status, type, q }) {
      const d = db()
      const needle = q?.toLowerCase()
      return d.quotes
        .filter((x) => !status || (status === "open" ? ["new", "in_review", "quoted"].includes(x.status) : x.status === status))
        .filter((x) => !type || x.type === type)
        .map((x) => quoteRow(d, x))
        .filter((x) => !needle || [x.reference, x.contactName, x.contactEmail, x.company, x.subject].some((v) => v?.toLowerCase().includes(needle)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async getQuote(id): Promise<AdminQuote | null> {
      const d = db()
      const q = d.quotes.find((x) => x.id === id)
      if (!q) return null
      const t = quoteTotal(d, q)
      return {
        ...quoteRow(d, q),
        customerId: q.customerId,
        truckSlug: q.truckSlug,
        partSlug: q.partSlug,
        message: q.message,
        quantity: q.quantity,
        financing: q.financing,
        tradeIn: q.tradeIn,
        items: d.quoteItems.filter((i) => i.quoteId === q.id).map((i) => ({ id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: round2(i.quantity * i.unitPrice) })),
        subtotal: t.subtotal,
        discount: q.discount,
        vatRate: q.vatRate,
        vatAmount: t.vat,
        validUntil: q.validUntil,
        terms: q.terms,
        responseMessage: q.responseMessage,
        respondedAt: q.respondedAt,
        hasPdf: ["quoted", "accepted"].includes(q.status),
        attachmentUrls: [],
        notes: notesFor(d, "quote", q.id),
      }
    },
    async saveQuote(id, v) {
      const d = db()
      const q = d.quotes.find((x) => x.id === id)
      if (!q) return fail("Quote not found.")
      d.quoteItems = d.quoteItems.filter((i) => i.quoteId !== id)
      for (const it of v.items) d.quoteItems.push({ id: randomUUID(), quoteId: id, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })
      Object.assign(q, { discount: v.discount, validUntil: v.validUntil, terms: v.terms, responseMessage: v.responseMessage, assignedTo: v.assignedTo })
      if (q.status === "new") q.status = "in_review"
      return { ok: true }
    },
    async setQuoteStatus(id, status) {
      const d = db()
      const q = d.quotes.find((x) => x.id === id)
      if (!q) return fail("Quote not found.")
      if (status === "quoted" && !d.quoteItems.some((i) => i.quoteId === id)) return fail("Add at least one line item before sending the quote.")
      q.status = status
      if (status === "quoted") {
        q.respondedAt = now()
        const profileId = d.customers.find((c) => c.id === q.customerId)?.profileId
        if (profileId)
          d.notifications.push({ id: randomUUID(), recipientId: profileId, recipientRole: null, type: "quote.quoted", title: "Your quote is ready", body: `${q.reference} · ${quoteRow(d, q).subject}`, link: `/account/quotes/${q.id}`, readAt: null, createdAt: now() })
      }
      return { ok: true }
    },
    async markQuotePdf() {
      return { ok: true }
    },

    /* --------------------------------- bookings ------------------------------- */

    async listBookings({ status, branch }) {
      const d = db()
      return d.bookings
        .filter((b) => !status || (status === "open" ? ["pending", "confirmed", "rescheduled"].includes(b.status) : b.status === status))
        .filter((b) => !branch || b.branchSlug === branch)
        .map((b) => bookingRow(d, b))
        .sort((a, b) => Number(b.isBreakdown && b.status === "pending") - Number(a.isBreakdown && a.status === "pending") || b.createdAt.localeCompare(a.createdAt))
    },
    async getBooking(id): Promise<AdminBooking | null> {
      const d = db()
      const b = d.bookings.find((x) => x.id === id)
      if (!b) return null
      return {
        ...bookingRow(d, b),
        customerId: b.customerId,
        fleetUnitId: b.fleetUnitId,
        truckMake: b.truckMake,
        truckModel: b.truckModel,
        truckYear: b.truckYear,
        mileageKm: b.mileageKm,
        issue: b.issue,
        cancelReason: b.cancelReason,
        photoUrls: [],
        notes: notesFor(d, "booking", b.id),
      }
    },
    async updateBooking(id, v) {
      const d = db()
      const b = d.bookings.find((x) => x.id === id)
      if (!b) return fail("Booking not found.")
      const prev = b.status
      b.status = v.status
      if (v.scheduledAt !== undefined) b.scheduledAt = v.scheduledAt
      if (v.status === "cancelled") b.cancelReason = v.cancelReason || "Cancelled by JAC Motors"
      const profileId = d.customers.find((c) => c.id === b.customerId)?.profileId
      if (profileId && prev !== v.status && ["confirmed", "rescheduled", "cancelled"].includes(v.status)) {
        d.notifications.push({
          id: randomUUID(),
          recipientId: profileId,
          recipientRole: null,
          type: `booking.${v.status}`,
          title: v.status === "confirmed" ? "Service booking confirmed" : v.status === "rescheduled" ? "Service booking rescheduled" : "Service booking cancelled",
          body: `${b.reference} · ${b.truckModel}`,
          link: `/account/bookings/${b.id}`,
          readAt: null,
          createdAt: now(),
        })
      }
      return { ok: true }
    },
    async convertBooking(id, v) {
      const d = db()
      const b = d.bookings.find((x) => x.id === id)
      if (!b) return fail("Booking not found.")
      if (d.jobs.some((j) => j.bookingId === id)) return fail("This booking already has a job order.")
      const job: DJob = {
        id: randomUUID(),
        reference: nextReference(d, "JO"),
        bookingId: b.id,
        customerId: b.customerId,
        fleetUnitId: b.fleetUnitId,
        branchSlug: b.branchSlug,
        status: "received",
        advisorId: session.userId,
        mechanicId: v.mechanicId,
        truckMake: b.truckMake,
        truckModel: b.truckModel,
        plateNumber: b.plateNumber,
        mileageInKm: b.mileageKm,
        complaint: b.issue,
        diagnosis: null,
        recommendation: null,
        customerNotes: null,
        promisedAt: v.promisedAt,
        receivedAt: now(),
        releasedAt: null,
        readyAt: null,
        auto: null,
      }
      d.jobs.push(job)
      // mirrors the insert trigger: first timeline event + customer notification
      job.status = "received"
      d.jobEvents.push({ id: randomUUID(), jobId: job.id, from: null, to: "received", note: null, actorId: session.userId, at: now(), visible: true })
      const profileId = d.customers.find((c) => c.id === b.customerId)?.profileId
      if (profileId)
        d.notifications.push({ id: randomUUID(), recipientId: profileId, recipientRole: null, type: "job.status_changed", title: "We've received your truck", body: `${job.reference} · ${job.truckModel}`, link: `/account/jobs/${job.id}`, readAt: null, createdAt: now() })
      b.status = "converted"
      return { ok: true, data: { jobId: job.id } }
    },

    /* ---------------------------------- jobs ---------------------------------- */

    async listJobs({ status, mechanicId, branch }) {
      const d = db()
      return d.jobs
        .filter(visibleJob)
        .filter((j) => !status || (status === "active" ? !["released", "cancelled"].includes(j.status) : j.status === status))
        .filter((j) => !mechanicId || j.mechanicId === mechanicId)
        .filter((j) => !branch || j.branchSlug === branch)
        .map((j) => jobRow(d, j))
        .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    },
    async getJob(id): Promise<AdminJob | null> {
      const d = db()
      const j = d.jobs.find((x) => x.id === id && visibleJob(x))
      if (!j) return null
      const t = jobTotals(d, j)
      const c = d.customers.find((x) => x.id === j.customerId)
      const inv = d.invoices.find((i) => i.jobId === j.id)
      const invTotal = inv ? round2((d.invoiceItems.filter((i) => i.invoiceId === inv.id).reduce((s, i) => s + i.quantity * i.unitPrice, 0) - inv.discount) * (1 + inv.vatRate)) : 0
      return {
        ...jobRow(d, j),
        customerId: j.customerId,
        customerPhone: c?.phone ?? null,
        customerEmail: c?.email ?? null,
        fleetUnitId: j.fleetUnitId,
        bookingId: j.bookingId,
        bookingReference: d.bookings.find((b) => b.id === j.bookingId)?.reference ?? null,
        mileageInKm: j.mileageInKm,
        diagnosis: j.diagnosis,
        recommendation: j.recommendation,
        customerNotes: j.customerNotes,
        items: t.items.map((i) => ({ id: i.id, type: i.type, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: round2(i.quantity * i.unitPrice) })),
        laborTotal: t.labor,
        partsTotal: t.parts,
        miscTotal: t.misc,
        events: d.jobEvents
          .filter((e) => e.jobId === j.id)
          .sort((a, b) => a.at.localeCompare(b.at))
          .map((e) => ({ id: e.id, from: e.from, to: e.to, note: e.note, actor: d.profiles.find((p) => p.id === e.actorId)?.fullName ?? null, at: e.at })),
        notes: notesFor(d, "job_order", j.id),
        invoice: inv ? { id: inv.id, reference: inv.reference, status: inv.status, total: invTotal } : null,
      }
    },
    async setJobStatus(id, status, note) {
      const d = db()
      const j = d.jobs.find((x) => x.id === id && visibleJob(x))
      if (!j) return fail("Job not found.")
      if (role === "mechanic" && !(MECHANIC_STATUSES as readonly string[]).includes(status)) return fail("Only a service advisor can release or cancel a job.")
      j.auto = null
      applyJobStatus(d, j, status as JobStatus, session.userId, note)
      return { ok: true }
    },
    async updateJob(id, v) {
      const d = db()
      const j = d.jobs.find((x) => x.id === id && visibleJob(x))
      if (!j) return fail("Job not found.")
      if (role === "mechanic" && (v.mechanicId !== undefined || v.promisedAt !== undefined)) return fail("Mechanics can only update diagnosis notes.")
      if (v.mechanicId !== undefined) j.mechanicId = v.mechanicId
      if (v.diagnosis !== undefined) j.diagnosis = v.diagnosis
      if (v.recommendation !== undefined) j.recommendation = v.recommendation
      if (v.customerNotes !== undefined) j.customerNotes = v.customerNotes
      if (v.promisedAt !== undefined) j.promisedAt = v.promisedAt
      return { ok: true }
    },
    async addJobItem(jobId, v) {
      const d = db()
      const j = d.jobs.find((x) => x.id === jobId && visibleJob(x))
      if (!j) return fail("Job not found.")
      if (role === "mechanic" && !["diagnosing", "awaiting_parts", "in_progress"].includes(j.status)) return fail("Items can be added while the job is being worked on.")
      d.jobItems.push({ id: randomUUID(), jobId, type: v.type, description: v.description, quantity: v.quantity, unitPrice: v.unitPrice })
      return { ok: true }
    },
    async removeJobItem(jobId, itemId) {
      if (role === "mechanic") return fail("Ask your service advisor to remove items.")
      const d = db()
      d.jobItems = d.jobItems.filter((i) => !(i.id === itemId && i.jobId === jobId))
      return { ok: true }
    },
    async createInvoice(jobId) {
      const d = db()
      const j = d.jobs.find((x) => x.id === jobId)
      if (!j) return fail("Job not found.")
      const existing = d.invoices.find((i) => i.jobId === jobId)
      if (existing) return { ok: true, data: { id: existing.id, reference: existing.reference } }
      const items = d.jobItems.filter((i) => i.jobId === jobId)
      if (!items.length) return fail("Add labour or parts before invoicing.")
      const c = d.customers.find((x) => x.id === j.customerId)
      const co = d.companies.find((x) => x.id === c?.companyId)
      const id = randomUUID()
      const reference = nextReference(d, "INV")
      d.invoices.push({
        id,
        reference,
        customerId: j.customerId,
        jobId,
        quoteId: null,
        branchSlug: j.branchSlug,
        status: "issued",
        billToName: c?.fullName ?? "Walk-in customer",
        billToCompany: co?.name ?? null,
        billToTin: co?.tin ?? null,
        billToAddress: co ? [co.address, co.city].filter(Boolean).join(", ") : null,
        discount: 0,
        vatRate: 0.12,
        amountPaid: 0,
        issuedAt: now(),
        dueDate: null,
        notes: null,
        createdAt: now(),
      })
      for (const it of items) d.invoiceItems.push({ id: randomUUID(), invoiceId: id, type: it.type, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })
      return { ok: true, data: { id, reference } }
    },

    async addNote(entityType, entityId, body) {
      db().staffNotes.push({ id: randomUUID(), entityType, entityId, body, authorId: session.userId, createdAt: now() })
      return { ok: true }
    },

    /* -------------------------------- customers ------------------------------- */

    async listCustomers({ q }) {
      const d = db()
      const needle = q?.toLowerCase()
      return d.customers
        .map(
          (c): AdminCustomerRow => ({
            id: c.id,
            fullName: c.fullName,
            email: c.email,
            phone: c.phone,
            company: d.companies.find((x) => x.id === c.companyId)?.name ?? null,
            hasAccount: Boolean(c.profileId),
            fleetCount: d.fleet.filter((u) => u.customerId === c.id).length,
            openJobs: d.jobs.filter((j) => j.customerId === c.id && !["released", "cancelled"].includes(j.status)).length,
            quoteCount: d.quotes.filter((x) => x.customerId === c.id).length,
            createdAt: c.createdAt,
          }),
        )
        .filter((c) => !needle || [c.fullName, c.email, c.phone, c.company].some((v) => v?.toLowerCase().includes(needle)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async getCustomer(id): Promise<AdminCustomer | null> {
      const d = db()
      const row = (await this.listCustomers({})).find((c) => c.id === id)
      if (!row) return null
      const c = d.customers.find((x) => x.id === id)!
      const co = d.companies.find((x) => x.id === c.companyId)
      return {
        ...row,
        companyDetail: co ? { name: co.name, tin: co.tin, industry: co.industry, fleetSize: co.fleetSize, address: co.address, city: co.city } : null,
        fleet: d.fleet.filter((u) => u.customerId === id).map(mapFleet),
        jobs: d.jobs.filter((j) => j.customerId === id).map((j) => jobRow(d, j)),
        quotes: d.quotes.filter((q) => q.customerId === id).map((q) => quoteRow(d, q)),
        bookings: d.bookings.filter((b) => b.customerId === id).map((b) => bookingRow(d, b)),
      }
    },
  }
}
