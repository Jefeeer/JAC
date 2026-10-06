import { z } from "zod"
import { branches } from "@/lib/config/branches"

/**
 * Quote-request schemas — shared by the client (React Hook Form) and the
 * Server Actions, which always re-validate.
 */

const phoneDigits = (v: string) => v.replace(/\D/g, "").length

export const contactFields = {
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(120),
  phone: z
    .string()
    .trim()
    .min(1, "Enter your phone or mobile number")
    .regex(/^[+()\d\s-]+$/, "Use digits, spaces, + ( ) or -")
    .refine((v) => phoneDigits(v) >= 7 && phoneDigits(v) <= 15, "Enter a valid phone or mobile number"),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  branch: z
    .enum(branches.map((b) => b.slug) as [string, ...string[]])
    .optional()
    .or(z.literal("")),
  consent: z.literal(true, { error: "Please agree so we can contact you about this request" }),
}

/** Bot traps: a hidden field humans never fill, and a minimum fill time. */
export const antiSpamFields = {
  website: z.string().max(200).optional(),
  startedAt: z.number().int().positive(),
}

export const financingSchema = z.object({
  price: z.number().nonnegative().max(100_000_000),
  downPaymentPct: z.number().min(0).max(100),
  termMonths: z.number().int().min(6).max(84),
  ratePct: z.number().min(0).max(50),
  tradeInValue: z.number().nonnegative().max(100_000_000),
  amountFinanced: z.number().nonnegative(),
  monthly: z.number().nonnegative(),
})
export type FinancingEstimate = z.infer<typeof financingSchema>

export const tradeInSchema = z.object({
  make: z.string().trim().max(40).optional().or(z.literal("")),
  model: z.string().trim().max(60).optional().or(z.literal("")),
  year: z.number().int().min(1980).max(2100).optional(),
  mileageKm: z.number().int().min(0).max(5_000_000).optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})
export type TradeInDetails = z.infer<typeof tradeInSchema>

export const truckQuoteSchema = z.object({
  ...contactFields,
  ...antiSpamFields,
  truckSlug: z.string().min(1).max(120),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  financing: financingSchema.optional(),
  tradeIn: tradeInSchema.optional(),
})
export type TruckQuoteInput = z.infer<typeof truckQuoteSchema>

/** Paths issued by createUploadTargets(): public/<uuid>/<n>-<safe name> */
export const UPLOAD_PATH_RE = /^public\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d-[\w.-]{1,80}$/

export const partQuoteSchema = z.object({
  ...contactFields,
  ...antiSpamFields,
  partSlug: z.string().min(1).max(120),
  quantity: z.number().int().min(1, "At least 1").max(999),
  truckModel: z.string().trim().max(60).optional().or(z.literal("")),
  plateNumber: z.string().trim().max(15).optional().or(z.literal("")),
  vin: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  photoPaths: z.array(z.string().regex(UPLOAD_PATH_RE)).max(3).default([]),
})
export type PartQuoteInput = z.input<typeof partQuoteSchema>

export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
export const MAX_UPLOADS = 3

export const uploadRequestSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        type: z.enum(ALLOWED_UPLOAD_TYPES, { error: "Photos must be JPG, PNG, WebP or HEIC" }),
        size: z.number().int().positive().max(MAX_UPLOAD_BYTES, "Each photo must be 8 MB or smaller"),
      }),
    )
    .min(1)
    .max(MAX_UPLOADS, `Up to ${MAX_UPLOADS} photos`),
})

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> }
