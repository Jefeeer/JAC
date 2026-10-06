import "server-only"

import { cache } from "react"
import { createSupabasePublicClient } from "@/lib/supabase/public"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import * as sample from "@/lib/data/seed-data"
import { payloadRange, sanitizeSearch, type PartFilters, type TruckFilters } from "@/lib/validation/catalog"
import { stockStatusFor, type BodyType, type Part, type PartCategory, type Service, type Truck } from "@/types/domain"

export const TRUCK_PAGE_SIZE = 12
export const PART_PAGE_SIZE = 20

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number; pageCount: number }

const num = (v: number | string | null | undefined) => (v === null || v === undefined ? null : Number(v))

function paged<T>(items: T[], total: number, page: number, pageSize: number): Paged<T> {
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}

function warnFallback(scope: string, error?: unknown) {
  if (process.env.NODE_ENV !== "production" || error) {
    console.warn(
      `[catalog] ${scope}: using sample data${error ? ` (${String((error as Error).message ?? error)})` : " — Supabase not configured"}`,
    )
  }
}

/* ========================================================================== */
/*  Trucks                                                                    */
/* ========================================================================== */

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
  truck_images:
    | { url: string; alt: string; width: number | null; height: number | null; is_primary: boolean; sort_order: number }[]
    | null
}

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

export const fallbackTrucks: Truck[] = sample.trucks.map((t, i) => ({
  ...t,
  id: `sample-truck-${i}`,
  currency: "PHP",
  isPublished: true,
}))

/** In-memory equivalent of the Supabase filters (offline mode + tests). */
function filterTrucksLocal(list: Truck[], f: TruckFilters) {
  const q = sanitizeSearch(f.q)?.toLowerCase()
  const band = payloadRange(f.payload)
  const rows = list.filter((t) => {
    if (!f.sold && t.availability === "sold") return false
    if (q && ![t.title, t.model, t.variant, t.series, t.engine].some((v) => v?.toLowerCase().includes(q))) return false
    if (f.brand && t.brand !== f.brand) return false
    if (f.model && t.model !== f.model) return false
    if (f.body && t.bodyType !== f.body) return false
    if (f.condition && t.condition !== f.condition) return false
    if (band && (t.payloadTons === null || t.payloadTons < band[0] || t.payloadTons >= band[1])) return false
    if (f.yearMin && t.year < f.yearMin) return false
    if (f.yearMax && t.year > f.yearMax) return false
    if ((f.priceMin !== undefined || f.priceMax !== undefined) && t.price === null) return false
    if (f.priceMin !== undefined && (t.price ?? 0) < f.priceMin) return false
    if (f.priceMax !== undefined && (t.price ?? 0) > f.priceMax) return false
    return true
  })
  const nullsLast = (a: number | null, b: number | null, dir: 1 | -1) =>
    a === null ? 1 : b === null ? -1 : (a - b) * dir
  const sorted = [...rows]
  switch (f.sort) {
    case "price-asc":
      sorted.sort((a, b) => nullsLast(a.price, b.price, 1))
      break
    case "price-desc":
      sorted.sort((a, b) => nullsLast(a.price, b.price, -1))
      break
    case "payload-asc":
      sorted.sort((a, b) => nullsLast(a.payloadTons, b.payloadTons, 1))
      break
    case "payload-desc":
      sorted.sort((a, b) => nullsLast(a.payloadTons, b.payloadTons, -1))
      break
    case "year-desc":
      sorted.sort((a, b) => b.year - a.year)
      break
    default:
      break // seed order ≈ newest listings
  }
  return sorted
}

