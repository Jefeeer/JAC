"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, LoaderIcon, MinusIcon, PlusIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { setPartStockAction } from "@/server/actions/admin"

/** Inline stock adjuster: −/+ or type a count, Enter to save. */
export function StockEditor({ id, qty, reorderLevel }: { id: string; qty: number; reorderLevel: number }) {
  const router = useRouter()
  const [value, setValue] = useState(String(qty))
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const n = Number(value)
  const dirty = n !== qty
  const save = (next = n) =>
    start(async () => {
      setError(null)
      const res = await setPartStockAction(id, next)
      if (!res.ok) setError(res.error)
      else router.refresh()
    })
  const tone = qty <= 0 ? "text-destructive" : qty <= reorderLevel ? "text-signal-foreground dark:text-signal" : ""

  return (
    <div className="inline-flex flex-col gap-1">
      <div className="inline-flex h-8 items-stretch overflow-hidden rounded-md border border-input">
        <button type="button" onClick={() => setValue(String(Math.max(0, n - 1)))} className="grid w-7 place-items-center hover:bg-muted" aria-label="Decrease">
          <MinusIcon className="size-3" />
        </button>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 7))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              save()
            }
          }}
          inputMode="numeric"
          aria-label="Stock quantity"
          className={cn("w-14 border-x border-input bg-transparent text-center font-mono text-sm font-semibold outline-none", tone)}
        />
        <button type="button" onClick={() => setValue(String(n + 1))} className="grid w-7 place-items-center hover:bg-muted" aria-label="Increase">
          <PlusIcon className="size-3" />
        </button>
        {dirty ? (
          <button type="button" disabled={pending} onClick={() => save()} className="grid w-8 place-items-center bg-brand text-white" aria-label="Save stock">
            {pending ? <LoaderIcon className="size-3.5 animate-spin" /> : <CheckIcon className="size-3.5" />}
          </button>
        ) : null}
      </div>
      {error ? <span className="text-[11px] text-destructive">{error}</span> : null}
    </div>
  )
}
