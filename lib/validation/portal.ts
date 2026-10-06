import { z } from "zod"

const optText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""))
const optInt = (min: number, max: number, msg: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined || (typeof v === "number" && Number.isNaN(v)) ? undefined : Number(String(v).replace(/[,\s]/g, ""))),
    z.number({ error: msg }).int(msg).min(min, msg).max(max, msg).optional(),
  )
const optDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .optional()
  .or(z.literal(""))

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || (/^[+()\d\s-]+$/.test(v) && v.replace(/\D/g, "").length >= 7), "Enter a valid phone number"),
})

export const companySchema = z.object({
  name: z.string().trim().min(2, "Enter the company name").max(120),
  tin: optText(20),
  industry: optText(60),
  fleetSize: optInt(0, 100_000, "Enter a number"),
  email: z.string().trim().email("Enter a valid email").max(120).optional().or(z.literal("")),
  phone: optText(20),
  address: optText(200),
  city: optText(60),
  province: optText(60),
})

export const fleetUnitSchema = z.object({
  id: z.string().uuid().optional(),
  nickname: optText(40),
  make: z.string().trim().min(1, "Enter the make").max(30),
  model: z.string().trim().min(1, "Enter the model").max(60),
  year: optInt(1980, new Date().getFullYear() + 1, "Enter a valid year"),
  plateNumber: optText(15),
  vin: optText(30),
  engineNumber: optText(30),
  color: optText(30),
  purchaseDate: optDate,
  currentMileageKm: optInt(0, 5_000_000, "Enter the odometer in km"),
  lastServiceDate: optDate,
  lastServiceMileageKm: optInt(0, 5_000_000, "Enter km"),
  serviceIntervalKm: optInt(1000, 100_000, "Between 1,000 and 100,000 km"),
  serviceIntervalMonths: optInt(1, 36, "Between 1 and 36 months"),
  remindersEnabled: z.boolean().default(true),
  notes: optText(500),
})
export type FleetUnitInput = z.input<typeof fleetUnitSchema>

export const mileageSchema = z.object({
  id: z.string().uuid(),
  km: z.preprocess((v) => Number(String(v).replace(/[,\s]/g, "")), z.number({ error: "Enter the odometer" }).int().min(0).max(5_000_000)),
})

export const cancelBookingSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
})
