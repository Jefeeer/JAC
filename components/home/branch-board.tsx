"use client"

import { useEffect, useState } from "react"
import { MapPinIcon, PhoneIcon } from "lucide-react"
import { SectionHeading } from "@/components/shared/section-heading"
import { branchStatus, branches, mapsUrl } from "@/lib/config/branches"
import { contactLinks } from "@/lib/config/site"
import { cn } from "@/lib/utils"

/** Departure-board style branch list with live open/closed state (Asia/Manila). */
export function BranchBoard() {
  // Status depends on the current time, so compute after mount to avoid hydration mismatch.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- time-dependent value must be client-only
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="dark bg-asphalt py-20 text-concrete sm:py-28" aria-labelledby="branches-title">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <SectionHeading
          bay="06"
          label="Branch network"
          title={<span id="branches-title">Seven bays. One standard.</span>}
          description="Sales, genuine parts and service under one roof at every branch — from North EDSA to Tacloban."
          action={{ href: "/contact", label: "Hours & directions" }}
        />

        <div className="mt-14 overflow-hidden rounded-sm border border-white/10 bg-black/40">
          <div className="hidden grid-cols-[5rem_1.3fr_1fr_1fr_11rem_3rem] gap-4 border-b border-white/10 px-6 py-3 font-mono text-[10px] tracking-[0.22em] text-concrete/65 uppercase md:grid">
            <span>Code</span>
            <span>Branch</span>
            <span>City</span>
            <span>Phone</span>
            <span>Status</span>
            <span className="sr-only">Map</span>
          </div>
          <ul className="divide-y divide-white/[0.07]">
            {branches.map((b) => {
              const status = now ? branchStatus(b, now) : null
              const phone = b.phone ?? b.mobile
              const phoneDisplay = b.phoneDisplay ?? b.mobileDisplay
              return (
                <li
                  key={b.slug}
                  className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-4 transition-colors hover:bg-white/[0.03] md:grid-cols-[5rem_1.3fr_1fr_1fr_11rem_3rem] md:px-6"
                >
                  <span className="row-span-2 font-mono text-lg font-bold tracking-widest text-signal md:row-span-1">{b.code}</span>
                  <span className="font-display text-2xl leading-none font-bold uppercase">
                    {b.name}
                    {b.isHeadOffice ? (
                      <span className="ml-2 align-middle font-mono text-[9px] tracking-widest text-brand-ink">HQ</span>
                    ) : null}
                  </span>
                  <span className="col-start-2 row-start-2 text-sm text-concrete/60 md:col-start-auto md:row-start-auto md:text-base">
                    {b.city}, {b.province}
                  </span>
                  <span className="hidden md:block">
                    {phone ? (
                      <a href={contactLinks.tel(phone)} className="inline-flex items-center gap-2 font-mono text-sm hover:text-brand-ink">
                        <PhoneIcon className="size-3.5" />
                        {phoneDisplay}
                      </a>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "col-start-3 row-start-1 inline-flex items-center gap-2 justify-self-end font-mono text-[11px] tracking-wider uppercase md:col-start-auto md:row-start-auto md:justify-self-start",
                      status?.open ? "text-success" : "text-concrete/50",
                    )}
                  >
                    <span
                      className={cn("size-2 rounded-full", status === null ? "bg-concrete/20" : status.open ? "animate-blink bg-success" : "bg-concrete/30")}
                      aria-hidden
                    />
                    <span className="md:hidden">{status === null ? "—" : status.open ? "Open" : "Closed"}</span>
                    <span className="hidden md:inline">{status === null ? "—" : status.label}</span>
                  </span>
                  {phone ? (
                    <a
                      href={contactLinks.tel(phone)}
                      className="col-start-3 row-start-2 mr-11 grid size-9 place-items-center justify-self-end rounded-full border border-white/15 transition-colors hover:border-brand hover:bg-brand md:hidden"
                      aria-label={`Call JAC Motors ${b.name}`}
                    >
                      <PhoneIcon className="size-4" />
                    </a>
                  ) : null}
                  <a
                    href={mapsUrl(b)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-start-3 row-start-2 grid size-9 place-items-center justify-self-end rounded-full border border-white/15 transition-colors hover:border-brand hover:bg-brand md:col-start-auto md:row-start-auto"
                    aria-label={`Directions to JAC Motors ${b.name}`}
                  >
                    <MapPinIcon className="size-4" />
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
        <p className="mt-4 font-mono text-[10px] tracking-[0.18em] text-concrete/65 uppercase">
          Status shown in Philippine time · Breakdown line answers 24/7
        </p>
      </div>
    </section>
  )
}
