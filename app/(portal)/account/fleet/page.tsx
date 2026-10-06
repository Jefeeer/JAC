import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon, TruckIcon } from "lucide-react"
import { EmptyState, PageHeader, primaryBtn } from "@/components/portal/page-header"
import { StatusPill } from "@/components/shared/status-pill"
import { formatDate, formatKm } from "@/lib/format"
import { MAINTENANCE_STATE } from "@/lib/status"
import { cn } from "@/lib/utils"
import { listFleet } from "@/server/queries/portal"

export const metadata: Metadata = { title: "My fleet" }

export default async function FleetPage() {
  const fleet = await listFleet()
  const order = { overdue: 0, due_soon: 1, ok: 2 }
  const sorted = [...fleet].sort((a, b) => order[a.maintenance?.state ?? "ok"] - order[b.maintenance?.state ?? "ok"])

  return (
    <>
      <PageHeader
        eyebrow={`${fleet.length} ${fleet.length === 1 ? "unit" : "units"}`}
        title="My fleet"
        description="Keep odometers current and we'll remind you before each unit's next PMS."
        actions={
          <Link href="/account/fleet/new" className={primaryBtn}>
            <PlusIcon className="size-4" /> Add truck
          </Link>
        }
      />
      {fleet.length === 0 ? (
        <EmptyState
          icon={TruckIcon}
          title="No trucks yet"
          text="Add each unit with its plate and odometer. Trucks serviced by JAC Motors also get their history attached automatically."
          action={
            <Link href="/account/fleet/new" className={primaryBtn}>
              <PlusIcon className="size-4" /> Add your first truck
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {sorted.map((u) => {
            const m = u.maintenance
            const pct = m ? Math.min(100, Math.max(0, 100 - (m.kmRemaining / u.serviceIntervalKm) * 100)) : 0
            return (
              <li key={u.id}>
                <Link href={`/account/fleet/${u.id}`} className="rivets block rounded-sm border border-border bg-card p-5 transition-colors hover:border-foreground/30 [--rivet:color-mix(in_oklch,var(--foreground)_15%,transparent)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">
                        {u.make} · {u.year ?? "—"}
                      </p>
                      <p className="mt-1 truncate font-display text-2xl font-extrabold uppercase">{u.nickname ?? u.model}</p>
                      {u.nickname ? <p className="text-sm text-muted-foreground">{u.model}</p> : null}
                    </div>
                    {u.plateNumber ? (
                      <span className="shrink-0 rounded-[3px] border-2 border-foreground px-2 py-0.5 font-mono text-sm font-bold tracking-wider">{u.plateNumber}</span>
                    ) : null}
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-dashed border-border pt-4 font-mono text-sm">
                    <div>
                      <dt className="text-[9px] tracking-[0.2em] text-muted-foreground uppercase">Odometer</dt>
                      <dd className="mt-1">{formatKm(u.currentMileageKm)}</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] tracking-[0.2em] text-muted-foreground uppercase">Next PMS</dt>
                      <dd className="mt-1">{m ? formatKm(m.nextServiceKm) : "—"}</dd>
                    </div>
                  </dl>
                  {m ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <StatusPill label={MAINTENANCE_STATE[m.state].label} tone={MAINTENANCE_STATE[m.state].tone} />
                        <span className="font-mono text-xs text-muted-foreground">by {formatDate(m.nextServiceDate)}</span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <div
                          className={cn("h-full rounded-full", m.state === "overdue" ? "bg-destructive" : m.state === "due_soon" ? "bg-signal" : "bg-success")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
