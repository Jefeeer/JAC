import { z } from "zod"
import { PART_SORTS, PAYLOAD_BANDS, TRUCK_SORTS } from "@/lib/catalog-options"

export { PART_SORTS, PART_SORT_LABELS, PAYLOAD_BANDS, TRUCK_SORTS, TRUCK_SORT_LABELS } from "@/lib/catalog-options"

/**
 * URL search-param schemas for the public catalog. Every param is optional
 * and anything malformed is dropped (never throws) so a hand-edited URL
 * just falls back to defaults.
 */

type RawParams = Record<string, string | string[] | undefined>

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v)
const str = (max = 80) =>
  z.preprocess(
    (v) => {
      const s = first(v)
      return typeof s === "string" && s.trim() ? s.trim().slice(0, max) : undefined
    },
    z.string().optional(),
  )
const int = (min: number, max: number) =>
  z.preprocess((v) => {
    const n = Number.parseInt(String(first(v) ?? ""), 10)
    return Number.isFinite(n) && n >= min && n <= max ? n : undefined
  }, z.number().int().optional())
const oneOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => {
    const s = first(v)
    return typeof s === "string" && (values as readonly string[]).includes(s) ? s : undefined
  }, z.enum(values).optional())
const flag = z.preprocess((v) => first(v) === "1" || first(v) === "true", z.boolean())

/* ---------------------------------- Trucks --------------------------------- */



export const truckFiltersSchema = z.object({
  q: str(60),
  brand: str(30),
  model: str(40),
  body: str(30),
  condition: oneOf(["new", "used"] as const),
  payload: oneOf(PAYLOAD_BANDS.map((b) => b.value) as unknown as readonly [string, ...string[]]),
  yearMin: int(1990, 2100),
  yearMax: int(1990, 2100),
  priceMin: int(0, 100_000_000),
  priceMax: int(0, 100_000_000),
  sold: flag,
  sort: z.preprocess((v) => {
    const s = first(v)
    return typeof s === "string" && (TRUCK_SORTS as readonly string[]).includes(s) ? s : "newest"
  }, z.enum(TRUCK_SORTS)),
  page: z.preprocess((v) => {
    const n = Number.parseInt(String(first(v) ?? "1"), 10)
    return Number.isFinite(n) && n > 0 && n < 1000 ? n : 1
  }, z.number().int()),
})
export type TruckFilters = z.infer<typeof truckFiltersSchema>

export function parseTruckFilters(raw: RawParams): TruckFilters {
  return truckFiltersSchema.parse(raw)
}

export function payloadRange(band: string | undefined): [number, number] | null {
  if (!band) return null
  const [min, max] = band.split("-").map(Number)
  return Number.isFinite(min) && Number.isFinite(max) ? [min, max] : null
}

/* ----------------------------------- Parts --------------------------------- */


export const partFiltersSchema = z.object({
  q: str(60),
  category: str(60),
  model: str(40),
  inStock: flag,
  sort: z.preprocess((v) => {
    const s = first(v)
    return typeof s === "string" && (PART_SORTS as readonly string[]).includes(s) ? s : "relevance"
  }, z.enum(PART_SORTS)),
  page: z.preprocess((v) => {
    const n = Number.parseInt(String(first(v) ?? "1"), 10)
    return Number.isFinite(n) && n > 0 && n < 1000 ? n : 1
  }, z.number().int()),
})
export type PartFilters = z.infer<typeof partFiltersSchema>

export function parsePartFilters(raw: RawParams): PartFilters {
  return partFiltersSchema.parse(raw)
}

/**
 * Strip characters that have meaning in PostgREST filter strings / LIKE
 * patterns so user search text can be embedded in `.or()` safely.
 */
export function sanitizeSearch(q: string | undefined) {
  if (!q) return undefined
  const cleaned = q.replace(/[%_*,()\\"']/g, " ").replace(/\s+/g, " ").trim()
  return cleaned.length ? cleaned : undefined
}

/** Build a query string from filters, dropping defaults. */
export function toSearchString(params: Record<string, string | number | boolean | undefined | null>, defaults: Record<string, unknown> = {}) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || v === false) continue
    if (defaults[k] !== undefined && defaults[k] === v) continue
    sp.set(k, v === true ? "1" : String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ""
}
