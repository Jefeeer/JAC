import type { FleetUnit } from "@/server/queries/portal"
import type { BookingStatus, JobStatus, Part, QuoteStatus, QuoteType, Truck, UserRole } from "@/types/domain"

/** Shapes returned by the admin repository (Supabase or DEMO MODE). */

export type StaffRef = { id: string; name: string; role: UserRole }
export type StaffNote = { id: string; body: string; author: string; at: string }

export type AdminStats = {
  trucksPublished: number
  trucksTotal: number
  trucksAvailable: number
  openQuotes: number
  newQuotes: number
  jobsActive: number
  jobsReady: number
  pendingBookings: number
  breakdownBookings: number
  todaysBookings: number
  monthSales: number
  monthInvoices: number
  lowStock: number
  outOfStock: number
  /** last 6 months, oldest first: { month: "2026-05", total } */
  salesTrend: { month: string; total: number }[]
}

export type AdminQuoteRow = {
  id: string
  reference: string
  type: QuoteType
  status: QuoteStatus
  createdAt: string
  contactName: string
  contactEmail: string
  contactPhone: string
  company: string | null
  subject: string
  total: number
  assignedTo: StaffRef | null
  branchSlug: string | null
  attachments: number
}

export type QuoteLine = { id?: string; description: string; quantity: number; unitPrice: number }

export type AdminQuote = AdminQuoteRow & {
  customerId: string | null
  truckSlug: string | null
  partSlug: string | null
  message: string | null
  quantity: number | null
  financing: Record<string, number> | null
  tradeIn: Record<string, unknown> | null
  items: (QuoteLine & { id: string; lineTotal: number })[]
  subtotal: number
  discount: number
  vatRate: number
  vatAmount: number
  validUntil: string | null
  terms: string | null
  responseMessage: string | null
  respondedAt: string | null
  hasPdf: boolean
  attachmentUrls: string[]
  notes: StaffNote[]
}

export type AdminBookingRow = {
  id: string
  reference: string
  status: BookingStatus
  createdAt: string
  contactName: string
  contactPhone: string
  contactEmail: string | null
  company: string | null
  truckLabel: string
  plateNumber: string | null
  serviceName: string | null
  isBreakdown: boolean
  preferredDate: string
  timeSlot: string
  scheduledAt: string | null
  branchSlug: string | null
  jobId: string | null
}

export type AdminBooking = AdminBookingRow & {
  customerId: string | null
  fleetUnitId: string | null
  truckMake: string
  truckModel: string
  truckYear: number | null
  mileageKm: number | null
  issue: string
  cancelReason: string | null
  photoUrls: string[]
  notes: StaffNote[]
}

export type AdminJobRow = {
  id: string
  reference: string
  status: JobStatus
  truckLabel: string
  plateNumber: string | null
  customerName: string
  branchSlug: string | null
  mechanic: StaffRef | null
  advisor: StaffRef | null
  receivedAt: string
  promisedAt: string | null
  grandTotal: number
  complaint: string
}

export type JobLine = { id: string; type: "labor" | "part" | "misc"; description: string; quantity: number; unitPrice: number; lineTotal: number }

export type AdminJob = AdminJobRow & {
  customerId: string | null
  customerPhone: string | null
  customerEmail: string | null
  fleetUnitId: string | null
  bookingId: string | null
  bookingReference: string | null
  mileageInKm: number | null
  diagnosis: string | null
  recommendation: string | null
  customerNotes: string | null
  items: JobLine[]
  laborTotal: number
  partsTotal: number
  miscTotal: number
  events: { id: string; from: JobStatus | null; to: JobStatus; note: string | null; actor: string | null; at: string }[]
  notes: StaffNote[]
  invoice: { id: string; reference: string; status: string; total: number } | null
}

export type AdminCustomerRow = {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  company: string | null
  hasAccount: boolean
  fleetCount: number
  openJobs: number
  quoteCount: number
  createdAt: string
}

export type AdminCustomer = AdminCustomerRow & {
  companyDetail: { name: string; tin: string | null; industry: string | null; fleetSize: number | null; address: string | null; city: string | null } | null
  fleet: FleetUnit[]
  jobs: AdminJobRow[]
  quotes: AdminQuoteRow[]
  bookings: AdminBookingRow[]
}

