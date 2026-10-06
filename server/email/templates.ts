import "server-only"

import { mapsUrl, type Branch } from "@/lib/config/branches"
import { formatKm, formatPeso } from "@/lib/format"
import type { FinancingEstimate, TradeInDetails } from "@/lib/validation/quote"
import { JOB_STATUS_FLOW, type JobStatus } from "@/types/domain"
import { absUrl, renderEmailHtml, renderEmailText, type EmailBlock, type EmailContent } from "./layout"

export type RenderedEmail = { subject: string; html: string; text: string }

function render(subject: string, content: EmailContent): RenderedEmail {
  return { subject, html: renderEmailHtml(content), text: renderEmailText(content) }
}

const manilaDate = (d: string | Date, withTime = false) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(typeof d === "string" ? new Date(d.length === 10 ? `${d}T00:00:00+08:00` : d) : d)

export { TIME_SLOT_LABELS } from "@/lib/validation/booking"
import { TIME_SLOT_LABELS } from "@/lib/validation/booking"

const branchLine = (b: Branch | null | undefined) => (b ? `JAC Motors ${b.name} — ${b.address}, ${b.city}` : "Nearest JAC Motors branch")

/* -------------------------------------------------------------------------- */
/*  Quotes                                                                    */
/* -------------------------------------------------------------------------- */

export type QuoteEmailData = {
  id: string
  reference: string
  type: "truck" | "part" | "service"
  contactName: string
  contactEmail: string
  contactPhone: string
  company: string | null
  subjectLine: string // "JAC N55 Refrigerated Van" / "JAC-1601010-ISF · Clutch Kit"
  quantity: number | null
  message: string | null
  financing: FinancingEstimate | null
  tradeIn: TradeInDetails | null
  branch: Branch | null
  attachments: number
}

function financingRows(f: FinancingEstimate | null): EmailBlock[] {
  if (!f) return []
  return [
    {
      type: "details",
      rows: [
        ["Est. unit price", formatPeso(f.price)],
        ["Down payment", `${f.downPaymentPct}%`],
        ["Term", `${f.termMonths} months @ ${f.ratePct}% p.a.`],
        ["Trade-in credit", f.tradeInValue ? formatPeso(f.tradeInValue) : null],
        ["Est. monthly", formatPeso(f.monthly)],
      ],
    },
  ]
}

export function quoteReceivedCustomer(q: QuoteEmailData): RenderedEmail {
  const first = q.contactName.split(" ")[0]
  const team = q.type === "part" ? "parts counter" : q.type === "service" ? "service desk" : "sales team"
  return render(`We've got your quote request — ${q.reference}`, {
    preheader: `${q.subjectLine} · our ${team} will contact you shortly.`,
    eyebrow: "Quote request received",
    heading: `Thanks, ${first}. We're on it.`,
    blocks: [
      { type: "paragraph", text: `Your request for ${q.subjectLine} is with our ${team}. Expect a call, SMS or email — usually within one business day.` },
      { type: "reference", label: "Your reference", value: q.reference },
      {
        type: "details",
        rows: [
          ["Item", q.subjectLine],
          ["Quantity", q.quantity && q.quantity > 1 ? String(q.quantity) : null],
          ["Branch", q.branch ? `JAC Motors ${q.branch.name}` : "Nearest branch"],
          ["Photos", q.attachments ? `${q.attachments} attached` : null],
        ],
      },
      ...(q.financing
        ? ([{ type: "paragraph", text: "You attached this financing estimate — we'll come back with actual terms:" }, ...financingRows(q.financing)] as EmailBlock[])
        : []),
      { type: "button", label: q.type === "truck" ? "Keep browsing trucks" : "Browse parts", href: absUrl(q.type === "truck" ? "/trucks" : "/parts") },
      {
        type: "callout",
        tone: "info",
        title: "Need it sooner?",
        text: "Reply to this email or message us on Viber / Messenger with your reference number.",
      },
    ],
    reason: `You're receiving this because a quote was requested on jacmotors.ph with ${q.contactEmail}.`,
  })
}

