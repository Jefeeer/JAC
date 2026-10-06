/**
 * Domain types mirroring the Supabase schema (supabase/migrations).
 * Regenerate the full client types with `npm run db:types` once the project
 * is linked; these hand-written shapes are what UI components consume.
 */

export type UserRole = "customer" | "admin" | "sales" | "parts" | "service_advisor" | "mechanic"
export const STAFF_ROLES = ["admin", "sales", "parts", "service_advisor", "mechanic"] as const satisfies readonly UserRole[]

export type TruckCondition = "new" | "used"
export type TruckAvailability = "available" | "reserved" | "sold" | "incoming"
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock"
export type QuoteType = "truck" | "part" | "service"
export type QuoteStatus = "new" | "in_review" | "quoted" | "accepted" | "rejected" | "expired" | "closed"
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "converted"
  | "completed"
  | "cancelled"
  | "no_show"
export type JobStatus =
  | "received"
  | "diagnosing"
  | "awaiting_parts"
  | "in_progress"
  | "ready"
  | "released"
  | "cancelled"
export type ServiceCategory =
  | "preventive_maintenance"
  | "diagnostics"
  | "repair"
  | "overhaul"
  | "package"
  | "roadside"

export type BodyType =
  | "pickup"
  | "dropside"
  | "aluminum_van"
  | "reefer"
  | "wing_van"
  | "cab_chassis"
  | "curtainside"
  | "cargo_high_side"
  | "tanker"
  | "crew_cab"

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  pickup: "Pickup",
  dropside: "Dropside",
  aluminum_van: "Aluminum Van",
  reefer: "Refrigerated Van",
  wing_van: "Wing Van",
  cab_chassis: "Cab & Chassis",
  curtainside: "Curtainside",
  cargo_high_side: "High-side Cargo",
  tanker: "Tanker",
  crew_cab: "Crew Cab",
}

export const JOB_STATUS_FLOW: { status: JobStatus; label: string; short: string }[] = [
  { status: "received", label: "Received", short: "IN" },
  { status: "diagnosing", label: "Diagnosing", short: "DX" },
  { status: "awaiting_parts", label: "Awaiting parts", short: "PT" },
  { status: "in_progress", label: "In progress", short: "WK" },
  { status: "ready", label: "Ready", short: "RD" },
  { status: "released", label: "Released", short: "OUT" },
]

export type TruckImage = {
  url: string
  alt: string
  width?: number | null
  height?: number | null
  isPrimary?: boolean
}

export type Truck = {
  id: string
  slug: string
  stockNumber: string | null
  title: string
  brand: string
  model: string
  series: string | null
  variant: string | null
  bodyType: BodyType
  year: number
  condition: TruckCondition
  availability: TruckAvailability
  payloadTons: number | null
  gvwKg: number | null
  wheelConfig: string | null
  engine: string | null
  displacementCc: number | null
  horsepower: number | null
  torqueNm: number | null
  transmission: string | null
  fuelType: string
  emissionStandard: string | null
  wheelbaseMm: number | null
  mileageKm: number
  color: string | null
  price: number | null
  priceOnRequest: boolean
  currency: string
  summary: string | null
  description: string | null
  features: string[]
  specs: Record<string, string>
  branchSlug: string | null
  isFeatured: boolean
  isPublished: boolean
  images: TruckImage[]
}

export type PartCategory = {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  sortOrder: number
}

export type PartCompatibility = {
  model: string
  series?: string | null
  engine?: string | null
  yearFrom?: number | null
  yearTo?: number | null
  notes?: string | null
}

export type Part = {
  id: string
  slug: string
  partNumber: string
  oemNumber: string | null
  name: string
  brand: string
  categorySlug: string
  summary: string | null
  description: string | null
  specs: Record<string, string>
  price: number | null
  priceOnRequest: boolean
  currency: string
  unit: string
  stockQty: number
  reorderLevel: number
  stockStatus: StockStatus
  leadTimeDays: number | null
  weightKg: number | null
  imageUrl: string | null
  isPublished: boolean
  compatibility: PartCompatibility[]
}

export type Service = {
  id: string
  slug: string
  name: string
  category: ServiceCategory
  summary: string
  description: string
  inclusions: string[]
  estDurationHours: number | null
  startingPrice: number | null
  intervalKm: number | null
  intervalMonths: number | null
  isPackage: boolean
  sortOrder: number
}

export function stockStatusFor(qty: number, reorderLevel: number): StockStatus {
  if (qty <= 0) return "out_of_stock"
  if (qty <= reorderLevel) return "low_stock"
  return "in_stock"
}
