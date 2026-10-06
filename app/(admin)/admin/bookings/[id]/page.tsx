import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ArrowRightIcon, MailIcon, PhoneIcon, SirenIcon } from "lucide-react"
import { BookingActions } from "@/components/admin/booking-actions"
import { NotesThread } from "@/components/admin/notes-thread"
import { Panel } from "@/components/admin/ui"
import { PageHeader } from "@/components/portal/page-header"
import { StatusPill } from "@/components/shared/status-pill"
import { branches } from "@/lib/config/branches"
import { formatDate, formatDateTime, formatKm } from "@/lib/format"
import { BOOKING_STATUS } from "@/lib/status"
import { TIME_SLOT_LABELS } from "@/lib/validation/booking"
import { adminPage } from "@/server/admin/context"
import { can } from "@/server/admin/permissions"

export const metadata: Metadata = { title: "Booking" }

export default async function AdminBookingPage(props: PageProps<"/admin/bookings/[id]">) {
  const { id } = await props.params
  const { repo, role } = await adminPage(`/admin/bookings/${id}`, "bookings.read")
  const [b, mechanics] = await Promise.all([repo.getBooking(id), repo.staff("mechanic")])
  if (!b) notFound()
  const branch = branches.find((x) => x.slug === b.branchSlug)
  const defaultWhen = b.scheduledAt
    ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(b.scheduledAt)).replace(" ", "T")
    : `${b.preferredDate}T${b.timeSlot.slice(0, 5)}`

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <PageHeader
        back={{ href: "/admin/bookings", label: "Bookings" }}
        eyebrow={`Booking ${b.reference} · ${b.createdAt ? `received ${formatDateTime(b.createdAt)}` : ""}`}
        title={
          <span className="flex items-center gap-3">
            {b.isBreakdown ? <SirenIcon className="size-8 text-brand" aria-label="Breakdown" /> : null}
            {b.serviceName ?? "Service / diagnosis"}
          </span>
        }
        description={`${b.truckLabel}${b.plateNumber ? ` · ${b.plateNumber}` : ""} · ${branch ? `JAC Motors ${branch.name}` : "Branch TBC"}`}
        actions={<StatusPill label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} className="text-xs" />}
      />

      {b.isBreakdown && b.status === "pending" ? (
        <a href={`tel:${b.contactPhone.replace(/[^\d+]/g, "")}`} className="flex items-center justify-between gap-4 rounded-lg bg-brand p-5 text-white">
          <span>
            <span className="block font-mono text-[11px] tracking-[0.2em] uppercase opacity-80">Breakdown — call the customer now</span>
            <span className="mt-1 block font-display text-3xl font-extrabold">{b.contactPhone}</span>
          </span>
          <PhoneIcon className="size-8" />
        </a>
      ) : null}

      {b.jobId ? (
        <Link href={`/admin/jobs/${b.jobId}`} className="flex items-center justify-between rounded-lg border border-brand/40 bg-brand/5 p-4">
          <span className="font-semibold">Checked in — open the job order</span>
          <ArrowRightIcon className="size-4" />
        </Link>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <div className="grid content-start gap-6 [&>*]:min-w-0">
          {can(role, "bookings.write") ? (
            <Panel title="Actions" bodyClassName="p-5">
              <BookingActions id={b.id} status={b.status} defaultWhen={defaultWhen} mechanics={mechanics} canConvert={!b.jobId} label={`${b.reference} · ${b.contactName}`} />
            </Panel>
          ) : null}
          <Panel title="Request" bodyClassName="grid gap-5 p-5">
            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              {[
                ["Preferred", `${formatDate(b.preferredDate, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · ${TIME_SLOT_LABELS[b.timeSlot] ?? b.timeSlot}`],
                ["Scheduled", b.scheduledAt ? formatDateTime(b.scheduledAt) : "Not yet"],
                ["Truck", [b.truckMake, b.truckModel, b.truckYear].filter(Boolean).join(" ")],
                ["Odometer", b.mileageKm ? formatKm(b.mileageKm) : "—"],
                ["Plate", b.plateNumber ?? "—"],
                ["Cancel reason", b.cancelReason],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">{k}</dt>
                    <dd className="mt-1">{v}</dd>
                  </div>
                ))}
            </dl>
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Issue</p>
              <p className="mt-1 whitespace-pre-line">{b.issue}</p>
            </div>
            {b.photoUrls.length ? (
              <div className="flex flex-wrap gap-2">
                {b.photoUrls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="relative block size-28 overflow-hidden rounded-md border border-border">
                    <Image src={u} alt="Customer photo" fill sizes="112px" className="object-cover" unoptimized />
                  </a>
                ))}
              </div>
            ) : null}
          </Panel>
        </div>

        <aside className="grid content-start gap-6 [&>*]:min-w-0">
          <Panel title="Contact" bodyClassName="grid gap-2 p-5 text-sm">
            <p className="font-semibold">
              {b.contactName}
              {b.company ? <span className="block text-xs font-normal text-muted-foreground">{b.company}</span> : null}
            </p>
            <a href={`tel:${b.contactPhone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 hover:text-brand-ink">
              <PhoneIcon className="size-3.5" /> {b.contactPhone}
            </a>
            {b.contactEmail ? (
              <a href={`mailto:${b.contactEmail}`} className="inline-flex items-center gap-2 break-all hover:text-brand-ink">
                <MailIcon className="size-3.5" /> {b.contactEmail}
              </a>
            ) : null}
            {b.customerId && can(role, "customers.read") ? (
              <Link href={`/admin/customers/${b.customerId}`} className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline">
                Customer record & fleet →
              </Link>
            ) : null}
          </Panel>
          <Panel title="Internal notes" bodyClassName="p-5">
            <NotesThread entityType="booking" entityId={b.id} notes={b.notes} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
