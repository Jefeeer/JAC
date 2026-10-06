import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowDownIcon, CheckIcon, MapPinIcon, PhoneCallIcon, ShieldCheckIcon, WrenchIcon } from "lucide-react"
import { ViberIcon } from "@/components/brand/channel-icons"
import { Breadcrumbs } from "@/components/catalog/breadcrumbs"
import { JsonLd } from "@/components/shared/json-ld"
import { SectionHeading } from "@/components/shared/section-heading"
import { TruckCard } from "@/components/shared/truck-card"
import { FinanceCalculator } from "@/components/trucks/finance-calculator"
import { PurchaseProvider } from "@/components/trucks/purchase-context"
import { SpecSheet } from "@/components/trucks/spec-sheet"
import { TruckGallery } from "@/components/trucks/truck-gallery"
import { TruckQuoteForm } from "@/components/trucks/truck-quote-form"
import { branches, mapsUrl } from "@/lib/config/branches"
import { contactLinks, siteConfig } from "@/lib/config/site"
import { formatKm, formatPeso } from "@/lib/format"
import { cn } from "@/lib/utils"
import { getRelatedTrucks, getTruckBySlug, getTruckSlugs } from "@/server/queries/catalog"
import { BODY_TYPE_LABELS } from "@/types/domain"

// ISR: prebuild every published unit, refresh hourly (admin edits revalidate on demand).
export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  return (await getTruckSlugs()).map((slug) => ({ slug }))
}

export async function generateMetadata(props: PageProps<"/trucks/[slug]">): Promise<Metadata> {
  const { slug } = await props.params
  const truck = await getTruckBySlug(slug)
  if (!truck) return { title: "Truck not found" }
  const price = truck.priceOnRequest || truck.price === null ? "Price on request" : formatPeso(truck.price)
  const title = `${truck.title} ${truck.year}${truck.condition === "used" ? " (Used)" : ""}`
  const description =
    truck.summary ??
    `${truck.title} — ${truck.payloadTons ?? ""} T ${BODY_TYPE_LABELS[truck.bodyType]}, ${truck.engine ?? ""}. ${price}. Available at JAC Motors Philippines.`
  return {
    title,
    description,
    alternates: { canonical: `/trucks/${truck.slug}` },
    openGraph: {
      title: `${title} | JAC Motors`,
      description,
      type: "website",
      images: truck.images[0] ? [{ url: truck.images[0].url, width: truck.images[0].width ?? undefined, height: truck.images[0].height ?? undefined, alt: truck.images[0].alt }] : undefined,
    },
  }
}

const availabilityCopy = {
  available: { label: "Available now", className: "bg-success text-white" },
  reserved: { label: "Reserved", className: "bg-signal text-signal-foreground" },
  incoming: { label: "Arriving soon", className: "bg-foreground text-background" },
  sold: { label: "Sold", className: "bg-muted-foreground text-background" },
} as const

