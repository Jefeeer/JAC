import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getSession } from "@/server/auth"
import { demoPortal } from "@/server/demo/portal"
import type { BookingStatus, JobStatus, QuoteStatus, QuoteType } from "@/types/domain"

/**
 * Customer-portal reads. All queries run as the signed-in user, so RLS
 * restricts every result to the customer's own records.
 */

/** In DEMO MODE returns the demo customer + profile ids; otherwise null (use Supabase). */
async function demo() {
  const session = await getSession()
  return session?.isDemo ? { customerId: session.customer?.id ?? "", profileId: session.userId, companyId: session.customer?.companyId ?? null } : null
}

const n = (v: number | string | null | undefined) => (v === null || v === undefined ? null : Number(v))

/* --------------------------------- Quotes --------------------------------- */

export type PortalQuote = {
  id: string
  reference: string
  type: QuoteType
  status: QuoteStatus
  createdAt: string
  subject: string
  subjectHref: string | null
  total: number
  validUntil: string | null
  hasPdf: boolean
}

type QuoteRow = {
  id: string
  reference: string
  quote_type: QuoteType
  status: QuoteStatus
  created_at: string
  total: number | string
  valid_until: string | null
  pdf_path: string | null
  truck: { title: string; slug: string } | null
  part: { name: string; part_number: string; slug: string } | null
}

const QUOTE_LIST = "id, reference, quote_type, status, created_at, total, valid_until, pdf_path, truck:trucks(title, slug), part:parts(name, part_number, slug)"

function mapQuote(r: QuoteRow): PortalQuote {
  return {
    id: r.id,
    reference: r.reference,
    type: r.quote_type,
    status: r.status,
    createdAt: r.created_at,
    subject: r.truck?.title ?? (r.part ? `${r.part.part_number} · ${r.part.name}` : "Service enquiry"),
    subjectHref: r.truck ? `/trucks/${r.truck.slug}` : r.part ? `/parts/${r.part.slug}` : null,
    total: Number(r.total ?? 0),
    validUntil: r.valid_until,
    hasPdf: Boolean(r.pdf_path),
  }
}

export async function listQuotes(limit = 50): Promise<PortalQuote[]> {
  const d = await demo()
  if (d) return demoPortal.listQuotes(d.customerId, limit)
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from("quotes").select(QUOTE_LIST).order("created_at", { ascending: false }).limit(limit)
  if (error) throw error
  return (data as unknown as QuoteRow[]).map(mapQuote)
}

export async function getQuote(id: string) {
  const d = await demo()
  if (d) return demoPortal.getQuote(d.customerId, id)
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("quotes")
    .select(
      `${QUOTE_LIST}, message, quantity, financing, trade_in, subtotal, discount, vat_rate, vat_amount, response_message, terms, responded_at, branch:branches(name), items:quote_items(id, description, quantity, unit_price, line_total, sort_order)`,
    )
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const r = data as unknown as QuoteRow & {
    message: string | null
    quantity: number | null
    financing: Record<string, number> | null
    trade_in: Record<string, unknown> | null
    subtotal: string | number
    discount: string | number
    vat_rate: string | number
    vat_amount: string | number
    response_message: string | null
    terms: string | null
    responded_at: string | null
    branch: { name: string } | null
    items: { id: string; description: string; quantity: string | number; unit_price: string | number; line_total: string | number; sort_order: number }[]
  }

  let pdfUrl: string | null = null
  if (r.pdf_path) {
    const { data: pdf } = await supabase.storage.from("documents").createSignedUrl(r.pdf_path, 60 * 60)
    pdfUrl = pdf?.signedUrl ?? null
  }

  return {
    ...mapQuote(r),
    message: r.message,
    quantity: r.quantity,
    financing: r.financing,
    tradeIn: r.trade_in,
    subtotal: Number(r.subtotal),
    discount: Number(r.discount),
    vatRate: Number(r.vat_rate),
    vatAmount: Number(r.vat_amount),
    responseMessage: r.response_message,
    terms: r.terms,
    respondedAt: r.responded_at,
    branchName: r.branch?.name ?? null,
    pdfUrl,
    items: [...(r.items ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ id: i.id, description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unit_price), lineTotal: Number(i.line_total) })),
  }
}

/* -------------------------------- Bookings -------------------------------- */

export type PortalBooking = {
  id: string
  reference: string
  status: BookingStatus
  truckModel: string
  plateNumber: string | null
  preferredDate: string
  timeSlot: string
  scheduledAt: string | null
  isBreakdown: boolean
  serviceName: string | null
  branchSlug: string | null
  createdAt: string
  job: { id: string; reference: string; status: JobStatus } | null
}

type BookingRow = {
  id: string
  reference: string
  status: BookingStatus
  truck_make: string
  truck_model: string
  plate_number: string | null
  preferred_date: string
  preferred_time_slot: string
  scheduled_at: string | null
  is_breakdown: boolean
  created_at: string
  service: { name: string } | null
  branch: { slug: string } | null
  job: { id: string; reference: string; status: JobStatus }[] | { id: string; reference: string; status: JobStatus } | null
}

