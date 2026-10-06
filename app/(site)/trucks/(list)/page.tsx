import type { Metadata } from "next"
import Link from "next/link"
import { PhoneCallIcon, SearchXIcon } from "lucide-react"
import { CatalogNavProvider, CatalogResults, CatalogSearch, PendingBar } from "@/components/catalog/catalog-nav"
import { FilterChips } from "@/components/catalog/filter-chips"
import { Pagination } from "@/components/catalog/pagination"
import { SortSelect } from "@/components/catalog/sort-select"
import { ScrollToHash } from "@/components/shared/scroll-to-hash"
import { SectionHeading } from "@/components/shared/section-heading"
import { TruckCard } from "@/components/shared/truck-card"
import { FinanceCalculator } from "@/components/trucks/finance-calculator"
import { PurchaseProvider } from "@/components/trucks/purchase-context"
import { TruckFilterSheet, TruckFilterSidebar } from "@/components/trucks/truck-filters"
import { contactLinks, siteConfig } from "@/lib/config/site"
import { formatPesoCompact } from "@/lib/format"
import { PAYLOAD_BANDS, TRUCK_SORT_LABELS, parseTruckFilters, type TruckFilters } from "@/lib/validation/catalog"
import { getTruckFacets, searchTrucks } from "@/server/queries/catalog"
import { BODY_TYPE_LABELS, type BodyType } from "@/types/domain"

export const metadata: Metadata = {
  title: "Truck Inventory — New & Used JAC Trucks",
  description:
    "Browse new and certified used JAC trucks and pickups at JAC Motors Philippines: N-Series, Gallop and T8 Pro. Filter by model, payload, body type, year and price.",
  alternates: { canonical: "/trucks" },
}

function toParams(f: TruckFilters): Record<string, string | undefined> {
  return {
    q: f.q,
    brand: f.brand,
    model: f.model,
    body: f.body,
    condition: f.condition,
    payload: f.payload,
    yearMin: f.yearMin?.toString(),
    yearMax: f.yearMax?.toString(),
    priceMin: f.priceMin?.toString(),
    priceMax: f.priceMax?.toString(),
    sold: f.sold ? "1" : undefined,
    sort: f.sort === "newest" ? undefined : f.sort,
    page: f.page > 1 ? String(f.page) : undefined,
  }
}

function activeChips(f: TruckFilters) {
  const chips: { key: string; label: string; also?: string[] }[] = []
  if (f.q) chips.push({ key: "q", label: `“${f.q}”` })
  if (f.condition) chips.push({ key: "condition", label: f.condition === "new" ? "New" : "Used" })
  if (f.brand) chips.push({ key: "brand", label: f.brand })
  if (f.model) chips.push({ key: "model", label: f.model })
  if (f.body) chips.push({ key: "body", label: BODY_TYPE_LABELS[f.body as BodyType] ?? f.body })
  if (f.payload) chips.push({ key: "payload", label: PAYLOAD_BANDS.find((b) => b.value === f.payload)?.label ?? f.payload })
  if (f.yearMin || f.yearMax) chips.push({ key: "yearMin", also: ["yearMax"], label: `Year ${f.yearMin ?? "…"}–${f.yearMax ?? "…"}` })
  if (f.priceMin !== undefined || f.priceMax !== undefined)
    chips.push({
      key: "priceMin",
      also: ["priceMax"],
      label: `${f.priceMin !== undefined ? formatPesoCompact(f.priceMin) : "₱0"} – ${f.priceMax !== undefined ? formatPesoCompact(f.priceMax) : "any"}`,
    })
  if (f.sold) chips.push({ key: "sold", label: "Incl. sold" })
  return chips
}

