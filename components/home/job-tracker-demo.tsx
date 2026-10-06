"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { CheckIcon } from "lucide-react"
import { SectionHeading } from "@/components/shared/section-heading"
import { cn } from "@/lib/utils"
import { JOB_STATUS_FLOW } from "@/types/domain"

const notes = [
  "Unit checked in at North EDSA bay 3. Odometer 50,210 km.",
  "ECU scan clean. Rear brake shoes worn to 1.2 mm — quote sent to your portal.",
  "Brake shoe set reserved from our parts counter. ETA 11:30.",
  "Technician T-07 working on rear axle. Drums within spec.",
  "Road test passed. Ready for pickup — bring your claim stub.",
  "Released 16:42. Next PMS due at 60,210 km. Drive safe!",
]

/**
 * Looping demo of the customer portal's live job tracker. The real one is
 * driven by Supabase Realtime on job_orders / job_order_events.
 */
export function JobTrackerDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: "-20% 0px" })
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!inView || reduce) return
    const id = setInterval(() => setStep((s) => (s + 1) % JOB_STATUS_FLOW.length), 2400)
    return () => clearInterval(id)
  }, [inView, reduce])

  const current = reduce ? JOB_STATUS_FLOW.length - 2 : step

  return (
    <section className="border-y border-border bg-surface py-20 sm:py-28" aria-labelledby="tracker-title">
      <div className="mx-auto grid max-w-[1440px] gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <SectionHeading
            bay="04"
            label="After-sales"
            title={<span id="tracker-title">Track your truck like a parcel.</span>}
            description="Every job order gets a live timeline in your customer portal — from check-in to release. No more calling the shop to ask “tapos na ba?”"
            action={{ href: "/account", label: "Open the portal" }}
          />
          <ul className="mt-10 grid gap-3 text-sm sm:grid-cols-2">
            {["Live status via SMS, email & portal", "Photos + diagnosis before work starts", "Approve quotes in one tap", "Service history per unit, forever"].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white">
                  <CheckIcon className="size-3" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Ticket */}
        <div ref={ref} className="relative" aria-live="off">
          <div className="absolute -inset-3 -z-10 rotate-[-1.5deg] rounded-sm bg-brand/10" aria-hidden />
          <div className="overflow-hidden rounded-sm border border-border bg-card shadow-xl shadow-black/5">
            <div className="flex items-center justify-between border-b border-dashed border-border bg-asphalt px-5 py-3 font-mono text-[11px] tracking-widest text-concrete uppercase">
              <span>Job order · JO-2610-00042</span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 animate-blink rounded-full bg-success" /> Live
              </span>
            </div>

            <div className="grid grid-cols-3 gap-px border-b border-border bg-border font-mono text-xs">
              {[
                ["Unit", "JAC N55"],
                ["Plate", "NAD 6513"],
                ["Branch", "North EDSA"],
              ].map(([k, v]) => (
                <div key={k} className="bg-card px-5 py-3">
                  <p className="text-[9px] tracking-[0.2em] text-muted-foreground uppercase">{k}</p>
                  <p className="mt-1 font-medium">{v}</p>
                </div>
              ))}
            </div>

            {/* Progress rail */}
            <div className="px-5 pt-8 pb-6">
              <div className="relative">
                <div className="absolute top-[13px] right-[8%] left-[8%] h-[3px] bg-border" aria-hidden />
                <div
                  className="absolute top-[13px] left-[8%] h-[3px] bg-brand transition-[width] duration-700 ease-out"
                  style={{ width: `${(current / (JOB_STATUS_FLOW.length - 1)) * 84}%` }}
                  aria-hidden
                />
                <ol className="relative grid grid-cols-6">
                  {JOB_STATUS_FLOW.map((s, i) => {
                    const done = i < current
                    const now = i === current
                    return (
                      <li key={s.status} className="flex flex-col items-center gap-2 text-center">
                        <span
                          className={cn(
                            "grid size-7 place-items-center rounded-full border-2 font-mono text-[9px] font-bold transition-all duration-500",
                            done && "border-brand bg-brand text-white",
                            now && "scale-110 border-brand bg-card text-brand-ink ring-4 ring-brand/20",
                            !done && !now && "border-border bg-card text-muted-foreground",
                          )}
                        >
                          {done ? <CheckIcon className="size-3.5" /> : s.short}
                        </span>
                        <span className={cn("text-[10px] leading-tight sm:text-xs", now ? "font-semibold text-foreground" : "text-muted-foreground")}>
                          {s.label}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </div>

              <div className="mt-8 min-h-[4.5rem] rounded-sm border border-border bg-muted/50 p-4">
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  Update · {JOB_STATUS_FLOW[current].label}
                </p>
                <p key={current} className="mt-1.5 text-sm animate-in fade-in slide-in-from-bottom-1 duration-500">
                  {notes[current]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
