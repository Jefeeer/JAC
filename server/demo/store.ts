import "server-only"

import { randomUUID } from "node:crypto"
import { DEMO_ACCOUNTS } from "@/lib/demo/accounts"
import { staticParts, staticTrucks } from "@/server/queries/static-catalog"
import { JOB_STATUS_FLOW, type BookingStatus, type JobStatus, type Part, type QuoteStatus, type QuoteType, type Truck, type UserRole } from "@/types/domain"

/**
 * DEMO MODE data store — an in-memory stand-in for the Supabase tables,
 * shared by every demo session in this server process. Resets on restart
 * (or via the demo toolbar). Never used when NEXT_PUBLIC_DEMO_MODE is off.
 */

export type DCustomer = { id: string; profileId: string | null; companyId: string | null; fullName: string; email: string; phone: string | null; createdAt: string }
export type DCompany = {
  id: string
  name: string
  tin: string | null
  industry: string | null
  fleetSize: number | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  province: string | null
}
export type DProfile = { id: string; email: string; fullName: string; phone: string | null; role: UserRole; branchSlug: string | null }
export type DFleet = {
  id: string
  customerId: string
  companyId: string | null
  nickname: string | null
  make: string
  model: string
  year: number | null
  plateNumber: string | null
  vin: string | null
  engineNumber: string | null
  color: string | null
  purchaseDate: string | null
  currentMileageKm: number
  mileageUpdatedAt: string | null
  lastServiceDate: string | null
  lastServiceMileageKm: number | null
  serviceIntervalKm: number
  serviceIntervalMonths: number
  remindersEnabled: boolean
  notes: string | null
  createdAt: string
}
export type DBooking = {
  id: string
  reference: string
  customerId: string | null
  fleetUnitId: string | null
  serviceSlug: string | null
  branchSlug: string | null
  status: BookingStatus
  contactName: string
  contactEmail: string | null
  contactPhone: string
  company: string | null
  truckMake: string
  truckModel: string
  truckYear: number | null
  plateNumber: string | null
  mileageKm: number | null
  issue: string
  isBreakdown: boolean
  photoCount: number
  preferredDate: string
  timeSlot: string
  scheduledAt: string | null
  cancelReason: string | null
  createdAt: string
  source: string
}
export type DJob = {
  id: string
  reference: string
  bookingId: string | null
  customerId: string | null
  fleetUnitId: string | null
  branchSlug: string | null
  status: JobStatus
  advisorId: string | null
  mechanicId: string | null
  truckMake: string
  truckModel: string
  plateNumber: string | null
  mileageInKm: number | null
  complaint: string
  diagnosis: string | null
  recommendation: string | null
  customerNotes: string | null
  promisedAt: string | null
  receivedAt: string
  releasedAt: string | null
  readyAt: string | null
  /** demo only: auto-advance one stage every AUTO_STEP_MS until "ready" */
  auto: { startedAt: number } | null
}
export type DJobItem = { id: string; jobId: string; type: "labor" | "part" | "misc"; description: string; quantity: number; unitPrice: number }
export type DJobEvent = { id: string; jobId: string; from: JobStatus | null; to: JobStatus; note: string | null; actorId: string | null; at: string; visible: boolean }
export type DQuote = {
  id: string
  reference: string
  type: QuoteType
  customerId: string | null
  truckSlug: string | null
  partSlug: string | null
  branchSlug: string | null
  status: QuoteStatus
  contactName: string
  contactEmail: string
  contactPhone: string
  company: string | null
  message: string | null
  quantity: number | null
  financing: Record<string, number> | null
  tradeIn: Record<string, unknown> | null
  discount: number
  vatRate: number
  validUntil: string | null
  terms: string | null
  responseMessage: string | null
  assignedTo: string | null
  respondedAt: string | null
  createdAt: string
  attachments: number
}
export type DQuoteItem = { id: string; quoteId: string; description: string; quantity: number; unitPrice: number }
export type DNotification = {
  id: string
  recipientId: string | null
  recipientRole: UserRole | null
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}
export type DStaffNote = { id: string; entityType: string; entityId: string; body: string; authorId: string; createdAt: string }
export type DInvoice = {
  id: string
  reference: string
  customerId: string | null
  jobId: string | null
  quoteId: string | null
  branchSlug: string | null
  status: "draft" | "issued" | "partially_paid" | "paid" | "void"
  billToName: string
  billToCompany: string | null
  billToTin: string | null
  billToAddress: string | null
  discount: number
  vatRate: number
  amountPaid: number
  issuedAt: string | null
  dueDate: string | null
  notes: string | null
  createdAt: string
}
export type DInvoiceItem = { id: string; invoiceId: string; type: "labor" | "part" | "truck" | "misc"; description: string; quantity: number; unitPrice: number }

