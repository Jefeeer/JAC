import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon, CheckIcon, ClockIcon, GaugeIcon, PhoneCallIcon } from "lucide-react"
import { JsonLd } from "@/components/shared/json-ld"
import { SectionHeading } from "@/components/shared/section-heading"
import { contactLinks, siteConfig } from "@/lib/config/site"
import { formatNumber, formatPeso } from "@/lib/format"
import { getServices } from "@/server/queries/catalog"
import type { Service, ServiceCategory } from "@/types/domain"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Truck Service, Maintenance & Repairs",
  description:
    "Preventive maintenance, computer diagnostics and troubleshooting, brake and clutch repairs, engine overhaul and fleet maintenance packages for JAC trucks at 7 JAC Motors branches.",
  alternates: { canonical: "/services" },
}

const SECTIONS: { id: string; categories: ServiceCategory[]; title: string; lede: string; image: string; alt: string }[] = [
  {
    id: "preventive-maintenance",
    categories: ["preventive_maintenance"],
    title: "Preventive maintenance",
    lede: "Scheduled PMS keeps warranty valid, fuel bills down and surprise breakdowns rare. Genuine filters and fluids, every time.",
    image: "/images/workshop-undercarriage.webp",
    alt: "Technician inspecting a truck undercarriage",
  },
  {
    id: "diagnostics",
    categories: ["diagnostics"],
    title: "Diagnostics & troubleshooting",
    lede: "Dealer-level scan tools and technicians who know JAC systems. You get a written diagnosis and a fixed quote before work begins.",
    image: "/images/jac-cab-chassis-yard.webp",
    alt: "JAC truck parked in a service yard",
  },
  {
    id: "repair",
    categories: ["repair"],
    title: "Repairs",
    lede: "Brakes, clutch, suspension, electrical and cooling — repaired with parts from our own counter, so you're not waiting on suppliers.",
    image: "/images/workshop-suspension.webp",
    alt: "Mechanic working on front suspension",
  },
  {
    id: "overhaul",
    categories: ["overhaul"],
    title: "Overhaul",
    lede: "Engine and transmission rebuilds with genuine internals, measured to spec and backed by a JAC Motors workshop warranty.",
    image: "/images/parts-shelves.webp",
    alt: "Shelves of genuine spare parts",
  },
  {
    id: "package",
    categories: ["package", "roadside"],
    title: "Packages & roadside",
    lede: "Fleet plans with locked rates and priority bays — plus a breakdown line that answers when you're stuck on the road.",
    image: "/images/fleet-yard.webp",
    alt: "Fleet of trucks parked in a yard",
  },
]

/** Generic PMS interval guide — always defer to the unit's owner's manual. */
const PMS_GUIDE: { km: number; items: string[] }[] = [
  { km: 5_000, items: ["First service (new units)", "Oil + oil filter", "Torque check: wheels, U-bolts"] },
  { km: 10_000, items: ["Oil + oil filter", "Fuel water-separator drain", "Brake adjustment", "40-point inspection"] },
  { km: 20_000, items: ["10k items", "Fuel filter", "Air filter clean / replace", "Greasing"] },
  { km: 40_000, items: ["20k items", "Coolant flush", "Valve clearance", "Wheel-bearing repack", "ECU scan"] },
]

