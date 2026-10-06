import { branches } from "@/lib/config/branches"
import { addDays, manilaToday } from "@/lib/validation/booking"
import {
  bookingNewStaff,
  bookingReceivedCustomer,
  bookingStatusCustomer,
  jobStatusCustomer,
  quoteNewStaff,
  quoteReceivedCustomer,
  type BookingEmailData,
  type QuoteEmailData,
  type RenderedEmail,
} from "@/server/email/templates"

/**
 * DEV ONLY — preview email templates with sample data.
 *   /api/dev/emails/index            list
 *   /api/dev/emails/<name>           HTML
 *   /api/dev/emails/<name>?format=text
 */

const quote: QuoteEmailData = {
  id: "00000000-0000-0000-0000-000000000001",
  reference: "Q-2610-00042",
  type: "truck",
  contactName: "Juan Dela Cruz",
  contactEmail: "juan@example.ph",
  contactPhone: "0917 123 4567",
  company: "Dela Cruz Logistics",
  subjectLine: "JAC N55 Refrigerated Van",
  quantity: 2,
  message: "Need two units for our Laguna cold-chain route. Delivery by December if possible.",
  financing: { price: 2_480_000, downPaymentPct: 20, termMonths: 48, ratePct: 12, tradeInValue: 450_000, amountFinanced: 1_534_000, monthly: 40_396 },
  tradeIn: { make: "Isuzu", model: "Elf NHR", year: 2016, mileageKm: 210_000, notes: "" },
  branch: branches[0],
  attachments: 0,
}

const booking: BookingEmailData = {
  id: "00000000-0000-0000-0000-000000000002",
  reference: "BK-2610-00007",
  status: "pending",
  contactName: "Maria Santos",
  contactEmail: "maria@example.ph",
  contactPhone: "0918 765 4321",
  company: null,
  truckMake: "JAC",
  truckModel: "N75",
  truckYear: 2022,
  plateNumber: "NAD 6513",
  mileageKm: 48_200,
  serviceName: "10,000 km Preventive Maintenance",
  issue: "Due for PMS. Squealing from rear brakes when fully loaded.",
  isBreakdown: false,
  preferredDate: addDays(manilaToday(), 3),
  timeSlot: "08:00-10:00",
  scheduledAt: null,
  cancelReason: null,
  branch: branches[4],
  photos: 2,
}

const job = {
  id: "00000000-0000-0000-0000-000000000003",
  reference: "JO-2610-00042",
  customerName: "Maria Santos",
  truckModel: "N75",
  plateNumber: "NAD 6513",
  customerNotes: "Rear brake shoes replaced. Drums within spec.",
  diagnosis: "Rear brake shoes worn to 1.2 mm.",
  grandTotal: 7450,
  branch: branches[4],
}

const TEMPLATES: Record<string, () => RenderedEmail> = {
  "quote-received": () => quoteReceivedCustomer(quote),
  "quote-staff": () => quoteNewStaff(quote),
  "part-quote-received": () => quoteReceivedCustomer({ ...quote, type: "part", subjectLine: "JAC-1601010-ISF · Clutch Kit — ISF 3.8", financing: null, tradeIn: null, attachments: 2 }),
  "booking-received": () => bookingReceivedCustomer(booking),
  "booking-breakdown": () => bookingReceivedCustomer({ ...booking, isBreakdown: true, preferredDate: manilaToday(), serviceName: "Breakdown & Roadside Assistance" }),
  "booking-staff": () => bookingNewStaff({ ...booking, isBreakdown: true }),
  "booking-confirmed": () => bookingStatusCustomer({ ...booking, status: "confirmed", scheduledAt: `${booking.preferredDate}T08:30:00+08:00` }),
  "booking-rescheduled": () => bookingStatusCustomer({ ...booking, status: "rescheduled", scheduledAt: `${addDays(booking.preferredDate, 2)}T13:00:00+08:00` }),
  "booking-cancelled": () => bookingStatusCustomer({ ...booking, status: "cancelled", cancelReason: "Customer requested a later date." }),
  "job-diagnosing": () => jobStatusCustomer({ ...job, status: "diagnosing" }),
  "job-ready": () => jobStatusCustomer({ ...job, status: "ready" }),
  "job-released": () => jobStatusCustomer({ ...job, status: "released" }),
}

export async function GET(req: Request, ctx: RouteContext<"/api/dev/emails/[template]">) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 })
  const { template } = await ctx.params

  if (template === "index") {
    const links = Object.keys(TEMPLATES)
      .map((k) => `<li><a href="/api/dev/emails/${k}">${k}</a> · <a href="/api/dev/emails/${k}?format=text">text</a></li>`)
      .join("")
    return new Response(`<!doctype html><title>Email previews</title><body style="font:16px system-ui;padding:24px"><h1>JAC Motors email previews</h1><ul>${links}</ul>`, {
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  }

  const make = TEMPLATES[template]
  if (!make) return new Response("Unknown template", { status: 404 })
  const email = make()
  if (new URL(req.url).searchParams.get("format") === "text") {
    return new Response(`Subject: ${email.subject}\n\n${email.text}`, { headers: { "content-type": "text/plain; charset=utf-8" } })
  }
  return new Response(email.html, { headers: { "content-type": "text/html; charset=utf-8", "x-email-subject": encodeURIComponent(email.subject) } })
}