export type DemoDb = {
  seededAt: number
  counters: Record<string, number>
  profiles: DProfile[]
  customers: DCustomer[]
  companies: DCompany[]
  fleet: DFleet[]
  bookings: DBooking[]
  jobs: DJob[]
  jobItems: DJobItem[]
  jobEvents: DJobEvent[]
  quotes: DQuote[]
  quoteItems: DQuoteItem[]
  notifications: DNotification[]
  staffNotes: DStaffNote[]
  trucks: Truck[]
  parts: Part[]
  invoices: DInvoice[]
  invoiceItems: DInvoiceItem[]
}

export const AUTO_STEP_MS = 40_000

/* ---------------------------------------------------------------- helpers */

const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString()
const ymd = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date(ms))
const yymm = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "2-digit", month: "2-digit" }).format(new Date()).replace("-", "")

export function nextReference(db: DemoDb, prefix: "Q" | "BK" | "JO" | "INV") {
  db.counters[prefix] = (db.counters[prefix] ?? 0) + 1
  return `${prefix}-${yymm()}-${String(db.counters[prefix]).padStart(5, "0")}`
}

export const ids = Object.fromEntries(DEMO_ACCOUNTS.map((a) => [a.email.split("@")[0].split(".")[0], a.id])) as Record<
  "ana" | "ben" | "carla" | "jun" | "rico" | "mika" | "leo",
  string
>

/* ------------------------------------------------------------------- seed */