const BOOKING_LIST =
  "id, reference, status, truck_make, truck_model, plate_number, preferred_date, preferred_time_slot, scheduled_at, is_breakdown, created_at, service:services(name), branch:branches(slug), job:job_orders(id, reference, status)"

function mapBooking(r: BookingRow): PortalBooking {
  const job = Array.isArray(r.job) ? (r.job[0] ?? null) : r.job
  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    truckModel: `${r.truck_make} ${r.truck_model}`,
    plateNumber: r.plate_number,
    preferredDate: r.preferred_date,
    timeSlot: r.preferred_time_slot,
    scheduledAt: r.scheduled_at,
    isBreakdown: r.is_breakdown,
    serviceName: r.service?.name ?? null,
    branchSlug: r.branch?.slug ?? null,
    createdAt: r.created_at,
    job,
  }
}

export async function listBookings(limit = 50): Promise<PortalBooking[]> {
  const d = await demo()
  if (d) return demoPortal.listBookings(d.customerId, limit)
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from("service_bookings").select(BOOKING_LIST).order("created_at", { ascending: false }).limit(limit)
  if (error) throw error
  return (data as unknown as BookingRow[]).map(mapBooking)
}

export async function getBooking(id: string) {
  const d = await demo()
  if (d) return demoPortal.getBooking(d.customerId, id)
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("service_bookings")
    .select(`${BOOKING_LIST}, issue_description, mileage_km, truck_year, cancel_reason, photo_paths, fleet_unit_id`)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const r = data as unknown as BookingRow & {
    issue_description: string
    mileage_km: number | null
    truck_year: number | null
    cancel_reason: string | null
    photo_paths: string[]
    fleet_unit_id: string | null
  }
  return {
    ...mapBooking(r),
    issue: r.issue_description,
    mileageKm: r.mileage_km,
    truckYear: r.truck_year,
    cancelReason: r.cancel_reason,
    photoCount: r.photo_paths?.length ?? 0,
    fleetUnitId: r.fleet_unit_id,
  }
}

/* ------------------------------- Job orders ------------------------------- */

export type PortalJob = {
  id: string
  reference: string
  status: JobStatus
  truckModel: string
  plateNumber: string | null
  receivedAt: string
  promisedAt: string | null
  readyAt: string | null
  releasedAt: string | null
  grandTotal: number
  branchSlug: string | null
  fleetUnitId: string | null
}

type JobRow = {
  id: string
  reference: string
  status: JobStatus
  truck_make: string
  truck_model: string
  plate_number: string | null
  received_at: string
  promised_at: string | null
  ready_at: string | null
  released_at: string | null
  grand_total: string | number
  fleet_unit_id: string | null
  branch: { slug: string } | null
}

const JOB_LIST = "id, reference, status, truck_make, truck_model, plate_number, received_at, promised_at, ready_at, released_at, grand_total, fleet_unit_id, branch:branches(slug)"

function mapJob(r: JobRow): PortalJob {
  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    truckModel: `${r.truck_make} ${r.truck_model}`,
    plateNumber: r.plate_number,
    receivedAt: r.received_at,
    promisedAt: r.promised_at,
    readyAt: r.ready_at,
    releasedAt: r.released_at,
    grandTotal: Number(r.grand_total ?? 0),
    branchSlug: r.branch?.slug ?? null,
    fleetUnitId: r.fleet_unit_id,
  }
}

export async function listJobs({ active, fleetUnitId, limit = 50 }: { active?: boolean; fleetUnitId?: string; limit?: number } = {}): Promise<PortalJob[]> {
  const d = await demo()
  if (d) return demoPortal.listJobs(d.customerId, { active, fleetUnitId, limit })
  const supabase = await createSupabaseServerClient()
  let q = supabase.from("job_orders").select(JOB_LIST).order("received_at", { ascending: false }).limit(limit)
  if (active) q = q.not("status", "in", "(released,cancelled)")
  if (fleetUnitId) q = q.eq("fleet_unit_id", fleetUnitId)
  const { data, error } = await q
  if (error) throw error
  return (data as unknown as JobRow[]).map(mapJob)
}

export async function getJob(id: string) {
  const d = await demo()
  if (d) return demoPortal.getJob(d.customerId, id)
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("job_orders")
    .select(
      `${JOB_LIST}, complaint, diagnosis, recommendation, customer_notes, mileage_in_km, labor_total, parts_total, misc_total,
       events:job_order_events(id, to_status, note, created_at),
       items:job_order_items(id, item_type, description, quantity, unit_price, line_total, sort_order)`,
    )
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const r = data as unknown as JobRow & {
    complaint: string
    diagnosis: string | null
    recommendation: string | null
    customer_notes: string | null
    mileage_in_km: number | null
    labor_total: string | number
    parts_total: string | number
    misc_total: string | number
    events: { id: string; to_status: JobStatus; note: string | null; created_at: string }[]
    items: { id: string; item_type: string; description: string; quantity: string | number; unit_price: string | number; line_total: string | number; sort_order: number }[]
  }
  return {
    ...mapJob(r),
    complaint: r.complaint,
    diagnosis: r.diagnosis,
    recommendation: r.recommendation,
    customerNotes: r.customer_notes,
    mileageInKm: r.mileage_in_km,
    laborTotal: Number(r.labor_total),
    partsTotal: Number(r.parts_total),
    miscTotal: Number(r.misc_total),
    events: [...(r.events ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((e) => ({ id: e.id, status: e.to_status, note: e.note, at: e.created_at })),
    items: [...(r.items ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ id: i.id, type: i.item_type, description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unit_price), lineTotal: Number(i.line_total) })),
  }
}

