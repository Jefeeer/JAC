import type { Metadata } from "next"
import Link from "next/link"
import { BanknoteIcon, CalendarCheckIcon, ClipboardListIcon, PackageIcon, SirenIcon, TruckIcon, WrenchIcon } from "lucide-react"
import { Panel, StatCard } from "@/components/admin/ui"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { StatusPill } from "@/components/shared/status-pill"
import { branches } from "@/lib/config/branches"
import { formatDate, formatPeso, formatPesoCompact, formatRelative } from "@/lib/format"
import { BOOKING_STATUS, JOB_STATUS, QUOTE_STATUS } from "@/lib/status"
import { cn } from "@/lib/utils"
import { adminPage } from "@/server/admin/context"
import { ROLE_LABELS, can, quoteTypesFor } from "@/server/admin/permissions"
import { JOB_STATUS_FLOW } from "@/types/domain"

export const metadata: Metadata = { title: "Dashboard" }

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", hour12: false }).format(new Date()))
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

export default async function AdminDashboard(props: PageProps<"/admin">) {
  const { session, repo, role } = await adminPage("/admin")
  const denied = (await props.searchParams).denied === "1"
  const [stats, jobs, bookings, quotes, lowParts] = await Promise.all([
    repo.stats(),
    can(role, "jobs.read") ? repo.listJobs({ status: "active" }) : Promise.resolve([]),
    can(role, "bookings.read") ? repo.listBookings({ status: "open" }) : Promise.resolve([]),
    can(role, "quotes.read") ? repo.listQuotes({ status: "open" }) : Promise.resolve([]),
    can(role, "parts.write") ? repo.listParts({ stock: "low" }) : Promise.resolve([]),
  ])
  const myTypes = quoteTypesFor(role)
  const myQuotes = myTypes ? quotes.filter((q) => myTypes.includes(q.type)) : quotes
  const breakdowns = bookings.filter((b) => b.isBreakdown && b.status === "pending")
  const maxSales = Math.max(...stats.salesTrend.map((s) => s.total), 1)
  const first = (session.profile.fullName ?? "").split(" ")[0]

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <RealtimeRefresh subscriptions={[{ table: "job_orders" }, { table: "service_bookings" }, { table: "quotes" }]} />
      {denied ? <p className="rounded-md border border-signal/60 bg-signal/10 px-4 py-3 text-sm">That section isn&apos;t available for your role.</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
            {formatDate(new Date(), { weekday: "long", month: "long", day: "numeric" })} · {ROLE_LABELS[role]}
          </p>
          <h1 className="mt-1 text-4xl leading-[0.95] font-black uppercase sm:text-5xl">
            {greeting()}
            {first ? `, ${first}` : ""}.
          </h1>
        </div>
        {breakdowns.length ? (
          <Link href="/admin/bookings" className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white">
            <SirenIcon className="size-4 animate-pulse" /> {breakdowns.length} breakdown {breakdowns.length === 1 ? "request" : "requests"} waiting
          </Link>
        ) : null}
      </div>

      {/* KPIs */}
      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Trucks in inventory"
          value={stats.trucksPublished}
          detail={`${stats.trucksAvailable} available · ${stats.trucksTotal - stats.trucksPublished} drafts`}
          href={can(role, "trucks.write") ? "/admin/trucks" : undefined}
          icon={TruckIcon}
        />
        <StatCard
          label="Open quotes"
          value={stats.openQuotes}
          detail={stats.newQuotes ? `${stats.newQuotes} new — need a reply` : "All answered"}
          href={can(role, "quotes.read") ? "/admin/quotes" : undefined}
          icon={ClipboardListIcon}
          tone={stats.newQuotes ? "brand" : "neutral"}
        />
        <StatCard
          label="Jobs in progress"
          value={stats.jobsActive}
          detail={stats.jobsReady ? `${stats.jobsReady} ready for release` : `${stats.pendingBookings} bookings to confirm`}
          href="/admin/jobs"
          icon={WrenchIcon}
          tone={stats.jobsReady ? "success" : "neutral"}
        />
        <StatCard label="Sales this month" value={formatPesoCompact(stats.monthSales)} detail={`${stats.monthInvoices} invoices issued`} icon={BanknoteIcon} tone="success" />
      </section>

      <div className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        {/* Workshop pipeline */}
        <Panel title={role === "mechanic" ? "My workshop" : "Workshop pipeline"} icon={WrenchIcon} action={{ href: "/admin/jobs", label: "Job board" }} className="xl:col-span-2">
          <div className="grid grid-cols-3 gap-px bg-border sm:grid-cols-5">
            {JOB_STATUS_FLOW.slice(0, 5).map((s) => {
              const n = jobs.filter((j) => j.status === s.status).length
              return (
                <Link key={s.status} href={`/admin/jobs#${s.status}`} className="bg-card p-4 hover:bg-muted/40">
                  <span className="block font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">{s.label}</span>
                  <span className={cn("mt-2 block font-display text-4xl font-black", n && s.status === "ready" && "text-success")}>{n}</span>
                </Link>
              )
            })}
          </div>
          <ul className="divide-y divide-border border-t border-border">
            {jobs.slice(0, 6).map((j) => (
              <li key={j.id}>
                <Link href={`/admin/jobs/${j.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 hover:bg-muted/40 sm:grid-cols-[8rem_1fr_9rem_auto]">
                  <span className="font-mono text-xs text-brand-ink">{j.reference}</span>
                  <span className="min-w-0 truncate text-sm">
                    <strong>{j.truckLabel}</strong> {j.plateNumber ? <span className="font-mono text-xs text-muted-foreground">{j.plateNumber}</span> : null} · {j.customerName}
                  </span>
                  <span className="hidden truncate text-xs text-muted-foreground sm:block">{j.mechanic?.name ?? "Unassigned"}</span>
                  <StatusPill label={JOB_STATUS[j.status].label} tone={JOB_STATUS[j.status].tone} />
                </Link>
              </li>
            ))}
            {jobs.length === 0 ? <li className="px-5 py-8 text-center text-sm text-muted-foreground">No active jobs.</li> : null}
          </ul>
        </Panel>

        {/* Sales trend */}
        <Panel title="Sales" icon={BanknoteIcon} bodyClassName="p-5">
          <p className="font-display text-4xl font-black">{formatPeso(stats.monthSales)}</p>
          <p className="text-sm text-muted-foreground">Invoiced this month (VAT incl.)</p>
          <div className="mt-6 flex h-40 items-end gap-2" role="img" aria-label="Invoiced sales, last 6 months">
            {stats.salesTrend.map((s, i) => (
              <div key={s.month} className="flex flex-1 flex-col items-center gap-2">
                <span className="font-mono text-[9px] text-muted-foreground">{s.total ? formatPesoCompact(s.total) : ""}</span>
                <span
                  className={cn("w-full rounded-t-sm", i === stats.salesTrend.length - 1 ? "bg-brand" : "bg-foreground/15")}
                  style={{ height: `${Math.max(4, (s.total / maxSales) * 110)}px` }}
                />
                <span className="font-mono text-[10px] text-muted-foreground">{formatDate(`${s.month}-01`, { month: "short" })}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3 [&>*]:min-w-0">
        {can(role, "bookings.read") ? (
          <Panel title="Bookings to handle" icon={CalendarCheckIcon} action={{ href: "/admin/bookings", label: "All bookings" }}>
            <ul className="divide-y divide-border">
              {bookings.slice(0, 6).map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/bookings/${b.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40">
                    {b.isBreakdown ? <SirenIcon className="size-4 shrink-0 text-brand" aria-label="Breakdown" /> : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {b.contactName} · {b.truckLabel}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {b.reference} · {formatDate(b.scheduledAt ?? b.preferredDate, { month: "short", day: "numeric" })} · {branches.find((x) => x.slug === b.branchSlug)?.name ?? "—"}
                      </span>
                    </span>
                    <StatusPill label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} />
                  </Link>
                </li>
              ))}
              {bookings.length === 0 ? <li className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing waiting.</li> : null}
            </ul>
          </Panel>
        ) : null}

        {can(role, "quotes.read") ? (
          <Panel title={myTypes ? "My quotes" : "Quotes inbox"} icon={ClipboardListIcon} action={{ href: "/admin/quotes", label: "Inbox" }}>
            <ul className="divide-y divide-border">
              {myQuotes.slice(0, 6).map((q) => (
                <li key={q.id}>
                  <Link href={`/admin/quotes/${q.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{q.subject}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {q.contactName} · {formatRelative(q.createdAt)}
                      </span>
                    </span>
                    <StatusPill label={QUOTE_STATUS[q.status].label} tone={QUOTE_STATUS[q.status].tone} />
                  </Link>
                </li>
              ))}
              {myQuotes.length === 0 ? <li className="px-5 py-8 text-center text-sm text-muted-foreground">Inbox zero.</li> : null}
            </ul>
          </Panel>
        ) : null}

        {can(role, "parts.write") ? (
          <Panel title="Stock alerts" icon={PackageIcon} action={{ href: "/admin/parts?stock=low", label: "Parts" }}>
            <ul className="divide-y divide-border">
              {lowParts.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/parts/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{p.partNumber}</span>
                    </span>
                    <span className={cn("font-mono text-sm font-bold", p.stockQty <= 0 ? "text-destructive" : "text-signal-foreground dark:text-signal")}>
                      {p.stockQty} / {p.reorderLevel}
                    </span>
                  </Link>
                </li>
              ))}
              {lowParts.length === 0 ? <li className="px-5 py-8 text-center text-sm text-muted-foreground">Stock levels healthy.</li> : null}
            </ul>
          </Panel>
        ) : null}
      </div>
    </div>
  )
}