export async function searchTrucks(f: TruckFilters): Promise<Paged<Truck>> {
  const size = TRUCK_PAGE_SIZE
  const from = (f.page - 1) * size

  if (!isSupabaseConfigured) {
    warnFallback("searchTrucks")
    const all = filterTrucksLocal(fallbackTrucks, f)
    return paged(all.slice(from, from + size), all.length, f.page, size)
  }

  const supabase = createSupabasePublicClient()
  let query = supabase.from("trucks").select(TRUCK_SELECT, { count: "exact" }).eq("is_published", true)

  const q = sanitizeSearch(f.q)
  if (q) {
    const p = `%${q}%`
    query = query.or(`title.ilike.${p},model.ilike.${p},variant.ilike.${p},series.ilike.${p},engine.ilike.${p}`)
  }
  if (!f.sold) query = query.neq("availability", "sold")
  if (f.brand) query = query.eq("brand", f.brand)
  if (f.model) query = query.eq("model", f.model)
  if (f.body) query = query.eq("body_type", f.body)
  if (f.condition) query = query.eq("condition", f.condition)
  const band = payloadRange(f.payload)
  if (band) query = query.gte("payload_tons", band[0]).lt("payload_tons", band[1])
  if (f.yearMin) query = query.gte("year", f.yearMin)
  if (f.yearMax) query = query.lte("year", f.yearMax)
  if (f.priceMin !== undefined) query = query.gte("price", f.priceMin)
  if (f.priceMax !== undefined) query = query.lte("price", f.priceMax)

  switch (f.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true, nullsFirst: false })
      break
    case "price-desc":
      query = query.order("price", { ascending: false, nullsFirst: false })
      break
    case "payload-asc":
      query = query.order("payload_tons", { ascending: true, nullsFirst: false })
      break
    case "payload-desc":
      query = query.order("payload_tons", { ascending: false, nullsFirst: false })
      break
    case "year-desc":
      query = query.order("year", { ascending: false })
      break
    default:
      query = query.order("published_at", { ascending: false, nullsFirst: false })
  }
  query = query.order("id").range(from, from + size - 1)

  const { data, error, count } = await query
  if (error) {
    warnFallback("searchTrucks", error)
    const all = filterTrucksLocal(fallbackTrucks, f)
    return paged(all.slice(from, from + size), all.length, f.page, size)
  }
  return paged((data as unknown as TruckRow[]).map(mapTruck), count ?? 0, f.page, size)
}

export type TruckFacets = {
  brands: { value: string; count: number }[]
  models: { value: string; series: string | null; count: number }[]
  bodyTypes: { value: BodyType; count: number }[]
  conditions: { value: "new" | "used"; count: number }[]
  years: [number, number]
  prices: [number, number]
  total: number
}

function facetsFrom(
  rows: Pick<Truck, "brand" | "model" | "series" | "bodyType" | "condition" | "year" | "price" | "availability">[],
): TruckFacets {
  const visible = rows.filter((r) => r.availability !== "sold")
  const count = <K extends string>(key: (r: (typeof visible)[number]) => K) => {
    const m = new Map<K, number>()
    for (const r of visible) m.set(key(r), (m.get(key(r)) ?? 0) + 1)
    return m
  }
  const series = new Map(visible.map((r) => [r.model, r.series]))
  const years = visible.map((r) => r.year)
  const prices = visible.map((r) => r.price).filter((p): p is number => p !== null)
  return {
    brands: [...count((r) => r.brand)].map(([value, c]) => ({ value, count: c })),
    models: [...count((r) => r.model)]
      .map(([value, c]) => ({ value, series: series.get(value) ?? null, count: c }))
      .sort((a, b) => (a.series ?? "").localeCompare(b.series ?? "") || a.value.localeCompare(b.value)),
    bodyTypes: [...count((r) => r.bodyType)].map(([value, c]) => ({ value, count: c })).sort((a, b) => b.count - a.count),
    conditions: [...count((r) => r.condition)].map(([value, c]) => ({ value, count: c })),
    years: years.length ? [Math.min(...years), Math.max(...years)] : [2015, new Date().getFullYear()],
    prices: prices.length ? [Math.min(...prices), Math.max(...prices)] : [0, 5_000_000],
    total: visible.length,
  }
}

export const getTruckFacets = cache(async (): Promise<TruckFacets> => {
  if (!isSupabaseConfigured) return facetsFrom(fallbackTrucks)
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase
    .from("trucks")
    .select("brand, model, series, body_type, condition, year, price, availability")
    .eq("is_published", true)
  if (error) {
    warnFallback("getTruckFacets", error)
    return facetsFrom(fallbackTrucks)
  }
  return facetsFrom(
    data.map((r) => ({
      brand: r.brand,
      model: r.model,
      series: r.series,
      bodyType: r.body_type as BodyType,
      condition: r.condition,
      year: r.year,
      price: num(r.price),
      availability: r.availability,
    })),
  )
})

