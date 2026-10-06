import type { Metadata } from "next"
import Link from "next/link"
import { ClipboardListIcon, FileTextIcon } from "lucide-react"
import { EmptyState, PageHeader, primaryBtn } from "@/components/portal/page-header"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { StatusPill } from "@/components/shared/status-pill"
import { formatDate, formatPeso } from "@/lib/format"
import { QUOTE_STATUS } from "@/lib/status"
import { listQuotes } from "@/server/queries/portal"

export const metadata: Metadata = { title: "Quotes" }

export default async function QuotesPage() {
  const quotes = await listQuotes(100)
  return (
    <>
      <RealtimeRefresh subscriptions={[{ table: "quotes" }]} />
      <PageHeader eyebrow="Sales & parts" title="Quotes" description="Truck, parts and service quotes you've requested. Priced quotes and PDFs appear here as soon as they're issued." />
      {quotes.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title="No quotes yet"
          text="Request a quote from any truck or part page — it shows up here."
          action={
            <Link href="/trucks" className={primaryBtn}>
              Browse trucks
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-sm border border-border bg-card">
          {quotes.map((q) => (
            <li key={q.id}>
              <Link href={`/account/quotes/${q.id}`} className="grid gap-2 p-5 hover:bg-muted/40 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
                <span className="min-w-0">
                  <span className="font-mono text-xs text-brand-ink">
                    {q.reference} · {q.type === "truck" ? "Truck" : q.type === "part" ? "Parts" : "Service"}
                  </span>
                  <span className="mt-1 block truncate font-semibold">{q.subject}</span>
                  <span className="block text-sm text-muted-foreground">Requested {formatDate(q.createdAt)}</span>
                </span>
                <span className="flex items-center gap-2 font-mono text-sm">
                  {q.hasPdf ? <FileTextIcon className="size-4 text-brand-ink" aria-label="PDF available" /> : null}
                  {q.total > 0 ? formatPeso(q.total) : <span className="text-muted-foreground">—</span>}
                </span>
                <StatusPill label={QUOTE_STATUS[q.status].customer} tone={QUOTE_STATUS[q.status].tone} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
