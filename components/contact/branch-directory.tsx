"use client"

import { useEffect, useState } from "react"
import { CalendarPlusIcon, MapPinIcon, NavigationIcon, PhoneIcon, SmartphoneIcon } from "lucide-react"
import Link from "next/link"
import { branchStatus, branches, mapsUrl, type Branch } from "@/lib/config/branches"
import { contactLinks } from "@/lib/config/site"
import { cn } from "@/lib/utils"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function to12h(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`
}

function HoursTable({ branch }: { branch: Branch }) {
  // Group consecutive days with identical hours: Mon–Sat 8 AM – 5 PM, Sun closed
  const order = [1, 2, 3, 4, 5, 6, 0]
  const rows: { from: number; to: number; label: string }[] = []
  for (const d of order) {
    const h = branch.hours[d]
    const label = h ? `${to12h(h.open)} – ${to12h(h.close)}` : "Closed"
    const last = rows.at(-1)
    if (last && last.label === label) last.to = d
    else rows.push({ from: d, to: d, label })
  }
  return (
    <dl className="grid gap-1 font-mono text-xs">
      {rows.map((r) => (
        <div key={r.from} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{r.from === r.to ? DAYS[r.from] : `${DAYS[r.from]}–${DAYS[r.to]}`}</dt>
          <dd>{r.label}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Branch list + live map. Selecting a branch (or arriving via #slug) swaps the embedded map. */
export function BranchDirectory() {
  const [selected, setSelected] = useState(branches[0].slug)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const fromHash = () => {
      const slug = window.location.hash.slice(1)
      if (branches.some((b) => b.slug === slug)) setSelected(slug)
    }
    fromHash()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- current time is client-only (avoids hydration mismatch)
    setNow(new Date())
    window.addEventListener("hashchange", fromHash)
    return () => window.removeEventListener("hashchange", fromHash)
  }, [])

  const branch = branches.find((b) => b.slug === selected) ?? branches[0]
  const embed = `https://maps.google.com/maps?q=${encodeURIComponent(branch.mapQuery)}&z=15&output=embed`

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
      <ul className="grid gap-3">
        {branches.map((b) => {
          const status = now ? branchStatus(b, now) : null
          const active = b.slug === selected
          return (
            <li key={b.slug} id={b.slug} className="scroll-mt-28">
              <article
                className={cn(
                  "rounded-sm border bg-card p-5 transition-colors",
                  active ? "border-brand ring-1 ring-brand" : "border-border hover:border-foreground/30",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelected(b.slug)
                    history.replaceState(null, "", `#${b.slug}`)
                  }}
                  aria-pressed={active}
                  className="flex w-full items-start justify-between gap-4 text-left"
                >
                  <span>
                    <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-brand-ink">
                      {b.code}
                      {b.isHeadOffice ? <span className="rounded-[2px] bg-brand px-1 text-[9px] text-white">HQ</span> : null}
                    </span>
                    <span className="mt-1 block font-display text-3xl leading-none font-extrabold uppercase">{b.name}</span>
                    <span className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      {b.address}, {b.city}, {b.province}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase",
                      status?.open ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", status?.open ? "animate-blink bg-success" : "bg-muted-foreground")} aria-hidden />
                    {status ? (status.open ? "Open" : "Closed") : "—"}
                  </span>
                </button>

                <div className="mt-4 grid gap-4 border-t border-dashed border-border pt-4 sm:grid-cols-2">
                  <div className="grid content-start gap-2 text-sm">
                    {b.phone ? (
                      <a href={contactLinks.tel(b.phone)} className="inline-flex items-center gap-2 font-mono hover:text-brand-ink">
                        <PhoneIcon className="size-3.5" /> {b.phoneDisplay}
                      </a>
                    ) : null}
                    {b.mobile ? (
                      <a href={contactLinks.tel(b.mobile)} className="inline-flex items-center gap-2 font-mono hover:text-brand-ink">
                        <SmartphoneIcon className="size-3.5" /> {b.mobileDisplay}
                      </a>
                    ) : null}
                    <a href={mapsUrl(b)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-brand-ink">
                      <NavigationIcon className="size-3.5" /> Directions
                    </a>
                    <Link href={`/book-service?branch=${b.slug}`} className="inline-flex items-center gap-2 hover:text-brand-ink">
                      <CalendarPlusIcon className="size-3.5" /> Book service here
                    </Link>
                  </div>
                  <HoursTable branch={b} />
                </div>
              </article>
            </li>
          )
        })}
      </ul>

      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="overflow-hidden rounded-sm border border-border bg-muted">
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 font-mono text-[11px] tracking-[0.18em] uppercase">
            <span>
              {branch.code} · JAC Motors {branch.name}
            </span>
            <a href={mapsUrl(branch)} target="_blank" rel="noopener noreferrer" className="text-brand-ink hover:underline">
              Open in Maps ↗
            </a>
          </div>
          <iframe
            key={branch.slug}
            title={`Map of JAC Motors ${branch.name}`}
            src={embed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="aspect-[4/3.4] w-full border-0 grayscale-[0.4] dark:invert-[0.9] dark:hue-rotate-180"
          />
        </div>
        <p className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Hours shown are subject to holiday schedules.</p>
      </div>
    </div>
  )
}
