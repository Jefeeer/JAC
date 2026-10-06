import "server-only"

import { branches } from "@/lib/config/branches"
import { fallbackParts, fallbackTrucks } from "@/server/queries/catalog"
import type { FleetUnit, PortalBooking, PortalJob, PortalNotification, PortalQuote } from "@/server/queries/portal"
import { demoDb, tickDemo, type DBooking, type DFleet, type DJob, type DQuote, type DemoDb } from "./store"

/**
 * Demo equivalents of server/queries/portal.ts. Filters mirror the RLS
 * policies (own customer only, quote items only once quoted, visible events).
 */

const db = () => {
  const d = demoDb()
  tickDemo(d)
  return d
}

/* ------------------------------- mapping ------------------------------- */

const quoteTotals = (d: DemoDb, q: DQuote) => {
  const items = d.quoteItems.filter((i) => i.quoteId === q.id)
  const subtotal = Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100
  const net = Math.max(subtotal - q.discount, 0)
  const vat = Math.round(net * q.vatRate * 100) / 100
  return { items, subtotal, vat, total: Math.round((net + vat) * 100) / 100 }
}

function mapQuote(d: DemoDb, q: DQuote): PortalQuote {
  const truck = q.truckSlug ? fallbackTrucks.find((t) => t.slug === q.truckSlug) : null
  const part = q.partSlug ? fallbackParts.find((p) => p.slug === q.partSlug) : null
  return {
    id: q.id,
    reference: q.reference,
    type: q.type,
    status: q.status,
    createdAt: q.createdAt,
    subject: truck?.title ?? (part ? `${part.partNumber} · ${part.name}` : "Service enquiry"),
    subjectHref: truck ? `/trucks/${truck.slug}` : part ? `/parts/${part.slug}` : null,
    total: quoteTotals(d, q).total,
    validUntil: q.validUntil,
    hasPdf: false,
  }
}

function mapBooking(d: DemoDb, b: DBooking): PortalBooking {
  const job = d.jobs.find((j) => j.bookingId === b.id)
  return {
    id: b.id,
    reference: b.reference,
    status: b.status,
    truckModel: `${b.truckMake} ${b.truckModel}`,
    plateNumber: b.plateNumber,
    preferredDate: b.preferredDate,
    timeSlot: b.timeSlot,
    scheduledAt: b.scheduledAt,
    isBreakdown: b.isBreakdown,
    serviceName: b.serviceSlug ? (serviceNames[b.serviceSlug] ?? null) : null,
    branchSlug: b.branchSlug,
    createdAt: b.createdAt,
    job: job ? { id: job.id, reference: job.reference, status: job.status } : null,
  }
}

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

export const jobTotals = (d: DemoDb, j: DJob) => {
  const items = d.jobItems.filter((i) => i.jobId === j.id)
  const sum = (t: string[]) => items.filter((i) => t.includes(i.type)).reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const labor = sum(["labor"])
  const parts = sum(["part"])
  const misc = sum(["misc"])
  return { items, labor, parts, misc, total: labor + parts + misc }
}

function mapJob(d: DemoDb, j: DJob): PortalJob {
  return {
    id: j.id,
    reference: j.reference,
    status: j.status,
    truckModel: `${j.truckMake} ${j.truckModel}`,
    plateNumber: j.plateNumber,
    receivedAt: j.receivedAt,
    promisedAt: j.promisedAt,
    readyAt: j.readyAt,
    releasedAt: j.releasedAt,
    grandTotal: jobTotals(d, j).total,
    branchSlug: j.branchSlug,
    fleetUnitId: j.fleetUnitId,
  }
}

const addMonths = (ymd: string, months: number) => {
  const [y, m, day] = ymd.slice(0, 10).split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1 + months, day))
  return dt.toISOString().slice(0, 10)
}
const todayYmd = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date())

/** Same rules as the fleet_unit_maintenance view. */
export function maintenanceFor(u: DFleet): FleetUnit["maintenance"] {
  const nextKm = (u.lastServiceMileageKm ?? 0) + u.serviceIntervalKm
  const nextDate = addMonths(u.lastServiceDate ?? u.purchaseDate ?? u.createdAt, u.serviceIntervalMonths)
  const today = todayYmd()
  const soon = new Date(Date.parse(`${today}T00:00:00Z`) + 14 * 86_400_000).toISOString().slice(0, 10)
  const state = u.currentMileageKm >= nextKm || nextDate <= today ? "overdue" : u.currentMileageKm >= nextKm - 1000 || nextDate <= soon ? "due_soon" : "ok"
  return { state, nextServiceKm: nextKm, nextServiceDate: nextDate, kmRemaining: Math.max(nextKm - u.currentMileageKm, 0) }
}

