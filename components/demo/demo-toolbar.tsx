"use client"

import { useTransition } from "react"
import { FastForwardIcon, FlaskConicalIcon, LoaderIcon, RotateCcwIcon, UsersIcon } from "lucide-react"
import { demoAdvanceJob, demoReset, demoSignOut } from "@/server/actions/demo"

/** Strip shown to DEMO MODE sessions: advance the live job, reset data, switch persona. */
export function DemoToolbar({ name, role }: { name: string; role: string }) {
  const [pending, start] = useTransition()
  const btn = "inline-flex h-7 items-center gap-1.5 rounded-sm border border-signal-foreground/20 px-2.5 hover:bg-signal-foreground/10 disabled:opacity-50"
  return (
    <div className="border-b border-signal/60 bg-signal text-signal-foreground">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-1.5 text-xs sm:px-6">
        <span className="inline-flex items-center gap-1.5 font-mono font-bold tracking-[0.18em] uppercase">
          <FlaskConicalIcon className="size-3.5" /> Demo mode
        </span>
        <span className="hidden sm:inline">
          Signed in as <strong>{name}</strong> ({role.replace("_", " ")}) · sample data, resets on restart
        </span>
        <span className="ml-auto flex flex-wrap gap-1.5">
          {pending ? <LoaderIcon className="size-4 animate-spin self-center" /> : null}
          <button type="button" disabled={pending} onClick={() => start(() => demoAdvanceJob())} className={btn} title="Move the live job to its next stage now">
            <FastForwardIcon className="size-3.5" /> Advance live job
          </button>
          <button type="button" disabled={pending} onClick={() => start(() => demoReset())} className={btn}>
            <RotateCcwIcon className="size-3.5" /> Reset data
          </button>
          <button type="button" disabled={pending} onClick={() => start(() => demoSignOut())} className={btn}>
            <UsersIcon className="size-3.5" /> Switch account
          </button>
        </span>
      </div>
    </div>
  )
}