export function quoteNewStaff(q: QuoteEmailData): RenderedEmail {
  const typeLabel = { truck: "TRUCK", part: "PARTS", service: "SERVICE" }[q.type]
  return render(`[${typeLabel} QUOTE] ${q.reference} · ${q.subjectLine} · ${q.contactName}`, {
    preheader: `${q.contactName} · ${q.contactPhone} · ${q.subjectLine}`,
    eyebrow: `New ${q.type} quote request`,
    heading: q.subjectLine,
    blocks: [
      { type: "reference", label: "Reference", value: q.reference },
      {
        type: "details",
        rows: [
          ["Customer", q.contactName],
          ["Company", q.company],
          ["Phone", q.contactPhone],
          ["Email", q.contactEmail],
          ["Quantity", q.quantity ? String(q.quantity) : null],
          ["Branch", q.branch?.name ?? "Not specified"],
          ["Photos", q.attachments ? `${q.attachments} uploaded` : null],
          [
            "Trade-in",
            q.tradeIn ? [q.tradeIn.make, q.tradeIn.model, q.tradeIn.year, q.tradeIn.mileageKm ? formatKm(q.tradeIn.mileageKm) : null].filter(Boolean).join(" · ") : null,
          ],
        ],
      },
      ...(q.message ? ([{ type: "quote", text: q.message }] as EmailBlock[]) : []),
      ...financingRows(q.financing),
      { type: "button", label: "Open in admin", href: absUrl(`/admin/quotes/${q.id}`) },
    ],
    reason: "Staff alert from the JAC Motors website. Reply-to is set to the customer.",
  })
}

/* -------------------------------------------------------------------------- */
/*  Bookings                                                                  */
/* -------------------------------------------------------------------------- */

export type BookingEmailData = {
  id: string
  reference: string
  status: "pending" | "confirmed" | "rescheduled" | "cancelled" | string
  contactName: string
  contactEmail: string | null
  contactPhone: string
  company: string | null
  truckMake: string
  truckModel: string
  truckYear: number | null
  plateNumber: string | null
  mileageKm: number | null
  serviceName: string | null
  issue: string
  isBreakdown: boolean
  preferredDate: string // YYYY-MM-DD
  timeSlot: string
  scheduledAt: string | null
  cancelReason: string | null
  branch: Branch | null
  photos: number
}

const truckLine = (b: BookingEmailData) =>
  [`${b.truckMake} ${b.truckModel}`, b.truckYear, b.plateNumber].filter(Boolean).join(" · ")

export function bookingReceivedCustomer(b: BookingEmailData): RenderedEmail {
  const first = b.contactName.split(" ")[0]
  return render(`${b.isBreakdown ? "Breakdown request" : "Service booking"} received — ${b.reference}`, {
    preheader: `${truckLine(b)} · ${manilaDate(b.preferredDate)} · we'll confirm your slot shortly.`,
    eyebrow: b.isBreakdown ? "Breakdown request received" : "Booking received",
    heading: b.isBreakdown ? `Hang tight, ${first}. We're calling you.` : `Your bay is being prepared, ${first}.`,
    blocks: [
      ...(b.isBreakdown
        ? ([
            {
              type: "callout",
              tone: "warning",
              title: "Stranded right now?",
              text: "Switch on your hazards and set your early-warning device. Calling the breakdown line is always faster than waiting for this email.",
            },
          ] as EmailBlock[])
        : []),
      {
        type: "paragraph",
        text: "A JAC Motors service advisor will confirm your slot by call or SMS. Your booking isn't final until you hear from us.",
      },
      { type: "reference", label: "Booking reference", value: b.reference },
      { type: "timeline", steps: ["Requested", "Confirmed", "Checked in", "In the bay", "Released"], current: 0 },
      {
        type: "details",
        rows: [
          ["Truck", truckLine(b)],
          ["Odometer", b.mileageKm ? formatKm(b.mileageKm) : null],
          ["Service", b.serviceName ?? "Diagnosis / not sure"],
          ["Preferred", `${manilaDate(b.preferredDate)}, ${TIME_SLOT_LABELS[b.timeSlot] ?? b.timeSlot}`],
          ["Branch", branchLine(b.branch)],
          ["Photos", b.photos ? `${b.photos} attached` : null],
        ],
      },
      { type: "quote", text: b.issue },
      ...(b.branch ? ([{ type: "button", label: "Get directions", href: mapsUrl(b.branch) }] as EmailBlock[]) : []),
    ],
    reason: `You're receiving this because a service booking was made on jacmotors.ph with ${b.contactEmail ?? "this address"}.`,
  })
}

