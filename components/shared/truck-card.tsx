import Image from "next/image"
import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"
import { formatKm, formatPeso } from "@/lib/format"
import { cn } from "@/lib/utils"
import { BODY_TYPE_LABELS, type Truck } from "@/types/domain"

const availabilityStyles: Record<Truck["availability"], string> = {
  available: "bg-success/15 text-success",
  reserved: "bg-signal/20 text-signal-foreground dark:text-signal",
  sold: "bg-foreground/10 text-muted-foreground",
  incoming: "bg-foreground/10 text-foreground",
}

/**
 * Listing card styled as a chassis data plate: photo on top, riveted
 * spec plate below with mono read-outs.
 */
export function TruckCard({ truck, priority = false, className }: { truck: Truck; priority?: boolean; className?: string }) {
  const image = truck.images[0]
  const specs: [string, string][] = [
    ["Payload", truck.payloadTons !== null ? `${truck.payloadTons} T` : "—"],
    ["Power", truck.horsepower ? `${truck.horsepower} hp` : "—"],
    [truck.condition === "used" ? "Odometer" : "Drive", truck.condition === "used" ? formatKm(truck.mileageKm) : (truck.wheelConfig ?? "—")],
  ]

  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-sm border border-border bg-card", className)}>
      <Link href={`/trucks/${truck.slug}`} className="absolute inset-0 z-10" aria-label={`${truck.title} — view details`} />

      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 92vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="rounded-[2px] bg-black/70 px-2 py-1 font-mono text-[10px] tracking-widest text-white uppercase backdrop-blur">
            {truck.condition === "new" ? "New" : "Certified used"}
          </span>
          <span className="rounded-[2px] bg-black/70 px-2 py-1 font-mono text-[10px] tracking-widest text-white uppercase backdrop-blur">
            {truck.year}
          </span>
        </div>
        <span className="absolute right-3 bottom-3 font-mono text-[10px] tracking-widest text-white/80 uppercase">
          {BODY_TYPE_LABELS[truck.bodyType]}
        </span>
        <span
          className="absolute top-3 right-3 grid size-9 translate-y-1 place-items-center rounded-full bg-brand text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          aria-hidden
        >
          <ArrowUpRightIcon className="size-4" />
        </span>
      </div>

      {/* Data plate */}
      <div className="rivets relative flex flex-1 flex-col bg-surface-2/60 px-5 pt-5 pb-4 [--rivet:color-mix(in_oklch,var(--foreground)_22%,transparent)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              {truck.series ?? truck.brand} · {truck.model}
            </p>
            <h3 className="mt-1 line-clamp-2 font-display text-2xl leading-[1.05] font-bold uppercase">{truck.title}</h3>
            {truck.variant ? <p className="truncate text-sm text-muted-foreground">{truck.variant}</p> : null}
          </div>
          <span className={cn("mt-1 shrink-0 rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase", availabilityStyles[truck.availability])}>
            {truck.availability}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-3 border-y border-dashed border-border py-3">
          {specs.map(([label, value], i) => (
            <div key={label} className={cn("px-2 first:pl-0", i > 0 && "border-l border-dashed border-border")}>
              <dt className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">{label}</dt>
              <dd className="mt-1 font-mono text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
              {truck.priceOnRequest || truck.price === null ? "Pricing" : "Cash price"}
            </p>
            <p className="font-display text-2xl font-extrabold">
              {truck.priceOnRequest || truck.price === null ? "On request" : formatPeso(truck.price)}
            </p>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">{truck.stockNumber}</span>
        </div>
      </div>
    </article>
  )
}
