"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarCheckIcon, LoaderIcon, WrenchIcon, XCircleIcon } from "lucide-react"
import { btn } from "@/components/admin/ui"
import { convertBookingAction, updateBookingAction } from "@/server/actions/admin"

type Mode = null | "confirm" | "reschedule" | "cancel" | "convert"

export function BookingActions({
  id,
  status,
  defaultWhen,
  mechanics,
  canConvert,
}: {
  id: string
  status: string
  defaultWhen: string
  mechanics: { id: string; name: string }[]
  canConvert: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)
  const [when, setWhen] = useState(defaultWhen)
  const [reason, setReason] = useState("")
  const [mechanicId, setMechanicId] = useState(mechanics[0]?.id ?? "")
  const [promised, setPromised] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const field = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand"

  const run = (fn: () => Promise<{ ok: boolean; error?: string; data?: { jobId?: string } }>) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) return setError(res.error ?? "Something went wrong")
      setMode(null)
      if (res.data?.jobId) router.push(`/admin/jobs/${res.data.jobId}`)
      else router.refresh()
    })

  const open = ["pending", "confirmed", "rescheduled"].includes(status)
  if (!open) return <p className="text-sm text-muted-foreground">No further actions — this booking is {status.replace("_", " ")}.</p>

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {status === "pending" ? (
          <button type="button" onClick={() => setMode("confirm")} className={btn.primary}>
            <CalendarCheckIcon className="size-4" /> Confirm slot
          </button>
        ) : (
          <button type="button" onClick={() => setMode("reschedule")} className={btn.outline}>
            <CalendarCheckIcon className="size-4" /> Reschedule
          </button>
        )}
        {canConvert ? (
          <button type="button" onClick={() => setMode("convert")} className={status === "pending" ? btn.outline : btn.primary}>
            <WrenchIcon className="size-4" /> Check in → job order
          </button>
        ) : null}
        <button type="button" onClick={() => setMode("cancel")} className={btn.danger}>
          <XCircleIcon className="size-4" /> Cancel
        </button>
        {status !== "pending" ? (
          <button type="button" disabled={pending} onClick={() => run(() => updateBookingAction({ id, status: "no_show" }))} className={btn.ghost}>
            Mark no-show
          </button>
        ) : null}
      </div>

      {mode === "confirm" || mode === "reschedule" ? (
        <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm">
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Drop-off date & time</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
          </label>
          <button
            type="button"
            disabled={pending || !when}
            onClick={() => run(() => updateBookingAction({ id, status: mode === "confirm" ? "confirmed" : "rescheduled", scheduledAt: when }))}
            className={btn.dark}
          >
            {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} {mode === "confirm" ? "Confirm & notify" : "Reschedule & notify"}
          </button>
        </div>
      ) : null}

      {mode === "convert" ? (
        <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm">
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Assign mechanic</span>
            <select value={mechanicId} onChange={(e) => setMechanicId(e.target.value)} className={field}>
              <option value="">Assign later</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Promised by (optional)</span>
            <input type="datetime-local" value={promised} onChange={(e) => setPromised(e.target.value)} className={field} />
          </label>
          <button type="button" disabled={pending} onClick={() => run(() => convertBookingAction({ id, mechanicId: mechanicId || null, promisedAt: promised || null }))} className={btn.primary}>
            {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} Open job order
          </button>
        </div>
      ) : null}

      {mode === "cancel" ? (
        <div className="grid gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm">
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Reason (sent to the customer)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Bay fully booked — please choose another day" className={field} />
          </label>
          <button type="button" disabled={pending} onClick={() => run(() => updateBookingAction({ id, status: "cancelled", cancelReason: reason }))} className={btn.danger}>
            {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} Cancel booking
          </button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
