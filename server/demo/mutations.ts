import "server-only"

import { randomUUID } from "node:crypto"
import type { z } from "zod"
import type { BookingValues } from "@/lib/validation/booking"
import type { companySchema, fleetUnitSchema, profileSchema } from "@/lib/validation/portal"
import type { FinancingEstimate, TradeInDetails } from "@/lib/validation/quote"
import type { SessionContext } from "@/server/auth"
import { demoDb, nextReference, tickDemo, type DCustomer, type DemoDb } from "./store"

/**
 * DEMO MODE writes. Each mirrors a Supabase write + the triggers/RLS rules
 * that would apply, so the demo behaves like production.
 */

const now = () => new Date().toISOString()
const blank = (v: string | undefined | null) => (v && v.length ? v : null)
type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> }

function customerOf(db: DemoDb, session: SessionContext) {
  const c = db.customers.find((x) => x.profileId === session.userId)
  if (!c) throw new Error("Demo customer not found")
  return c
}

/* -------------------------------- portal ------------------------------- */

export const demoMutations = {
  updateProfile(session: SessionContext, v: z.output<typeof profileSchema>): Result {
    const db = demoDb()
    const p = db.profiles.find((x) => x.id === session.userId)
    if (p) Object.assign(p, { fullName: v.fullName, phone: blank(v.phone) })
    const c = db.customers.find((x) => x.profileId === session.userId)
    if (c) Object.assign(c, { fullName: v.fullName, phone: blank(v.phone) })
    return { ok: true }
  },

  saveCompany(session: SessionContext, v: z.output<typeof companySchema>): Result {
    const db = demoDb()
    const c = customerOf(db, session)
    const row = {
      name: v.name,
      tin: blank(v.tin),
      industry: blank(v.industry),
      fleetSize: v.fleetSize ?? null,
      email: blank(v.email),
      phone: blank(v.phone),
      address: blank(v.address),
      city: blank(v.city),
      province: blank(v.province),
    }
    const existing = db.companies.find((x) => x.id === c.companyId)
    if (existing) Object.assign(existing, row)
    else {
      const id = randomUUID()
      db.companies.push({ id, ...row })
      c.companyId = id
      for (const u of db.fleet) if (u.customerId === c.id && !u.companyId) u.companyId = id
    }
    return { ok: true }
  },

  saveFleetUnit(session: SessionContext, v: z.output<typeof fleetUnitSchema>): Result<{ id: string }> {
    const db = demoDb()
    const c = customerOf(db, session)
    const plate = v.plateNumber ? v.plateNumber.toUpperCase() : null
    if (plate && db.fleet.some((u) => u.plateNumber === plate && u.id !== v.id)) {
      return { ok: false, error: "That plate number or VIN is already registered to another unit. Contact us if this is your truck." }
    }
    const row = {
      nickname: blank(v.nickname),
      make: v.make,
      model: v.model,
      year: v.year ?? null,
      plateNumber: plate,
      vin: v.vin ? v.vin.toUpperCase() : null,
      engineNumber: blank(v.engineNumber),
      color: blank(v.color),
      purchaseDate: blank(v.purchaseDate),
      currentMileageKm: v.currentMileageKm ?? 0,
      mileageUpdatedAt: now(),
      lastServiceDate: blank(v.lastServiceDate),
      lastServiceMileageKm: v.lastServiceMileageKm ?? null,
      serviceIntervalKm: v.serviceIntervalKm ?? 10000,
      serviceIntervalMonths: v.serviceIntervalMonths ?? 6,
      remindersEnabled: v.remindersEnabled,
      notes: blank(v.notes),
    }
    if (v.id) {
      const u = db.fleet.find((x) => x.id === v.id && x.customerId === c.id)
      if (!u) return { ok: false, error: "Truck not found." }
      Object.assign(u, row)
      return { ok: true, data: { id: u.id } }
    }
    const id = randomUUID()
    db.fleet.push({ id, customerId: c.id, companyId: c.companyId, createdAt: now(), ...row })
    return { ok: true, data: { id } }
  },

  updateMileage(session: SessionContext, id: string, km: number): Result {
    const db = demoDb()
    const c = customerOf(db, session)
    const u = db.fleet.find((x) => x.id === id && x.customerId === c.id)
    if (!u) return { ok: false, error: "Truck not found." }
    if (km < u.currentMileageKm) return { ok: false, error: `Odometer can't go below the last reading (${u.currentMileageKm.toLocaleString("en-PH")} km).` }
    u.currentMileageKm = km
    u.mileageUpdatedAt = now()
    return { ok: true }
  },

  deleteFleetUnit(session: SessionContext, id: string) {
    const db = demoDb()
    const c = customerOf(db, session)
    db.fleet = db.fleet.filter((u) => !(u.id === id && u.customerId === c.id))
    for (const j of db.jobs) if (j.fleetUnitId === id) j.fleetUnitId = null
  },

  cancelBooking(session: SessionContext, id: string, reason: string): Result {
    const db = demoDb()
    const c = customerOf(db, session)
    const b = db.bookings.find((x) => x.id === id && x.customerId === c.id && ["pending", "confirmed", "rescheduled"].includes(x.status))
    if (!b) return { ok: false, error: "This booking can no longer be cancelled online — please call the branch." }
    b.status = "cancelled"
    b.cancelReason = reason || "Cancelled by customer"
    return { ok: true }
  },

  markNotificationsRead(session: SessionContext, ids?: string[]) {
    const db = demoDb()
    for (const n of db.notifications) if (n.recipientId === session.userId && !n.readAt && (!ids?.length || ids.includes(n.id))) n.readAt = now()
  },
}

