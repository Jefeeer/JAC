"use client"

import { useState } from "react"
import { SlidersHorizontalIcon } from "lucide-react"
import { AutoForm } from "@/components/catalog/catalog-nav"
import { ChipRadio, FilterGroup, RowRadio, ToggleRow } from "@/components/catalog/filter-parts"
import { NativeSelect } from "@/components/forms/controls"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { formatPesoCompact } from "@/lib/format"
import { PAYLOAD_BANDS } from "@/lib/catalog-options"
import type { TruckFilters as Filters } from "@/lib/validation/catalog"
import { BODY_TYPE_LABELS } from "@/types/domain"
import type { TruckFacets } from "@/server/queries/catalog"

const PRICE_STEPS = [300_000, 500_000, 750_000, 1_000_000, 1_500_000, 2_000_000, 2_500_000, 3_000_000, 5_000_000, 8_000_000]

function FilterFields({ facets, filters }: { facets: TruckFacets; filters: Filters }) {
  const years: number[] = []
  for (let y = facets.years[1]; y >= facets.years[0]; y--) years.push(y)

  return (
    <div className="grid gap-6">
      <FilterGroup legend="Condition">
        <div className="flex flex-wrap gap-1.5">
          <ChipRadio name="condition" value="" checked={!filters.condition} label="All" />
          {(["new", "used"] as const).map((c) => (
            <ChipRadio
              key={c}
              name="condition"
              value={c}
              checked={filters.condition === c}
              label={c === "new" ? "New" : "Used"}
              count={facets.conditions.find((x) => x.value === c)?.count ?? 0}
            />
          ))}
        </div>
      </FilterGroup>

      {facets.brands.length > 1 ? (
        <FilterGroup legend="Brand">
          <div className="flex flex-wrap gap-1.5">
            <ChipRadio name="brand" value="" checked={!filters.brand} label="All" />
            {facets.brands.map((b) => (
              <ChipRadio key={b.value} name="brand" value={b.value} checked={filters.brand === b.value} label={b.value} count={b.count} />
            ))}
          </div>
        </FilterGroup>
      ) : null}

      <FilterGroup legend="Payload">
        <div className="flex flex-wrap gap-1.5">
          <ChipRadio name="payload" value="" checked={!filters.payload} label="Any" />
          {PAYLOAD_BANDS.map((b) => (
            <ChipRadio key={b.value} name="payload" value={b.value} checked={filters.payload === b.value} label={b.label} hint={b.hint} />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup legend="Model">
        <div className="-mx-2 grid max-h-72 gap-0.5 overflow-y-auto pr-1">
          <RowRadio name="model" value="" checked={!filters.model} label="All models" count={facets.total} />
          {facets.models.map((m) => (
            <RowRadio key={m.value} name="model" value={m.value} checked={filters.model === m.value} label={m.value} sub={m.series} count={m.count} />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup legend="Body type">
        <div className="flex flex-wrap gap-1.5">
          <ChipRadio name="body" value="" checked={!filters.body} label="All" />
          {facets.bodyTypes.map((b) => (
            <ChipRadio key={b.value} name="body" value={b.value} checked={filters.body === b.value} label={BODY_TYPE_LABELS[b.value] ?? b.value} count={b.count} />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup legend="Year">
        <div className="grid grid-cols-2 gap-2">
          <NativeSelect name="yearMin" defaultValue={filters.yearMin ?? ""} aria-label="Year from" className="h-10 text-sm">
            <option value="">From</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect name="yearMax" defaultValue={filters.yearMax ?? ""} aria-label="Year to" className="h-10 text-sm">
            <option value="">To</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </NativeSelect>
        </div>
      </FilterGroup>

      <FilterGroup legend="Price">
        <div className="grid grid-cols-2 gap-2">
          <NativeSelect name="priceMin" defaultValue={filters.priceMin ?? ""} aria-label="Minimum price" className="h-10 text-sm">
            <option value="">Min</option>
            {PRICE_STEPS.map((p) => (
              <option key={p} value={p}>
                {formatPesoCompact(p)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect name="priceMax" defaultValue={filters.priceMax ?? ""} aria-label="Maximum price" className="h-10 text-sm">
            <option value="">Max</option>
            {PRICE_STEPS.map((p) => (
              <option key={p} value={p}>
                {formatPesoCompact(p)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Price filters hide units marked “price on request”.</p>
      </FilterGroup>

      <FilterGroup legend="Availability">
        <ToggleRow name="sold" checked={filters.sold} label="Show sold units" description="See what's moved recently — similar stock arrives monthly." />
      </FilterGroup>
    </div>
  )
}

/** Desktop sidebar form. Keyed by the parent on URL change so defaults stay in sync. */
export function TruckFilterSidebar({ facets, filters }: { facets: TruckFacets; filters: Filters }) {
  return (
    <AutoForm preserve={{ q: filters.q, sort: filters.sort === "newest" ? undefined : filters.sort }}>
      <FilterFields facets={facets} filters={filters} />
      <noscript>
        <button type="submit" className="mt-6 h-11 w-full rounded-sm bg-foreground text-sm font-semibold text-background">
          Apply filters
        </button>
      </noscript>
    </AutoForm>
  )
}

export function TruckFilterSheet({ facets, filters, activeCount, total }: { facets: TruckFacets; filters: Filters; activeCount: number; total: number }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-11 items-center gap-2 rounded-sm border border-border px-4 text-sm font-medium lg:hidden">
        <SlidersHorizontalIcon className="size-4" />
        Filters
        {activeCount > 0 ? <span className="grid size-5 place-items-center rounded-full bg-brand font-mono text-[10px] text-white">{activeCount}</span> : null}
      </SheetTrigger>
      <SheetContent side="left" className="w-full gap-0 p-0 data-[side=left]:w-full data-[side=left]:sm:max-w-sm">
        <div className="border-b border-border px-5 py-4">
          <SheetTitle className="font-display text-2xl font-extrabold uppercase">Filter trucks</SheetTitle>
          <SheetDescription className="sr-only">Narrow the truck inventory</SheetDescription>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <AutoForm preserve={{ q: filters.q, sort: filters.sort === "newest" ? undefined : filters.sort }}>
            <FilterFields facets={facets} filters={filters} />
          </AutoForm>
        </div>
        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-12 w-full rounded-sm bg-brand font-wide text-xs font-bold tracking-[0.14em] text-white uppercase"
          >
            Show {total} {total === 1 ? "truck" : "trucks"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