/* ---------------------------------- Fleet --------------------------------- */

export type FleetUnit = {
  id: string
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
  maintenance: { state: "ok" | "due_soon" | "overdue"; nextServiceKm: number; nextServiceDate: string; kmRemaining: number } | null
}

type FleetRow = {
  id: string
  nickname: string | null
  make: string
  model: string
  year: number | null
  plate_number: string | null
  vin: string | null
  engine_number: string | null
  color: string | null
  purchase_date: string | null
  current_mileage_km: number
  mileage_updated_at: string | null
  last_service_date: string | null
  last_service_mileage_km: number | null
  service_interval_km: number
  service_interval_months: number
  reminders_enabled: boolean
  notes: string | null
}

type MaintenanceRow = {
  fleet_unit_id: string
  maintenance_state: "ok" | "due_soon" | "overdue"
  next_service_mileage_km: number
  next_service_date: string
  km_remaining: number
}

function mapFleet(r: FleetRow, m?: MaintenanceRow): FleetUnit {
  return {
    id: r.id,
    nickname: r.nickname,
    make: r.make,
    model: r.model,
    year: r.year,
    plateNumber: r.plate_number,
    vin: r.vin,
    engineNumber: r.engine_number,
    color: r.color,
    purchaseDate: r.purchase_date,
    currentMileageKm: r.current_mileage_km,
    mileageUpdatedAt: r.mileage_updated_at,
    lastServiceDate: r.last_service_date,
    lastServiceMileageKm: r.last_service_mileage_km,
    serviceIntervalKm: r.service_interval_km,
    serviceIntervalMonths: r.service_interval_months,
    remindersEnabled: r.reminders_enabled,
    notes: r.notes,
    maintenance: m
      ? { state: m.maintenance_state, nextServiceKm: m.next_service_mileage_km, nextServiceDate: m.next_service_date, kmRemaining: m.km_remaining }
      : null,
  }
}

const FLEET_COLS =
  "id, nickname, make, model, year, plate_number, vin, engine_number, color, purchase_date, current_mileage_km, mileage_updated_at, last_service_date, last_service_mileage_km, service_interval_km, service_interval_months, reminders_enabled, notes"

export async function listFleet(): Promise<FleetUnit[]> {
  const d = await demo()
  if (d) return demoPortal.listFleet(d.customerId)
  const supabase = await createSupabaseServerClient()
  const [units, maint] = await Promise.all([
    supabase.from("fleet_units").select(FLEET_COLS).order("created_at"),
    supabase.from("fleet_unit_maintenance").select("fleet_unit_id, maintenance_state, next_service_mileage_km, next_service_date, km_remaining"),
  ])
  if (units.error) throw units.error
  const byId = new Map(((maint.data ?? []) as MaintenanceRow[]).map((m) => [m.fleet_unit_id, m]))
  return (units.data as FleetRow[]).map((u) => mapFleet(u, byId.get(u.id)))
}

export async function getFleetUnit(id: string): Promise<FleetUnit | null> {
  const d = await demo()
  if (d) return demoPortal.getFleetUnit(d.customerId, id)
  const supabase = await createSupabaseServerClient()
  const [unit, maint] = await Promise.all([
    supabase.from("fleet_units").select(FLEET_COLS).eq("id", id).maybeSingle(),
    supabase.from("fleet_unit_maintenance").select("fleet_unit_id, maintenance_state, next_service_mileage_km, next_service_date, km_remaining").eq("fleet_unit_id", id).maybeSingle(),
  ])
  if (unit.error) throw unit.error
  return unit.data ? mapFleet(unit.data as FleetRow, (maint.data as MaintenanceRow | null) ?? undefined) : null
}

/* ------------------------------ Notifications ----------------------------- */

export type PortalNotification = { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string }

export async function listNotifications(userId: string, limit = 50): Promise<PortalNotification[]> {
  if (await demo()) return demoPortal.listNotifications(userId, limit)
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return data.map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, link: r.link, readAt: r.read_at, createdAt: r.created_at }))
}

export async function countUnread(userId: string): Promise<number> {
  if (await demo()) return demoPortal.countUnread(userId)
  const supabase = await createSupabaseServerClient()
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null)
  return count ?? 0
}

/* --------------------------------- Company -------------------------------- */

export async function getCompany(companyId: string | null) {
  if (await demo()) return demoPortal.getCompany(companyId)
  if (!companyId) return null
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from("companies").select("id, name, tin, industry, fleet_size, email, phone, address, city, province").eq("id", companyId).maybeSingle()
  return data
}

export { n as toNumber }