function seed(): DemoDb {
  // Deterministic ids: on Vercel every function instance seeds its own copy of
  // this store, so random ids made a link rendered by one instance (e.g. the
  // dashboard) 404 when the detail page was served by another.
  let seq = 0
  const sid = () => `00000000-0000-4000-8000-${(++seq).toString(16).padStart(12, "0")}`
  const now = Date.now()
  const db: DemoDb = {
    seededAt: now,
    counters: { Q: 40, BK: 6, JO: 41, INV: 12 },
    profiles: DEMO_ACCOUNTS.map((a) => ({ id: a.id, email: a.email, fullName: a.fullName, phone: a.phone, role: a.role, branchSlug: a.branchSlug })),
    customers: [],
    companies: [],
    fleet: [],
    bookings: [],
    jobs: [],
    jobItems: [],
    jobEvents: [],
    quotes: [],
    quoteItems: [],
    notifications: [],
    staffNotes: [],
    trucks: structuredClone(staticTrucks),
    parts: structuredClone(staticParts),
    invoices: [],
    invoiceItems: [],
  }

  /* companies + customers */
  const reyesCo: DCompany = {
    id: sid(),
    name: "Reyes Cold Chain Logistics",
    tin: "123-456-789-000",
    industry: "Cold-chain logistics",
    fleetSize: 4,
    email: "billing@reyescoldchain.demo",
    phone: "(02) 8555 0100",
    address: "12 Mindanao Ave",
    city: "Quezon City",
    province: "Metro Manila",
  }
  const hardwareCo: DCompany = { id: sid(), name: "Dela Paz Hardware & Construction Supply", tin: null, industry: "Construction supply", fleetSize: 3, email: null, phone: null, address: null, city: "Dasmariñas", province: "Cavite" }
  db.companies.push(reyesCo, hardwareCo)

  const ana: DCustomer = { id: sid(), profileId: ids.ana, companyId: reyesCo.id, fullName: "Ana Reyes", email: "ana.reyes@demo.jacmotors.ph", phone: "0917 555 0101", createdAt: iso(now - 400 * DAY) }
  const ben: DCustomer = { id: sid(), profileId: ids.ben, companyId: null, fullName: "Ben Santos", email: "ben.santos@demo.jacmotors.ph", phone: "0918 555 0202", createdAt: iso(now - 60 * DAY) }
  const marco: DCustomer = { id: sid(), profileId: null, companyId: hardwareCo.id, fullName: "Marco Dela Paz", email: "marco@delapaz.demo", phone: "0919 555 0303", createdAt: iso(now - 200 * DAY) }
  const lgu: DCustomer = { id: sid(), profileId: null, companyId: null, fullName: "Engr. Liza Ramos (LGU Motorpool)", email: "motorpool@lgu.demo", phone: "0920 555 0404", createdAt: iso(now - 30 * DAY) }
  const lead1: DCustomer = { id: sid(), profileId: null, companyId: null, fullName: "Paolo Cruz", email: "paolo.cruz@example.ph", phone: "0921 555 0505", createdAt: iso(now - 2 * DAY) }
  const lead2: DCustomer = { id: sid(), profileId: null, companyId: null, fullName: "Grace Lim", email: "grace@limfoods.demo", phone: "0922 555 0606", createdAt: iso(now - 0.3 * DAY) }
  const ramon: DCustomer = { id: sid(), profileId: null, companyId: null, fullName: "Ramon Villanueva", email: "ramon.v@example.ph", phone: "0923 555 0707", createdAt: iso(now - 25 * 60_000) }
  db.customers.push(ana, ben, marco, lgu, lead1, lead2, ramon)

  /* fleet */
  const unit = (u: Partial<DFleet> & Pick<DFleet, "customerId" | "model">): DFleet => ({
    id: sid(),
    companyId: null,
    nickname: null,
    make: "JAC",
    year: 2023,
    plateNumber: null,
    vin: null,
    engineNumber: null,
    color: "White",
    purchaseDate: null,
    currentMileageKm: 0,
    mileageUpdatedAt: iso(now - 3 * DAY),
    lastServiceDate: null,
    lastServiceMileageKm: null,
    serviceIntervalKm: 10000,
    serviceIntervalMonths: 6,
    remindersEnabled: true,
    notes: null,
    createdAt: iso(now - 300 * DAY),
    ...u,
  })
  const reefer1 = unit({ customerId: ana.id, companyId: reyesCo.id, nickname: "Reefer 1", model: "N55", plateNumber: "NAD 6513", vin: "LJ11KBBD5P1000513", currentMileageKm: 50210, lastServiceDate: ymd(now - 150 * DAY), lastServiceMileageKm: 40180, purchaseDate: "2023-02-14", notes: "Reefer body · Laguna route" })
  const hauler = unit({ customerId: ana.id, companyId: reyesCo.id, nickname: "Hauler 2", model: "N75", plateNumber: "NBC 2041", currentMileageKm: 78920, lastServiceDate: ymd(now - 40 * DAY), lastServiceMileageKm: 70100, year: 2022 })
  const pickup = unit({ customerId: ana.id, companyId: reyesCo.id, nickname: "Ops pickup", model: "T8 Pro", plateNumber: "NDE 7781", currentMileageKm: 19350, lastServiceDate: ymd(now - 170 * DAY), lastServiceMileageKm: 10020, year: 2024, color: "Navy Blue" })
  const reefer2 = unit({ customerId: ana.id, companyId: reyesCo.id, nickname: "Reefer 2", model: "N55", plateNumber: "NAF 3307", currentMileageKm: 61400, lastServiceDate: ymd(now - 210 * DAY), lastServiceMileageKm: 49800 })
  const benTruck = unit({ customerId: ben.id, model: "HFC1061", year: 2019, plateNumber: "ABK 1946", currentMileageKm: 146200, lastServiceDate: ymd(now - 70 * DAY), lastServiceMileageKm: 142000, color: "White" })
  const marcoTruck = unit({ customerId: marco.id, companyId: hardwareCo.id, model: "N75", plateNumber: "DCA 4410", currentMileageKm: 88400, year: 2021 })
  const lguTruck = unit({ customerId: lgu.id, model: "Gallop K3", plateNumber: "SKP 118", currentMileageKm: 23100, year: 2024, notes: "Water tanker" })
  db.fleet.push(reefer1, hauler, pickup, reefer2, benTruck, marcoTruck, lguTruck)

  /* job orders */
  const job = (j: Partial<DJob> & Pick<DJob, "customerId" | "truckModel" | "complaint" | "status">): DJob => {
    const created: DJob = {
    id: sid(),
    reference: nextReference(db, "JO"),
    bookingId: null,
    fleetUnitId: null,
    branchSlug: "north-edsa",
    advisorId: ids.jun,
    mechanicId: ids.rico,
    truckMake: "JAC",
    plateNumber: null,
    mileageInKm: null,
    diagnosis: null,
    recommendation: null,
    customerNotes: null,
    promisedAt: null,
    receivedAt: iso(now),
    releasedAt: null,
    readyAt: null,
    auto: null,
    ...j,
    }
    db.jobs.push(created)
    return created
  }
  const addEvents = (j: DJob, path: JobStatus[], startMs: number, stepMs: number) => {
    path.forEach((to, i) =>
      db.jobEvents.push({ id: sid(), jobId: j.id, from: i ? path[i - 1] : null, to, note: null, actorId: i ? ids.rico : ids.jun, at: iso(startMs + i * stepMs), visible: true }),
    )
  }
  const item = (jobId: string, type: DJobItem["type"], description: string, unitPrice: number, quantity = 1) =>
    db.jobItems.push({ id: sid(), jobId, type, description, quantity, unitPrice })

  // Live job — auto-advances while you watch
  const live = job({
    customerId: ana.id,
    fleetUnitId: reefer1.id,
    truckModel: "N55",
    plateNumber: reefer1.plateNumber,
    mileageInKm: 50210,
    status: "received",
    complaint: "Due for 50,000 km PMS. Rear brakes squeal when fully loaded.",
    receivedAt: iso(now - 20 * 60_000),
    promisedAt: iso(now + 6 * 3600_000),
    auto: { startedAt: now },
  })
  addEvents(live, ["received"], now - 20 * 60_000, 0)
  item(live.id, "labor", "10,000 km preventive maintenance", 3200)
  item(live.id, "part", "Oil filter — Cummins ISF 3.8 (JAC-1012010-ISF)", 780)
  item(live.id, "part", "Diesel engine oil 15W-40 CK-4, 18 L", 6950)

  const ready = job({
    customerId: ana.id,
    fleetUnitId: hauler.id,
    truckModel: "N75",
    plateNumber: hauler.plateNumber,
    mileageInKm: 78920,
    status: "ready",
    complaint: "Clutch slipping on inclines.",
    diagnosis: "Clutch disc worn beyond limit; pressure plate fingers uneven.",
    recommendation: "Replace clutch kit; check flywheel runout.",
    customerNotes: "Clutch kit replaced and flywheel resurfaced. Road-tested loaded on the Balintawak flyover.",
    receivedAt: iso(now - 1.2 * DAY),
    readyAt: iso(now - 1.5 * 3600_000),
  })
  addEvents(ready, ["received", "diagnosing", "awaiting_parts", "in_progress", "ready"], now - 1.2 * DAY, 0.25 * DAY)
  item(ready.id, "labor", "Clutch replacement", 5500)
  item(ready.id, "part", "Clutch kit — ISF 3.8 (JAC-1601010-ISF)", 14800)
  item(ready.id, "labor", "Flywheel resurfacing", 1800)

  const parts = job({
    customerId: marco.id,
    fleetUnitId: marcoTruck.id,
    branchSlug: "cavite",
    truckModel: "N75",
    plateNumber: marcoTruck.plateNumber,
    mileageInKm: 88400,
    status: "awaiting_parts",
    complaint: "Overheating in traffic.",
    diagnosis: "Water pump bearing play; radiator fins clogged.",
    receivedAt: iso(now - 2 * DAY),
    mechanicId: ids.rico,
  })
  addEvents(parts, ["received", "diagnosing", "awaiting_parts"], now - 2 * DAY, 0.3 * DAY)
  item(parts.id, "part", "Water pump — ISF 3.8", 6800)
  item(parts.id, "labor", "Cooling system service", 2400)

  const diag = job({
    customerId: lgu.id,
    fleetUnitId: lguTruck.id,
    branchSlug: "pampanga",
    truckModel: "Gallop K3",
    plateNumber: lguTruck.plateNumber,
    mileageInKm: 23100,
    status: "diagnosing",
    complaint: "PTO pump not engaging; warning light on dash.",
    receivedAt: iso(now - 5 * 3600_000),
    mechanicId: null,
  })
  addEvents(diag, ["received", "diagnosing"], now - 5 * 3600_000, 3600_000)

  // History for Ana's units
  for (const [u, daysAgo, km, total] of [
    [reefer1, 150, 40180, 11_430],
    [reefer1, 330, 30050, 9_870],
    [hauler, 40, 70100, 12_200],
    [pickup, 170, 10020, 5_400],
  ] as const) {
    const h = job({
      customerId: ana.id,
      fleetUnitId: u.id,
      truckModel: u.model,
      plateNumber: u.plateNumber,
      mileageInKm: km,
      status: "released",
      complaint: "Scheduled preventive maintenance.",
      customerNotes: "PMS completed. All fluids topped up.",
      receivedAt: iso(now - daysAgo * DAY),
      readyAt: iso(now - daysAgo * DAY + 5 * 3600_000),
      releasedAt: iso(now - daysAgo * DAY + 7 * 3600_000),
    })
    addEvents(h, ["received", "diagnosing", "in_progress", "ready", "released"], now - daysAgo * DAY, 1.5 * 3600_000)
    item(h.id, "labor", "Preventive maintenance", Math.round(total * 0.35))
    item(h.id, "part", "Filters & fluids", Math.round(total * 0.65))
  }

  /* bookings */
  const booking = (b: Partial<DBooking> & Pick<DBooking, "contactName" | "truckModel" | "issue" | "preferredDate" | "status">): DBooking => ({
    id: sid(),
    reference: nextReference(db, "BK"),
    customerId: null,
    fleetUnitId: null,
    serviceSlug: null,
    branchSlug: "north-edsa",
    contactEmail: null,
    contactPhone: "0917 555 0000",
    company: null,
    truckMake: "JAC",
    truckYear: null,
    plateNumber: null,
    mileageKm: null,
    isBreakdown: false,
    photoCount: 0,
    timeSlot: "08:00-10:00",
    scheduledAt: null,
    cancelReason: null,
    createdAt: iso(now - DAY),
    source: "website",
    ...b,
  })
  db.bookings.push(
    booking({
      customerId: ana.id,
      fleetUnitId: pickup.id,
      contactName: "Ana Reyes",
      contactEmail: ana.email,
      contactPhone: ana.phone!,
      company: reyesCo.name,
      truckModel: "T8 Pro",
      plateNumber: pickup.plateNumber,
      mileageKm: 19350,
      serviceSlug: "pms-10000",
      issue: "20,000 km PMS for the ops pickup.",
      preferredDate: ymd(now + 3 * DAY),
      scheduledAt: new Date(`${ymd(now + 3 * DAY)}T08:30:00+08:00`).toISOString(),
      status: "confirmed",
      createdAt: iso(now - 2 * DAY),
    }),
    booking({
      customerId: ana.id,
      fleetUnitId: reefer2.id,
      contactName: "Ana Reyes",
      contactEmail: ana.email,
      contactPhone: ana.phone!,
      company: reyesCo.name,
      truckModel: "N55",
      plateNumber: reefer2.plateNumber,
      mileageKm: 61400,
      serviceSlug: "pms-10000",
      issue: "Overdue PMS — also check reefer unit compressor noise.",
      preferredDate: ymd(now + 6 * DAY),
      timeSlot: "13:00-15:00",
      status: "pending",
      createdAt: iso(now - 0.2 * DAY),
    }),
    booking({
      customerId: ben.id,
      fleetUnitId: benTruck.id,
      contactName: "Ben Santos",
      contactEmail: ben.email,
      contactPhone: ben.phone!,
      truckModel: "HFC1061",
      truckYear: 2019,
      plateNumber: benTruck.plateNumber,
      mileageKm: 146200,
      branchSlug: "a-bonifacio",
      serviceSlug: "computer-diagnostics",
      issue: "Check-engine light on, rough idle in the morning.",
      preferredDate: ymd(now + 2 * DAY),
      timeSlot: "10:00-12:00",
      status: "pending",
      createdAt: iso(now - 0.1 * DAY),
    }),
    booking({
      customerId: ramon.id,
      contactName: "Ramon Villanueva",
      contactEmail: "ramon.v@example.ph",
      contactPhone: "0923 555 0707",
      truckModel: "N35",
      issue: "Truck won't start at the warehouse, battery replaced already. Location: Valenzuela, near NLEX Karuhatan exit.",
      isBreakdown: true,
      serviceSlug: "roadside-assistance",
      preferredDate: ymd(now),
      status: "pending",
      createdAt: iso(now - 25 * 60_000),
    }),
    booking({
      customerId: ana.id,
      contactName: "Ana Reyes",
      contactEmail: ana.email,
      contactPhone: ana.phone!,
      truckModel: "N75",
      plateNumber: hauler.plateNumber,
      issue: "Brake inspection",
      preferredDate: ymd(now - 20 * DAY),
      status: "cancelled",
      cancelReason: "Rescheduled to a later date",
      createdAt: iso(now - 25 * DAY),
    }),
  )

  /* quotes */
  const quote = (q: Partial<DQuote> & Pick<DQuote, "type" | "contactName" | "contactEmail" | "status">): DQuote => ({
    id: sid(),
    reference: nextReference(db, "Q"),
    customerId: null,
    truckSlug: null,
    partSlug: null,
    branchSlug: null,
    contactPhone: "0917 555 0000",
    company: null,
    message: null,
    quantity: 1,
    financing: null,
    tradeIn: null,
    discount: 0,
    vatRate: 0.12,
    validUntil: null,
    terms: null,
    responseMessage: null,
    assignedTo: null,
    respondedAt: null,
    createdAt: iso(now - DAY),
    attachments: 0,
    ...q,
  })
  const q1 = quote({
    type: "truck",
    customerId: ana.id,
    truckSlug: "jac-n90-box-van-2025",
    contactName: "Ana Reyes",
    contactEmail: ana.email,
    contactPhone: ana.phone!,
    company: reyesCo.name,
    status: "quoted",
    quantity: 2,
    message: "Two units for the Batangas expansion. Need delivery before December.",
    financing: { price: 2_350_000, downPaymentPct: 20, termMonths: 48, ratePct: 12, tradeInValue: 0, amountFinanced: 1_880_000, monthly: 49_506 },
    validUntil: ymd(now + 14 * DAY),
    terms: "Price inclusive of LTO registration and 1st PMS. Delivery 3–4 weeks from down payment.",
    responseMessage: "Hi Ana — thanks for the opportunity. Fleet pricing below for two N90 box vans with aluminum bodies.",
    assignedTo: ids.mika,
    respondedAt: iso(now - 1 * DAY),
    createdAt: iso(now - 4 * DAY),
    branchSlug: "a-bonifacio",
  })
  db.quoteItems.push(
    { id: sid(), quoteId: q1.id, description: "JAC N90 Box Van 18 ft, 2025 (fleet price)", quantity: 2, unitPrice: 2_098_214.29 },
    { id: sid(), quoteId: q1.id, description: "Rear liftgate, 1,000 kg", quantity: 2, unitPrice: 89_285.71 },
  )
  const q2 = quote({
    type: "part",
    customerId: ana.id,
    partSlug: "brake-shoe-set-rear-n-series",
    contactName: "Ana Reyes",
    contactEmail: ana.email,
    contactPhone: ana.phone!,
    company: reyesCo.name,
    status: "in_review",
    quantity: 4,
    message: "Truck: N55 · Plate: NAF 3307\n\nStocking up for both reefers.",
    assignedTo: ids.leo,
    createdAt: iso(now - 0.5 * DAY),
  })
  const q3 = quote({
    type: "truck",
    customerId: lead1.id,
    truckSlug: "jac-t8-pro-4x4-2025",
    contactName: lead1.fullName,
    contactEmail: lead1.email,
    contactPhone: lead1.phone!,
    status: "new",
    message: "Is the blue one still available? Can I trade in my 2015 Strada?",
    tradeIn: { make: "Mitsubishi", model: "Strada", year: 2015, mileageKm: 180000 },
    createdAt: iso(now - 2 * DAY),
  })
  const q4 = quote({
    type: "part",
    customerId: lead2.id,
    partSlug: "tyre-750r16-radial",
    contactName: lead2.fullName,
    contactEmail: lead2.email,
    contactPhone: lead2.phone!,
    company: "Lim Foods",
    status: "new",
    quantity: 6,
    attachments: 2,
    message: "Truck: N55\n\nNeed 6 pcs, delivery to Marikina please.",
    createdAt: iso(now - 0.3 * DAY),
  })
  const q5 = quote({
    type: "part",
    customerId: ana.id,
    partSlug: "oil-filter-cummins-isf38",
    contactName: "Ana Reyes",
    contactEmail: ana.email,
    status: "accepted",
    quantity: 10,
    createdAt: iso(now - 45 * DAY),
    respondedAt: iso(now - 44 * DAY),
  })
  db.quoteItems.push({ id: sid(), quoteId: q5.id, description: "Oil Filter — Cummins ISF 3.8", quantity: 10, unitPrice: 696.43 })
  db.quotes.push(q1, q2, q3, q4, q5)

  /* notifications */
  const notify = (n: Omit<DNotification, "id" | "readAt"> & { readAt?: string | null }) => db.notifications.push({ id: sid(), readAt: null, ...n })
  notify({ recipientId: ids.ana, recipientRole: null, type: "job.ready", title: "Your truck is ready for release", body: `${ready.reference} · N75 · NBC 2041`, link: `/account/jobs/${ready.id}`, createdAt: iso(now - 1.5 * 3600_000) })
  notify({ recipientId: ids.ana, recipientRole: null, type: "quote.quoted", title: "Your quote is ready", body: `${q1.reference} · 2 × JAC N90 Box Van`, link: `/account/quotes/${q1.id}`, createdAt: iso(now - DAY) })
  notify({ recipientId: ids.ana, recipientRole: null, type: "booking.confirmed", title: "Service booking confirmed", body: "T8 Pro · NDE 7781", link: "/account/bookings", createdAt: iso(now - 1.8 * DAY), readAt: iso(now - 1.7 * DAY) })
  notify({ recipientId: ids.ana, recipientRole: null, type: "reminder.maintenance", title: "Reefer 2 is overdue for PMS", body: "NAF 3307 · 61,400 km", link: `/account/fleet/${reefer2.id}`, createdAt: iso(now - 3 * DAY), readAt: iso(now - 2.5 * DAY) })
  notify({ recipientId: null, recipientRole: "service_advisor", type: "booking.received", title: "BREAKDOWN booking", body: "Ramon Villanueva · N35", link: "/admin/bookings", createdAt: iso(now - 25 * 60_000) })
  notify({ recipientId: null, recipientRole: "sales", type: "quote.created", title: "New truck quote request", body: `${q3.reference} · Paolo Cruz`, link: `/admin/quotes/${q3.id}`, createdAt: iso(now - 2 * DAY) })
  notify({ recipientId: null, recipientRole: "parts", type: "quote.created", title: "New part quote request", body: `${q4.reference} · Grace Lim`, link: `/admin/quotes/${q4.id}`, createdAt: iso(now - 0.3 * DAY) })

  for (const j of db.jobs.filter((x) => x.status === "released")) {
    const inv: DInvoice = {
      id: sid(),
      reference: nextReference(db, "INV"),
      customerId: j.customerId,
      jobId: j.id,
      quoteId: null,
      branchSlug: j.branchSlug,
      status: "paid",
      billToName: "Reyes Cold Chain Logistics",
      billToCompany: "Reyes Cold Chain Logistics",
      billToTin: "123-456-789-000",
      billToAddress: "12 Mindanao Ave, Quezon City",
      discount: 0,
      vatRate: 0.12,
      amountPaid: 0,
      issuedAt: j.releasedAt,
      dueDate: null,
      notes: null,
      createdAt: j.releasedAt ?? iso(now),
    }
    db.invoices.push(inv)
    for (const it of db.jobItems.filter((i) => i.jobId === j.id)) db.invoiceItems.push({ id: sid(), invoiceId: inv.id, type: it.type, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })
  }
  // Truck sales this month (accepted quote → invoice) for the sales KPI
  const sold = db.trucks.find((t) => t.availability === "sold")
  if (sold) {
    const inv: DInvoice = {
      id: sid(),
      reference: nextReference(db, "INV"),
      customerId: marco.id,
      jobId: null,
      quoteId: null,
      branchSlug: "north-edsa",
      status: "paid",
      billToName: "Marco Dela Paz",
      billToCompany: hardwareCo.name,
      billToTin: null,
      billToAddress: "Dasmariñas, Cavite",
      discount: 0,
      vatRate: 0.12,
      amountPaid: 0,
      // a few hours ago, so "Sales this month" is populated whatever the date
      issuedAt: iso(now - 3 * 3600_000),
      dueDate: null,
      notes: null,
      createdAt: iso(now - 3 * 3600_000),
    }
    db.invoices.push(inv)
    db.invoiceItems.push({ id: sid(), invoiceId: inv.id, type: "truck", description: sold.title, quantity: 1, unitPrice: Math.round((sold.price ?? 0) / 1.12) })
  }

  db.staffNotes.push({ id: sid(), entityType: "job_order", entityId: ready.id, body: "Customer prefers pickup after 4 PM. Call Ana before release.", authorId: ids.jun, createdAt: iso(now - 2 * 3600_000) })

  return db
}

