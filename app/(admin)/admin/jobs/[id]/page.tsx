import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FileTextIcon, MailIcon, PhoneIcon } from "lucide-react"
import { CreateInvoiceButton, JobItemsEditor, JobNotesForm, JobStatusControl } from "@/components/admin/job-controls"
import { NotesThread } from "@/components/admin/notes-thread"
import { Panel, btn } from "@/components/admin/ui"
import { PageHeader } from "@/components/portal/page-header"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { StatusPill } from "@/components/shared/status-pill"
import { branches } from "@/lib/config/branches"
import { formatDateTime, formatKm, formatPeso } from "@/lib/format"
import { JOB_STATUS } from "@/lib/status"
import { adminPage } from "@/server/admin/context"
import { MECHANIC_STATUSES, can } from "@/server/admin/permissions"
import { JOB_STATUS_FLOW, type JobStatus } from "@/types/domain"

export const metadata: Metadata = { title: "Job order" }

/** "2026-10-06T14:30" in Manila for datetime-local inputs */
const toLocalInput = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(" ", "T") : ""

export default async function AdminJobPage(props: PageProps<"/admin/jobs/[id]">) {
  const { id } = await props.params
  const { repo, role } = await adminPage(`/admin/jobs/${id}`, "jobs.read")
  const [job, mechanics, parts] = await Promise.all([repo.getJob(id), repo.staff("mechanic"), can(role, "jobs.items") ? repo.listParts({}) : Promise.resolve([])])
  if (!job) notFound()

  const isMechanic = role === "mechanic"
  const canWrite = can(role, "jobs.write")
  const allowed: JobStatus[] = isMechanic ? [...MECHANIC_STATUSES] : canWrite ? [...JOB_STATUS_FLOW.map((s) => s.status), "cancelled"] : []
  const closed = ["released", "cancelled"].includes(job.status)
  const branch = branches.find((b) => b.slug === job.branchSlug)

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <RealtimeRefresh subscriptions={[{ table: "job_orders", filter: `id=eq.${job.id}` }, { table: "job_order_items", filter: `job_order_id=eq.${job.id}` }]} />
      <PageHeader
        back={{ href: "/admin/jobs", label: "Job board" }}
        eyebrow={`Job order ${job.reference}${job.bookingReference ? ` · from ${job.bookingReference}` : ""}`}
        title={
          <>
            {job.truckLabel} <span className="font-mono text-2xl text-muted-foreground">{job.plateNumber}</span>
          </>
        }
        description={`${job.customerName} · ${branch ? `JAC Motors ${branch.name}` : "—"} · checked in ${formatDateTime(job.receivedAt)}${job.mileageInKm ? ` at ${formatKm(job.mileageInKm)}` : ""}`}
        actions={<StatusPill label={JOB_STATUS[job.status].label} tone={JOB_STATUS[job.status].tone} pulse={!closed} className="text-xs" />}
      />

      {allowed.length && !closed ? (
        <Panel title="Status" bodyClassName="p-5">
          <JobStatusControl id={job.id} status={job.status} allowed={allowed} />
          {isMechanic ? <p className="mt-3 text-xs text-muted-foreground">Release and cancellation are done by the service advisor.</p> : null}
        </Panel>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <div className="grid content-start gap-6 [&>*]:min-w-0">
          <Panel title="Customer concern" bodyClassName="p-5">
            <p className="whitespace-pre-line">{job.complaint}</p>
          </Panel>

          <Panel title="Workshop notes" bodyClassName="p-5">
            <JobNotesForm
              id={job.id}
              canAssign={canWrite}
              mechanics={mechanics}
              initial={{
                diagnosis: job.diagnosis ?? "",
                recommendation: job.recommendation ?? "",
                customerNotes: job.customerNotes ?? "",
                mechanicId: job.mechanic?.id ?? "",
                promisedAt: toLocalInput(job.promisedAt),
              }}
            />
          </Panel>

          <Panel title="Labour & parts" bodyClassName="p-5">
            <JobItemsEditor
              jobId={job.id}
              items={job.items}
              canEdit={can(role, "jobs.items") && !closed}
              canRemove={!isMechanic && can(role, "jobs.items") && !closed}
              parts={parts.map((p) => ({ id: p.id, label: `${p.partNumber} · ${p.name}`, price: p.priceOnRequest ? null : p.price }))}
            />
          </Panel>
        </div>

        <aside className="grid content-start gap-6 [&>*]:min-w-0">
          <Panel title="Customer" bodyClassName="grid gap-2 p-5 text-sm">
            <p className="font-semibold">{job.customerName}</p>
            {job.customerPhone ? (
              <a href={`tel:${job.customerPhone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 hover:text-brand-ink">
                <PhoneIcon className="size-3.5" /> {job.customerPhone}
              </a>
            ) : null}
            {job.customerEmail ? (
              <a href={`mailto:${job.customerEmail}`} className="inline-flex items-center gap-2 break-all hover:text-brand-ink">
                <MailIcon className="size-3.5" /> {job.customerEmail}
              </a>
            ) : null}
            {job.customerId && can(role, "customers.read") ? (
              <Link href={`/admin/customers/${job.customerId}`} className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline">
                Customer record & fleet →
              </Link>
            ) : null}
          </Panel>

          {can(role, "invoices.write") ? (
            <Panel title="Invoice" bodyClassName="p-5">
              {job.invoice ? (
                <div className="grid gap-3">
                  <p className="text-sm">
                    <span className="font-mono text-brand-ink">{job.invoice.reference}</span> · {job.invoice.status}
                  </p>
                  <p className="font-display text-3xl font-black">{formatPeso(job.invoice.total)}</p>
                  <a href={`/api/documents/jobs/${job.id}/invoice`} target="_blank" className={btn.outline}>
                    <FileTextIcon className="size-4" /> Invoice PDF
                  </a>
                </div>
              ) : (
                <div className="grid gap-3">
                  <p className="text-sm text-muted-foreground">
                    Labour + parts total <strong className="font-mono text-foreground">{formatPeso(job.laborTotal + job.partsTotal + job.miscTotal)}</strong> before 12% VAT.
                  </p>
                  {job.items.length ? <CreateInvoiceButton jobId={job.id} /> : <p className="text-xs text-muted-foreground">Add labour or parts first.</p>}
                </div>
              )}
            </Panel>
          ) : null}

          <Panel title="Timeline" bodyClassName="p-5">
            <ol className="grid gap-4">
              {[...job.events].reverse().map((e, i) => (
                <li key={e.id} className="flex gap-3">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${i === 0 ? "bg-brand" : "bg-border"}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{JOB_STATUS[e.to].label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDateTime(e.at)}
                      {e.actor ? ` · ${e.actor}` : ""}
                    </span>
                    {e.note ? <span className="mt-1 block text-sm text-muted-foreground">{e.note}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Internal notes" bodyClassName="p-5">
            <NotesThread entityType="job_order" entityId={job.id} notes={job.notes} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
