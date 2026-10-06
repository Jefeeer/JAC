import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MapPinIcon, PhoneCallIcon } from "lucide-react"
import { JobProgress } from "@/components/portal/job-progress"
import { PageHeader, secondaryBtn } from "@/components/portal/page-header"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { StatusPill } from "@/components/shared/status-pill"
import { branches, mapsUrl } from "@/lib/config/branches"
import { contactLinks, siteConfig } from "@/lib/config/site"
import { formatDate, formatDateTime, formatKm, formatPeso } from "@/lib/format"
import { JOB_STATUS } from "@/lib/status"
import { getJob } from "@/server/queries/portal"
import type { JobStatus } from "@/types/domain"

export const metadata: Metadata = { title: "Job order" }

const UUID = /^[0-9a-f-]{36}$/i

export default async function JobDetailPage(props: PageProps<"/account/jobs/[id]">) {
  const { id } = await props.params
  if (!UUID.test(id)) notFound()
  const job = await getJob(id)
  if (!job) notFound()

  const branch = branches.find((b) => b.slug === job.branchSlug)
  const stamps: Partial<Record<JobStatus, string>> = {}
  for (const e of job.events) stamps[e.status] = formatDate(e.at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  const live = !["released", "cancelled"].includes(job.status)

  return (
    <>
      {live ? (
        <RealtimeRefresh
          subscriptions={[
            { table: "job_orders", filter: `id=eq.${job.id}` },
            { table: "job_order_events", filter: `job_order_id=eq.${job.id}`, event: "INSERT" },
            { table: "job_order_items", filter: `job_order_id=eq.${job.id}` },
          ]}
        />
      ) : null}

      <PageHeader
        back={{ href: "/account/jobs", label: "Service jobs" }}
        eyebrow={`Job order ${job.reference}`}
        title={job.truckModel}
        description={[job.plateNumber, job.mileageInKm ? `${formatKm(job.mileageInKm)} at check-in` : null].filter(Boolean).join(" · ")}
        actions={<StatusPill label={JOB_STATUS[job.status].label} tone={JOB_STATUS[job.status].tone} pulse={live} className="text-xs" />}
      />

      <section className="rounded-sm border border-border bg-card p-6 sm:p-8" aria-label="Progress">
        <div className="mb-6 flex items-center justify-between font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          <span>Progress</span>
          {live ? (
            <span className="flex items-center gap-1.5 text-success">
              <span className="size-1.5 animate-blink rounded-full bg-success" /> Live
            </span>
          ) : null}
        </div>
        <JobProgress status={job.status} timestamps={stamps} />
        {job.status === "ready" ? (
          <div className="mt-8 rounded-sm border border-success/40 bg-success/5 p-4 text-sm">
            <strong>Ready for pickup.</strong> Bring your claim stub and a valid ID to {branch ? `JAC Motors ${branch.name}` : "the branch"}.
          </div>
        ) : null}
        {job.promisedAt && live ? <p className="mt-6 text-sm text-muted-foreground">Promised completion: {formatDateTime(job.promisedAt)}</p> : null}
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-8">
          <section className="rounded-sm border border-border bg-card p-6">
            <h2 className="font-mono text-[11px] font-normal tracking-[0.2em] text-muted-foreground uppercase">Workshop notes</h2>
            <dl className="mt-4 grid gap-5">
              <div>
                <dt className="text-xs font-semibold tracking-wide uppercase">Your concern</dt>
                <dd className="mt-1 whitespace-pre-line">{job.complaint}</dd>
              </div>
              {job.diagnosis ? (
                <div>
                  <dt className="text-xs font-semibold tracking-wide uppercase">Diagnosis</dt>
                  <dd className="mt-1 whitespace-pre-line">{job.diagnosis}</dd>
                </div>
              ) : null}
              {job.recommendation ? (
                <div>
                  <dt className="text-xs font-semibold tracking-wide uppercase">Recommendation</dt>
                  <dd className="mt-1 whitespace-pre-line">{job.recommendation}</dd>
                </div>
              ) : null}
              {job.customerNotes ? (
                <div className="rounded-sm border-l-4 border-brand bg-muted/50 p-4">
                  <dt className="text-xs font-semibold tracking-wide uppercase">Note from your service advisor</dt>
                  <dd className="mt-1 whitespace-pre-line">{job.customerNotes}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="overflow-hidden rounded-sm border border-border bg-card">
            <h2 className="border-b border-border px-6 py-4 font-mono text-[11px] font-normal tracking-[0.2em] text-muted-foreground uppercase">Labour & parts</h2>
            {job.items.length === 0 ? (
              <p className="px-6 py-5 text-sm text-muted-foreground">Line items appear here once your advisor adds them.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {job.items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-6 py-3">
                        <span className="mr-2 rounded-[2px] border border-border px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">{i.type}</span>
                        {i.description}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {i.quantity} × {formatPeso(i.unitPrice)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono whitespace-nowrap">{formatPeso(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/30 font-mono text-sm">
                  {[
                    ["Labour", job.laborTotal],
                    ["Parts", job.partsTotal],
                    ["Other", job.miscTotal],
                  ]
                    .filter(([, v]) => Number(v) > 0)
                    .map(([k, v]) => (
                      <tr key={k as string}>
                        <td className="px-6 py-2 text-muted-foreground" colSpan={2}>
                          {k}
                        </td>
                        <td className="px-6 py-2 text-right">{formatPeso(Number(v))}</td>
                      </tr>
                    ))}
                  <tr className="font-bold">
                    <td className="px-6 py-3" colSpan={2}>
                      Estimated total
                    </td>
                    <td className="px-6 py-3 text-right">{formatPeso(job.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
            <p className="border-t border-border px-6 py-3 text-xs text-muted-foreground">Final amounts appear on your invoice at release.</p>
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <section className="rounded-sm border border-border bg-card p-6">
            <h2 className="font-mono text-[11px] font-normal tracking-[0.2em] text-muted-foreground uppercase">Timeline</h2>
            <ol className="mt-4 grid gap-4">
              {[...job.events].reverse().map((e, i) => (
                <li key={e.id} className="relative flex gap-3">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${i === 0 ? "bg-brand" : "bg-border"}`} aria-hidden />
                  <span>
                    <span className="block font-semibold">{JOB_STATUS[e.status].label}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{formatDateTime(e.at)}</span>
                    {e.note ? <span className="mt-1 block text-sm text-muted-foreground">{e.note}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {branch ? (
            <section className="rounded-sm border border-border bg-card p-6">
              <h2 className="font-mono text-[11px] font-normal tracking-[0.2em] text-muted-foreground uppercase">Service branch</h2>
              <p className="mt-3 font-display text-2xl font-extrabold uppercase">JAC Motors {branch.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {branch.address}, {branch.city}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={contactLinks.tel(branch.phone ?? branch.mobile ?? siteConfig.contact.phone)} className={secondaryBtn}>
                  <PhoneCallIcon className="size-4" /> Call branch
                </a>
                <a href={mapsUrl(branch)} target="_blank" rel="noopener noreferrer" className={secondaryBtn}>
                  <MapPinIcon className="size-4" /> Directions
                </a>
              </div>
            </section>
          ) : null}
          {job.fleetUnitId ? (
            <Link href={`/account/fleet/${job.fleetUnitId}`} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              View this truck&apos;s service history →
            </Link>
          ) : null}
        </aside>
      </div>
    </>
  )
}