export function bookingNewStaff(b: BookingEmailData): RenderedEmail {
  return render(`${b.isBreakdown ? "🚨 BREAKDOWN · " : ""}[BOOKING] ${b.reference} · ${b.truckModel} · ${manilaDate(b.preferredDate)}`, {
    preheader: `${b.contactName} · ${b.contactPhone} · ${b.issue.slice(0, 80)}`,
    eyebrow: b.isBreakdown ? "Breakdown — call the customer now" : "New service booking",
    heading: `${b.truckMake} ${b.truckModel}${b.plateNumber ? ` · ${b.plateNumber}` : ""}`,
    blocks: [
      ...(b.isBreakdown
        ? ([{ type: "callout", tone: "warning", title: "Marked as breakdown", text: `Call ${b.contactName} on ${b.contactPhone} immediately and triage.` }] as EmailBlock[])
        : []),
      { type: "reference", label: "Reference", value: b.reference },
      {
        type: "details",
        rows: [
          ["Customer", b.contactName],
          ["Company", b.company],
          ["Phone", b.contactPhone],
          ["Email", b.contactEmail],
          ["Truck", truckLine(b)],
          ["Odometer", b.mileageKm ? formatKm(b.mileageKm) : null],
          ["Service", b.serviceName ?? "Not specified"],
          ["Preferred", `${manilaDate(b.preferredDate)}, ${TIME_SLOT_LABELS[b.timeSlot] ?? b.timeSlot}`],
          ["Branch", b.branch?.name ?? "Not specified"],
          ["Photos", b.photos ? `${b.photos} uploaded` : null],
        ],
      },
      { type: "quote", text: b.issue },
      { type: "button", label: "Open booking", href: absUrl(`/admin/bookings/${b.id}`) },
    ],
    reason: "Staff alert from the JAC Motors website. Reply-to is set to the customer.",
  })
}

export function bookingStatusCustomer(b: BookingEmailData): RenderedEmail {
  const when = b.scheduledAt ? manilaDate(b.scheduledAt, true) : `${manilaDate(b.preferredDate)}, ${TIME_SLOT_LABELS[b.timeSlot] ?? b.timeSlot}`

  if (b.status === "cancelled") {
    return render(`Booking cancelled — ${b.reference}`, {
      preheader: `${truckLine(b)} · ${b.reference}`,
      eyebrow: "Booking cancelled",
      heading: "Your service booking was cancelled.",
      blocks: [
        { type: "paragraph", text: `Booking ${b.reference} for your ${b.truckMake} ${b.truckModel} has been cancelled.` },
        ...(b.cancelReason ? ([{ type: "quote", text: b.cancelReason }] as EmailBlock[]) : []),
        { type: "paragraph", text: "If this wasn't expected, or you'd like a new slot, book again or call us — we'll fit you in." },
        { type: "button", label: "Book a new slot", href: absUrl("/book-service") },
      ],
      reason: `You're receiving this about booking ${b.reference}.`,
    })
  }

  const rescheduled = b.status === "rescheduled"
  return render(`${rescheduled ? "New time for your service" : "Service confirmed"} — ${when}`, {
    preheader: `${truckLine(b)} · ${branchLine(b.branch)}`,
    eyebrow: rescheduled ? "Booking rescheduled" : "Booking confirmed",
    heading: rescheduled ? "Your slot has moved." : "You're booked in.",
    blocks: [
      { type: "reference", label: rescheduled ? "New schedule" : "Drop-off", value: when },
      { type: "timeline", steps: ["Requested", "Confirmed", "Checked in", "In the bay", "Released"], current: 1 },
      {
        type: "details",
        rows: [
          ["Reference", b.reference],
          ["Truck", truckLine(b)],
          ["Service", b.serviceName],
          ["Where", branchLine(b.branch)],
        ],
      },
      {
        type: "callout",
        tone: "info",
        title: "What to bring",
        text: "OR/CR, the key and any spare keys, and your PMS booklet if you have one. Please arrive 10 minutes early for check-in.",
      },
      ...(b.branch ? ([{ type: "button", label: "Get directions", href: mapsUrl(b.branch) }] as EmailBlock[]) : []),
      { type: "paragraph", text: "Once your truck is checked in you'll get live job updates by email and in your customer portal." },
    ],
    reason: `You're receiving this about booking ${b.reference}.`,
  })
}

