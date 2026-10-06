"use client"

import { useTransition } from "react"
import { CheckCheckIcon, LoaderIcon } from "lucide-react"
import { markNotificationsRead } from "@/server/actions/portal"

export function MarkAllRead({ disabled }: { disabled: boolean }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() => start(async () => void (await markNotificationsRead()))}
      className="inline-flex h-11 items-center gap-2 rounded-sm border border-border px-4 text-sm font-medium hover:border-foreground/40 disabled:opacity-50"
    >
      {pending ? <LoaderIcon className="size-4 animate-spin" /> : <CheckCheckIcon className="size-4" />} Mark all read
    </button>
  )
}
