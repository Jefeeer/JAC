import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DownloadIcon, PhoneCallIcon } from "lucide-react"
import { PageHeader, primaryBtn, secondaryBtn } from "@/components/portal/page-header"
import { RealtimeRefresh } from "@/components/portal/realtime-refresh"
import { StatusPill } from "@/components/shared/status-pill"
import { contactLinks, siteConfig } from "@/lib/config/site"
import { formatDate, formatDateTime, formatKm, formatPeso } from "@/lib/format"
import { QUOTE_STATUS } from "@/lib/status"
import { getQuote } from "@/server/queries/portal"

export const metadata: Metadata = { title: "Quote" }

export default async function QuoteDetailPage(props: PageProps<"/account/quotes/[id]">) {
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const q = await getQuote(id)
  if (!q) notFound()

  const priced = q.items.length > 0
  const status = QUOTE_STATUS[q.status]
  const fin = q.financing as { downPaymentPct?: number; termMonths?: number; monthly?: number; tradeInValue?: number } | null
  const trade = q.tradeIn as { make?: string; model?: string; year?: number; mileageKm?: number } | null

  return (
    <>
      <RealtimeRefresh subscriptions={[{ table: "quotes", filter: `id=eq.${q.id}` }]} />
      <PageHeader
        back={{ href: "/account/quotes", label: "Quotes" }}
        eyebrow={`Quote ${q.reference}`}
        title={q.subject}
        description={`Requested ${formatDateTime(q.createdAt)}${q.branchName ? ` · ${q.branchName}` : ""}`}
        actions={
          <>
            <StatusPill label={status.customer} tone={status.tone} className="text-xs" />
            {q.pdfUrl ? (
              <a href={q.pdfUrl} target="_blank" rel="noopener noreferrer" className={primaryBtn}>
                <DownloadIcon className="size-4" /> PDF
              </a>
            ) : null}
          </>
        }
      />

      <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <section className="overflow-hidden rounded-sm border border-border bg-card">
          <h2 className="border-b border-border px-6 py-4 font-mono text-[11px] font-normal tracking-[0.2em] text-muted-foreground uppercase">
            {priced ? "Your quotation" : "Pricing"}
          </h2>
          {priced ? (
            <>
              {q.responseMessage ? <p className="border-b border-border px-6 py-4 whitespace-pre-line">{q.responseMessage}</p> : null}
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {q.items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-6 py-3">{i.description}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap text-muted-foreground">
                        {i.quantity} × {formatPeso(i.unitPrice, { cents: true })}
                      </td>
                      <td className="px-6 py-3 text-right font-mono whitespace-nowrap">{formatPeso(i.lineTotal, { cents: true })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/30 font-mono">
                  <tr>
                    <td colSpan={2} className="px-6 py-2 text-muted-foreground">
                      Subtotal
                    </td>
                    <td className="px-6 py-2 text-right">{formatPeso(q.subtotal, { cents: true })}</td>
                  </tr>
                  {q.discount > 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-2 text-muted-foreground">
                        Discount
                      </td>
                      <td className="px-6 py-2 text-right">− {formatPeso(q.discount, { cents: true })}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <td colSpan={2} className="px-6 py-2 text-muted-foreground">
                      VAT ({Math.round(q.vatRate * 100)}%)
                    </td>
                    <td className="px-6 py-2 text-right">{formatPeso(q.vatAmount, { cents: true })}</td>
                  </tr>
                  <tr className="text-base font-bold">
                    <td colSpan={2} className="px-6 py-3">
                      Total
                    </td>
                    <td className="px-6 py-3 text-right">{formatPeso(q.total, { cents: true })}</td>
                  </tr>
                </tfoot>
              </table>
              {q.validUntil || q.terms ? (
                <div className="border-t border-border px-6 py-4 text-sm text-muted-foreground">
                  {q.validUntil ? <p>Valid until {formatDate(q.validUntil)}.</p> : null}
                  {q.terms ? <p className="mt-1 whitespace-pre-line">{q.terms}</p> : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="px-6 py-6 text-muted-foreground">
              {q.status === "new" || q.status === "in_review"
                ? "Our team is preparing your quote. You'll be notified here and by email when it's ready."
                : "This quote has no line items."}
            </p>
          )}
        </section>

        <aside className="grid content-start gap-6">
          <section className="rounded-sm border border-border bg-card p-6">
            <h2 className="font-mono text-[11px] font-normal tracking-[0.2em] text-muted-foreground uppercase">Your request</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              {q.quantity ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Quantity</dt>
                  <dd className="font-mono">{q.quantity}</dd>
                </div>
              ) : null}
              {fin ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Financing estimate</dt>
                  <dd className="text-right font-mono">
                    {fin.downPaymentPct}% down · {fin.termMonths} mo
                    <br />≈ {formatPeso(fin.monthly ?? 0)}/mo
                  </dd>
                </div>
              ) : null}
              {trade?.make || trade?.model ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Trade-in</dt>
                  <dd className="text-right">
                    {[trade.make, trade.model, trade.year].filter(Boolean).join(" ")}
                    {trade.mileageKm ? <span className="block font-mono text-xs">{formatKm(trade.mileageKm)}</span> : null}
                  </dd>
                </div>
              ) : null}
            </dl>
            {q.message ? <p className="mt-4 border-t border-dashed border-border pt-4 text-sm whitespace-pre-line text-muted-foreground">{q.message}</p> : null}
          </section>
          <div className="flex flex-wrap gap-2">
            <a href={contactLinks.tel(siteConfig.contact.phone)} className={secondaryBtn}>
              <PhoneCallIcon className="size-4" /> Discuss this quote
            </a>
            {q.subjectHref ? (
              <Link href={q.subjectHref} className={secondaryBtn}>
                View listing
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  )
}
