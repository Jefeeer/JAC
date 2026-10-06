import { z } from "zod"
import { branches } from "@/lib/config/branches"
import { UPLOAD_PATH_RE, antiSpamFields, contactFields } from "@/lib/validation/quote"

export const TIME_SLOTS = ["08:00-10:00", "10:00-12:00", "13:00-15:00", "15:00-17:00"] as const
export const TIME_SLOT_OPTIONS: { value: (typeof TIME_SLOTS)[number]; label: string; sub: string }[] = [
  { value: "08:00-10:00", label: "8 – 10 AM", sub: "Early bay" },
  { value: "10:00-12:00", label: "10 AM – 12 NN", sub: "Morning" },
  { value: "13:00-15:00", label: "1 – 3 PM", sub: "Afternoon" },
  { value: "15:00-17:00", label: "3 – 5 PM", sub: "Late" },
]

export const BOOKING_WINDOW_DAYS = 60

/* --------------------------- Manila calendar helpers ------------------------ */

/** Today's date in Asia/Manila as YYYY-MM-DD. */
export function manilaToday(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}

export function addDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/** 0 = Sunday … 6 = Saturday for a calendar date (timezone-independent). */
export function weekdayOf(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function bookingDateBounds(isBreakdown: boolean, now: Date = new Date()) {
  const today = manilaToday(now)
  return { min: isBreakdown ? today : addDays(today, 1), max: addDays(today, BOOKING_WINDOW_DAYS) }
}

const DAY_NAMES = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"]

/** Returns an error message if the branch is closed / date out of range, else null. */
export function validateBookingDate(ymd: string, branchSlug: string | undefined, isBreakdown: boolean, now: Date = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || Number.isNaN(Date.parse(ymd))) return "Pick a date"
  const { min, max } = bookingDateBounds(isBreakdown, now)
  if (ymd < min) return isBreakdown ? "Pick today or a later date" : "Online bookings start tomorrow — for today, call the branch"
  if (ymd > max) return `Bookings open up to ${BOOKING_WINDOW_DAYS} days ahead`
  const branch = branches.find((b) => b.slug === branchSlug)
  if (branch && !branch.hours[weekdayOf(ymd)]) return `${branch.name} is closed on ${DAY_NAMES[weekdayOf(ymd)]}`
  return null
}

/* ---------------------------------- Schema --------------------------------- */

const optionalInt = (min: number, max: number, msg: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined || (typeof v === "number" && Number.isNaN(v)) ? undefined : Number(v)),
    z.number({ error: msg }).int(msg).min(min, msg).max(max, msg).optional(),
  )

export const bookingSchema = z
  .object({
    ...contactFields,
    ...antiSpamFields,
    branch: z.enum(branches.map((b) => b.slug) as [string, ...string[]], { error: "Choose a branch" }),
    isBreakdown: z.boolean().default(false),
    truckMake: z.string().trim().min(1, "Enter the make").max(30),
    truckModel: z.string().trim().min(1, "Enter the model").max(60),
    truckYear: optionalInt(1980, new Date().getFullYear() + 1, "Enter a valid year"),
    plateNumber: z.string().trim().max(15).optional().or(z.literal("")),
    mileageKm: optionalInt(0, 5_000_000, "Enter the odometer in km"),
    serviceSlug: z.string().trim().max(60).optional().or(z.literal("")),
    issue: z.string().trim().min(10, "Tell us a bit more (at least 10 characters)").max(2000),
    preferredDate: z.string().min(1, "Pick a date"),
    timeSlot: z.enum(TIME_SLOTS, { error: "Pick a time slot" }),
    photoPaths: z.array(z.string().regex(UPLOAD_PATH_RE)).max(3).default([]),
  })
  .superRefine((v, ctx) => {
    const err = validateBookingDate(v.preferredDate, v.branch, v.isBreakdown)
    if (err) ctx.addIssue({ code: "custom", path: ["preferredDate"], message: err })
  })

export type BookingInput = z.input<typeof bookingSchema>
export type BookingValues = z.output<typeof bookingSchema>
