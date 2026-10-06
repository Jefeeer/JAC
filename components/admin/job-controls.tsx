"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, CheckIcon, LoaderIcon, Trash2Icon } from "lucide-react"
import { btn } from "@/components/admin/ui"
import { formatPeso } from "@/lib/format"
import { cn } from "@/lib/utils"
import { addJobItemAction, createInvoiceAction, removeJobItemAction, setJobStatusAction, updateJobAction } from "@/server/actions/admin"
import { JOB_STATUS_FLOW, type JobStatus } from "@/types/domain"

const NEXT: Partial<Record<JobStatus, JobStatus>> = {
  received: "diagnosing",
  diagnosing: "in_progress",
  awaiting_parts: "in_progress",
  in_progress: "ready",
  ready: "released",
}
const label = (s: JobStatus) => JOB_STATUS_FLOW.find((x) => x.status === s)?.label ?? (s === "cancelled" ? "Cancelled" : s)

function useAction() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? "Something went wrong")
      else {
        after?.()
        router.refresh()
      }
    })
  return { pending, error, run }
}

/** Compact "advance" button for job board cards. */
export function AdvanceJobButton({ id, status, canRelease }: { id: string; status: JobStatus; canRelease: boolean }) {
  const { pending, error, run } = useAction()
  const next = NEXT[status]
  if (!next || (next === "released" && !canRelease)) return null
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault()
          run(() => setJobStatusAction(id, next))
        }}
        className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border text-xs font-semibold hover:border-brand hover:bg-brand hover:text-white disabled:opacity-50"
      >
        {pending ? <LoaderIcon className="size-3.5 animate-spin" /> : <ArrowRightIcon className="size-3.5" />} {label(next)}
      </button>
      {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
    </div>
  )
}

/** Full status pipeline on the job page: every stage as a button + optional customer-visible note. */
export function JobStatusControl({ id, status, allowed }: { id: string; status: JobStatus; allowed: JobStatus[] }) {
  const { pending, error, run } = useAction()
  const [note, setNote] = useState("")
  const [target, setTarget] = useState<JobStatus | null>(NEXT[status] && allowed.includes(NEXT[status]!) ? NEXT[status]! : null)
  const flow = [...JOB_STATUS_FLOW.map((s) => s.status), "cancelled"] as JobStatus[]

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {flow.map((s) => {
          const current = s === status
          const ok = allowed.includes(s) && !current
          return (
            <button
              key={s}
              type="button"
              disabled={!ok || pending}
              onClick={() => setTarget(s)}
              aria-pressed={target === s}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
                current && "border-brand bg-brand/10 font-semibold text-brand-ink",
                target === s && !current && "border-foreground bg-foreground text-background",
                !current && target !== s && ok && "border-border hover:border-foreground/40",
                !ok && !current && "border-border opacity-40",
                s === "cancelled" && ok && target !== s && "text-destructive",
              )}
            >
              {current ? <CheckIcon className="size-3.5" /> : null}
              {label(s)}
            </button>
          )
        })}
      </div>
      {target ? (
        <div className="grid gap-2 rounded-md border border-border bg-muted/40 p-3">
          <label htmlFor="status-note" className="text-sm">
            Move to <strong>{label(target)}</strong> — optional note for the customer&apos;s timeline
          </label>
          <input
            id="status-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder={target === "awaiting_parts" ? "e.g. Rear brake shoe set ordered from the parts counter" : "e.g. Road test passed"}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand"
          />
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={() => run(() => setJobStatusAction(id, target, note), () => setNote(""))} className={target === "cancelled" ? btn.danger : btn.primary}>
              {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} Update status
            </button>
            <button type="button" onClick={() => setTarget(null)} className={btn.ghost}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

export function JobNotesForm({
  id,
  initial,
  canAssign,
  mechanics,
}: {
  id: string
  initial: { diagnosis: string; recommendation: string; customerNotes: string; mechanicId: string; promisedAt: string }
  canAssign: boolean
  mechanics: { id: string; name: string }[]
}) {
  const { pending, error, run } = useAction()
  const [v, setV] = useState(initial)
  const [saved, setSaved] = useState(false)
  const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20"
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(
          () =>
            updateJobAction({
              id,
              diagnosis: v.diagnosis,
              recommendation: v.recommendation,
              customerNotes: v.customerNotes,
              ...(canAssign ? { mechanicId: v.mechanicId || null, promisedAt: v.promisedAt || null } : {}),
            }),
          () => setSaved(true),
        )
      }}
      className="grid gap-4"
    >
      {canAssign ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Mechanic</span>
            <select value={v.mechanicId} onChange={(e) => setV({ ...v, mechanicId: e.target.value })} className={cn(field, "h-10")}>
              <option value="">Unassigned</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Promised by</span>
            <input type="datetime-local" value={v.promisedAt} onChange={(e) => setV({ ...v, promisedAt: e.target.value })} className={cn(field, "h-10")} />
          </label>
        </div>
      ) : null}
      {(
        [
          ["diagnosis", "Diagnosis", "What did the inspection / scan find?"],
          ["recommendation", "Recommendation", "Work recommended to the customer"],
          ["customerNotes", "Note to customer", "Shown on the customer's job page and emails"],
        ] as const
      ).map(([k, l, ph]) => (
        <label key={k} className="grid gap-1.5 text-sm">
          <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">{l}</span>
          <textarea value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} rows={3} placeholder={ph} className={field} />
        </label>
      ))}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btn.dark}>
          {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} Save
        </button>
        {saved && !pending ? <span className="text-sm text-success">Saved</span> : null}
        {error ? <span className="text-sm text-destructive">{error}</span> : null}
      </div>
    </form>
  )
}

