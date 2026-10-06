"use client"

import { useState, useTransition } from "react"
import { LoaderIcon, XCircleIcon } from "lucide-react"
import { TextArea } from "@/components/forms/controls"
import { cancelBooking } from "@/server/actions/portal"

export function CancelBooking({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-sm border border-border px-4 text-sm hover:border-destructive hover:text-destructive">
        <XCircleIcon className="size-4" /> Cancel booking
      </button>
    )
  }

  return (
    <div className="w-full rounded-sm border border-destructive/40 bg-destructive/5 p-4 sm:w-96">
      <p className="font-semibold">Cancel this booking?</p>
      <label className="mt-3 block text-sm text-muted-foreground" htmlFor="cancel-reason">
        Reason (optional) — helps us improve
      </label>
      <TextArea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} className="mt-1 min-h-0" />
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await cancelBooking({ id, reason })
              if (!res.ok) setError(res.error)
              else setOpen(false)
            })
          }
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} Yes, cancel
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-sm border border-border px-4 text-sm">
          Keep it
        </button>
      </div>
    </div>
  )
}