export const getTruckBySlug = cache(async (slug: string): Promise<Truck | null> => {
  if (!isSupabaseConfigured) return fallbackTrucks.find((t) => t.slug === slug) ?? null
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase.from("trucks").select(TRUCK_SELECT).eq("slug", slug).eq("is_published", true).maybeSingle()
  if (error) {
    warnFallback("getTruckBySlug", error)
    return fallbackTrucks.find((t) => t.slug === slug) ?? null
  }
  return data ? mapTruck(data as unknown as TruckRow) : null
})

export async function getRelatedTrucks(truck: Truck, limit = 3): Promise<Truck[]> {
  let pool: Truck[] = fallbackTrucks
  if (isSupabaseConfigured) {
    const supabase = createSupabasePublicClient()
    const { data, error } = await supabase
      .from("trucks")
      .select(TRUCK_SELECT)
      .eq("is_published", true)
      .neq("availability", "sold")
      .neq("id", truck.id)
      // values are double-quoted so series names with spaces/dashes are safe in PostgREST or()
      .or(`series.eq."${(truck.series ?? "_").replace(/"/g, "")}",body_type.eq.${truck.bodyType}`)
      .limit(12)
    if (error) warnFallback("getRelatedTrucks", error)
    else pool = (data as unknown as TruckRow[]).map(mapTruck)
  }
  // Rank: same body type + close payload first
  return pool
    .filter((t) => t.id !== truck.id && t.availability !== "sold")
    .map((t) => ({
      t,
      score:
        (t.bodyType === truck.bodyType ? 2 : 0) +
        (t.series && t.series === truck.series ? 1 : 0) -
        Math.abs((t.payloadTons ?? 0) - (truck.payloadTons ?? 0)) / 10,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.t)
}

export async function getTruckSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured) return fallbackTrucks.map((t) => t.slug)
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase.from("trucks").select("slug").eq("is_published", true)
  if (error) return fallbackTrucks.map((t) => t.slug)
  return data.map((r) => r.slug)
}

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

/** Distinct models with their payload — powers the home "weighbridge". */
export async function getLineup(): Promise<
  { model: string; series: string | null; bodyType: BodyType; payloadTons: number; slug: string }[]
