import type { Metadata } from "next"
import Link from "next/link"
import { BellOffIcon, CalendarCheckIcon, ClipboardListIcon, GaugeIcon, WrenchIcon } from "lucide-react"
import { MarkAllRead } from "@/components/portal/mark-all-read"
import { EmptyState, PageHeader } from "@/components/portal/page-header"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import { requireUser } from "@/server/auth"
import { listNotifications } from "@/server/queries/portal"

export const metadata: Metadata = { title: "Notifications" }

const iconFor = (type: string) =>
  type.startsWith("job") ? WrenchIcon : type.startsWith("booking") ? CalendarCheckIcon : type.startsWith("quote") ? ClipboardListIcon : GaugeIcon

export default async function NotificationsPage() {
  const session = await requireUser("/account/notifications")
  const items = await listNotifications(session.userId, 100)
  const unread = items.filter((i) => !i.readAt).length

  return (
    <>
      <RealtimeRefresh subscriptions={[{ table: "notifications", filter: `recipient_id=eq.${session.userId}`, event: "INSERT" }]} />
      <PageHeader eyebrow={unread ? `${unread} unread` : "All caught up"} title="Notifications" actions={<MarkAllRead disabled={unread === 0} />} />
      {items.length === 0 ? (
        <EmptyState icon={BellOffIcon} title="Nothing yet" text="Booking confirmations, job updates and maintenance reminders will appear here." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-sm border border-border bg-card">
          {items.map((n) => {
            const Icon = iconFor(n.type)
            const inner = (
              <>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-full border", n.readAt ? "border-border text-muted-foreground" : "border-brand bg-brand/10 text-brand-ink")}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block", !n.readAt && "font-semibold")}>{n.title}</span>
                  {n.body ? <span className="block truncate text-sm text-muted-foreground">{n.body}</span> : null}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</span>
                {!n.readAt ? <span className="size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" /> : null}
              </>
            )
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} className="flex items-center gap-4 p-4 hover:bg-muted/40">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 p-4">{inner}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
