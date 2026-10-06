import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLinkIcon, MailIcon, PhoneIcon } from "lucide-react"
import { NotesThread } from "@/components/admin/notes-thread"
import { QuoteEditor } from "@/components/admin/quote-editor"
import { Panel } from "@/components/admin/ui"
import { PageHeader } from "@/components/portal/page-header"
import { StatusPill } from "@/components/shared/status-pill"
import { formatDateTime, formatKm, formatPeso } from "@/lib/format"
import { QUOTE_STATUS } from "@/lib/status"
import { addDays, manilaToday } from "@/lib/validation/booking"
import { adminPage } from "@/server/admin/context"
import { CAN, can } from "@/server/admin/permissions"

export const metadata: Metadata = { title: "Quote" }

export default async function AdminQuotePage(props: PageProps<"/admin/quotes/[id]">) {
  const { id } = await props.params
  const { repo, role } = await adminPage(`/admin/quotes/${id}`, "quotes.read")
  const q = await repo.getQuote(id)
  if (!q) notFound()
  const [staff, trucks, parts] = await Promise.all([repo.staff(), repo.listTrucks({}), repo.listParts({})])
  const quoteStaff = staff.filter((s) => (CAN["quotes.write"] as readonly string[]).includes(s.role))
  const catalog = [
    ...trucks.filter((t) => t.availability !== "sold").map((t) => ({ label: `${t.title} (${t.year}) · ${t.stockNumber ?? ""}`, price: t.priceOnRequest ? null : t.price })),
    ...parts.map((p) => ({ label: `${p.partNumber} · ${p.name}`, price: p.priceOnRequest ? null : p.price })),
  ]
  const fin = q.financing as { downPaymentPct?: number; termMonths?: number; monthly?: number; tradeInValue?: number; price?: number } | null
  const trade = q.tradeIn as { make?: string; model?: string; year?: number; mileageKm?: number; notes?: string } | null

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <PageHeader
        back={{ href: "/admin/quotes", label: "Quotes inbox" }}
        eyebrow={`${q.type} quote ${q.reference} · received ${formatDateTime(q.createdAt)}`}
        title={q.subject}
        description={q.respondedAt ? `Sent ${formatDateTime(q.respondedAt)}` : "Not yet sent"}
        actions={<StatusPill label={QUOTE_STATUS[q.status].label} tone={QUOTE_STATUS[q.status].tone} className="text-xs" />}
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <Panel title="Quotation" bodyClassName="p-5">
          {can(role, "quotes.write") ? (
            <QuoteEditor
              id={q.id}
              status={q.status}
              vatRate={q.vatRate}
              staff={quoteStaff}
              catalog={catalog}
              initial={{
                items: q.items,
                discount: q.discount,
                validUntil: q.validUntil ?? addDays(manilaToday(), 14),
                terms: q.terms ?? "",
                responseMessage: q.responseMessage ?? "",
                assignedTo: q.assignedTo?.id ?? "",
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Read-only for your role.</p>
          )}
        </Panel>

        <aside className="grid content-start gap-6 [&>*]:min-w-0">
          <Panel title="Customer request" bodyClassName="grid gap-4 p-5 text-sm">
            <div className="grid gap-1.5">
              <p className="font-semibold">
                {q.contactName}
                {q.company ? <span className="block text-xs font-normal text-muted-foreground">{q.company}</span> : null}
              </p>
              <a href={`tel:${q.contactPhone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 hover:text-brand-ink">
                <PhoneIcon className="size-3.5" /> {q.contactPhone}
              </a>
              <a href={`mailto:${q.contactEmail}?subject=${encodeURIComponent(`Your JAC Motors quote ${q.reference}`)}`} className="inline-flex items-center gap-2 break-all hover:text-brand-ink">
                <MailIcon className="size-3.5" /> {q.contactEmail}
              </a>
            </div>
            {q.quantity && q.quantity > 1 ? <p>Quantity requested: <strong>{q.quantity}</strong></p> : null}
            {q.message ? <p className="rounded-md border-l-4 border-brand bg-muted/50 p-3 whitespace-pre-line">{q.message}</p> : null}
            {fin ? (
              <div className="rounded-md border border-border p-3">
                <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Financing estimate</p>
                <p className="mt-1">
                  {fin.downPaymentPct}% down · {fin.termMonths} months · ≈ {formatPeso(fin.monthly ?? 0)}/mo
                  {fin.tradeInValue ? ` · trade-in ${formatPeso(fin.tradeInValue)}` : ""}
                </p>
              </div>
            ) : null}
            {trade?.make || trade?.model ? (
              <div className="rounded-md border border-border p-3">
                <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Trade-in</p>
                <p className="mt-1">
                  {[trade.make, trade.model, trade.year].filter(Boolean).join(" ")}
                  {trade.mileageKm ? ` · ${formatKm(trade.mileageKm)}` : ""}
                </p>
                {trade.notes ? <p className="text-xs text-muted-foreground">{trade.notes}</p> : null}
              </div>
            ) : null}
            {q.attachmentUrls.length ? (
              <div className="flex flex-wrap gap-2">
                {q.attachmentUrls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="relative block size-24 overflow-hidden rounded-md border border-border">
                    <Image src={u} alt="Customer photo" fill sizes="96px" className="object-cover" unoptimized />
                  </a>
                ))}
              </div>
            ) : q.attachments ? (
              <p className="text-xs text-muted-foreground">{q.attachments} photo(s) attached (available once storage is connected).</p>
            ) : null}
            <div className="flex flex-wrap gap-3 text-xs">
              {q.truckSlug ? (
                <Link href={`/trucks/${q.truckSlug}`} target="_blank" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  Listing <ExternalLinkIcon className="size-3" />
                </Link>
              ) : null}
              {q.partSlug ? (
                <Link href={`/parts/${q.partSlug}`} target="_blank" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  Part page <ExternalLinkIcon className="size-3" />
                </Link>
              ) : null}
              {q.customerId && can(role, "customers.read") ? (
                <Link href={`/admin/customers/${q.customerId}`} className="text-muted-foreground hover:text-foreground">
                  Customer record →
                </Link>
              ) : null}
            </div>
          </Panel>
          <Panel title="Internal notes" bodyClassName="p-5">
            <NotesThread entityType="quote" entityId={q.id} notes={q.notes} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
