import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"
import { StockBadge } from "@/components/catalog/stock-badge"
import { PartVisual } from "@/components/parts/part-visual"
import { priceLabel } from "@/lib/format"
import type { Part } from "@/types/domain"

/** Dense catalog row (table-like on desktop, card on mobile). */
export function PartRow({ part, highlightModel }: { part: Part; highlightModel?: string }) {
  const models = [...new Set(part.compatibility.map((c) => c.model))]
  const shown = models.slice(0, 4)

  return (
    <li className="group relative grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-2 px-4 py-4 transition-colors hover:bg-muted/50 sm:px-5 md:grid-cols-[4.5rem_minmax(0,1.6fr)_minmax(0,1fr)_8.5rem_8rem_2rem] md:items-center">
      <Link href={`/parts/${part.slug}`} className="absolute inset-0 z-10" aria-label={`${part.name} — ${part.partNumber}`} />
      <PartVisual
        imageUrl={part.imageUrl}
        partNumber={part.partNumber}
        name={part.name}
        categorySlug={part.categorySlug}
        size="sm"
        className="row-span-3 size-[4.5rem] rounded-sm md:row-span-1"
      />
      <div className="min-w-0">
        <p className="font-mono text-xs font-semibold tracking-wide text-brand-ink">{part.partNumber}</p>
        <p className="mt-0.5 line-clamp-2 font-semibold leading-snug group-hover:underline group-hover:underline-offset-2">{part.name}</p>
        {part.oemNumber ? <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">OEM {part.oemNumber}</p> : null}
      </div>
      <ul className="flex flex-wrap gap-1" aria-label="Fits">
        {shown.map((m) => (
          <li
            key={m}
            className={
              m === highlightModel
                ? "rounded-[2px] bg-brand px-1.5 py-0.5 font-mono text-[10px] text-white"
                : "rounded-[2px] border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            }
          >
            {m}
          </li>
        ))}
        {models.length > shown.length ? <li className="px-1 font-mono text-[10px] text-muted-foreground">+{models.length - shown.length}</li> : null}
      </ul>
      <div className="flex items-center justify-between gap-3 md:contents">
        <StockBadge status={part.stockStatus} leadTimeDays={part.leadTimeDays} className="justify-self-start" />
        <p className="text-right font-mono text-sm font-semibold md:text-left">
          {priceLabel(part) === "Price on request" ? <span className="font-sans text-xs font-normal text-muted-foreground">Price on request</span> : priceLabel(part)}
          {!part.priceOnRequest && part.price !== null ? <span className="ml-1 font-sans text-[11px] font-normal text-muted-foreground">/{part.unit}</span> : null}
        </p>
      </div>
      <ArrowUpRightIcon className="hidden size-4 text-muted-foreground transition-colors group-hover:text-brand-ink md:block" aria-hidden />
    </li>
  )
}
