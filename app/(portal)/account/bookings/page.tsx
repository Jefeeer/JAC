import type { Metadata } from "next"
import Link from "next/link"
import { CalendarCheckIcon, SirenIcon } from "lucide-react"
import { EmptyState, PageHeader, primaryBtn } from "@/components/portal/page-header"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { StatusPill } from "@/components/shared/status-pill"
import { branches } from "@/lib/config/branches"
import { formatDate, formatDateTime } from "@/lib/format"
import { BOOKING_STATUS } from "@/lib/status"
import { TIME_SLOT_LABELS } from "@/lib/validation/booking"
import { listBookings } from "@/server/queries/portal"

export const metadata: Metadata = { title: "Bookings" }

export default async function BookingsPage() {
  const bookings = await listBookings(100)

  return (
    <>
      <RealtimeRefresh subscriptions={[{ table: "service_bookings" }]} />
      <PageHeader
        eyebrow="Service bookings"
        title="Bookings"
        description="Requests you've made online or with our advisors. Status updates here as soon as the branch confirms."
        actions={
          <Link href="/book-service" className={primaryBtn}>
            New booking
          </Link>
        }
      />
      {bookings.length === 0 ? (
        <EmptyState icon={CalendarCheckIcon} title="No bookings yet" text="Book PMS, diagnostics or a repair online — we'll confirm your slot by call or SMS." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-sm border border-border bg-card">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link href={`/account/bookings/${b.id}`} className="grid gap-2 p-5 hover:bg-muted/40 sm:grid-cols-[1fr_auto] sm:items-center">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-mono text-xs text-brand-ink">
                    {b.reference}
                    {b.isBreakdown ? (
                      <span className="inline-flex items-center gap-1 rounded-[2px] bg-brand px-1.5 py-0.5 text-[9px] text-white">
                        <SirenIcon className="size-3" /> Breakdown
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block font-semibold">
                    {b.serviceName ?? "Service / diagnosis"} · {b.truckModel} <span className="font-mono text-xs text-muted-foreground">{b.plateNumber}</span>
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {b.scheduledAt ? formatDateTime(b.scheduledAt) : `${formatDate(b.preferredDate)}, ${TIME_SLOT_LABELS[b.timeSlot] ?? b.timeSlot}`} ·{" "}
                    {branches.find((x) => x.slug === b.branchSlug)?.name ?? "Branch TBC"}
                  </span>
                </span>
                <StatusPill label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
