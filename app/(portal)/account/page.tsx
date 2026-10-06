import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BellIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  GaugeIcon,
  PlusIcon,
  TruckIcon,
  WrenchIcon,
} from "lucide-react"
import { JobProgress } from "@/components/portal/job-progress"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { StatusPill } from "@/components/shared/status-pill"
import { branches } from "@/lib/config/branches"
import { formatDate, formatDateTime, formatKm, formatPeso, formatRelative } from "@/lib/format"
import { BOOKING_STATUS, JOB_STATUS, MAINTENANCE_STATE, QUOTE_STATUS } from "@/lib/status"
import { cn } from "@/lib/utils"
import { TIME_SLOT_LABELS } from "@/lib/validation/booking"
import { requireUser } from "@/server/auth"
import { truckImageForModel } from "@/server/queries/catalog"
import { getCompany, listBookings, listFleet, listJobs, listNotifications, listQuotes } from "@/server/queries/portal"

export const metadata: Metadata = { title: "Dashboard" }

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", hour12: false }).format(new Date()))
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

const card = "rounded-lg border border-border bg-card"

function CardHeader({ title, href, linkLabel, icon: Icon }: { title: string; href?: string; linkLabel?: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
      <h2 className="flex items-center gap-2.5 font-display text-xl font-extrabold uppercase">
        <Icon className="size-4 text-brand-ink" aria-hidden /> {title}
      </h2>
      {href ? (
        <Link href={href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          {linkLabel} <ArrowRightIcon className="size-3.5" />
        </Link>
      ) : null}
    </div>
  )
}

export default async function DashboardPage(props: PageProps<"/account">) {
  const session = await requireUser("/account")
  const denied = (await props.searchParams).denied === "admin"
  const [jobs, bookings, quotes, fleet, notes, company] = await Promise.all([
    listJobs({ active: true }),
    listBookings(30),
    listQuotes(30),
    listFleet(),
    listNotifications(session.userId, 6),
    getCompany(session.customer?.companyId ?? null),
  ])

  const upcoming = bookings
    .filter((b) => ["pending", "confirmed", "rescheduled"].includes(b.status))
    .sort((a, b) => (a.scheduledAt ?? a.preferredDate).localeCompare(b.scheduledAt ?? b.preferredDate))
  const openQuotes = quotes.filter((q) => ["new", "in_review", "quoted"].includes(q.status))
  const quotedCount = openQuotes.filter((q) => q.status === "quoted").length
  const ready = jobs.filter((j) => j.status === "ready")
  const health = {
    ok: fleet.filter((u) => u.maintenance?.state === "ok").length,
    due_soon: fleet.filter((u) => u.maintenance?.state === "due_soon").length,
    overdue: fleet.filter((u) => u.maintenance?.state === "overdue").length,
  }
  const attention = fleet
    .filter((u) => u.maintenance && u.maintenance.state !== "ok")
    .sort((a, b) => (a.maintenance!.state === "overdue" ? -1 : 1) - (b.maintenance!.state === "overdue" ? -1 : 1))
  const first = (session.profile.fullName ?? "").split(" ")[0]
  const live = jobs.find((j) => j.status !== "ready") ?? jobs[0]
  const heroImage = truckImageForModel(live?.truckModel ?? fleet[0]?.model)

  const kpis = [
    { label: "In the workshop", value: jobs.length, detail: ready.length ? `${ready.length} ready for pickup` : "Live stage updates", href: "/account/jobs", icon: WrenchIcon, tone: ready.length ? "success" : "brand" },
    { label: "Upcoming bookings", value: upcoming.length, detail: upcoming[0] ? `Next: ${formatDate(upcoming[0].scheduledAt ?? upcoming[0].preferredDate, { month: "short", day: "numeric" })}` : "Nothing scheduled", href: "/account/bookings", icon: CalendarCheckIcon, tone: "info" },
    { label: "Open quotes", value: openQuotes.length, detail: quotedCount ? `${quotedCount} priced — review now` : "Being prepared", href: "/account/quotes", icon: ClipboardListIcon, tone: quotedCount ? "warning" : "info" },
    { label: "Need service", value: health.due_soon + health.overdue, detail: health.overdue ? `${health.overdue} overdue` : fleet.length ? "Fleet up to date" : "No trucks yet", href: "/account/fleet", icon: GaugeIcon, tone: health.overdue ? "danger" : health.due_soon ? "warning" : "success" },
  ] as const

  const toneBg = { brand: "bg-brand/10 text-brand-ink", info: "bg-foreground/[0.06] text-foreground", warning: "bg-signal/20 text-signal-foreground dark:text-signal", danger: "bg-destructive/10 text-destructive", success: "bg-success/10 text-success" }

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <RealtimeRefresh subscriptions={[{ table: "job_orders" }, { table: "service_bookings" }, { table: "quotes" }]} />

      {denied ? <p className="rounded-md border border-signal/60 bg-signal/10 px-4 py-3 text-sm">The admin panel is for JAC Motors staff only.</p> : null}

      {/* Hero summary */}
      <section className="dark grain relative isolate overflow-hidden rounded-xl bg-asphalt text-concrete">
        <div className="absolute inset-y-0 right-0 -z-10 w-full md:w-3/5">
          <Image src={heroImage.url} alt="" fill priority sizes="(min-width: 768px) 60vw, 100vw" className="object-cover object-center opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-asphalt via-asphalt/80 to-asphalt/10" aria-hidden />
        </div>
        <div className="grid-lines absolute inset-0 -z-10 text-white opacity-30" aria-hidden />
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:p-10 [&>*]:min-w-0">
          <div>
            <p className="font-mono text-[11px] tracking-[0.22em] text-concrete/60 uppercase">
              {formatDate(new Date(), { weekday: "long", month: "long", day: "numeric" })}
              {company ? ` · ${company.name}` : ""}
            </p>
            <h1 className="mt-3 text-4xl leading-[0.9] font-black break-words uppercase sm:text-6xl">
              {greeting()}
              {first ? (
                <>
                  , <span className="text-brand">{first}.</span>
                </>
              ) : (
                "."
              )}
            </h1>
            <ul className="mt-5 flex flex-wrap gap-2 text-sm">
              <li className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                <strong>{jobs.length}</strong> in the workshop
              </li>
              {ready.length ? (
                <li className="rounded-full border border-success/50 bg-success/15 px-3 py-1 text-success">
                  <strong>{ready.length}</strong> ready for pickup
                </li>
              ) : null}
              <li className={cn("rounded-full border px-3 py-1", health.overdue ? "border-brand/60 bg-brand/15" : "border-white/15 bg-white/5")}>
                <strong>{health.overdue + health.due_soon}</strong> of {fleet.length} trucks need service
              </li>
            </ul>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link href="/book-service" className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-5 text-sm font-semibold text-white hover:brightness-110">
                Book a service <ArrowRightIcon className="size-4" />
              </Link>
              <Link href="/account/fleet/new" className="inline-flex h-11 items-center gap-2 rounded-md border border-white/20 px-5 text-sm font-medium hover:bg-white/10">
                <PlusIcon className="size-4" /> Add a truck
              </Link>
            </div>
          </div>

          {live ? (
            <Link href={`/account/jobs/${live.id}`} className="group block rounded-lg border border-white/15 bg-asphalt/70 p-4 backdrop-blur-md transition-colors hover:border-white/30">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-success uppercase">
                  <span className="size-1.5 animate-blink rounded-full bg-success" /> Live · {live.reference}
                </span>
                <ArrowUpRightIcon className="size-4 text-concrete/50 group-hover:text-white" />
              </div>
              <p className="mt-2 font-display text-2xl font-extrabold uppercase">{live.truckModel}</p>
              <p className="font-mono text-xs text-concrete/60">{live.plateNumber}</p>
              <div className="mt-4">
                <JobProgress status={live.status} compact />
              </div>
              <p className="mt-3 text-sm">
                Now: <strong>{JOB_STATUS[live.status].label}</strong>
              </p>
            </Link>
          ) : null}
        </div>
      </section>

      {/* KPIs */}
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className={cn(card, "group flex flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md")}>
            <span className="flex items-center justify-between">
              <span className={cn("grid size-10 place-items-center rounded-md", toneBg[k.tone])}>
                <k.icon className="size-5" />
              </span>
              <ArrowUpRightIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
            <span>
              <span className="block font-display text-5xl leading-none font-black">{k.value}</span>
              <span className="mt-2 block text-sm font-semibold">{k.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{k.detail}</span>
            </span>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        {/* Live jobs */}
        <section className={cn(card, "xl:col-span-2")} aria-labelledby="bay">
          <CardHeader title="In the workshop" href="/account/jobs" linkLabel="All jobs" icon={WrenchIcon} />
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <CheckCircle2Icon className="size-8 text-success" />
              <p className="mt-3 font-semibold">No trucks in the workshop</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">When one checks in at a JAC Motors branch, you&apos;ll follow every stage here live.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {jobs.map((j) => {
                const img = truckImageForModel(j.truckModel)
                return (
                  <li key={j.id}>
                    <Link href={`/account/jobs/${j.id}`} className="group grid grid-cols-[72px_minmax(0,1fr)] gap-4 p-4 transition-colors hover:bg-muted/40 sm:grid-cols-[140px_minmax(0,1fr)] sm:p-5">
                      <span className="relative block aspect-square overflow-hidden rounded-md bg-muted sm:aspect-[4/3]">
                        <Image src={img.url} alt={img.alt} fill sizes="140px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-start justify-between gap-2">
                          <span>
                            <span className="block font-mono text-xs text-brand-ink">{j.reference}</span>
                            <span className="block font-display text-2xl leading-tight font-extrabold uppercase">{j.truckModel}</span>
                            <span className="block font-mono text-xs text-muted-foreground">
                              {j.plateNumber ?? "—"} · {branches.find((b) => b.slug === j.branchSlug)?.name ?? "JAC Motors"}
                            </span>
                          </span>
                          <StatusPill label={JOB_STATUS[j.status].label} tone={JOB_STATUS[j.status].tone} pulse={j.status !== "ready"} />
                        </span>
                        <span className="col-span-2 mt-4 block sm:col-span-1">
                          <JobProgress status={j.status} />
                        </span>
                        {j.status === "ready" ? (
                          <span className="mt-3 block rounded-md bg-success/10 px-3 py-2 text-sm text-success">Ready for pickup — bring your claim stub and ID.</span>
                        ) : j.promisedAt ? (
                          <span className="mt-3 block text-xs text-muted-foreground">Promised by {formatDateTime(j.promisedAt)}</span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Fleet health */}
        <section className={card} aria-labelledby="health">
          <CardHeader title="Fleet health" href="/account/fleet" linkLabel={`${fleet.length} trucks`} icon={TruckIcon} />
          <div className="p-5">
            {fleet.length === 0 ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Add your trucks to track maintenance and get reminders.</p>
                <Link href="/account/fleet/new" className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-semibold text-background">
                  <PlusIcon className="size-4" /> Add a truck
                </Link>
              </div>
            ) : (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${health.ok} up to date, ${health.due_soon} due soon, ${health.overdue} overdue`}>
                  <span className="bg-success" style={{ width: `${(health.ok / fleet.length) * 100}%` }} />
                  <span className="bg-signal" style={{ width: `${(health.due_soon / fleet.length) * 100}%` }} />
                  <span className="bg-destructive" style={{ width: `${(health.overdue / fleet.length) * 100}%` }} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {(
                    [
                      ["Up to date", health.ok, "text-success"],
                      ["Due soon", health.due_soon, "text-signal-foreground dark:text-signal"],
                      ["Overdue", health.overdue, "text-destructive"],
                    ] as const
                  ).map(([label, value, cls]) => (
                    <div key={label} className="rounded-md bg-muted/50 py-3">
                      <dd className={cn("font-display text-3xl font-black", cls)}>{value}</dd>
                      <dt className="text-[11px] text-muted-foreground">{label}</dt>
                    </div>
                  ))}
                </dl>
                <ul className="mt-5 grid gap-2">
                  {attention.slice(0, 4).map((u) => (
                    <li key={u.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                      <Link href={`/account/fleet/${u.id}`} className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {u.nickname ?? `${u.make} ${u.model}`} <span className="font-mono text-[11px] font-normal text-muted-foreground">{u.plateNumber}</span>
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Due at {formatKm(u.maintenance!.nextServiceKm)} · {formatDate(u.maintenance!.nextServiceDate)}
                        </span>
                      </Link>
                      <StatusPill label={MAINTENANCE_STATE[u.maintenance!.state].label} tone={MAINTENANCE_STATE[u.maintenance!.state].tone} />
                    </li>
                  ))}
                  {attention.length === 0 ? <li className="text-sm text-muted-foreground">Every unit is up to date. 👍</li> : null}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3 [&>*]:min-w-0">
        {/* Upcoming */}
        <section className={card} aria-labelledby="upcoming">
          <CardHeader title="Upcoming" href="/account/bookings" linkLabel="Bookings" icon={CalendarCheckIcon} />
          <ul className="divide-y divide-border">
            {upcoming.length === 0 ? <li className="px-5 py-8 text-center text-sm text-muted-foreground">No upcoming bookings.</li> : null}
            {upcoming.slice(0, 4).map((b) => {
              const when = b.scheduledAt ?? b.preferredDate
              return (
                <li key={b.id}>
                  <Link href={`/account/bookings/${b.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40">
                    <span className="grid w-14 shrink-0 overflow-hidden rounded-md border border-border text-center">
                      <span className="bg-brand py-0.5 font-mono text-[10px] font-bold tracking-widest text-white uppercase">{formatDate(when, { month: "short" })}</span>
                      <span className="py-1 font-display text-2xl leading-none font-black">{formatDate(when, { day: "numeric" })}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{b.serviceName ?? "Service"}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {b.truckModel} · {b.scheduledAt ? formatDate(b.scheduledAt, { hour: "numeric", minute: "2-digit" }) : (TIME_SLOT_LABELS[b.timeSlot] ?? b.timeSlot)}
                      </span>
                    </span>
                    <StatusPill label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Quotes */}
        <section className={card} aria-labelledby="quotes">
          <CardHeader title="Quotes" href="/account/quotes" linkLabel="All quotes" icon={ClipboardListIcon} />
          <ul className="divide-y divide-border">
            {quotes.length === 0 ? <li className="px-5 py-8 text-center text-sm text-muted-foreground">No quote requests yet.</li> : null}
            {quotes.slice(0, 4).map((q) => (
              <li key={q.id}>
                <Link href={`/account/quotes/${q.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/40">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{q.subject}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">
                      {q.reference}
                      {q.total > 0 ? ` · ${formatPeso(q.total)}` : ""}
                    </span>
                  </span>
                  <StatusPill label={QUOTE_STATUS[q.status].customer} tone={QUOTE_STATUS[q.status].tone} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Activity */}
        <section className={cn(card, "lg:col-span-2 2xl:col-span-1")} aria-labelledby="activity">
          <CardHeader title="Activity" href="/account/notifications" linkLabel="All" icon={BellIcon} />
          <ol className="grid gap-0 px-5 py-4">
            {notes.length === 0 ? <li className="py-4 text-center text-sm text-muted-foreground">Updates about your trucks appear here.</li> : null}
            {notes.map((n, i) => (
              <li key={n.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < notes.length - 1 ? <span className="absolute top-3 left-[5px] h-full w-px bg-border" aria-hidden /> : null}
                <span className={cn("relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-card", n.readAt ? "bg-muted-foreground/40" : "bg-brand")} aria-hidden />
                <span className="min-w-0 flex-1">
                  {n.link ? (
                    <Link href={n.link} className={cn("block truncate text-sm hover:underline", !n.readAt && "font-semibold")}>
                      {n.title}
                    </Link>
                  ) : (
                    <span className="block truncate text-sm">{n.title}</span>
                  )}
                  <span className="block truncate text-xs text-muted-foreground">{n.body}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{formatRelative(n.createdAt)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