export function mapFleet(u: DFleet): FleetUnit {
  return {
    id: u.id,
    nickname: u.nickname,
    make: u.make,
    model: u.model,
    year: u.year,
    plateNumber: u.plateNumber,
    vin: u.vin,
    engineNumber: u.engineNumber,
    color: u.color,
    purchaseDate: u.purchaseDate,
    currentMileageKm: u.currentMileageKm,
    mileageUpdatedAt: u.mileageUpdatedAt,
    lastServiceDate: u.lastServiceDate,
    lastServiceMileageKm: u.lastServiceMileageKm,
    serviceIntervalKm: u.serviceIntervalKm,
    serviceIntervalMonths: u.serviceIntervalMonths,
    remindersEnabled: u.remindersEnabled,
    notes: u.notes,
    maintenance: maintenanceFor(u),
  }
}

/* -------------------------------- reads -------------------------------- */

const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)

export const demoPortal = {
  listQuotes(customerId: string, limit = 50) {
    const d = db()
    return d.quotes.filter((q) => q.customerId === customerId).sort(byNewest).slice(0, limit).map((q) => mapQuote(d, q))
  },

  getQuote(customerId: string, id: string) {
    const d = db()
    const q = d.quotes.find((x) => x.id === id && x.customerId === customerId)
    if (!q) return null
    const t = quoteTotals(d, q)
    const visibleItems = ["new", "in_review"].includes(q.status) ? [] : t.items
    return {
      ...mapQuote(d, q),
      message: q.message,
      quantity: q.quantity,
      financing: q.financing,
      tradeIn: q.tradeIn,
      subtotal: t.subtotal,
      discount: q.discount,
      vatRate: q.vatRate,
      vatAmount: t.vat,
      responseMessage: q.responseMessage,
      terms: q.terms,
      respondedAt: q.respondedAt,
      branchName: branches.find((b) => b.slug === q.branchSlug)?.name ?? null,
      pdfUrl: null as string | null,
      items: visibleItems.map((i) => ({ id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: Math.round(i.quantity * i.unitPrice * 100) / 100 })),
    }
  },

  listBookings(customerId: string, limit = 50) {
    const d = db()
    return d.bookings.filter((b) => b.customerId === customerId).sort(byNewest).slice(0, limit).map((b) => mapBooking(d, b))
  },

  getBooking(customerId: string, id: string) {
    const d = db()
    const b = d.bookings.find((x) => x.id === id && x.customerId === customerId)
    if (!b) return null
    return { ...mapBooking(d, b), issue: b.issue, mileageKm: b.mileageKm, truckYear: b.truckYear, cancelReason: b.cancelReason, photoCount: b.photoCount, fleetUnitId: b.fleetUnitId }
  },

  listJobs(customerId: string, { active, fleetUnitId, limit = 50 }: { active?: boolean; fleetUnitId?: string; limit?: number } = {}) {
    const d = db()
    return d.jobs
      .filter((j) => j.customerId === customerId)
      .filter((j) => !active || !["released", "cancelled"].includes(j.status))
      .filter((j) => !fleetUnitId || j.fleetUnitId === fleetUnitId)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .slice(0, limit)
      .map((j) => mapJob(d, j))
  },

  getJob(customerId: string, id: string) {
    const d = db()
    const j = d.jobs.find((x) => x.id === id && x.customerId === customerId)
    if (!j) return null
    const t = jobTotals(d, j)
    return {
      ...mapJob(d, j),
      complaint: j.complaint,
      diagnosis: j.diagnosis,
      recommendation: j.recommendation,
      customerNotes: j.customerNotes,
      mileageInKm: j.mileageInKm,
      laborTotal: t.labor,
      partsTotal: t.parts,
      miscTotal: t.misc,
      events: d.jobEvents
        .filter((e) => e.jobId === j.id && e.visible)
        .sort((a, b) => a.at.localeCompare(b.at))
        .map((e) => ({ id: e.id, status: e.to, note: e.note, at: e.at })),
      items: t.items.map((i) => ({ id: i.id, type: i.type, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.quantity * i.unitPrice })),
    }
  },

  listFleet(customerId: string) {
    return db()
      .fleet.filter((u) => u.customerId === customerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(mapFleet)
  },

  getFleetUnit(customerId: string, id: string) {
    const u = db().fleet.find((x) => x.id === id && x.customerId === customerId)
    return u ? mapFleet(u) : null
  },

  listNotifications(profileId: string, limit = 50): PortalNotification[] {
    return db()
      .notifications.filter((n) => n.recipientId === profileId)
      .sort(byNewest)
      .slice(0, limit)
      .map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, readAt: n.readAt, createdAt: n.createdAt }))
  },

  countUnread(profileId: string) {
    return db().notifications.filter((n) => n.recipientId === profileId && !n.readAt).length
  },

  getCompany(companyId: string | null) {
    if (!companyId) return null
    const c = db().companies.find((x) => x.id === companyId)
    return c
      ? { id: c.id, name: c.name, tin: c.tin, industry: c.industry, fleet_size: c.fleetSize, email: c.email, phone: c.phone, address: c.address, city: c.city, province: c.province }
      : null
  },
}