/* --------------------------- public submissions --------------------------- */

/** Logged-in demo customer, or a fresh unlinked "lead" customer (like production). */
function resolveDemoCustomer(db: DemoDb, session: SessionContext | null, contact: { name: string; email: string; phone: string }): DCustomer {
  if (session?.isDemo && session.customer) {
    const c = db.customers.find((x) => x.id === session.customer!.id)
    if (c) return c
  }
  const existing = db.customers.find((c) => !c.profileId && c.email.toLowerCase() === contact.email.toLowerCase())
  if (existing) return existing
  const c: DCustomer = { id: randomUUID(), profileId: null, companyId: null, fullName: contact.name, email: contact.email, phone: contact.phone, createdAt: now() }
  db.customers.push(c)
  return c
}

function staffAlert(db: DemoDb, role: "sales" | "parts" | "service_advisor", type: string, title: string, body: string, link: string) {
  db.notifications.push({ id: randomUUID(), recipientId: null, recipientRole: role, type, title, body, link, readAt: null, createdAt: now() })
}

export const demoSubmissions = {
  quote(
    session: SessionContext | null,
    v: {
      type: "truck" | "part"
      name: string
      email: string
      phone: string
      company?: string
      branch?: string
      message?: string
      quantity?: number
      truckSlug?: string
      partSlug?: string
      financing?: FinancingEstimate
      tradeIn?: TradeInDetails
      attachments?: number
    },
  ) {
    const db = demoDb()
    tickDemo(db)
    const customer = resolveDemoCustomer(db, session, v)
    const id = randomUUID()
    const reference = nextReference(db, "Q")
    db.quotes.push({
      id,
      reference,
      type: v.type,
      customerId: customer.id,
      truckSlug: v.truckSlug ?? null,
      partSlug: v.partSlug ?? null,
      branchSlug: v.branch || null,
      status: "new",
      contactName: v.name,
      contactEmail: v.email,
      contactPhone: v.phone,
      company: v.company || null,
      message: v.message || null,
      quantity: v.quantity ?? 1,
      financing: (v.financing as Record<string, number> | undefined) ?? null,
      tradeIn: v.tradeIn && (v.tradeIn.make || v.tradeIn.model) ? (v.tradeIn as Record<string, unknown>) : null,
      discount: 0,
      vatRate: 0.12,
      validUntil: null,
      terms: null,
      responseMessage: null,
      assignedTo: null,
      respondedAt: null,
      createdAt: now(),
      attachments: v.attachments ?? 0,
    })
    staffAlert(db, v.type === "part" ? "parts" : "sales", "quote.created", `New ${v.type} quote request`, `${reference} · ${v.name}`, `/admin/quotes/${id}`)
    return reference
  },

  booking(session: SessionContext | null, v: BookingValues) {
    const db = demoDb()
    const customer = resolveDemoCustomer(db, session, v)
    const unit = db.fleet.find((u) => u.customerId === customer.id && v.plateNumber && u.plateNumber === v.plateNumber.toUpperCase())
    const id = randomUUID()
    const reference = nextReference(db, "BK")
    db.bookings.push({
      id,
      reference,
      customerId: customer.id,
      fleetUnitId: unit?.id ?? null,
      serviceSlug: v.serviceSlug || null,
      branchSlug: v.branch,
      status: "pending",
      contactName: v.name,
      contactEmail: v.email,
      contactPhone: v.phone,
      company: v.company || null,
      truckMake: v.truckMake,
      truckModel: v.truckModel,
      truckYear: v.truckYear ?? null,
      plateNumber: v.plateNumber ? v.plateNumber.toUpperCase() : null,
      mileageKm: v.mileageKm ?? null,
      issue: v.issue,
      isBreakdown: v.isBreakdown,
      photoCount: v.photoPaths.length,
      preferredDate: v.preferredDate,
      timeSlot: v.timeSlot,
      scheduledAt: null,
      cancelReason: null,
      createdAt: now(),
      source: "website",
    })
    staffAlert(db, "service_advisor", "booking.received", v.isBreakdown ? "BREAKDOWN booking" : "New service booking", `${reference} · ${v.name} · ${v.truckModel}`, `/admin/bookings/${id}`)
    return reference
  },
}
