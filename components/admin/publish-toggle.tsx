"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useConfirm } from "@/components/shared/confirm"
import { cn } from "@/lib/utils"
import { setPartPublishedAction, setTruckPublishedAction } from "@/server/actions/admin"

export function PublishToggle({ kind, id, published, name }: { kind: "truck" | "part"; id: string; published: boolean; name?: string }) {
  const confirm = useConfirm()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={published}
        aria-label={published ? "Published — click to unpublish" : "Draft — click to publish"}
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: published ? `Unpublish this ${kind}?` : `Publish this ${kind}?`,
            description: published ? "It disappears from the public website. Existing quotes and jobs are unaffected." : "It goes live on the public website and in search.",
            details: name ? [[kind === "truck" ? "Truck" : "Part", name]] : undefined,
            tone: published ? "danger" : "success",
            confirmLabel: published ? "Unpublish" : "Publish",
          })
          if (!ok) return
          start(async () => {
            setError(null)
            const res = kind === "truck" ? await setTruckPublishedAction(id, !published) : await setPartPublishedAction(id, !published)
            if (!res.ok) setError(res.error)
            else router.refresh()
          })
        }}
        className={cn(
          "inline-flex h-7 items-center gap-2 rounded-full border px-2.5 font-mono text-[10px] font-semibold tracking-wider uppercase transition-colors disabled:opacity-50",
          published ? "border-success/50 bg-success/10 text-success" : "border-border text-muted-foreground hover:border-foreground/40",
        )}
      >
        <span className={cn("size-2 rounded-full", published ? "bg-success" : "bg-muted-foreground/50")} />
        {published ? "Live" : "Draft"}
      </button>
      {error ? <span className="max-w-48 text-[11px] text-destructive">{error}</span> : null}
    </div>
  )
}
