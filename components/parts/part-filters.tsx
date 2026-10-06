"use client"

import { useState } from "react"
import { SlidersHorizontalIcon, TruckIcon } from "lucide-react"
import { AutoForm } from "@/components/catalog/catalog-nav"
import { FilterGroup, RowRadio, ToggleRow } from "@/components/catalog/filter-parts"
import { NativeSelect } from "@/components/forms/controls"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { PartFilters } from "@/lib/validation/catalog"
import type { CategoryWithCount } from "@/server/queries/catalog"

function preserveFor(filters: PartFilters) {
  return { q: filters.q, model: filters.model, sort: filters.sort === "relevance" ? undefined : filters.sort }
}

function Fields({ categories, filters }: { categories: CategoryWithCount[]; filters: PartFilters }) {
  const total = categories.reduce((n, c) => n + c.count, 0)
  return (
    <div className="grid gap-6">
      <FilterGroup legend="Category">
        <div className="-mx-2 grid gap-0.5">
          <RowRadio name="category" value="" checked={!filters.category} label="All categories" count={total} />
          {categories.map((c) => (
            <RowRadio key={c.slug} name="category" value={c.slug} checked={filters.category === c.slug} label={c.name} count={c.count} />
          ))}
        </div>
      </FilterGroup>
      <FilterGroup legend="Availability">
        <ToggleRow name="inStock" checked={filters.inStock} label="In stock only" description="Hide parts that need to be ordered in." />
      </FilterGroup>
    </div>
  )
}

export function PartFilterSidebar({ categories, filters }: { categories: CategoryWithCount[]; filters: PartFilters }) {
  return (
    <AutoForm preserve={preserveFor(filters)}>
      <Fields categories={categories} filters={filters} />
      <noscript>
        <button type="submit" className="mt-6 h-11 w-full rounded-sm bg-foreground text-sm font-semibold text-background">
          Apply
        </button>
      </noscript>
    </AutoForm>
  )
}

export function PartFilterSheet({ categories, filters, activeCount, total }: { categories: CategoryWithCount[]; filters: PartFilters; activeCount: number; total: number }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-11 items-center gap-2 rounded-sm border border-border px-4 text-sm font-medium lg:hidden">
        <SlidersHorizontalIcon className="size-4" /> Filters
        {activeCount > 0 ? <span className="grid size-5 place-items-center rounded-full bg-brand font-mono text-[10px] text-white">{activeCount}</span> : null}
      </SheetTrigger>
      <SheetContent side="left" className="w-full gap-0 p-0 data-[side=left]:w-full data-[side=left]:sm:max-w-sm">
        <div className="border-b border-border px-5 py-4">
          <SheetTitle className="font-display text-2xl font-extrabold uppercase">Filter parts</SheetTitle>
          <SheetDescription className="sr-only">Narrow the parts catalog</SheetDescription>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <AutoForm preserve={preserveFor(filters)}>
            <Fields categories={categories} filters={filters} />
          </AutoForm>
        </div>
        <div className="border-t border-border p-4">
          <button type="button" onClick={() => setOpen(false)} className="h-12 w-full rounded-sm bg-brand font-wide text-xs font-bold tracking-[0.14em] text-white uppercase">
            Show {total} {total === 1 ? "part" : "parts"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** "Fits my truck" model picker shown next to the search box. */
export function ModelPicker({ models, filters }: { models: string[]; filters: PartFilters }) {
  return (
    <AutoForm preserve={{ q: filters.q, category: filters.category, inStock: filters.inStock ? "1" : undefined, sort: filters.sort === "relevance" ? undefined : filters.sort }}>
      <label htmlFor="fits-model" className="sr-only">
        Fits my truck
      </label>
      <div className="relative">
        <TruckIcon className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-brand-ink" aria-hidden />
        <NativeSelect id="fits-model" name="model" defaultValue={filters.model ?? ""} className="h-16 pl-12 text-base font-medium">
          <option value="">Fits my truck: any model</option>
          {models.map((m) => (
            <option key={m} value={m}>
              Fits JAC {m}
            </option>
          ))}
        </NativeSelect>
      </div>
    </AutoForm>
  )
}
