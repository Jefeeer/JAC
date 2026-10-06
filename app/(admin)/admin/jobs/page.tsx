import type { Metadata } from "next"
import Link from "next/link"
import { ClockIcon, UserRoundIcon } from "lucide-react"
import { AdvanceJobButton } from "@/components/admin/job-controls"
import { FilterTabs } from "@/components/admin/ui"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { branches } from "@/lib/config/branches"
import { formatDateTime, formatPeso, formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import { adminPage } from "@/server/admin/context"
import { can } from "@/server/admin/permissions"
import { JOB_STATUS_FLOW, type JobStatus } from "@/types/domain"

export const metadata: Metadata = { title: "Job board" }

const COLUMNS: { status: JobStatus; tone: string }[] = [
  { status: "received", tone: "border-t-foreground/40" },
  { status: "diagnosing", tone: "border-t-signal" },
  { status: "awaiting_parts", tone: "border-t-signal" },
  { status: "in_progress", tone: "border-t-brand" },
  { status: "ready", tone: "border-t-success" },
]

export default async function JobBoardPage(props: PageProps<"/admin/jobs">) {
  const { repo, role, session } = await adminPage("/admin/jobs", "jobs.read")
  const sp = await props.searchParams
  const branch = typeof sp.branch === "string" ? sp.branch : undefined
  const mine = sp.mine === "1"
  const jobs = await repo.listJobs({ status: "active", branch, mechanicId: mine ? session.userId : undefined })
  const canRelease = can(role, "jobs.write")
  const branchTabs = [{ key: "all", label: "All branches", href: "/admin/jobs" }, ...branches.map((b) => ({ key: b.slug, label: b.name, href: `/admin/jobs?branch=${b.slug}` }))]

  return (
    <div className="grid gap-5 [&>*]:min-w-0">
      <RealtimeRefresh subscriptions={[{ table: "job_orders" }, { table: "job_order_events", event: "INSERT" }]} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-muted-foreground">
          {jobs.length} active {jobs.length === 1 ? "job" : "jobs"} · updates live
          {role === "mechanic" ? " · showing jobs assigned to you" : ""}
        </p>
        {role !== "mechanic" ? <FilterTabs tabs={branchTabs} active={branch ?? "all"} /> : null}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="grid min-w-[1100px] grid-cols-5 gap-4">
          {COLUMNS.map((col) => {
            const list = jobs.filter((j) => j.status === col.status)
            const meta = JOB_STATUS_FLOW.find((s) => s.status === col.status)!
            return (
              <section key={col.status} id={col.status} aria-label={meta.label} className={cn("flex min-h-[60svh] flex-col rounded-lg border border-t-4 border-border bg-muted/30", col.tone)}>
                <header className="flex items-center justify-between px-3 py-3">
                  <h2 className="font-display text-lg font-extrabold uppercase">{meta.label}</h2>
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-foreground/10 px-1.5 font-mono text-xs">{list.length}</span>
                </header>
                <ol className="grid gap-2.5 px-2.5 pb-3">
                  {list.map((j) => {
                    const late = j.promisedAt && new Date(j.promisedAt).getTime() < Date.now() && j.status !== "ready"
                    return (
                      <li key={j.id}>
                        <article className="rounded-md border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
                          <Link href={`/admin/jobs/${j.id}`} className="block">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[11px] text-brand-ink">{j.reference}</span>
                              <span className="font-mono text-[10px] text-muted-foreground">{branches.find((b) => b.slug === j.branchSlug)?.code}</span>
                            </div>
                            <p className="mt-1 font-semibold leading-tight">{j.truckLabel}</p>
                            <p className="font-mono text-xs text-muted-foreground">{j.plateNumber ?? "—"}</p>
                            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{j.complaint}</p>
                            <div className="mt-2.5 grid gap-1 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <UserRoundIcon className="size-3" /> {j.mechanic?.name ?? <em className="text-signal-foreground not-italic dark:text-signal">Unassigned</em>}
                              </span>
                              <span className={cn("inline-flex items-center gap-1.5", late && "font-semibold text-destructive")}>
                                <ClockIcon className="size-3" /> {j.promisedAt ? `Due ${formatDateTime(j.promisedAt)}` : `In ${formatRelative(j.receivedAt).replace(" ago", "")}`}
                              </span>
                              {j.grandTotal ? <span className="font-mono">{formatPeso(j.grandTotal)}</span> : null}
                            </div>
                          </Link>
                          <div className="mt-3">
                            <AdvanceJobButton id={j.id} status={j.status} canRelease={canRelease} />
                          </div>
                        </article>
                      </li>
                    )
                  })}
                  {list.length === 0 ? <li className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Empty</li> : null}
                </ol>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
