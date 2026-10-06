import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowDownIcon, PhoneCallIcon, ShieldCheckIcon, TruckIcon } from "lucide-react"
import { ViberIcon } from "@/components/brand/channel-icons"
import { Breadcrumbs } from "@/components/catalog/breadcrumbs"
import { StockBadge } from "@/components/catalog/stock-badge"
import { PartQuoteForm } from "@/components/parts/part-quote-form"
import { PartRow } from "@/components/parts/part-row"
import { PartVisual } from "@/components/parts/part-visual"
import { JsonLd } from "@/components/shared/json-ld"
import { SectionHeading } from "@/components/shared/section-heading"
import { contactLinks, siteConfig } from "@/lib/config/site"
import { formatPeso } from "@/lib/format"
import { getPartBySlug, getPartCategories, getPartSlugs, getRelatedParts } from "@/server/queries/catalog"

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  return (await getPartSlugs()).map((slug) => ({ slug }))
}

export async function generateMetadata(props: PageProps<"/parts/[slug]">): Promise<Metadata> {
  const { slug } = await props.params
  const part = await getPartBySlug(slug)
  if (!part) return { title: "Part not found" }
  const models = [...new Set(part.compatibility.map((c) => c.model))].slice(0, 5).join(", ")
  const description = `${part.name} (${part.partNumber}) — ${part.brand}. Fits JAC ${models}. ${part.priceOnRequest || part.price === null ? "Request a quote" : formatPeso(part.price)} at JAC Motors Philippines.`
  return {
    title: `${part.name} · ${part.partNumber}`,
    description,
    alternates: { canonical: `/parts/${part.slug}` },
    openGraph: { title: `${part.name} · ${part.partNumber} | JAC Motors`, description, images: part.imageUrl ? [{ url: part.imageUrl }] : undefined },
  }
}

