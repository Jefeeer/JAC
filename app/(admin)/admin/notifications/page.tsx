import type { Metadata } from "next"
import Link from "next/link"
import { BellOffIcon } from "lucide-react"
import { MarkAllAdminRead } from "@/components/admin/mark-read"
import { panel } from "@/components/admin/ui"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import { adminPage } from "@/server/admin/context"

export const metadata: Metadata = { title: "Notifications" }

export default async function AdminNotificationsPage() {
  const { repo } = await adminPage("/admin/notifications")
  const items = await repo.notifications(100)
  const unread = items.filter((i) => !i.readAt).length

  return (
    <div className="grid gap-5">
      <RealtimeRefresh subscriptions={[{ table: "notifications", event: "INSERT" }]} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{unread ? `${unread} unread` : "All caught up"} · includes alerts for your role</p>
        <MarkAllAdminRead disabled={!unread} />
      </div>
      {items.length === 0 ? (
        <div className={cn(panel, "grid place-items-center px-6 py-14 text-center")}>
          <BellOffIcon className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">New quotes, bookings and breakdowns will appear here.</p>
        </div>
      ) : (
        <ul className={cn(panel, "divide-y divide-border overflow-hidden")}>
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.link ?? "#"} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40">
                <span className={cn("size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : n.title.includes("BREAKDOWN") ? "animate-pulse bg-brand" : "bg-brand")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={cn("block", !n.readAt && "font-semibold", n.title.includes("BREAKDOWN") && "text-brand-ink")}>{n.title}</span>
                  {n.body ? <span className="block truncate text-sm text-muted-foreground">{n.body}</span> : null}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