/* ---------------------------------------------------------- singleton + tick */

const g = globalThis as unknown as { __jacDemoDb?: DemoDb }

export function demoDb(): DemoDb {
  g.__jacDemoDb ??= seed()
  return g.__jacDemoDb
}

export function resetDemoDb() {
  g.__jacDemoDb = seed()
}

/** Apply a status change exactly like the Postgres triggers would: stamps, timeline event, customer notification. */
export function applyJobStatus(db: DemoDb, job: DJob, to: JobStatus, actorId: string | null, note: string | null = null, atMs = Date.now()) {
  if (job.status === to) return
  const from = job.status
  job.status = to
  if (to === "ready") job.readyAt = iso(atMs)
  if (to === "released") {
    job.releasedAt = iso(atMs)
    const unit = db.fleet.find((f) => f.id === job.fleetUnitId)
    if (unit) {
      unit.lastServiceDate = ymd(atMs)
      unit.lastServiceMileageKm = job.mileageInKm ?? unit.lastServiceMileageKm
      unit.currentMileageKm = Math.max(unit.currentMileageKm, job.mileageInKm ?? 0)
    }
    job.auto = null
  }
  db.jobEvents.push({ id: randomUUID(), jobId: job.id, from, to, note, actorId, at: iso(atMs), visible: true })
  const customer = db.customers.find((c) => c.id === job.customerId)
  if (customer?.profileId) {
    const titles: Record<JobStatus, string> = {
      received: "We've received your truck",
      diagnosing: "Diagnosis in progress",
      awaiting_parts: "Waiting on parts",
      in_progress: "Repair work has started",
      ready: "Your truck is ready for release",
      released: "Truck released — drive safe",
      cancelled: "Job order cancelled",
    }
    db.notifications.push({
      id: randomUUID(),
      recipientId: customer.profileId,
      recipientRole: null,
      type: to === "ready" ? "job.ready" : "job.status_changed",
      title: titles[to],
      body: `${job.reference} · ${job.truckModel}${job.plateNumber ? ` · ${job.plateNumber}` : ""}`,
      link: `/account/jobs/${job.id}`,
      readAt: null,
      createdAt: iso(atMs),
    })
  }
}