export default async function TruckDetailPage(props: PageProps<"/trucks/[slug]">) {
  const { slug } = await props.params
  const truck = await getTruckBySlug(slug)
  if (!truck) notFound()

  const related = await getRelatedTrucks(truck, 3)
  const branch = branches.find((b) => b.slug === truck.branchSlug) ?? branches[0]
  const branchPhone = branch.phone ?? branch.mobile ?? siteConfig.contact.phone
  const branchPhoneDisplay = branch.phoneDisplay ?? branch.mobileDisplay ?? siteConfig.contact.phoneDisplay
  const hasPrice = !truck.priceOnRequest && truck.price !== null
  const avail = availabilityCopy[truck.availability]

  const quick: [string, string][] = [
    ["Payload", truck.payloadTons !== null ? `${truck.payloadTons} T` : "—"],
    ["Power", truck.horsepower ? `${truck.horsepower} hp` : "—"],
    ["Torque", truck.torqueNm ? `${truck.torqueNm} N·m` : "—"],
    [truck.condition === "used" ? "Odometer" : "Drive", truck.condition === "used" ? formatKm(truck.mileageKm) : (truck.wheelConfig ?? "—")],
  ]

  return (
    <PurchaseProvider>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": ["Vehicle", "Product"],
          name: truck.title,
          description: truck.summary ?? truck.description ?? undefined,
          brand: { "@type": "Brand", name: truck.brand },
          model: truck.model,
          vehicleModelDate: String(truck.year),
          bodyType: BODY_TYPE_LABELS[truck.bodyType],
          sku: truck.stockNumber ?? undefined,
          color: truck.color ?? undefined,
          itemCondition: truck.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
          mileageFromOdometer: { "@type": "QuantitativeValue", value: truck.mileageKm, unitCode: "KMT" },
          vehicleEngine: truck.engine ? { "@type": "EngineSpecification", name: truck.engine } : undefined,
          vehicleTransmission: truck.transmission ?? undefined,
          driveWheelConfiguration: truck.wheelConfig ?? undefined,
          fuelType: truck.fuelType,
          image: truck.images.map((i) => (i.url.startsWith("/") ? `${siteConfig.url}${i.url}` : i.url)),
          offers: {
            "@type": "Offer",
            url: `${siteConfig.url}/trucks/${truck.slug}`,
            priceCurrency: "PHP",
            ...(hasPrice ? { price: truck.price } : {}),
            availability:
              truck.availability === "sold"
                ? "https://schema.org/SoldOut"
                : truck.availability === "incoming"
                  ? "https://schema.org/PreOrder"
                  : "https://schema.org/InStock",
            seller: { "@id": `${siteConfig.url}/#dealer` },
          },
        }}
      />

      <div className="mx-auto max-w-[1440px] px-4 pt-8 sm:px-6">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/trucks", label: "Trucks" },
            { href: `/trucks?model=${encodeURIComponent(truck.model)}`, label: truck.model },
            { label: truck.stockNumber ?? truck.title },
          ]}
        />
      </div>

      {/* Gallery + summary */}
      <section className="mx-auto grid max-w-[1440px] gap-8 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[1.45fr_1fr] lg:gap-12">
        <TruckGallery
          images={truck.images}
          title={truck.title}
          badge={<span className={cn("rounded-[2px] px-2.5 py-1 font-mono text-[11px] font-semibold tracking-widest uppercase", avail.className)}>{avail.label}</span>}
        />

        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
            {truck.series ?? truck.brand} · {truck.year} · {truck.condition === "new" ? "New" : "Certified used"}
          </p>
          <h1 className="mt-3 text-5xl leading-[0.88] font-black uppercase sm:text-6xl">{truck.title}</h1>
          {truck.variant ? <p className="mt-2 text-lg text-muted-foreground">{truck.variant}</p> : null}

          <div className="mt-6 border-y border-border py-5">
            <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">{hasPrice ? "Cash price" : "Pricing"}</p>
            <p className="mt-1 font-display text-5xl font-black">{hasPrice ? formatPeso(truck.price!) : "Price on request"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasPrice ? "Financing, trade-in and fleet pricing available." : "Fleet, LGU and body-configuration pricing quoted per request."}
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-4 gap-px overflow-hidden rounded-sm border border-border bg-border">
            {quick.map(([k, v]) => (
              <div key={k} className="bg-card px-3 py-3">
                <dt className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">{k}</dt>
                <dd className="mt-1 font-mono text-sm font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          {truck.summary ? <p className="mt-6 leading-relaxed">{truck.summary}</p> : null}

          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            <a
              href="#quote"
              className="shutter inline-flex h-14 items-center justify-between rounded-sm bg-foreground px-5 font-wide text-xs font-bold tracking-[0.14em] text-background uppercase transition-colors hover:text-white sm:col-span-2"
            >
              {truck.availability === "sold" ? "Find me a similar unit" : "Request a quote"} <ArrowDownIcon className="size-4" />
            </a>
            <a href={contactLinks.tel(branchPhone)} className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-border text-sm font-medium hover:border-foreground/40">
              <PhoneCallIcon className="size-4" /> {branchPhoneDisplay}
            </a>
            <a href={contactLinks.viber(siteConfig.contact.viber)} className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-border text-sm font-medium hover:border-foreground/40">
              <ViberIcon className="size-4" /> Ask on Viber
            </a>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-sm bg-muted/60 p-4 text-sm">
            <MapPinIcon className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
            <p>
              On display at <strong>JAC Motors {branch.name}</strong> — {branch.address}, {branch.city}.{" "}
              <a href={mapsUrl(branch)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-ink">
                Directions
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="border-t border-border bg-surface py-16 sm:py-20" aria-labelledby="specs-title">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeading bay="A" label="Data plate" title={<span id="specs-title">Full specifications</span>} />
          <div className="mt-10">
            <SpecSheet truck={truck} />
          </div>

          {truck.description || truck.features.length ? (
            <div className="mt-12 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
              {truck.description ? (
                <div>
                  <h3 className="font-mono text-[11px] font-normal tracking-[0.22em] text-muted-foreground uppercase">Overview</h3>
                  <p className="mt-3 text-lg leading-relaxed">{truck.description}</p>
                </div>
              ) : null}
              {truck.features.length ? (
                <div>
                  <h3 className="font-mono text-[11px] font-normal tracking-[0.22em] text-muted-foreground uppercase">Key features</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {truck.features.map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <ul className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-3">
            {[
              { icon: ShieldCheckIcon, t: truck.condition === "new" ? "Factory warranty" : "Inspected & certified", d: truck.condition === "new" ? "Registered and serviced through any JAC Motors branch." : "Passed our multi-point inspection before listing." },
              { icon: WrenchIcon, t: "Service bay included", d: "Preventive maintenance, diagnostics and genuine parts at 7 branches." },
              { icon: PhoneCallIcon, t: "24/7 breakdown line", d: "One call, Viber or Messenger message when you're stuck on the road." },
            ].map((x) => (
              <li key={x.t} className="flex gap-4 bg-card p-5">
                <x.icon className="size-5 shrink-0 text-brand-ink" aria-hidden />
                <div>
                  <p className="font-semibold">{x.t}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Financing */}
      {truck.availability !== "sold" ? (
        <section id="financing" className="scroll-mt-28 py-16 sm:py-20" aria-labelledby="financing-title">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <SectionHeading
              bay="B"
              label="Financing & trade-in"
              title={<span id="financing-title">Run the numbers.</span>}
              description="Estimate your monthly amortisation, factor in a trade-in, and attach it to your quote so our sales team can come back with real terms."
            />
            <div className="mt-10">
              <FinanceCalculator price={truck.price} priceOnRequest={truck.priceOnRequest} />
            </div>
          </div>
        </section>
      ) : null}

      {/* Quote */}
      <section id="quote" className="scroll-mt-28 border-t border-border bg-surface py-16 sm:py-20" aria-labelledby="quote-title">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <SectionHeading
              bay="C"
              label="Request quote"
              title={<span id="quote-title">{truck.availability === "sold" ? "Want one like it?" : "Get your price."}</span>}
              description={
                truck.availability === "sold"
                  ? "This unit has been sold. Tell us what you need and we'll match you with incoming stock or a trade-in."
                  : "Fleet discounts, body-builder options, registration and insurance — one consultant handles all of it."
              }
            />
            <div className="mt-8 rounded-sm border border-dashed border-border p-5">
              <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">You&apos;re asking about</p>
              <p className="mt-2 font-display text-2xl font-bold uppercase">{truck.title}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {truck.stockNumber} · {truck.year} · {BODY_TYPE_LABELS[truck.bodyType]}
              </p>
            </div>
          </div>
          <TruckQuoteForm truckSlug={truck.slug} truckTitle={truck.title} defaultBranch={truck.branchSlug} />
        </div>
      </section>

      {/* Related */}
      {related.length ? (
        <section className="py-16 sm:py-20" aria-labelledby="related-title">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <SectionHeading bay="D" label="Also on the floor" title={<span id="related-title">Similar units</span>} action={{ href: `/trucks?body=${truck.bodyType}`, label: `All ${BODY_TYPE_LABELS[truck.bodyType].toLowerCase()} units` }} />
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((t) => (
                <li key={t.id}>
                  <TruckCard truck={t} className="h-full" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6">
        <Link href="/trucks" className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase hover:text-foreground">
          ← Back to inventory
        </Link>
      </div>
    </PurchaseProvider>
  )
}
