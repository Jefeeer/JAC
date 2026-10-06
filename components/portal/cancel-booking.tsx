"use client"

import { useRef, useState, useTransition } from "react"
import { LoaderIcon, XCircleIcon } from "lucide-react"
import { useConfirm } from "@/components/shared/confirm"
import { cancelBooking } from "@/server/actions/portal"

export function CancelBooking({ id, reference }: { id: string; reference?: string }) {
  const confirm = useConfirm()
  // value captured on change: the dialog unmounts its content once closed
  const reason = useRef("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const ask = async () => {
    reason.current = ""
    const ok = await confirm({
      title: "Cancel this booking?",
      tone: "danger",
      icon: "delete",
      confirmLabel: "Yes, cancel booking",
      cancelLabel: "Keep it",
      details: reference ? [["Booking", reference]] : undefined,
      description: (
        <span className="mt-1 grid gap-1.5">
          <span>The service advisor is notified and the slot is released.</span>
          <label htmlFor="cancel-reason" className="mt-2 text-xs font-medium text-foreground">
            Reason (optional) — helps us improve
          </label>
          <textarea
            id="cancel-reason"
            onChange={(e) => (reason.current = e.target.value)}
            rows={2}
            maxLength={300}
            className="w-full rounded-sm border border-input bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-brand"
          />
        </span>
      ),
    })
    if (!ok) return
    start(async () => {
      setError(null)
      const res = await cancelBooking({ id, reason: reason.current })
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={ask}
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-sm border border-border px-4 text-sm hover:border-destructive hover:text-destructive disabled:opacity-60"
      >
        {pending ? <LoaderIcon className="size-4 animate-spin" /> : <XCircleIcon className="size-4" />} Cancel booking
      </button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
