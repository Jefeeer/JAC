import type { Metadata } from "next"
import Link from "next/link"
import { PaperclipIcon } from "lucide-react"
import { EmptyRow, FilterTabs, SearchBox, Td, Th, panel } from "@/components/admin/ui"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { StatusPill } from "@/components/shared/status-pill"
import { formatPeso, formatRelative } from "@/lib/format"
import { QUOTE_STATUS } from "@/lib/status"
import { cn } from "@/lib/utils"
import { adminPage } from "@/server/admin/context"
import { quoteTypesFor } from "@/server/admin/permissions"
import type { QuoteStatus, QuoteType } from "@/types/domain"

export const metadata: Metadata = { title: "Quotes inbox" }

const STATUS_TABS: { key: string; label: string; status?: QuoteStatus | "open" }[] = [
  { key: "open", label: "Open", status: "open" },
  { key: "new", label: "New", status: "new" },
  { key: "quoted", label: "Sent", status: "quoted" },
  { key: "accepted", label: "Won", status: "accepted" },
  { key: "all", label: "All" },
]

export default async function QuotesInboxPage(props: PageProps<"/admin/quotes">) {
  const { repo, role } = await adminPage("/admin/quotes", "quotes.read")
  const sp = await props.searchParams
  const tab = STATUS_TABS.find((t) => t.key === sp.tab) ?? STATUS_TABS[0]
  const myTypes = quoteTypesFor(role)
  const typeParam = typeof sp.type === "string" ? (sp.type as QuoteType | "any") : myTypes ? myTypes[0] : "any"
  const type = typeParam === "any" ? undefined : (typeParam as QuoteType)
  const q = typeof sp.q === "string" ? sp.q : undefined
  const rows = await repo.listQuotes({ status: tab.status, type, q })
  const qs = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ tab: tab.key, type: typeParam, q, ...o })) if (v) p.set(k, v)
    return `/admin/quotes?${p}`
  }

  return (
    <div className="grid gap-5 [&>*]:min-w-0">
      <RealtimeRefresh subscriptions={[{ table: "quotes" }]} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs tabs={STATUS_TABS.map((t) => ({ key: t.key, label: t.label, href: qs({ tab: t.key }) }))} active={tab.key} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <FilterTabs
            tabs={[
              { key: "any", label: "All types", href: qs({ type: "any" }) },
              { key: "truck", label: "Trucks", href: qs({ type: "truck" }) },
              { key: "part", label: "Parts", href: qs({ type: "part" }) },
              { key: "service", label: "Service", href: qs({ type: "service" }) },
            ]}
            active={typeParam}
          />
          <SearchBox action="/admin/quotes" defaultValue={q} placeholder="Search name, email, ref…" hidden={{ tab: tab.key, type: typeParam }} />
        </div>
      </div>

      <div className={cn(panel, "overflow-x-auto")}>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <Th>Quote</Th>
              <Th>Customer</Th>
              <Th>For</Th>
              <Th>Assigned</Th>
              <Th className="text-right">Total</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className={cn("hover:bg-muted/40", r.status === "new" && "font-semibold")}>
                <Td>
                  <Link href={`/admin/quotes/${r.id}`} className="font-mono text-xs text-brand-ink hover:underline">
                    {r.reference}
                  </Link>
                  <span className="block text-xs font-normal text-muted-foreground">{formatRelative(r.createdAt)}</span>
                </Td>
                <Td>
                  <span className="block">{r.contactName}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{r.company ?? r.contactEmail}</span>
                </Td>
                <Td>
                  <span className="mr-2 rounded-[2px] border border-border px-1.5 py-0.5 font-mono text-[9px] font-normal tracking-wider text-muted-foreground uppercase">{r.type}</span>
                  {r.subject}
                  {r.attachments ? <PaperclipIcon className="ml-1.5 inline size-3.5 text-muted-foreground" aria-label={`${r.attachments} photos`} /> : null}
                </Td>
                <Td className="font-normal text-muted-foreground">{r.assignedTo?.name ?? "—"}</Td>
                <Td className="text-right font-mono font-normal">{r.total ? formatPeso(r.total) : "—"}</Td>
                <Td>
                  <StatusPill label={QUOTE_STATUS[r.status].label} tone={QUOTE_STATUS[r.status].tone} />
                </Td>
              </tr>
            ))}
            {rows.length === 0 ? <EmptyRow colSpan={6}>No quotes match.</EmptyRow> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
