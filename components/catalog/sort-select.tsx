"use client"

import { AutoForm } from "@/components/catalog/catalog-nav"
import { NativeSelect } from "@/components/forms/controls"

export function SortSelect({
  value,
  options,
  preserve,
}: {
  value: string
  options: Record<string, string>
  preserve: Record<string, string | undefined>
}) {
  return (
    <AutoForm preserve={preserve} className="flex items-center gap-2">
      <label htmlFor="catalog-sort" className="hidden font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase sm:block">
        Sort
      </label>
      <NativeSelect id="catalog-sort" name="sort" aria-label="Sort by" defaultValue={value} className="h-11 min-w-48 text-sm">
        {Object.entries(options).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </NativeSelect>
      <noscript>
        <button type="submit" className="h-11 rounded-sm border border-border px-3 text-sm">
          Go
        </button>
      </noscript>
    </AutoForm>
  )
}
