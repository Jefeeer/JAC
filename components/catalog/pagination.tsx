import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Server-rendered pagination that preserves the active filters. */
export function Pagination({
  basePath,
  params,
  page,
  pageCount,
}: {
  basePath: string
  params: Record<string, string | undefined>
  page: number
  pageCount: number
}) {
  if (pageCount <= 1) return null

  const href = (p: number) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v)
    if (p > 1) sp.set("page", String(p))
    const qs = sp.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  // 1 … 4 5 [6] 7 8 … 20
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount))
  const sorted = [...pages].sort((a, b) => a - b)

  const itemClass = "grid h-11 min-w-11 place-items-center rounded-sm border px-3 font-mono text-sm transition-colors"

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(itemClass, "border-border hover:border-foreground/40")} aria-label="Previous page">
          <ChevronLeftIcon className="size-4" />
        </Link>
      ) : null}
      {sorted.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - sorted[i - 1] > 1 ? <span className="px-1 text-muted-foreground">…</span> : null}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(itemClass, p === page ? "border-brand bg-brand text-white" : "border-border hover:border-foreground/40")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={cn(itemClass, "border-border hover:border-foreground/40")} aria-label="Next page">
          <ChevronRightIcon className="size-4" />
        </Link>
      ) : null}
    </nav>
  )
}