export type AdminNotification = { id: string; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string }

export type Ok<T = undefined> = T extends undefined ? { ok: true } : { ok: true; data: T }
export type Fail = { ok: false; error: string }
export type RepoResult<T = undefined> = Ok<T> | Fail

export type TruckInput = Omit<Truck, "id" | "images" | "currency"> & { id?: string }
export type PartInput = Omit<Part, "id" | "stockStatus" | "currency"> & { id?: string }

export type AdminRepo = {
  stats(): Promise<AdminStats>
  staff(role?: UserRole): Promise<StaffRef[]>
  notifications(limit?: number): Promise<AdminNotification[]>
  unreadCount(): Promise<number>
  markNotificationsRead(): Promise<void>

  listTrucks(f: { q?: string; status?: "published" | "draft" | "sold" }): Promise<Truck[]>
  getTruck(id: string): Promise<Truck | null>
  saveTruck(input: TruckInput): Promise<RepoResult<{ id: string; slug: string }>>
  setTruckPublished(id: string, published: boolean): Promise<RepoResult>
  deleteTruck(id: string): Promise<RepoResult>
  addTruckImage(truckId: string, img: { url: string; alt: string; storagePath?: string | null; width?: number | null; height?: number | null }): Promise<RepoResult>
  removeTruckImage(truckId: string, url: string): Promise<RepoResult>
  setPrimaryTruckImage(truckId: string, url: string): Promise<RepoResult>

  listParts(f: { q?: string; stock?: "low" | "out"; category?: string }): Promise<Part[]>
  getPart(id: string): Promise<Part | null>
  savePart(input: PartInput): Promise<RepoResult<{ id: string; slug: string }>>
  setPartStock(id: string, qty: number): Promise<RepoResult>
  setPartPublished(id: string, published: boolean): Promise<RepoResult>
  importParts(rows: PartInput[]): Promise<RepoResult<{ inserted: number; updated: number }>>

  listQuotes(f: { status?: QuoteStatus | "open"; type?: QuoteType; q?: string }): Promise<AdminQuoteRow[]>
  getQuote(id: string): Promise<AdminQuote | null>
  saveQuote(id: string, v: { items: QuoteLine[]; discount: number; validUntil: string | null; terms: string | null; responseMessage: string | null; assignedTo: string | null }): Promise<RepoResult>
  setQuoteStatus(id: string, status: QuoteStatus): Promise<RepoResult>
  markQuotePdf(id: string, path: string): Promise<RepoResult>

  listBookings(f: { status?: BookingStatus | "open"; branch?: string }): Promise<AdminBookingRow[]>
  getBooking(id: string): Promise<AdminBooking | null>
  updateBooking(id: string, v: { status: "confirmed" | "rescheduled" | "cancelled" | "no_show" | "completed"; scheduledAt?: string | null; cancelReason?: string | null }): Promise<RepoResult>
  convertBooking(id: string, v: { mechanicId: string | null; promisedAt: string | null }): Promise<RepoResult<{ jobId: string }>>

  listJobs(f: { status?: JobStatus | "active"; mechanicId?: string; branch?: string }): Promise<AdminJobRow[]>
  getJob(id: string): Promise<AdminJob | null>
  setJobStatus(id: string, status: JobStatus, note: string | null): Promise<RepoResult>
  updateJob(id: string, v: { mechanicId?: string | null; diagnosis?: string | null; recommendation?: string | null; customerNotes?: string | null; promisedAt?: string | null }): Promise<RepoResult>
  addJobItem(jobId: string, v: { type: JobLine["type"]; description: string; quantity: number; unitPrice: number; partId?: string | null }): Promise<RepoResult>
  removeJobItem(jobId: string, itemId: string): Promise<RepoResult>
  createInvoice(jobId: string): Promise<RepoResult<{ id: string; reference: string }>>

  addNote(entityType: "quote" | "booking" | "job_order" | "customer", entityId: string, body: string): Promise<RepoResult>

  listCustomers(f: { q?: string }): Promise<AdminCustomerRow[]>
  getCustomer(id: string): Promise<AdminCustomer | null>
}
