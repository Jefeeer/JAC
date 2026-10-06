import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarPlusIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { FleetForm } from "@/components/portal/fleet-form"
import { MileageUpdate } from "@/components/portal/mileage-update"
import { PageHeader, primaryBtn, secondaryBtn } from "@/components/portal/page-header"
import { StatusPill } from "@/components/shared/status-pill"
import { formatDate, formatKm, formatNumber, formatPeso } from "@/lib/format"
import { JOB_STATUS, MAINTENANCE_STATE } from "@/lib/status"
import { deleteFleetUnit } from "@/server/actions/portal"
import { getPartModels, getTruckFacets } from "@/server/queries/catalog"
import { getFleetUnit, listJobs } from "@/server/queries/portal"

export const metadata: Metadata = { title: "Truck" }

export default async function FleetUnitPage(props: PageProps<"/account/fleet/[id]">) {
  const { id } = await props.params
  const edit = (await props.searchParams).edit === "1"
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const unit = await getFleetUnit(id)
  if (!unit) notFound()

  if (edit) {
    const [facets, partModels] = await Promise.all([getTruckFacets(), getPartModels()])
    const models = [...new Set([...facets.models.map((m) => m.value), ...partModels])]
    return (
      <>
        <PageHeader back={{ href: `/account/fleet/${unit.id}`, label: "Back to truck" }} eyebrow="Edit" title={unit.nickname ?? `${unit.make} ${unit.model}`} />
        <div className="max-w-3xl">
          <FleetForm
            models={models}
            initial={{
              id: unit.id,
              nickname: unit.nickname ?? "",
              make: unit.make,
              model: unit.model,
              year: unit.year ?? undefined,
              plateNumber: unit.plateNumber ?? "",
              vin: unit.vin ?? "",
              engineNumber: unit.engineNumber ?? "",
              color: unit.color ?? "",
              purchaseDate: unit.purchaseDate ?? "",
              currentMileageKm: unit.currentMileageKm,
              lastServiceDate: unit.lastServiceDate ?? "",
              lastServiceMileageKm: unit.lastServiceMileageKm ?? undefined,
              serviceIntervalKm: unit.serviceIntervalKm,
              serviceIntervalMonths: unit.serviceIntervalMonths,
              remindersEnabled: unit.remindersEnabled,
              notes: unit.notes ?? "",
            }}
          />
        </div>
      </>
    )
  }

  const jobs = await listJobs({ fleetUnitId: unit.id })
  const m = unit.maintenance
  const remove = deleteFleetUnit.bind(null, unit.id)

  return (
    <>
      <PageHeader
        back={{ href: "/account/fleet", label: "My fleet" }}
        eyebrow={[unit.make, unit.year, unit.plateNumber].filter(Boolean).join(" · ")}
        title={unit.nickname ?? unit.model}
        description={unit.nickname ? `${unit.make} ${unit.model}` : undefined}
        actions={
          <>
            <Link href={`/account/fleet/${unit.id}?edit=1`} className={secondaryBtn}>
              <PencilIcon className="size-4" /> Edit
            </Link>
            <Link href={`/book-service?model=${encodeURIComponent(unit.model)}`} className={primaryBtn}>
              <CalendarPlusIcon className="size-4" /> Book service
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-sm border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-mono text-[11px] font-normal tracking-[0.2em] text-muted-foreground uppercase">Maintenance</h2>
          {m ? (
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Status</p>
                <div className="mt-2">
                  <StatusPill label={MAINTENANCE_STATE[m.state].label} tone={MAINTENANCE_STATE[m.state].tone} className="text-xs" />
                </div>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Next service</p>
                <p className="mt-1 font-display text-3xl font-black">{formatKm(m.nextServiceKm)}</p>
                <p className="text-sm text-muted-foreground">or by {formatDate(m.nextServiceDate)}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Remaining</p>
                <p className="mt-1 font-display text-3xl font-black">{formatNumber(m.kmRemaining)} km</p>
                <p className="text-sm text-muted-foreground">every {formatKm(unit.serviceIntervalKm)} / {unit.serviceIntervalMonths} mo</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Add an odometer reading to start tracking.</p>
          )}
          <p className="mt-6 text-xs text-muted-foreground">
            Last service: {unit.lastServiceDate ? formatDate(unit.lastServiceDate) : "not recorded"}
            {unit.lastServiceMileageKm ? ` at ${formatKm(unit.lastServiceMileageKm)}` : ""} · Reminders {unit.remindersEnabled ? "on" : "off"}
          </p>
        </section>

        <section className="rounded-sm border border-border bg-card p-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Odometer</p>
          <p className="mt-1 font-display text-4xl font-black">{formatKm(unit.currentMileageKm)}</p>
          <p className="mb-5 text-xs text-muted-foreground">Updated {unit.mileageUpdatedAt ? formatDate(unit.mileageUpdatedAt) : "—"}</p>
          <MileageUpdate id={unit.id} current={unit.currentMileageKm} />
        </section>
      </div>

      <section className="mt-8" aria-labelledby="history">
        <h2 id="history" className="mb-4 text-2xl font-extrabold uppercase">Service history</h2>
        {jobs.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border p-6 text-sm text-muted-foreground">
            No JAC Motors job orders for this unit yet. Book a service and the record appears here automatically.
          </p>
        ) : (
          <ol className="relative grid gap-3 border-l-2 border-border pl-6">
            {jobs.map((j) => (
              <li key={j.id} className="relative">
                <span className="absolute top-5 -left-[31px] size-3 rounded-full border-2 border-background bg-brand" aria-hidden />
                <Link href={`/account/jobs/${j.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-card p-4 hover:border-foreground/30">
                  <span>
                    <span className="block font-mono text-xs text-brand-ink">{j.reference}</span>
                    <span className="block font-semibold">{formatDate(j.releasedAt ?? j.receivedAt)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    {j.grandTotal ? <span className="font-mono text-sm">{formatPeso(j.grandTotal)}</span> : null}
                    <StatusPill label={JOB_STATUS[j.status].label} tone={JOB_STATUS[j.status].tone} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-10 grid gap-4 rounded-sm border border-border bg-card p-6 sm:grid-cols-2">
        <dl className="grid gap-2 text-sm">
          {[
            ["VIN", unit.vin],
            ["Engine no.", unit.engineNumber],
            ["Color", unit.color],
            ["Purchased", unit.purchaseDate ? formatDate(unit.purchaseDate) : null],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-mono">{v ?? "—"}</dd>
            </div>
          ))}
          {unit.notes ? <p className="mt-2 whitespace-pre-line text-muted-foreground">{unit.notes}</p> : null}
        </dl>
        <form action={remove} className="self-end justify-self-start sm:justify-self-end">
          <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-sm border border-border px-4 text-sm text-muted-foreground hover:border-destructive hover:text-destructive">
            <Trash2Icon className="size-4" /> Remove from fleet
          </button>
        </form>
      </section>
    </>
  )
}