export default async function TrucksPage(props: PageProps<"/trucks">) {
  const filters = parseTruckFilters(await props.searchParams)
  const [result, facets] = await Promise.all([searchTrucks(filters), getTruckFacets()])
  const params = toParams(filters)
  const chips = activeChips(filters)
  const withoutQ: Record<string, string | undefined> = { ...params, q: undefined }
  const formKey = new URLSearchParams(Object.entries(withoutQ).filter((e): e is [string, string] => Boolean(e[1]))).toString()
  const from = (result.page - 1) * result.pageSize + 1
  const to = Math.min(result.page * result.pageSize, result.total)

  return (
    <CatalogNavProvider basePath="/trucks">
      <PendingBar />

      {/* Header band */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[1440px] px-4 pt-12 pb-8 sm:px-6 sm:pt-16">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
            <span className="shrink-0 rounded-[2px] bg-brand px-1.5 py-0.5 font-semibold whitespace-nowrap text-white">Inventory</span>
            <span>{facets.total} units across 7 branches</span>
          </div>
          <h1 className="mt-4 text-6xl leading-[0.85] font-black uppercase sm:text-8xl">
            Find your <span className="text-brand">truck.</span>
          </h1>
          <div className="mt-8 max-w-3xl">
            <CatalogSearch
              value={filters.q}
              preserve={withoutQ}
              label="Search trucks"
              placeholder="Search model, body or engine — e.g. N55 reefer, Cummins, 4x4"
            />
          </div>
        </div>
      </section>

      <div id="inventory" className="mx-auto grid max-w-[1440px] scroll-mt-28 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-28 max-h-[calc(100svh-8rem)] overflow-y-auto pr-2 pb-8 no-scrollbar">
            <TruckFilterSidebar key={formKey} facets={facets} filters={filters} />
          </div>
        </aside>

        <div className="min-w-0">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TruckFilterSheet formKey={formKey} facets={facets} filters={filters} activeCount={chips.length} total={result.total} />
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {result.total === 0 ? (
                  "No matching units"
                ) : (
                  <>
                    Showing <span className="font-mono text-foreground">{from}–{to}</span> of{" "}
                    <span className="font-mono text-foreground">{result.total}</span> {result.total === 1 ? "unit" : "units"}
                  </>
                )}
              </p>
            </div>
            <SortSelect key={`sort-${formKey}`} value={filters.sort} options={TRUCK_SORT_LABELS} preserve={{ ...params, sort: undefined, page: undefined }} />
          </div>

          {chips.length ? (
            <div className="mt-5">
              <FilterChips basePath="/trucks" params={params} labels={chips} />
            </div>
          ) : null}

          <CatalogResults className="mt-8">
            {result.items.length === 0 ? (
              <div className="grid place-items-center rounded-sm border border-dashed border-border px-6 py-20 text-center">
                <SearchXIcon className="size-10 text-muted-foreground" aria-hidden />
                <h2 className="mt-5 text-4xl font-extrabold uppercase">No trucks match — yet.</h2>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Try widening your filters. New and trade-in units arrive every month, and we can source specific configurations for fleets.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/trucks" className="inline-flex h-11 items-center rounded-sm bg-foreground px-5 text-sm font-semibold text-background">
                    Clear filters
                  </Link>
                  <a
                    href={contactLinks.tel(siteConfig.contact.phone)}
                    className="inline-flex h-11 items-center gap-2 rounded-sm border border-border px-5 text-sm"
                  >
                    <PhoneCallIcon className="size-4" /> Ask sales
                  </a>
                </div>
              </div>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((truck, i) => (
                  <li key={truck.id}>
                    <TruckCard truck={truck} priority={i < 2} className="h-full" />
                  </li>
                ))}
              </ul>
            )}
          </CatalogResults>

          <div className="mt-12">
            <Pagination basePath="/trucks" params={params} page={result.page} pageCount={result.pageCount} />
          </div>
        </div>
      </div>

      {/* Financing — target of the footer's "Financing & trade-in" link */}
      <section id="financing" className="scroll-mt-28 border-t border-border bg-surface py-16 sm:py-20" aria-labelledby="financing-title">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeading
            bay="F"
            label="Financing & trade-in"
            title={<span id="financing-title">Run the numbers.</span>}
            description="Financing through our bank partners with terms up to 60 months, plus trade-in credit for your current truck. Estimate your monthly here, then open a unit to attach the numbers to your quote."
          />
          <div className="mt-10">
            <PurchaseProvider>
              <FinanceCalculator price={null} priceOnRequest={false} standalone />
            </PurchaseProvider>
          </div>
        </div>
      </section>
      <ScrollToHash />
    </CatalogNavProvider>
  )
}
