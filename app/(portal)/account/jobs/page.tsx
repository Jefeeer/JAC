import type { Metadata } from "next"
import Link from "next/link"
import { WrenchIcon } from "lucide-react"
import { JobProgress } from "@/components/portal/job-progress"
import { EmptyState, PageHeader, primaryBtn } from "@/components/portal/page-header"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { StatusPill } from "@/components/shared/status-pill"
import { branches } from "@/lib/config/branches"
import { formatDate, formatPeso } from "@/lib/format"
import { JOB_STATUS } from "@/lib/status"
import { listJobs } from "@/server/queries/portal"

export const metadata: Metadata = { title: "Service jobs" }

export default async function JobsPage() {
  const jobs = await listJobs({ limit: 100 })
  const active = jobs.filter((j) => !["released", "cancelled"].includes(j.status))
  const past = jobs.filter((j) => ["released", "cancelled"].includes(j.status))

  return (
    <>
      <RealtimeRefresh subscriptions={[{ table: "job_orders" }]} />
      <PageHeader eyebrow="Workshop" title="Service jobs" description="Every job order opened for your trucks — live while in the bay, and kept as service history after release." />

      {jobs.length === 0 ? (
        <EmptyState
          icon={WrenchIcon}
          title="No service jobs yet"
          text="When your truck checks in at a JAC Motors branch, its job order appears here and updates live."
          action={
            <Link href="/book-service" className={primaryBtn}>
              Book a service
            </Link>
          }
        />
      ) : null}

      {active.length ? (
        <section aria-labelledby="active-jobs" className="mb-10">
          <h2 id="active-jobs" className="mb-4 font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">In progress ({active.length})</h2>
          <ul className="grid gap-4">
            {active.map((j) => (
              <li key={j.id}>
                <Link href={`/account/jobs/${j.id}`} className="block rounded-sm border border-border bg-card p-5 hover:border-foreground/30">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-brand-ink">{j.reference}</p>
                      <p className="mt-1 font-display text-2xl font-extrabold uppercase">{j.truckModel}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {j.plateNumber ?? "—"} · checked in {formatDate(j.receivedAt)} · {branches.find((b) => b.slug === j.branchSlug)?.name ?? ""}
                      </p>
                    </div>
                    <StatusPill label={JOB_STATUS[j.status].label} tone={JOB_STATUS[j.status].tone} pulse />
                  </div>
                  <div className="mt-6">
                    <JobProgress status={j.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {past.length ? (
        <section aria-labelledby="past-jobs">
          <h2 id="past-jobs" className="mb-4 font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">History ({past.length})</h2>
          <div className="overflow-x-auto rounded-sm border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-normal">Job</th>
                  <th scope="col" className="px-4 py-3 text-left font-normal">Truck</th>
                  <th scope="col" className="px-4 py-3 text-left font-normal">Checked in</th>
                  <th scope="col" className="px-4 py-3 text-left font-normal">Released</th>
                  <th scope="col" className="px-4 py-3 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {past.map((j) => (
                  <tr key={j.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/account/jobs/${j.id}`} className="font-mono text-xs font-semibold text-brand-ink hover:underline">
                        {j.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {j.truckModel} <span className="font-mono text-xs text-muted-foreground">{j.plateNumber}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{formatDate(j.receivedAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{j.status === "cancelled" ? "Cancelled" : formatDate(j.releasedAt)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{j.grandTotal ? formatPeso(j.grandTotal) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  )
}
