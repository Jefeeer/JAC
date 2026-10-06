import { z } from "zod"

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null))
const optNum = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined || (typeof v === "number" && Number.isNaN(v)) ? null : Number(String(v).replace(/[,\s₱]/g, ""))),
    z.number().min(min).max(max).nullable(),
  )
const reqInt = (min: number, max: number, msg: string) =>
  z.preprocess((v) => Number(String(v ?? "").replace(/[,\s]/g, "")), z.number({ error: msg }).int(msg).min(min, msg).max(max, msg))

export const BODY_TYPES = ["pickup", "dropside", "aluminum_van", "reefer", "wing_van", "cab_chassis", "curtainside", "cargo_high_side", "tanker", "crew_cab"] as const

export const truckSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(3, "Enter a title").max(120),
    slug: z.string().trim().max(80).optional().default(""),
    stockNumber: optText(30),
    brand: z.string().trim().min(1).max(30).default("JAC"),
    model: z.string().trim().min(1, "Enter the model").max(40),
    series: optText(40),
    variant: optText(80),
    bodyType: z.enum(BODY_TYPES),
    year: reqInt(1990, new Date().getFullYear() + 1, "Enter a valid year"),
    condition: z.enum(["new", "used"]),
    availability: z.enum(["available", "reserved", "sold", "incoming"]),
    payloadTons: optNum(0, 60),
    gvwKg: optNum(0, 80000),
    wheelConfig: optText(10),
    engine: optText(120),
    displacementCc: optNum(0, 20000),
    horsepower: optNum(0, 1000),
    torqueNm: optNum(0, 5000),
    transmission: optText(60),
    fuelType: z.string().trim().max(20).default("diesel"),
    emissionStandard: optText(20),
    wheelbaseMm: optNum(0, 10000),
    mileageKm: reqInt(0, 5_000_000, "Enter the odometer"),
    color: optText(40),
    price: optNum(0, 100_000_000),
    priceOnRequest: z.boolean().default(false),
    summary: optText(300),
    description: optText(4000),
    featuresText: z.string().max(3000).optional().default(""),
    specsText: z.string().max(3000).optional().default(""),
    branchSlug: optText(40),
    isFeatured: z.boolean().default(false),
  })
  .refine((v) => v.priceOnRequest || v.price !== null, { path: ["price"], message: "Enter a price or tick “price on request”" })
export type TruckForm = z.input<typeof truckSchema>

export const partSchema = z
  .object({
    id: z.string().optional(),
    partNumber: z.string().trim().min(2, "Enter the part number").max(40),
    oemNumber: optText(40),
    name: z.string().trim().min(2, "Enter the name").max(120),
    slug: z.string().trim().max(80).optional().default(""),
    brand: z.string().trim().min(1).max(60).default("JAC Genuine"),
    categorySlug: z.string().trim().min(1, "Choose a category").max(60),
    summary: optText(300),
    description: optText(4000),
    price: optNum(0, 10_000_000),
    priceOnRequest: z.boolean().default(false),
    unit: z.string().trim().min(1).max(20).default("pc"),
    stockQty: reqInt(0, 1_000_000, "Enter stock"),
    reorderLevel: reqInt(0, 100_000, "Enter reorder level"),
    leadTimeDays: optNum(0, 365),
    weightKg: optNum(0, 5000),
    imageUrl: optText(500),
    isPublished: z.boolean().default(true),
    specsText: z.string().max(3000).optional().default(""),
    compatText: z.string().max(3000).optional().default(""),
  })
  .refine((v) => v.priceOnRequest || v.price !== null, { path: ["price"], message: "Enter a price or tick “price on request”" })
export type PartForm = z.input<typeof partSchema>

/** "Key: value" lines → record */
export function parseKeyValues(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split("\n")) {
    const i = line.indexOf(":")
    if (i > 0) {
      const k = line.slice(0, i).trim()
      const v = line.slice(i + 1).trim()
      if (k && v) out[k.slice(0, 60)] = v.slice(0, 200)
    }
  }
  return out
}
export const toKeyValues = (r: Record<string, string>) =>
  Object.entries(r)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")

/** Compatibility lines: "N55 | Cummins ISF 3.8 | 2019-2025" (engine and years optional) */
export function parseCompat(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [model, engine, years] = l.split("|").map((s) => s.trim())
      const [from, to] = (years ?? "").split("-").map((y) => Number(y.trim()))
      return { model: model.slice(0, 40), engine: engine || null, yearFrom: Number.isFinite(from) && from > 1980 ? from : null, yearTo: Number.isFinite(to) && to > 1980 ? to : null }
    })
    .filter((c) => c.model)
}
export const toCompat = (c: { model: string; engine?: string | null; yearFrom?: number | null; yearTo?: number | null }[]) =>
  c.map((x) => [x.model, x.engine ?? "", x.yearFrom || x.yearTo ? `${x.yearFrom ?? ""}-${x.yearTo ?? ""}` : ""].join(" | ").replace(/( \| )+$/, "")).join("\n")

export const quoteLineSchema = z.object({
  description: z.string().trim().min(1, "Describe the item").max(300),
  quantity: z.coerce.number().positive("Qty > 0").max(100000),
  unitPrice: z.coerce.number().min(0).max(100_000_000),
})
export const quoteResponseSchema = z.object({
  id: z.string().min(1),
  items: z.array(quoteLineSchema).max(50),
  discount: z.coerce.number().min(0).max(100_000_000).default(0),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .or(z.literal("").transform(() => null)),
  terms: z.string().trim().max(2000).nullable().optional(),
  responseMessage: z.string().trim().max(2000).nullable().optional(),
  assignedTo: z.string().nullable().optional(),
})
export type QuoteResponseInput = z.input<typeof quoteResponseSchema>

export const jobItemSchema = z.object({
  jobId: z.string().min(1),
  type: z.enum(["labor", "part", "misc"]),
  description: z.string().trim().min(2, "Describe the item").max(300),
  quantity: z.coerce.number().positive().max(10000),
  unitPrice: z.coerce.number().min(0).max(10_000_000),
  partId: z.string().nullable().optional(),
})

export const noteSchema = z.object({
  entityType: z.enum(["quote", "booking", "job_order", "customer"]),
  entityId: z.string().min(1),
  body: z.string().trim().min(1, "Write a note").max(2000),
})