export default async function PartDetailPage(props: PageProps<"/parts/[slug]">) {
  const { slug } = await props.params
  const part = await getPartBySlug(slug)
  if (!part) notFound()

  const [related, categories] = await Promise.all([getRelatedParts(part, 4), getPartCategories()])
  const category = categories.find((c) => c.slug === part.categorySlug)
  const models = [...new Set(part.compatibility.map((c) => c.model))]
  const hasPrice = !part.priceOnRequest && part.price !== null
  const specs = Object.entries(part.specs)

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: part.name,
          sku: part.partNumber,
          mpn: part.oemNumber ?? part.partNumber,
          brand: { "@type": "Brand", name: part.brand },
          category: category?.name,
          description: part.summary ?? part.description ?? undefined,
          image: part.imageUrl ? `${siteConfig.url}${part.imageUrl}` : undefined,
          isAccessoryOrSparePartFor: models.map((m) => ({ "@type": "Vehicle", name: `JAC ${m}`, brand: { "@type": "Brand", name: "JAC" } })),
          offers: {
            "@type": "Offer",
            url: `${siteConfig.url}/parts/${part.slug}`,
            priceCurrency: "PHP",
            ...(hasPrice ? { price: part.price } : {}),
            availability:
              part.stockStatus === "out_of_stock"
                ? part.leadTimeDays
                  ? "https://schema.org/BackOrder"
                  : "https://schema.org/OutOfStock"
                : part.stockStatus === "low_stock"
                  ? "https://schema.org/LimitedAvailability"
                  : "https://schema.org/InStock",
            seller: { "@id": `${siteConfig.url}/#dealer` },
          },
        }}
      />

      <div className="mx-auto max-w-[1440px] px-4 pt-8 sm:px-6">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/parts", label: "Parts" },
            ...(category ? [{ href: `/parts?category=${category.slug}`, label: category.name }] : []),
            { label: part.partNumber },
          ]}
        />
      </div>

      <section className="mx-auto grid max-w-[1440px] gap-8 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <PartVisual
          imageUrl={part.imageUrl}
          partNumber={part.partNumber}
          name={part.name}
          categorySlug={part.categorySlug}
          size="lg"
          priority
          className="aspect-square rounded-sm lg:aspect-[4/3.4]"
        />

        <div>
          <p className="font-mono text-sm font-semibold tracking-wider text-brand-ink">{part.partNumber}</p>
          <h1 className="mt-2 text-5xl leading-[0.9] font-black uppercase sm:text-6xl">{part.name}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheckIcon className="size-4 text-success" aria-hidden /> {part.brand}
            </span>
            {part.oemNumber ? <span className="font-mono">OEM {part.oemNumber}</span> : null}
            {category ? <span>{category.name}</span> : null}
          </p>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-y border-border py-5">
            <div>
              <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">{hasPrice ? `Price per ${part.unit}` : "Pricing"}</p>
              <p className="mt-1 font-display text-5xl font-black">{hasPrice ? formatPeso(part.price!) : "On request"}</p>
            </div>
            <StockBadge status={part.stockStatus} qty={part.stockQty} leadTimeDays={part.leadTimeDays} showQty className="text-xs" />
          </div>

          {part.summary ? <p className="mt-6 text-lg leading-relaxed">{part.summary}</p> : null}

          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            <a
              href="#quote"
              className="shutter inline-flex h-14 items-center justify-between rounded-sm bg-foreground px-5 font-wide text-xs font-bold tracking-[0.14em] text-background uppercase transition-colors hover:text-white sm:col-span-2"
            >
              Request parts quote <ArrowDownIcon className="size-4" />
            </a>
            <a href={contactLinks.tel(siteConfig.contact.phone)} className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-border text-sm font-medium hover:border-foreground/40">
              <PhoneCallIcon className="size-4" /> Call parts counter
            </a>
            <a href={contactLinks.viber(siteConfig.contact.viber)} className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-border text-sm font-medium hover:border-foreground/40">
              <ViberIcon className="size-4" /> Send a photo
            </a>
          </div>

          {/* Fitment */}
          <div className="mt-8">
            <h2 className="flex items-center gap-2 font-mono text-[11px] font-normal tracking-[0.22em] text-muted-foreground uppercase">
              <TruckIcon className="size-4" aria-hidden /> Compatible with
            </h2>
            {part.compatibility.length ? (
              <div className="mt-3 overflow-hidden rounded-sm border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left font-normal">Model</th>
                      <th scope="col" className="px-4 py-2.5 text-left font-normal">Engine</th>
                      <th scope="col" className="px-4 py-2.5 text-left font-normal">Years</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {part.compatibility.map((c) => (
                      <tr key={`${c.model}-${c.engine}-${c.yearFrom}`}>
                        <td className="px-4 py-2.5">
                          <Link href={`/trucks?model=${encodeURIComponent(c.model)}`} className="font-semibold hover:text-brand-ink hover:underline">
                            JAC {c.model}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{c.engine ?? "All"}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          {c.yearFrom || c.yearTo ? `${c.yearFrom ?? "…"}–${c.yearTo ?? "present"}` : "All years"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Fitment data coming soon — send us your VIN to confirm.</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Not sure it fits? Add your plate or VIN to the quote and we&apos;ll confirm before you pay.</p>
          </div>
        </div>
      </section>

      {specs.length || part.description || part.weightKg ? (
        <section className="border-t border-border bg-surface py-14" aria-labelledby="part-specs">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 id="part-specs" className="text-4xl font-extrabold uppercase">Specifications</h2>
              {part.description ? <p className="mt-4 leading-relaxed text-muted-foreground">{part.description}</p> : null}
            </div>
            <dl className="rivets divide-y divide-dashed divide-border rounded-sm border border-border bg-card px-6 py-3 [--rivet:color-mix(in_oklch,var(--foreground)_18%,transparent)]">
              {[
                ["Part number", part.partNumber],
                ...(part.oemNumber ? [["OEM number", part.oemNumber]] : []),
                ["Brand", part.brand],
                ["Sold per", part.unit],
                ...(part.weightKg ? [["Weight", `${part.weightKg} kg`]] : []),
                ...specs,
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-6 py-2.5">
                  <dt className="text-sm text-muted-foreground">{k}</dt>
                  <dd className="text-right font-mono text-sm font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      <section id="quote" className="scroll-mt-28 border-t border-border py-16 sm:py-20" aria-labelledby="quote-title">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <SectionHeading
              bay="P"
              label="Parts quote"
              title={<span id="quote-title">Reserve it at the counter.</span>}
              description="Tell us the quantity and your truck. We confirm fitment, price and stock, then hold it for pickup or arrange delivery."
            />
            <div className="mt-8 flex items-center gap-4 rounded-sm border border-dashed border-border p-4">
              <PartVisual imageUrl={part.imageUrl} partNumber={part.partNumber} name={part.name} categorySlug={part.categorySlug} size="sm" className="size-16 shrink-0 rounded-sm" />
              <div className="min-w-0">
                <p className="font-mono text-xs text-brand-ink">{part.partNumber}</p>
                <p className="truncate font-semibold">{part.name}</p>
              </div>
            </div>
          </div>
          <PartQuoteForm partSlug={part.slug} partName={part.name} partNumber={part.partNumber} unit={part.unit} compatibleModels={models} />
        </div>
      </section>

      {related.length ? (
        <section className="border-t border-border bg-surface py-16" aria-labelledby="related-parts">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <SectionHeading bay="+" label="Often bought together" title={<span id="related-parts">Related parts</span>} action={{ href: `/parts?category=${part.categorySlug}`, label: "More in this category" }} />
            <ul className="mt-8 divide-y divide-border overflow-hidden rounded-sm border border-border bg-card">
              {related.map((p) => (
                <PartRow key={p.id} part={p} />
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  )
}
