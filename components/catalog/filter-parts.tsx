"use client"

import { cn } from "@/lib/utils"

/** Fieldset with the catalog's mono legend style. */
export function FilterGroup({ legend, children, className }: { legend: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={cn("border-t border-border pt-5", className)}>
      <legend className="float-left mb-3 w-full font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{legend}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  )
}

/** Radio rendered as a pill/chip. */
export function ChipRadio({
  name,
  value,
  checked,
  label,
  count,
  hint,
}: {
  name: string
  value: string
  checked: boolean
  label: string
  count?: number
  hint?: string
}) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-sm transition-colors",
          "peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white",
          "peer-focus-visible:ring-3 peer-focus-visible:ring-brand/30 hover:border-foreground/40",
        )}
      >
        {label}
        {count !== undefined ? <span className="font-mono text-[10px] opacity-60">{count}</span> : null}
        {hint ? <span className="sr-only">({hint})</span> : null}
      </span>
    </label>
  )
}

/** Radio rendered as a full-width list row (for long option lists). */
export function RowRadio({
  name,
  value,
  checked,
  label,
  count,
  sub,
}: {
  name: string
  value: string
  checked: boolean
  label: string
  count?: number
  sub?: string | null
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 transition-colors hover:bg-muted">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span
        className="grid size-4 shrink-0 place-items-center rounded-full border border-input peer-checked:border-brand peer-checked:[&>span]:scale-100 peer-focus-visible:ring-3 peer-focus-visible:ring-brand/30"
        aria-hidden
      >
        <span className="size-2 scale-0 rounded-full bg-brand transition-transform" />
      </span>
      <span className="flex-1 text-sm peer-checked:font-semibold">
        {label}
        {sub ? <span className="ml-1.5 text-xs text-muted-foreground">{sub}</span> : null}
      </span>
      {count !== undefined ? <span className="font-mono text-[11px] text-muted-foreground">{count}</span> : null}
    </label>
  )
}

export function ToggleRow({ name, checked, label, description }: { name: string; checked: boolean; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="text-sm font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span> : null}
      </span>
      <input type="checkbox" name={name} value="1" defaultChecked={checked} className="peer sr-only" />
      <span
        aria-hidden
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-input transition-colors after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-background after:shadow after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-5 peer-focus-visible:ring-3 peer-focus-visible:ring-brand/30"
      />
    </label>
  )
}
