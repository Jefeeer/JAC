"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, FileTextIcon, LoaderIcon, PlusIcon, SendIcon, Trash2Icon } from "lucide-react"
import { btn } from "@/components/admin/ui"
import { formatPeso } from "@/lib/format"
import { generateQuotePdfAction, saveQuoteAction, setQuoteStatusAction } from "@/server/actions/admin"
import type { QuoteStatus } from "@/types/domain"

type Line = { description: string; quantity: string; unitPrice: string }
type CatalogOption = { label: string; price: number | null }

export function QuoteEditor({
  id,
  status,
  initial,
  staff,
  catalog,
  vatRate,
}: {
  id: string
  status: QuoteStatus
  initial: { items: { description: string; quantity: number; unitPrice: number }[]; discount: number; validUntil: string; terms: string; responseMessage: string; assignedTo: string }
  staff: { id: string; name: string; role: string }[]
  catalog: CatalogOption[]
  vatRate: number
}) {
  const router = useRouter()
  const [lines, setLines] = useState<Line[]>(
    initial.items.length ? initial.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: String(i.unitPrice) })) : [{ description: "", quantity: "1", unitPrice: "" }],
  )
  const [discount, setDiscount] = useState(String(initial.discount || ""))
  const [validUntil, setValidUntil] = useState(initial.validUntil)
  const [terms, setTerms] = useState(initial.terms)
  const [message, setMessage] = useState(initial.responseMessage)
  const [assignedTo, setAssignedTo] = useState(initial.assignedTo)
  const [pick, setPick] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  const num = (s: string) => Number(String(s).replace(/[,₱\s]/g, "")) || 0
  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + num(l.quantity) * num(l.unitPrice), 0)
    const net = Math.max(subtotal - num(discount), 0)
    const vat = Math.round(net * vatRate * 100) / 100
    return { subtotal, vat, total: net + vat }
  }, [lines, discount, vatRate])

  const payload = () => ({
    id,
    items: lines.filter((l) => l.description.trim()).map((l) => ({ description: l.description.trim(), quantity: num(l.quantity), unitPrice: num(l.unitPrice) })),
    discount: num(discount),
    validUntil: validUntil || null,
    terms: terms || null,
    responseMessage: message || null,
    assignedTo: assignedTo || null,
  })

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      setMsg(null)
      const res = await fn()
      setMsg(res.ok ? { ok: true, text: okText } : { ok: false, text: res.error ?? "Something went wrong" })
      if (res.ok) router.refresh()
    })

  const field = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20"
  const editable = !["accepted", "rejected", "closed", "expired"].includes(status)

  return (
    <div className="grid gap-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="text-left font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              <th className="pb-2 font-normal">Description</th>
              <th className="w-20 pb-2 font-normal">Qty</th>
              <th className="w-36 pb-2 font-normal">Unit price (ex-VAT)</th>
              <th className="w-32 pb-2 text-right font-normal">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <input value={l.description} disabled={!editable} onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, description: e.target.value } : x)))} className={field} placeholder="Item or service" aria-label={`Line ${i + 1} description`} />
                </td>
                <td className="py-1 pr-2">
                  <input value={l.quantity} disabled={!editable} onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, quantity: e.target.value } : x)))} inputMode="decimal" className={`${field} font-mono`} aria-label={`Line ${i + 1} quantity`} />
                </td>
                <td className="py-1 pr-2">
                  <input value={l.unitPrice} disabled={!editable} onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, unitPrice: e.target.value } : x)))} inputMode="decimal" className={`${field} font-mono`} aria-label={`Line ${i + 1} unit price`} />
                </td>
                <td className="py-1 text-right font-mono whitespace-nowrap">{formatPeso(num(l.quantity) * num(l.unitPrice))}</td>
                <td className="py-1 pl-2 text-right">
                  {editable ? (
                    <button type="button" onClick={() => setLines(lines.filter((_, k) => k !== i))} className="text-muted-foreground hover:text-destructive" aria-label={`Remove line ${i + 1}`}>
                      <Trash2Icon className="size-4" />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editable ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setLines([...lines, { description: "", quantity: "1", unitPrice: "" }])} className={btn.outline}>
            <PlusIcon className="size-4" /> Add line
          </button>
          <select
            value={pick}
            onChange={(e) => {
              const o = catalog[Number(e.target.value)]
              if (o) setLines([...lines.filter((x) => x.description.trim()), { description: o.label, quantity: "1", unitPrice: o.price ? String(Math.round((o.price / (1 + vatRate)) * 100) / 100) : "" }])
              setPick("")
            }}
            className="h-10 max-w-sm min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Add from catalog"
          >
            <option value="">+ Add from catalog (price converted to ex-VAT)…</option>
            {catalog.map((o, i) => (
              <option key={i} value={i}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Message to customer</span>
            <textarea value={message} disabled={!editable} onChange={(e) => setMessage(e.target.value)} rows={3} className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-brand" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Terms</span>
            <textarea value={terms} disabled={!editable} onChange={(e) => setTerms(e.target.value)} rows={2} placeholder="Delivery lead time, inclusions, payment terms…" className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-brand" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Valid until</span>
              <input type="date" value={validUntil} disabled={!editable} onChange={(e) => setValidUntil(e.target.value)} className={field} />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Assigned to</span>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={field}>
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.role.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <dl className="grid content-start gap-2 rounded-md border border-border bg-muted/40 p-4 font-mono text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatPeso(totals.subtotal, { cents: true })}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Discount</dt>
            <dd>
              <input value={discount} disabled={!editable} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" placeholder="0" className="h-8 w-28 rounded border border-input bg-background px-2 text-right" aria-label="Discount" />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">VAT {Math.round(vatRate * 100)}%</dt>
            <dd>{formatPeso(totals.vat, { cents: true })}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-bold">
            <dt>Total</dt>
            <dd>{formatPeso(totals.total, { cents: true })}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
        {editable ? (
          <>
            <button type="button" disabled={pending} onClick={() => act(() => saveQuoteAction(payload()), "Draft saved")} className={btn.outline}>
              {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} Save draft
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                act(async () => {
                  const saved = await saveQuoteAction(payload())
                  if (!saved.ok) return saved
                  return setQuoteStatusAction(id, "quoted")
                }, "Quote sent to the customer")
              }
              className={btn.primary}
            >
              <SendIcon className="size-4" /> {status === "quoted" ? "Update & resend" : "Save & send quote"}
            </button>
          </>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMsg(null)
              const saved = editable ? await saveQuoteAction(payload()) : { ok: true }
              if (!saved.ok) return setMsg({ ok: false, text: (saved as { error: string }).error })
              const res = await generateQuotePdfAction(id)
              if (!res.ok) return setMsg({ ok: false, text: res.error })
              window.open(res.data?.url ?? `/api/documents/quotes/${id}`, "_blank")
              router.refresh()
            })
          }
          className={btn.outline}
        >
          <FileTextIcon className="size-4" /> PDF
        </button>
        {status === "quoted" ? (
          <>
            <button type="button" disabled={pending} onClick={() => act(() => setQuoteStatusAction(id, "accepted"), "Marked accepted")} className={btn.ghost}>
              <CheckIcon className="size-4" /> Accepted
            </button>
            <button type="button" disabled={pending} onClick={() => act(() => setQuoteStatusAction(id, "rejected"), "Marked declined")} className={btn.ghost}>
              Declined
            </button>
          </>
        ) : null}
        {editable && status !== "quoted" ? (
          <button type="button" disabled={pending} onClick={() => act(() => setQuoteStatusAction(id, "closed"), "Closed")} className={btn.ghost}>
            Close without quote
          </button>
        ) : null}
        {msg ? <span className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</span> : null}
      </div>
    </div>
  )
}