/* -------------------------------------------------------------------------- */
/*  Job orders                                                                */
/* -------------------------------------------------------------------------- */

export type JobEmailData = {
  id: string
  reference: string
  status: JobStatus
  customerName: string
  truckModel: string
  plateNumber: string | null
  customerNotes: string | null
  diagnosis: string | null
  grandTotal: number | null
  branch: Branch | null
}

const JOB_COPY: Record<JobStatus, { subject: string; heading: string; text: string }> = {
  received: { subject: "We've received your truck", heading: "Checked in and in the queue.", text: "Your truck is checked in. A technician will start diagnosis shortly." },
  diagnosing: { subject: "Diagnosis in progress", heading: "Our technicians are on it.", text: "We're running checks and diagnostics. You'll get our findings and a quote before any additional work starts." },
  awaiting_parts: { subject: "Waiting on parts", heading: "Parts are on the way.", text: "We're waiting for parts to arrive at the branch. We'll resume work as soon as they're in." },
  in_progress: { subject: "Repair work has started", heading: "Wrenches are turning.", text: "Work on your truck is under way." },
  ready: { subject: "Your truck is ready for release", heading: "Ready to roll.", text: "Your truck has passed its final checks and road test and is ready for pickup." },
  released: { subject: "Truck released — drive safe", heading: "Back on the road.", text: "Your truck has been released. Thanks for trusting JAC Motors — we'll remind you when the next service is due." },
  cancelled: { subject: "Job order cancelled", heading: "Job order cancelled.", text: "This job order has been cancelled. Contact your service advisor if you have questions." },
}

export function jobStatusCustomer(j: JobEmailData): RenderedEmail {
  const copy = JOB_COPY[j.status]
  const steps = JOB_STATUS_FLOW.map((s) => s.label)
  const current = Math.max(0, JOB_STATUS_FLOW.findIndex((s) => s.status === j.status))
  const truck = [`JAC ${j.truckModel}`, j.plateNumber].filter(Boolean).join(" · ")

  return render(`${copy.subject} — ${j.reference}`, {
    preheader: `${truck} · ${copy.text}`,
    eyebrow: `Job order ${j.reference}`,
    heading: copy.heading,
    blocks: [
      ...(j.status === "ready"
        ? ([
            {
              type: "callout",
              tone: "success",
              title: "Ready for pickup",
              text: `Bring your claim stub and valid ID to ${branchLine(j.branch)}. Branch hours are on our website.`,
            },
          ] as EmailBlock[])
        : []),
      { type: "paragraph", text: copy.text },
      ...(j.status !== "cancelled" ? ([{ type: "timeline", steps, current }] as EmailBlock[]) : []),
      {
        type: "details",
        rows: [
          ["Truck", truck],
          ["Branch", j.branch ? `JAC Motors ${j.branch.name}` : null],
          ["Findings", j.diagnosis],
          ["Estimated total", j.status === "ready" && j.grandTotal ? `${formatPeso(j.grandTotal)} — final amount on your invoice` : null],
        ],
      },
      ...(j.customerNotes ? ([{ type: "quote", text: j.customerNotes }] as EmailBlock[]) : []),
      { type: "button", label: "Track live in your portal", href: absUrl(`/account/jobs/${j.id}`) },
    ],
    reason: `You're receiving this because JAC Motors is servicing your truck under job order ${j.reference}.`,
  })
}
