import type { Metadata } from "next"
import Link from "next/link"
import { PackageSearchIcon, PhoneCallIcon } from "lucide-react"
import { ViberIcon } from "@/components/brand/channel-icons"
import { CatalogNavProvider, CatalogResults, CatalogSearch, PendingBar } from "@/components/catalog/catalog-nav"
import { FilterChips } from "@/components/catalog/filter-chips"
import { Pagination } from "@/components/catalog/pagination"
import { SortSelect } from "@/components/catalog/sort-select"
import { ModelPicker, PartFilterSheet, PartFilterSidebar } from "@/components/parts/part-filters"
import { PartRow } from "@/components/parts/part-row"
import { contactLinks, siteConfig } from "@/lib/config/site"
import { PART_SORT_LABELS, parsePartFilters, type PartFilters } from "@/lib/validation/catalog"
import { getPartCategories, getPartModels, searchParts } from "@/server/queries/catalog"

export const metadata: Metadata = {
  title: "Genuine JAC Spare Parts Catalog",
  description:
    "Search genuine JAC truck spare parts by part number, name, category or compatible model — filters, brakes, clutch kits, electrical, cooling and more. Live stock status at JAC Motors Philippines.",
  alternates: { canonical: "/parts" },
}

function toParams(f: PartFilters): Record<string, string | undefined> {
  return {
    q: f.q,
    category: f.category,
    model: f.model,
    inStock: f.inStock ? "1" : undefined,
    sort: f.sort === "relevance" ? undefined : f.sort,
    page: f.page > 1 ? String(f.page) : undefined,
  }
}

export default async function PartsPage(props: PageProps<"/parts">) {
  const filters = parsePartFilters(await props.searchParams)
  const [result, categories, models] = await Promise.all([searchParts(filters), getPartCategories(), getPartModels()])
  const params = toParams(filters)
  const categoryName = categories.find((c) => c.slug === filters.category)?.name

  const chips: { key: string; label: string }[] = []
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”` })
  if (filters.model) chips.push({ key: "model", label: `Fits ${filters.model}` })
  if (filters.category) chips.push({ key: "category", label: categoryName ?? filters.category })
  if (filters.inStock) chips.push({ key: "inStock", label: "In stock" })

  const formKey = [filters.category, filters.inStock, filters.model, filters.sort].join("|")
  const totalSkus = categories.reduce((n, c) => n + c.count, 0)
  const from = (result.page - 1) * result.pageSize + 1
  const to = Math.min(result.page * result.pageSize, result.total)

  return (
    <CatalogNavProvider basePath="/parts">
      <PendingBar />

      <section className="dark grain relative overflow-hidden bg-asphalt text-concrete">
        <div className="grid-lines absolute inset-0 text-white opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-[1440px] px-4 pt-12 pb-10 sm:px-6 sm:pt-16">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.22em] text-concrete/60 uppercase">
            <span className="shrink-0 rounded-[2px] bg-brand px-1.5 py-0.5 font-semibold whitespace-nowrap text-white">Parts counter</span>
            <span>{totalSkus} genuine SKUs · live stock</span>
          </div>
          <h1 className="mt-4 text-6xl leading-[0.85] font-black uppercase sm:text-8xl">
            The right part, <span className="text-brand">first time.</span>
          </h1>
          <div className="mt-8 grid max-w-5xl gap-3 md:grid-cols-[1.6fr_1fr]">
            <CatalogSearch
              value={filters.q}
              preserve={{ category: params.category, model: params.model, inStock: params.inStock, sort: params.sort }}
              label="Search parts"
              placeholder="Part no., OEM no. or name — e.g. 1012010, clutch kit"
            />
            <ModelPicker key={`m-${formKey}`} models={models} filters={filters} />
          </div>
          <p className="mt-4 text-sm text-concrete/60">
            Can&apos;t find it? Send a photo of the old part on{" "}
            <a href={contactLinks.viber(siteConfig.contact.viber)} className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-white">
              <ViberIcon className="size-3.5" /> Viber
            </a>{" "}
            and we&apos;ll identify it.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-28">
            <PartFilterSidebar key={formKey} categories={categories} filters={filters} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PartFilterSheet key={formKey} categories={categories} filters={filters} activeCount={(filters.category ? 1 : 0) + (filters.inStock ? 1 : 0)} total={result.total} />
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {result.total === 0 ? (
                  "No matching parts"
                ) : (
                  <>
                    <span className="font-mono text-foreground">{from}–{to}</span> of <span className="font-mono text-foreground">{result.total}</span> parts
                    {categoryName ? <> in {categoryName}</> : null}
                  </>
                )}
              </p>
            </div>
            <SortSelect key={`s-${formKey}`} value={filters.sort} options={PART_SORT_LABELS} preserve={{ ...params, sort: undefined, page: undefined }} />
          </div>

          {chips.length ? (
            <div className="mt-5">
              <FilterChips basePath="/parts" params={params} labels={chips} />
            </div>
          ) : null}

          <CatalogResults className="mt-6">
            {result.items.length === 0 ? (
              <div className="grid place-items-center rounded-sm border border-dashed border-border px-6 py-20 text-center">
                <PackageSearchIcon className="size-10 text-muted-foreground" aria-hidden />
                <h2 className="mt-5 text-4xl font-extrabold uppercase">Not in the online catalog.</h2>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Our counters carry far more than what&apos;s listed here. Send us the part number or a photo and we&apos;ll check stock across all 7 branches.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/parts" className="inline-flex h-11 items-center rounded-sm bg-foreground px-5 text-sm font-semibold text-background">
                    Clear search
                  </Link>
                  <a href={contactLinks.viber(siteConfig.contact.viber)} className="inline-flex h-11 items-center gap-2 rounded-sm border border-border px-5 text-sm">
                    <ViberIcon className="size-4" /> Send a photo
                  </a>
                  <a href={contactLinks.tel(siteConfig.contact.phone)} className="inline-flex h-11 items-center gap-2 rounded-sm border border-border px-5 text-sm">
                    <PhoneCallIcon className="size-4" /> Call parts
                  </a>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-sm border border-border bg-card">
                <div className="hidden grid-cols-[4.5rem_minmax(0,1.6fr)_minmax(0,1fr)_8.5rem_8rem_2rem] gap-x-4 border-b border-border bg-muted/50 px-5 py-3 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase md:grid">
                  <span />
                  <span>Part</span>
                  <span>Fits</span>
                  <span>Stock</span>
                  <span>Price</span>
                  <span />
                </div>
                <ul className="divide-y divide-border">
                  {result.items.map((part) => (
                    <PartRow key={part.id} part={part} highlightModel={filters.model} />
                  ))}
                </ul>
              </div>
            )}
          </CatalogResults>

          <div className="mt-10">
            <Pagination basePath="/parts" params={params} page={result.page} pageCount={result.pageCount} />
          </div>
        </div>
      </div>
    </CatalogNavProvider>
  )
}
