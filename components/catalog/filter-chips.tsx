import Link from "next/link"
import { XIcon } from "lucide-react"

/** Removable chips for each active filter (each chip is a link without that param). */
export function FilterChips({
  basePath,
  params,
  labels,
}: {
  basePath: string
  params: Record<string, string | undefined>
  labels: { key: string; label: string; also?: string[] }[]
}) {
  if (labels.length === 0) return null

  const without = (keys: string[]) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v && !keys.includes(k) && k !== "page") sp.set(k, v)
    const qs = sp.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {labels.map((l) => (
        <li key={l.key}>
          <Link
            href={without([l.key, ...(l.also ?? [])])}
            scroll={false}
            className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm transition-colors hover:border-brand hover:text-brand-ink"
            aria-label={`Remove filter: ${l.label}`}
          >
            {l.label}
            <XIcon className="size-3.5" aria-hidden />
          </Link>
        </li>
      ))}
      <li>
        <Link href={basePath} scroll={false} className="px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Clear all
        </Link>
      </li>
    </ul>
  )
}
