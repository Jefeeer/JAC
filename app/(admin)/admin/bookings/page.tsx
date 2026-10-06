import type { Metadata } from "next"
import Link from "next/link"
import { SirenIcon } from "lucide-react"
import { EmptyRow, FilterTabs, Td, Th, panel } from "@/components/admin/ui"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { StatusPill } from "@/components/shared/status-pill"
import { branches } from "@/lib/config/branches"
import { formatDate, formatDateTime, formatRelative } from "@/lib/format"
import { BOOKING_STATUS } from "@/lib/status"
import { cn } from "@/lib/utils"
import { TIME_SLOT_LABELS } from "@/lib/validation/booking"
import { adminPage } from "@/server/admin/context"
import type { BookingStatus } from "@/types/domain"

export const metadata: Metadata = { title: "Bookings" }

const TABS: { key: string; label: string; status?: BookingStatus | "open" }[] = [
  { key: "open", label: "Open", status: "open" },
  { key: "pending", label: "To confirm", status: "pending" },
  { key: "confirmed", label: "Confirmed", status: "confirmed" },
  { key: "converted", label: "Checked in", status: "converted" },
  { key: "cancelled", label: "Cancelled", status: "cancelled" },
  { key: "all", label: "All" },
]

export default async function AdminBookingsPage(props: PageProps<"/admin/bookings">) {
  const { repo } = await adminPage("/admin/bookings", "bookings.read")
  const sp = await props.searchParams
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0]
  const branch = typeof sp.branch === "string" ? sp.branch : undefined
  const rows = await repo.listBookings({ status: tab.status, branch })

  return (
    <div className="grid gap-5 [&>*]:min-w-0">
      <RealtimeRefresh subscriptions={[{ table: "service_bookings" }]} />
      <FilterTabs tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: `/admin/bookings?tab=${t.key}${branch ? `&branch=${branch}` : ""}` }))} active={tab.key} />
      <div className={cn(panel, "overflow-x-auto")}>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <Th>Booking</Th>
              <Th>Customer</Th>
              <Th>Truck & service</Th>
              <Th>When</Th>
              <Th>Branch</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((b) => (
              <tr key={b.id} className={cn("hover:bg-muted/40", b.isBreakdown && b.status === "pending" && "bg-brand/5")}>
                <Td>
                  <Link href={`/admin/bookings/${b.id}`} className="font-mono text-xs font-semibold text-brand-ink hover:underline">
                    {b.reference}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{formatRelative(b.createdAt)}</span>
                </Td>
                <Td>
                  <span className="block font-semibold">{b.contactName}</span>
                  <span className="block text-xs text-muted-foreground">{b.contactPhone}</span>
                </Td>
                <Td>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {b.isBreakdown ? <SirenIcon className="size-3.5 text-brand" aria-label="Breakdown" /> : null}
                    {b.truckLabel} <span className="font-mono text-xs font-normal text-muted-foreground">{b.plateNumber}</span>
                  </span>
                  <span className="block text-xs text-muted-foreground">{b.serviceName ?? "Diagnosis"}</span>
                </Td>
                <Td className="font-mono text-xs whitespace-nowrap">
                  {b.scheduledAt ? formatDateTime(b.scheduledAt) : `${formatDate(b.preferredDate)} · ${TIME_SLOT_LABELS[b.timeSlot] ?? b.timeSlot}`}
                  {!b.scheduledAt && b.status === "pending" ? <span className="block text-[10px] text-muted-foreground">preferred</span> : null}
                </Td>
                <Td>{branches.find((x) => x.slug === b.branchSlug)?.name ?? "—"}</Td>
                <Td>
                  <StatusPill label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} />
                </Td>
              </tr>
            ))}
            {rows.length === 0 ? <EmptyRow colSpan={6}>No bookings here.</EmptyRow> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