function ServiceCard({ s }: { s: Service }) {
  return (
    <article className="flex flex-col rounded-sm border border-border bg-card p-6">
      <h3 className="font-display text-2xl leading-tight font-extrabold uppercase">{s.name}</h3>
      <p className="mt-2 text-muted-foreground">{s.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] tracking-wider uppercase">
        {s.estDurationHours ? (
          <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-border px-2 py-1">
            <ClockIcon className="size-3" /> ~{s.estDurationHours} h
          </span>
        ) : null}
        {s.intervalKm ? (
          <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-border px-2 py-1">
            <GaugeIcon className="size-3" /> every {formatNumber(s.intervalKm)} km
          </span>
        ) : null}
        <span className="rounded-[2px] border border-border px-2 py-1">{s.startingPrice ? `From ${formatPeso(s.startingPrice)}` : "Quote after inspection"}</span>
      </div>
      {s.inclusions.length ? (
        <ul className="mt-5 grid gap-1.5 text-sm">
          {s.inclusions.map((i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
              {i}
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href={s.category === "roadside" ? "/book-service?breakdown=1" : `/book-service?service=${s.slug}`}
        className="group mt-6 inline-flex items-center gap-2 self-start border-b-2 border-foreground pb-1 font-wide text-xs font-bold tracking-[0.14em] uppercase hover:border-brand hover:text-brand-ink"
      >
        {s.category === "roadside" ? "Request help" : "Book this"} <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </article>
  )
}

export default async function ServicesPage() {
  const services = await getServices()

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "JAC Motors truck services",
          itemListElement: services.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: { "@type": "Service", name: s.name, description: s.summary, provider: { "@id": `${siteConfig.url}/#dealer` }, areaServed: "PH" },
          })),
        }}
      />

      <section className="dark grain relative overflow-hidden bg-asphalt text-concrete">
        <Image src="/images/workshop-undercarriage.webp" alt="" fill priority sizes="100vw" className="object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-asphalt via-asphalt/80 to-transparent" aria-hidden />
        <div className="relative mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-24">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.22em] text-concrete/60 uppercase">
            <span className="shrink-0 rounded-[2px] bg-brand px-1.5 py-0.5 font-semibold whitespace-nowrap text-white">Service menu</span>
            <span>All 7 branches</span>
          </div>
          <h1 className="mt-4 max-w-4xl text-6xl leading-[0.85] font-black uppercase sm:text-8xl">
            Less downtime. <span className="text-brand">More trips.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-concrete/75">
            From a 10,000 km PMS to a full engine overhaul — one service bay that knows JAC trucks inside out.
          </p>
          <nav aria-label="Service categories" className="mt-10 flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="rounded-sm border border-white/20 px-4 py-2 text-sm transition-colors hover:border-brand hover:bg-brand">
                {s.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {SECTIONS.map((section, idx) => {
        const list = services.filter((s) => section.categories.includes(s.category))
        if (!list.length) return null
        return (
          <section key={section.id} id={section.id} className={idx % 2 ? "scroll-mt-28 border-y border-border bg-surface py-16 sm:py-20" : "scroll-mt-28 py-16 sm:py-20"}>
            <div className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
              <div>
                <SectionHeading bay={String(idx + 1).padStart(2, "0")} label="Service" title={section.title} description={section.lede} />
                <div className="relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-sm lg:block">
                  <Image src={section.image} alt={section.alt} fill sizes="35vw" className="object-cover" />
                </div>
              </div>
              <div className="grid content-start gap-5 md:grid-cols-2">
                {list.map((s) => (
                  <ServiceCard key={s.slug} s={s} />
                ))}
              </div>
            </div>
          </section>
        )
      })}

      <section className="py-16 sm:py-20" aria-labelledby="pms-guide">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeading
            bay="KM"
            label="Maintenance guide"
            title={<span id="pms-guide">Your PMS, at a glance.</span>}
            description="A typical interval guide for JAC light and medium trucks. Severe duty (dusty roads, overloading, idling in traffic) shortens intervals — your owner's manual and service advisor have the final word."
          />
          <ol className="mt-10 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-4">
            {PMS_GUIDE.map((g) => (
              <li key={g.km} className="bg-card p-6">
                <p className="font-display text-4xl font-black">
                  {formatNumber(g.km)}
                  <span className="ml-1 font-mono text-sm font-normal text-muted-foreground">km</span>
                </p>
                <ul className="mt-4 grid gap-1.5 text-sm">
                  {g.items.map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                      {i}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/book-service" className="shutter inline-flex h-14 items-center gap-3 rounded-sm bg-foreground px-6 font-wide text-xs font-bold tracking-[0.14em] text-background uppercase hover:text-white">
              Book a service <ArrowRightIcon className="size-4" />
            </Link>
            <a href={contactLinks.tel(siteConfig.contact.phone)} className="inline-flex h-14 items-center gap-2 rounded-sm border border-border px-6 text-sm font-medium hover:border-foreground/40">
              <PhoneCallIcon className="size-4" /> {siteConfig.contact.phoneDisplay}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