> {
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

/* ========================================================================== */
/*  Parts                                                                     */
/* ========================================================================== */

type PartRow = {
  id: string
  slug: string
  part_number: string
  oem_number: string | null
  name: string
  brand: string
  summary: string | null
  description: string | null
  specs: Record<string, string> | null
  price: number | string | null
  price_on_request: boolean
  currency: string
  unit: string
  stock_qty: number
  reorder_level: number
  stock_status: Part["stockStatus"]
  lead_time_days: number | null
  weight_kg: number | string | null
  image_url: string | null
  is_published: boolean
  category: { slug: string; name: string } | null
  compat: { model: string; series: string | null; engine: string | null; year_from: number | null; year_to: number | null; notes: string | null }[] | null
}

const PART_COLUMNS = `
  id, slug, part_number, oem_number, name, brand, summary, description, specs, price, price_on_request,
  currency, unit, stock_qty, reorder_level, stock_status, lead_time_days, weight_kg, image_url, is_published,
  compat:part_compatibility(model, series, engine, year_from, year_to, notes)
`

export function mapPart(row: PartRow): Part {
  return {
    id: row.id,
    slug: row.slug,
    partNumber: row.part_number,
    oemNumber: row.oem_number,
    name: row.name,
    brand: row.brand,
    categorySlug: row.category?.slug ?? "",
    summary: row.summary,
    description: row.description,
    specs: row.specs ?? {},
    price: num(row.price),
    priceOnRequest: row.price_on_request,
    currency: row.currency,
    unit: row.unit,
    stockQty: row.stock_qty,
    reorderLevel: row.reorder_level,
    stockStatus: row.stock_status,
    leadTimeDays: row.lead_time_days,
    weightKg: num(row.weight_kg),
    imageUrl: row.image_url,
    isPublished: row.is_published,
    compatibility: (row.compat ?? []).map((c) => ({
      model: c.model,
      series: c.series,
      engine: c.engine,
      yearFrom: c.year_from,
      yearTo: c.year_to,
      notes: c.notes,
    })),
  }
}

export const fallbackParts: Part[] = sample.parts.map((p, i) => ({
  ...p,
  id: `sample-part-${i}`,
  currency: "PHP",
  isPublished: true,
  stockStatus: stockStatusFor(p.stockQty, p.reorderLevel),
}))

export const fallbackCategories: PartCategory[] = sample.partCategories.map((c, i) => ({ ...c, id: `sample-cat-${i}` }))

function filterPartsLocal(list: Part[], f: PartFilters) {
  const q = sanitizeSearch(f.q)?.toLowerCase()
  const rows = list.filter((p) => {
    if (q && ![p.partNumber, p.oemNumber, p.name, p.summary].some((v) => v?.toLowerCase().includes(q))) return false
    if (f.category && p.categorySlug !== f.category) return false
    if (f.model && !p.compatibility.some((c) => c.model === f.model)) return false
    if (f.inStock && p.stockStatus === "out_of_stock") return false
    return true
  })
  const sorted = [...rows]
  const priceKey = (p: Part) => (p.priceOnRequest || p.price === null ? null : p.price)
  switch (f.sort) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case "part-number":
      sorted.sort((a, b) => a.partNumber.localeCompare(b.partNumber))
      break
    case "price-asc":
      sorted.sort((a, b) => (priceKey(a) ?? Infinity) - (priceKey(b) ?? Infinity))
      break
    case "price-desc":
      sorted.sort((a, b) => (priceKey(b) ?? -Infinity) - (priceKey(a) ?? -Infinity))
      break
    default:
      if (q) {
        // exact / prefix part-number hits first
        const rank = (p: Part) =>
          p.partNumber.toLowerCase() === q || p.oemNumber?.toLowerCase() === q
            ? 0
            : p.partNumber.toLowerCase().startsWith(q)
              ? 1
              : p.name.toLowerCase().includes(q)
                ? 2
                : 3
        sorted.sort((a, b) => rank(a) - rank(b))
      }
  }
  return sorted
}

export async function searchParts(f: PartFilters): Promise<Paged<Part>> {
  const size = PART_PAGE_SIZE
  const from = (f.page - 1) * size

  if (!isSupabaseConfigured) {
    warnFallback("searchParts")
    const all = filterPartsLocal(fallbackParts, f)
    return paged(all.slice(from, from + size), all.length, f.page, size)
  }

  const supabase = createSupabasePublicClient()
  // Inner-join aliases are only added when filtering so unfiltered results
  // keep their full compatibility list in `compat`.
  const select = [
    PART_COLUMNS,
    f.category ? "category:part_categories!inner(slug, name)" : "category:part_categories(slug, name)",
    f.model ? "model_filter:part_compatibility!inner(model)" : null,
  ]
    .filter(Boolean)
    .join(", ")

  let query = supabase.from("parts").select(select, { count: "exact" }).eq("is_published", true)
  const q = sanitizeSearch(f.q)
  if (q) {
    const p = `%${q}%`
    query = query.or(`part_number.ilike.${p},oem_number.ilike.${p},name.ilike.${p},summary.ilike.${p}`)
  }
  if (f.category) query = query.eq("category.slug", f.category)
  if (f.model) query = query.eq("model_filter.model", f.model)
  if (f.inStock) query = query.neq("stock_status", "out_of_stock")

  switch (f.sort) {
    case "name":
      query = query.order("name")
      break
    case "part-number":
      query = query.order("part_number")
      break
    case "price-asc":
      query = query.order("price", { ascending: true, nullsFirst: false })
      break
    case "price-desc":
      query = query.order("price", { ascending: false, nullsFirst: false })
      break
    default:
      query = query.order("stock_status").order("name")
  }
  query = query.order("id").range(from, from + size - 1)

  const { data, error, count } = await query
  if (error) {
    warnFallback("searchParts", error)
    const all = filterPartsLocal(fallbackParts, f)
    return paged(all.slice(from, from + size), all.length, f.page, size)
  }
  return paged((data as unknown as PartRow[]).map(mapPart), count ?? 0, f.page, size)
}

