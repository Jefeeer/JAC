"use client"

import { useTransition } from "react"
import { FastForwardIcon, FlaskConicalIcon, LoaderIcon, RotateCcwIcon, UsersIcon } from "lucide-react"
import { useConfirm } from "@/components/shared/confirm"
import { demoAdvanceJob, demoReset, demoSignOut } from "@/server/actions/demo"

/** Strip shown to DEMO MODE sessions: advance the live job, reset data, switch persona. */
export function DemoToolbar({ name, role }: { name: string; role: string }) {
  const [pending, start] = useTransition()
  const confirm = useConfirm()
  const ask = (o: Parameters<typeof confirm>[0], fn: () => Promise<unknown>) => async () => {
    if (await confirm(o)) start(async () => void (await fn()))
  }
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
          <button type="button" disabled={pending} onClick={ask({ title: "Advance the live job?", description: "Moves the demo live job to its next workshop stage and notifies the customer.", confirmLabel: "Advance", icon: "send" }, demoAdvanceJob)} className={btn} title="Move the live job to its next stage now">
            <FastForwardIcon className="size-3.5" /> Advance live job
          </button>
          <button type="button" disabled={pending} onClick={ask({ title: "Reset demo data?", description: "Every change made in this demo (bookings, quotes, jobs, edits) is discarded and the sample data is restored.", confirmLabel: "Reset data", tone: "danger" }, demoReset)} className={btn}>
            <RotateCcwIcon className="size-3.5" /> Reset data
          </button>
          <button type="button" disabled={pending} onClick={ask({ title: "Switch account?", description: `You'll be signed out as ${name} and taken back to the demo accounts.`, confirmLabel: "Switch account", icon: "logout" }, demoSignOut)} className={btn}>
            <UsersIcon className="size-3.5" /> Switch account
          </button>
        </span>
      </div>
    </div>
  )
}
