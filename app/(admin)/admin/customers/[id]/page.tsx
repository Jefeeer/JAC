import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MailIcon, PhoneIcon } from "lucide-react"
import { Panel } from "@/components/admin/ui"
import { PageHeader } from "@/components/portal/page-header"
import { StatusPill } from "@/components/shared/status-pill"
import { formatDate, formatKm, formatPeso } from "@/lib/format"
import { BOOKING_STATUS, JOB_STATUS, MAINTENANCE_STATE, QUOTE_STATUS } from "@/lib/status"
import { adminPage } from "@/server/admin/context"

export const metadata: Metadata = { title: "Customer" }

export default async function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params
  const { repo } = await adminPage(`/admin/customers/${id}`, "customers.read")
  const c = await repo.getCustomer(id)
  if (!c) notFound()
  const lifetime = c.jobs.reduce((s, j) => s + j.grandTotal, 0)

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <PageHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        eyebrow={c.hasAccount ? "Portal customer" : "Lead / walk-in"}
        title={c.fullName}
        description={c.company ?? undefined}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr] [&>*]:min-w-0">
        <aside className="grid content-start gap-6 [&>*]:min-w-0">
          <Panel title="Contact" bodyClassName="grid gap-2 p-5 text-sm">
            {c.phone ? (
              <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 hover:text-brand-ink">
                <PhoneIcon className="size-3.5" /> {c.phone}
              </a>
            ) : null}
            {c.email ? (
              <a href={`mailto:${c.email}`} className="inline-flex items-center gap-2 break-all hover:text-brand-ink">
                <MailIcon className="size-3.5" /> {c.email}
              </a>
            ) : null}
            <p className="text-xs text-muted-foreground">Customer since {formatDate(c.createdAt)}</p>
          </Panel>
          {c.companyDetail ? (
            <Panel title="Company" bodyClassName="grid gap-1 p-5 text-sm">
              <p className="font-semibold">{c.companyDetail.name}</p>
              {c.companyDetail.tin ? <p className="font-mono text-xs">TIN {c.companyDetail.tin}</p> : null}
              {c.companyDetail.industry ? <p className="text-muted-foreground">{c.companyDetail.industry}</p> : null}
              {c.companyDetail.address || c.companyDetail.city ? <p className="text-muted-foreground">{[c.companyDetail.address, c.companyDetail.city].filter(Boolean).join(", ")}</p> : null}
            </Panel>
          ) : null}
          <Panel title="Lifetime" bodyClassName="grid grid-cols-3 gap-2 p-5 text-center">
            {[
              ["Trucks", c.fleetCount],
              ["Jobs", c.jobs.length],
              ["Service", formatPeso(lifetime)],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-md bg-muted/50 py-3">
                <p className="font-display text-xl font-black">{v}</p>
                <p className="text-[11px] text-muted-foreground">{k}</p>
              </div>
            ))}
          </Panel>
        </aside>

        <div className="grid content-start gap-6 [&>*]:min-w-0">
          <Panel title={`Fleet (${c.fleet.length})`}>
            <ul className="divide-y divide-border">
              {c.fleet.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span>
                    <span className="font-semibold">{u.nickname ?? `${u.make} ${u.model}`}</span>{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {u.plateNumber} · {u.make} {u.model} {u.year ?? ""} · {formatKm(u.currentMileageKm)}
                    </span>
                  </span>
                  {u.maintenance ? <StatusPill label={MAINTENANCE_STATE[u.maintenance.state].label} tone={MAINTENANCE_STATE[u.maintenance.state].tone} /> : null}
                </li>
              ))}
              {c.fleet.length === 0 ? <li className="px-5 py-6 text-sm text-muted-foreground">No trucks on file.</li> : null}
            </ul>
          </Panel>

          <Panel title={`Job orders (${c.jobs.length})`}>
            <ul className="divide-y divide-border">
              {c.jobs.map((j) => (
                <li key={j.id}>
                  <Link href={`/admin/jobs/${j.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/40">
                    <span>
                      <span className="font-mono text-xs text-brand-ink">{j.reference}</span> · {j.truckLabel} {j.plateNumber} · {formatDate(j.receivedAt)}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs">{j.grandTotal ? formatPeso(j.grandTotal) : ""}</span>
                      <StatusPill label={JOB_STATUS[j.status].label} tone={JOB_STATUS[j.status].tone} />
                    </span>
                  </Link>
                </li>
              ))}
              {c.jobs.length === 0 ? <li className="px-5 py-6 text-sm text-muted-foreground">No jobs yet.</li> : null}
            </ul>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            <Panel title={`Quotes (${c.quotes.length})`}>
              <ul className="divide-y divide-border">
                {c.quotes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/admin/quotes/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/40">
                      <span className="min-w-0 truncate">{q.subject}</span>
                      <StatusPill label={QUOTE_STATUS[q.status].label} tone={QUOTE_STATUS[q.status].tone} />
                    </Link>
                  </li>
                ))}
                {c.quotes.length === 0 ? <li className="px-5 py-6 text-sm text-muted-foreground">None.</li> : null}
              </ul>
            </Panel>
            <Panel title={`Bookings (${c.bookings.length})`}>
              <ul className="divide-y divide-border">
                {c.bookings.map((b) => (
                  <li key={b.id}>
                    <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/40">
                      <span className="min-w-0 truncate">
                        {b.reference} · {formatDate(b.scheduledAt ?? b.preferredDate)}
                      </span>
                      <StatusPill label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} />
                    </Link>
                  </li>
                ))}
                {c.bookings.length === 0 ? <li className="px-5 py-6 text-sm text-muted-foreground">None.</li> : null}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
