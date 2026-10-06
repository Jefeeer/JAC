import "server-only"

import { createSupabasePublicClient } from "@/lib/supabase/public"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import * as sample from "@/lib/data/seed-data"
import { stockStatusFor, type BodyType, type Part, type Service, type Truck } from "@/types/domain"

/* -------------------------------------------------------------------------- */
/*  Row → domain mappers                                                       */
/* -------------------------------------------------------------------------- */

type TruckRow = {
  id: string
  slug: string
  stock_number: string | null
  title: string
  brand: string
  model: string
  series: string | null
  variant: string | null
  body_type: string
  year: number
  condition: Truck["condition"]
  availability: Truck["availability"]
  payload_tons: number | string | null
  gvw_kg: number | null
  wheel_config: string | null
  engine: string | null
  displacement_cc: number | null
  horsepower: number | null
  torque_nm: number | null
  transmission: string | null
  fuel_type: string
  emission_standard: string | null
  wheelbase_mm: number | null
  mileage_km: number
  color: string | null
  price: number | string | null
  price_on_request: boolean
  currency: string
  summary: string | null
  description: string | null
  features: string[] | null
  specs: Record<string, string> | null
  is_featured: boolean
  is_published: boolean
  branch: { slug: string } | null
  truck_images: { url: string; alt: string; width: number | null; height: number | null; is_primary: boolean; sort_order: number }[] | null
}

const num = (v: number | string | null) => (v === null || v === undefined ? null : Number(v))

export const TRUCK_SELECT = `
  id, slug, stock_number, title, brand, model, series, variant, body_type, year, condition, availability,
  payload_tons, gvw_kg, wheel_config, engine, displacement_cc, horsepower, torque_nm, transmission,
  fuel_type, emission_standard, wheelbase_mm, mileage_km, color, price, price_on_request, currency,
  summary, description, features, specs, is_featured, is_published,
  branch:branches(slug),
  truck_images(url, alt, width, height, is_primary, sort_order)
`

export function mapTruck(row: TruckRow): Truck {
  const images = [...(row.truck_images ?? [])]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    .map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height, isPrimary: i.is_primary }))

  return {
    id: row.id,
    slug: row.slug,
    stockNumber: row.stock_number,
    title: row.title,
    brand: row.brand,
    model: row.model,
    series: row.series,
    variant: row.variant,
    bodyType: row.body_type as BodyType,
    year: row.year,
    condition: row.condition,
    availability: row.availability,
    payloadTons: num(row.payload_tons),
    gvwKg: row.gvw_kg,
    wheelConfig: row.wheel_config,
    engine: row.engine,
    displacementCc: row.displacement_cc,
    horsepower: row.horsepower,
    torqueNm: row.torque_nm,
    transmission: row.transmission,
    fuelType: row.fuel_type,
    emissionStandard: row.emission_standard,
    wheelbaseMm: row.wheelbase_mm,
    mileageKm: row.mileage_km,
    color: row.color,
    price: num(row.price),
    priceOnRequest: row.price_on_request,
    currency: row.currency,
    summary: row.summary,
    description: row.description,
    features: row.features ?? [],
    specs: row.specs ?? {},
    branchSlug: row.branch?.slug ?? null,
    isFeatured: row.is_featured,
    isPublished: row.is_published,
    images,
  }
}

/* -------------------------------------------------------------------------- */
/*  Offline fallback (no Supabase env) — mirrors seed.sql                      */
/* -------------------------------------------------------------------------- */

export const fallbackTrucks: Truck[] = sample.trucks.map((t, i) => ({
  ...t,
  id: `sample-truck-${i}`,
  currency: "PHP",
  isPublished: true,
}))

export const fallbackParts: Part[] = sample.parts.map((p, i) => ({
  ...p,
  id: `sample-part-${i}`,
  currency: "PHP",
  isPublished: true,
  stockStatus: stockStatusFor(p.stockQty, p.reorderLevel),
}))

export const fallbackServices: Service[] = sample.services.map((s, i) => ({ ...s, id: `sample-service-${i}` }))

function warnFallback(scope: string, error?: unknown) {
  if (process.env.NODE_ENV !== "production" || error) {
    console.warn(`[catalog] ${scope}: using sample data${error ? ` (${String((error as Error).message ?? error)})` : " — Supabase not configured"}`)
  }
}

/* -------------------------------------------------------------------------- */
/*  Queries                                                                    */
/* -------------------------------------------------------------------------- */

export async function getFeaturedTrucks(limit = 6): Promise<Truck[]> {
  if (!isSupabaseConfigured) {
    warnFallback("getFeaturedTrucks")
    return fallbackTrucks.filter((t) => t.isFeatured && t.availability !== "sold").slice(0, limit)
  }

  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase
    .from("trucks")
    .select(TRUCK_SELECT)
    .eq("is_published", true)
    .eq("is_featured", true)
    .neq("availability", "sold")
    .order("published_at", { ascending: false })
    .limit(limit)

  if (error) {
    warnFallback("getFeaturedTrucks", error)
    return fallbackTrucks.filter((t) => t.isFeatured).slice(0, limit)
  }
  return (data as unknown as TruckRow[]).map(mapTruck)
}

/** Distinct models with their payload range — powers the home "weighbridge". */
export async function getLineup(): Promise<{ model: string; series: string | null; bodyType: BodyType; payloadTons: number; slug: string }[]> {
  let rows: Truck[] = fallbackTrucks
  if (isSupabaseConfigured) {
    const supabase = createSupabasePublicClient()
    const { data, error } = await supabase.from("trucks").select(TRUCK_SELECT).eq("is_published", true).eq("condition", "new")
    if (error) warnFallback("getLineup", error)
    else rows = (data as unknown as TruckRow[]).map(mapTruck)
  }

  const byModel = new Map<string, Truck>()
  for (const t of rows) {
    if (t.condition !== "new" || t.payloadTons === null) continue
    const existing = byModel.get(t.model)
    if (!existing || (t.payloadTons ?? 0) > (existing.payloadTons ?? 0)) byModel.set(t.model, t)
  }
  return [...byModel.values()]
    .map((t) => ({ model: t.model, series: t.series, bodyType: t.bodyType, payloadTons: t.payloadTons ?? 0, slug: t.slug }))
    .sort((a, b) => a.payloadTons - b.payloadTons)
}

export async function getServices(): Promise<Service[]> {
  if (!isSupabaseConfigured) {
    warnFallback("getServices")
    return fallbackServices
  }
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase
    .from("services")
    .select("id, slug, name, category, summary, description, inclusions, est_duration_hours, starting_price, interval_km, interval_months, is_package, sort_order")
    .eq("is_active", true)
    .order("sort_order")

  if (error) {
    warnFallback("getServices", error)
    return fallbackServices
  }
  return data.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    category: s.category,
    summary: s.summary ?? "",
    description: s.description ?? "",
    inclusions: s.inclusions ?? [],
    estDurationHours: num(s.est_duration_hours),
    startingPrice: num(s.starting_price),
    intervalKm: s.interval_km,
    intervalMonths: s.interval_months,
    isPackage: s.is_package,
    sortOrder: s.sort_order,
  }))
}