const AUTO_PATH: JobStatus[] = ["received", "diagnosing", "awaiting_parts", "in_progress", "ready"]
const AUTO_NOTES: Partial<Record<JobStatus, string>> = {
  diagnosing: "ECU scan clean. Inspecting brakes and suspension.",
  awaiting_parts: "Rear brake shoes worn to 1.2 mm — set reserved from the parts counter.",
  in_progress: "Technician working on the rear axle.",
  ready: "Road test passed. Ready for pickup.",
}

/** Advance auto jobs based on elapsed time (called on every demo read). */
export function tickDemo(db: DemoDb, now = Date.now()) {
  for (const job of db.jobs) {
    if (!job.auto) continue
    const target = Math.min(AUTO_PATH.length - 1, Math.floor((now - job.auto.startedAt) / AUTO_STEP_MS))
    let idx = AUTO_PATH.indexOf(job.status)
    if (idx < 0) {
      job.auto = null
      continue
    }
    while (idx < target) {
      idx++
      const to = AUTO_PATH[idx]
      if (to === "diagnosing") job.diagnosis = "Rear brake shoes worn; front pads OK. Oil due."
      if (to === "awaiting_parts") job.recommendation = "Replace rear brake shoe set and adjust."
      if (to === "in_progress") db.jobItems.push({ id: randomUUID(), jobId: job.id, type: "part", description: "Rear brake shoe set — N-Series (JAC-3502090-N)", quantity: 1, unitPrice: 3950 })
      if (to === "ready") job.customerNotes = "PMS done, rear brake shoes replaced. Road-tested loaded."
      applyJobStatus(db, job, to, ids.rico, AUTO_NOTES[to] ?? null, job.auto.startedAt + idx * AUTO_STEP_MS)
    }
    if (job.status === "ready") job.auto = null
  }
}

/** Demo toolbar: push the live job forward one stage now. */
export function advanceLiveJob(db: DemoDb) {
  const job = db.jobs.find((j) => j.auto) ?? db.jobs.find((j) => !["ready", "released", "cancelled"].includes(j.status) && j.customerId === db.customers[0]?.id)
  if (!job) return null
  if (job.auto) job.auto.startedAt -= AUTO_STEP_MS
  else {
    const idx = JOB_STATUS_FLOW.findIndex((s) => s.status === job.status)
    const next = JOB_STATUS_FLOW[idx + 1]?.status
    if (next) applyJobStatus(db, job, next, ids.rico)
  }
  tickDemo(db)
  return job
}
