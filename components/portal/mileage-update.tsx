"use client"

import { useState, useTransition } from "react"
import { CheckIcon, LoaderIcon } from "lucide-react"
import { useConfirm } from "@/components/shared/confirm"
import { updateMileage } from "@/server/actions/portal"

export function MileageUpdate({ id, current }: { id: string; current: number }) {
  const [km, setKm] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const confirm = useConfirm()

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const next = Number(km.replace(/,/g, ""))
        const ok = await confirm({
          title: "Update odometer?",
          description: next < current ? "This is lower than the reading on file — double-check before saving." : "Your next service reminder is recalculated from this reading.",
          tone: next < current ? "danger" : "default",
          details: [
            ["On file", `${current.toLocaleString("en-PH")} km`],
            ["New", `${next.toLocaleString("en-PH")} km`],
          ],
          confirmLabel: "Save reading",
        })
        if (!ok) return
        start(async () => {
          const res = await updateMileage({ id, km })
          setMsg(res.ok ? { ok: true, text: "Odometer updated" } : { ok: false, text: res.error })
          if (res.ok) setKm("")
        })
      }}
      className="grid gap-2"
    >
      <label htmlFor={`km-${id}`} className="font-mono text-[11px] tracking-[0.16em] uppercase">
        Update odometer
      </label>
      <div className="flex gap-2">
        <input
          id={`km-${id}`}
          value={km}
          onChange={(e) => setKm(e.target.value.replace(/[^\d,]/g, ""))}
          inputMode="numeric"
          placeholder={current.toLocaleString("en-PH")}
          className="h-11 w-full min-w-0 rounded-sm border border-input bg-surface px-3 font-mono outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20"
        />
        <button type="submit" disabled={pending || !km} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50">
          {pending ? <LoaderIcon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />} Save
        </button>
      </div>
      {msg ? (
        <p className={`text-xs ${msg.ok ? "text-success" : "text-destructive"}`} role="status">
          {msg.text}
        </p>
      ) : null}
    </form>
  )
}
