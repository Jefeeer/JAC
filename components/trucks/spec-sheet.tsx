import { formatKm, formatNumber } from "@/lib/format"
import { BODY_TYPE_LABELS, type Truck } from "@/types/domain"

type Row = [label: string, value: string | null | undefined]

/** Full spec sheet, grouped like a manufacturer's data plate. */
export function SpecSheet({ truck }: { truck: Truck }) {
  const groups: { title: string; rows: Row[] }[] = [
    {
      title: "Unit",
      rows: [
        ["Make / model", `${truck.brand} ${truck.model}`],
        ["Series", truck.series],
        ["Variant", truck.variant],
        ["Body", BODY_TYPE_LABELS[truck.bodyType]],
        ["Year", String(truck.year)],
        ["Condition", truck.condition === "new" ? "Brand new" : "Certified used"],
        ["Odometer", truck.condition === "used" ? formatKm(truck.mileageKm) : "0 km"],
        ["Color", truck.color],
        ["Stock no.", truck.stockNumber],
      ],
    },
    {
      title: "Powertrain",
      rows: [
        ["Engine", truck.engine],
        ["Displacement", truck.displacementCc ? `${formatNumber(truck.displacementCc)} cc` : null],
        ["Max power", truck.horsepower ? `${truck.horsepower} hp` : null],
        ["Max torque", truck.torqueNm ? `${formatNumber(truck.torqueNm)} N·m` : null],
        ["Transmission", truck.transmission],
        ["Drive", truck.wheelConfig],
        ["Fuel", truck.fuelType ? truck.fuelType[0].toUpperCase() + truck.fuelType.slice(1) : null],
        ["Emission", truck.emissionStandard],
      ],
    },
    {
      title: "Capacity & dimensions",
      rows: [
        ["Rated payload", truck.payloadTons !== null ? `${truck.payloadTons} tonnes` : null],
        ["GVW", truck.gvwKg ? `${formatNumber(truck.gvwKg)} kg` : null],
        ["Wheelbase", truck.wheelbaseMm ? `${formatNumber(truck.wheelbaseMm)} mm` : null],
        ...Object.entries(truck.specs),
      ],
    },
  ]

  return (
    <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-3">
      {groups.map((g) => {
        const rows = g.rows.filter((r): r is [string, string] => Boolean(r[1]))
        if (!rows.length) return null
        return (
          <section key={g.title} className="rivets bg-card p-6 [--rivet:color-mix(in_oklch,var(--foreground)_18%,transparent)]">
            <h3 className="font-mono text-[11px] font-normal tracking-[0.22em] text-brand-ink uppercase">{g.title}</h3>
            <dl className="mt-4 divide-y divide-dashed divide-border">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-right font-mono text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )
      })}
    </div>
  )
}