export function JobItemsEditor({
  jobId,
  items,
  canEdit,
  canRemove,
  parts,
}: {
  jobId: string
  items: { id: string; type: string; description: string; quantity: number; unitPrice: number; lineTotal: number }[]
  canEdit: boolean
  canRemove: boolean
  parts: { id: string; label: string; price: number | null }[]
}) {
  const { pending, error, run } = useAction()
  const [draft, setDraft] = useState({ type: "labor" as "labor" | "part" | "misc", description: "", quantity: "1", unitPrice: "", partId: "" })
  const total = items.reduce((s, i) => s + i.lineTotal, 0)
  const field = "h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand"

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <tbody className="divide-y divide-border">
            {items.map((i) => (
              <tr key={i.id}>
                <td className="py-2.5 pr-3">
                  <span className="mr-2 rounded-[2px] border border-border px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">{i.type}</span>
                  {i.description}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap text-muted-foreground">
                  {i.quantity} × {formatPeso(i.unitPrice)}
                </td>
                <td className="py-2.5 pl-3 text-right font-mono whitespace-nowrap">{formatPeso(i.lineTotal)}</td>
                {canRemove ? (
                  <td className="w-10 pl-2 text-right">
                    <button type="button" onClick={() => run(() => removeJobItemAction(jobId, i.id))} className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${i.description}`}>
                      <Trash2Icon className="size-4" />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="py-6 text-center text-muted-foreground" colSpan={4}>
                  No labour or parts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-bold">
              <td className="pt-3">Total (before VAT)</td>
              <td />
              <td className="pt-3 text-right font-mono">{formatPeso(total)}</td>
              {canRemove ? <td /> : null}
            </tr>
          </tfoot>
        </table>
      </div>

      {canEdit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            run(
              () =>
                addJobItemAction({
                  jobId,
                  type: draft.type,
                  description: draft.description,
                  quantity: Number(draft.quantity),
                  unitPrice: Number(draft.unitPrice.replace(/[,₱\s]/g, "") || 0),
                  partId: draft.partId || null,
                }),
              () => setDraft({ type: draft.type, description: "", quantity: "1", unitPrice: "", partId: "" }),
            )
          }}
          className="mt-4 grid gap-2 rounded-md border border-dashed border-border p-3 sm:grid-cols-[7rem_1fr_5rem_8rem_auto]"
        >
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as typeof draft.type, partId: "" })} className={field} aria-label="Item type">
            <option value="labor">Labour</option>
            <option value="part">Part</option>
            <option value="misc">Other</option>
          </select>
          {draft.type === "part" ? (
            <select
              value={draft.partId}
              onChange={(e) => {
                const p = parts.find((x) => x.id === e.target.value)
                setDraft({ ...draft, partId: e.target.value, description: p?.label ?? "", unitPrice: p?.price ? String(p.price) : draft.unitPrice })
              }}
              className={field}
              aria-label="Part"
            >
              <option value="">Choose a part…</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          ) : (
            <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="e.g. Brake overhaul labour" className={field} aria-label="Description" />
          )}
          <input value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} inputMode="decimal" className={cn(field, "font-mono")} aria-label="Quantity" />
          <input value={draft.unitPrice} onChange={(e) => setDraft({ ...draft, unitPrice: e.target.value })} inputMode="decimal" placeholder="Unit ₱" className={cn(field, "font-mono")} aria-label="Unit price" />
          <button type="submit" disabled={pending || !draft.description} className={btn.dark}>
            {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} Add
          </button>
        </form>
      ) : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

export function CreateInvoiceButton({ jobId }: { jobId: string }) {
  const { pending, error, run } = useAction()
  return (
    <div>
      <button type="button" disabled={pending} onClick={() => run(() => createInvoiceAction(jobId))} className={btn.primary}>
        {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} Create invoice
      </button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
