import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRightIcon, MapPinIcon, PhoneCallIcon } from "lucide-react"
import { CancelBooking } from "@/components/portal/cancel-booking"
import { PageHeader, secondaryBtn } from "@/components/portal/page-header"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { StatusPill } from "@/components/shared/status-pill"
import { branches, mapsUrl } from "@/lib/config/branches"
import { contactLinks, siteConfig } from "@/lib/config/site"
import { formatDate, formatDateTime, formatKm } from "@/lib/format"
import { BOOKING_STATUS, JOB_STATUS } from "@/lib/status"
import { TIME_SLOT_LABELS } from "@/lib/validation/booking"
import { getBooking } from "@/server/queries/portal"

export const metadata: Metadata = { title: "Booking" }

const STEPS = ["Requested", "Confirmed", "Checked in", "Completed"]
const stepIndex = (s: string) => ({ pending: 0, confirmed: 1, rescheduled: 1, converted: 2, completed: 3 })[s] ?? 0

export default async function BookingDetailPage(props: PageProps<"/account/bookings/[id]">) {
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const b = await getBooking(id)
  if (!b) notFound()

  const branch = branches.find((x) => x.slug === b.branchSlug)
  const cancellable = ["pending", "confirmed", "rescheduled"].includes(b.status)
  const closed = ["cancelled", "no_show"].includes(b.status)
  const at = stepIndex(b.status)

  return (
    <>
      <RealtimeRefresh subscriptions={[{ table: "service_bookings", filter: `id=eq.${b.id}` }, { table: "job_orders" }]} />
      <PageHeader
        back={{ href: "/account/bookings", label: "Bookings" }}
        eyebrow={`Booking ${b.reference}${b.isBreakdown ? " · Breakdown" : ""}`}
        title={b.serviceName ?? "Service / diagnosis"}
        description={`${b.truckModel}${b.plateNumber ? ` · ${b.plateNumber}` : ""}`}
        actions={<StatusPill label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} className="text-xs" />}
      />

      {!closed ? (
        <ol className="mb-8 grid grid-cols-4 gap-1" aria-label="Booking progress">
          {STEPS.map((s, i) => (
            <li key={s}>
              <div className={`h-1.5 rounded-full ${i <= at ? "bg-brand" : "bg-border"}`} />
              <p className={`mt-2 text-xs ${i === at ? "font-semibold" : "text-muted-foreground"}`}>{s}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mb-8 rounded-sm border border-border bg-muted/50 p-4 text-sm">
          This booking was {b.status === "no_show" ? "marked as a no-show" : "cancelled"}
          {b.cancelReason ? ` — ${b.cancelReason}` : ""}.{" "}
          <Link href="/book-service" className="underline underline-offset-2">
            Book a new slot
          </Link>
        </p>
      )}

      {b.job ? (
        <Link href={`/account/jobs/${b.job.id}`} className="mb-8 flex items-center justify-between gap-4 rounded-sm border border-brand/50 bg-brand/5 p-5">
          <span>
            <span className="block font-mono text-xs text-brand-ink">Job order {b.job.reference}</span>
            <span className="block font-semibold">Your truck is checked in — track the job live</span>
          </span>
          <span className="flex items-center gap-3">
            <StatusPill label={JOB_STATUS[b.job.status].label} tone={JOB_STATUS[b.job.status].tone} pulse />
            <ArrowRightIcon className="size-4" />
          </span>
        </Link>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-sm border border-border bg-card p-6">
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {[
              ["When", b.scheduledAt ? formatDateTime(b.scheduledAt) : `${formatDate(b.preferredDate)}, ${TIME_SLOT_LABELS[b.timeSlot] ?? b.timeSlot} (preferred)`],
              ["Branch", branch ? `JAC Motors ${branch.name}` : "To be confirmed"],
              ["Truck", [b.truckModel, b.truckYear, b.plateNumber].filter(Boolean).join(" · ")],
              ["Odometer", b.mileageKm ? formatKm(b.mileageKm) : "—"],
              ["Requested", formatDateTime(b.createdAt)],
              ["Photos", b.photoCount ? `${b.photoCount} attached` : "None"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{k}</dt>
                <dd className="mt-1">{v}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Issue</dt>
              <dd className="mt-1 whitespace-pre-line">{b.issue}</dd>
            </div>
          </dl>
        </section>

        <aside className="grid content-start gap-4">
          {b.status === "pending" ? (
            <p className="rounded-sm border border-signal/60 bg-signal/10 p-4 text-sm">
              Awaiting confirmation — a service advisor will call or SMS you to confirm the slot.
            </p>
          ) : null}
          {branch ? (
            <div className="flex flex-wrap gap-2">
              <a href={contactLinks.tel(branch.phone ?? branch.mobile ?? siteConfig.contact.phone)} className={secondaryBtn}>
                <PhoneCallIcon className="size-4" /> Call {branch.name}
              </a>
              <a href={mapsUrl(branch)} target="_blank" rel="noopener noreferrer" className={secondaryBtn}>
                <MapPinIcon className="size-4" /> Directions
              </a>
            </div>
          ) : null}
          {cancellable ? <CancelBooking id={b.id} /> : null}
        </aside>
      </div>
    </>
  )
}