export type CategoryWithCount = PartCategory & { count: number }

export const getPartCategories = cache(async (): Promise<CategoryWithCount[]> => {
  const withCounts = (cats: PartCategory[], parts: { categorySlug: string }[]) =>
    cats
      .map((c) => ({ ...c, count: parts.filter((p) => p.categorySlug === c.slug).length }))
      .sort((a, b) => a.sortOrder - b.sortOrder)

  if (!isSupabaseConfigured) return withCounts(fallbackCategories, fallbackParts)
  const supabase = createSupabasePublicClient()
  const [cats, parts] = await Promise.all([
    supabase.from("part_categories").select("id, slug, name, description, icon, sort_order").order("sort_order"),
    supabase.from("parts").select("category:part_categories(slug)").eq("is_published", true),
  ])
  if (cats.error || parts.error) {
    warnFallback("getPartCategories", cats.error ?? parts.error)
    return withCounts(fallbackCategories, fallbackParts)
  }
  return withCounts(
    cats.data.map((c) => ({ id: c.id, slug: c.slug, name: c.name, description: c.description, icon: c.icon, sortOrder: c.sort_order })),
    (parts.data as unknown as { category: { slug: string } | null }[]).map((p) => ({ categorySlug: p.category?.slug ?? "" })),
  )
})

/** Truck models that have at least one compatible published part. */
export const getPartModels = cache(async (): Promise<string[]> => {
  const sortModels = (models: string[]) =>
    [...new Set(models)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  if (!isSupabaseConfigured) return sortModels(fallbackParts.flatMap((p) => p.compatibility.map((c) => c.model)))
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase.from("part_compatibility").select("model")
  if (error) {
    warnFallback("getPartModels", error)
    return sortModels(fallbackParts.flatMap((p) => p.compatibility.map((c) => c.model)))
  }
  return sortModels(data.map((r) => r.model))
})

export const getPartBySlug = cache(async (slug: string): Promise<Part | null> => {
  if (!isSupabaseConfigured) return fallbackParts.find((p) => p.slug === slug) ?? null
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase
    .from("parts")
    .select(`${PART_COLUMNS}, category:part_categories(slug, name)`)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle()
  if (error) {
    warnFallback("getPartBySlug", error)
    return fallbackParts.find((p) => p.slug === slug) ?? null
  }
  return data ? mapPart(data as unknown as PartRow) : null
})

export async function getRelatedParts(part: Part, limit = 4): Promise<Part[]> {
  const models = new Set(part.compatibility.map((c) => c.model))
  const rank = (pool: Part[]) =>
    pool
      .filter((p) => p.id !== part.id)
      .map((p) => ({
        p,
        score: p.compatibility.filter((c) => models.has(c.model)).length + (p.categorySlug === part.categorySlug ? 3 : 0),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.p)

  if (!isSupabaseConfigured) return rank(fallbackParts)
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase
    .from("parts")
    .select(`${PART_COLUMNS}, category:part_categories(slug, name)`)
    .eq("is_published", true)
    .neq("id", part.id)
    .limit(60)
  if (error) {
    warnFallback("getRelatedParts", error)
    return rank(fallbackParts)
  }
  return rank((data as unknown as PartRow[]).map(mapPart))
}

export async function getPartSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured) return fallbackParts.map((p) => p.slug)
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase.from("parts").select("slug").eq("is_published", true)
  if (error) return fallbackParts.map((p) => p.slug)
  return data.map((r) => r.slug)
}

/* ========================================================================== */
/*  Services                                                                  */
/* ========================================================================== */

export const fallbackServices: Service[] = sample.services.map((s, i) => ({ ...s, id: `sample-service-${i}` }))

export async function getServices(): Promise<Service[]> {
  if (!isSupabaseConfigured) {
    warnFallback("getServices")
    return fallbackServices
  }
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, slug, name, category, summary, description, inclusions, est_duration_hours, starting_price, interval_km, interval_months, is_package, sort_order",
    )
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
