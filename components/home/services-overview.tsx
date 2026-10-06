"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react"
import { ArrowRightIcon } from "lucide-react"
import { SectionHeading } from "@/components/shared/section-heading"

const items = [
  {
    no: "01",
    title: "Preventive maintenance",
    body: "10k / 20k / 40k km PMS with genuine filters and a printed health report.",
    href: "/services#preventive-maintenance",
    image: "/images/workshop-undercarriage.webp",
    alt: "Technician working under a truck",
    tag: "From 2.5 hrs",
  },
  {
    no: "02",
    title: "Diagnostics & troubleshooting",
    body: "Dealer-level ECU scan, live data and a written diagnosis before any wrench turns.",
    href: "/services#diagnostics",
    image: "/images/jac-cab-chassis-yard.webp",
    alt: "JAC truck in a service yard",
    tag: "Same-day",
  },
  {
    no: "03",
    title: "Repairs",
    body: "Brakes, clutch, suspension, electrical — fixed with parts from our own counter.",
    href: "/services#repair",
    image: "/images/workshop-suspension.webp",
    alt: "Mechanic repairing front suspension",
    tag: "Genuine parts",
  },
  {
    no: "04",
    title: "Engine & transmission overhaul",
    body: "Teardown, machining and rebuild with a JAC Motors workshop warranty.",
    href: "/services#overhaul",
    image: "/images/parts-shelves.webp",
    alt: "Shelves stocked with spare parts",
    tag: "Warrantied",
  },
  {
    no: "05",
    title: "Fleet maintenance packages",
    body: "Locked PMS rates, priority bays and pickup & delivery for 3+ units.",
    href: "/services#package",
    image: "/images/fleet-yard.webp",
    alt: "Row of trucks parked in a fleet yard",
    tag: "Fleet accounts",
  },
]

export function ServicesOverview() {
  const listRef = useRef<HTMLOListElement>(null)
  const [active, setActive] = useState<number | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 300, damping: 30, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 300, damping: 30, mass: 0.6 })

  const track = (e: React.PointerEvent, jump = false) => {
    const rect = listRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    x.set(px)
    y.set(py)
    // first entry: snap the preview to the pointer instead of flying in from (0,0)
    if (jump) {
      sx.jump(px)
      sy.jump(py)
    }
  }

  return (
    <section className="py-20 sm:py-28" aria-labelledby="services-title">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <SectionHeading
          bay="03"
          label="Service bay"
          title={<span id="services-title">We fix what keeps you earning.</span>}
          description="Factory-trained technicians, dealer diagnostic tools and parts on the shelf — so a breakdown costs you a day, not a week."
          action={{ href: "/book-service", label: "Book a slot" }}
        />

        <ol ref={listRef} className="relative mt-14 border-t border-border" onPointerMove={(e) => track(e)} onPointerLeave={() => setActive(null)}>
          {items.map((item, i) => (
            <li key={item.no} className="border-b border-border">
              <Link
                href={item.href}
                onPointerEnter={(e) => {
                  track(e, active === null)
                  setActive(i)
                }}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-6 sm:grid-cols-[4rem_1.2fr_1fr_auto] sm:gap-8 sm:py-8"
              >
                <span className="font-mono text-sm text-muted-foreground transition-colors group-hover:text-brand-ink">{item.no}</span>
                <span className="font-display text-3xl leading-none font-extrabold uppercase transition-transform duration-300 group-hover:translate-x-2 sm:text-5xl">
                  {item.title}
                </span>
                <span className="col-span-2 col-start-2 row-start-2 text-sm leading-relaxed text-muted-foreground sm:col-span-1 sm:col-start-auto sm:row-start-auto sm:text-base">
                  {item.body}
                </span>
                <span className="col-start-3 row-start-1 flex items-center gap-3 sm:col-start-auto sm:row-start-auto">
                  <span className="hidden rounded-[2px] border border-border px-2 py-1 font-mono text-[10px] tracking-widest uppercase xl:inline">
                    {item.tag}
                  </span>
                  <span className="grid size-10 place-items-center rounded-full border border-border transition-all group-hover:border-brand group-hover:bg-brand group-hover:text-white">
                    <ArrowRightIcon className="size-4" />
                  </span>
                </span>
              </Link>
            </li>
          ))}

          {/* Cursor-following preview (pointer devices only) */}
          <AnimatePresence>
            {active !== null ? (
              <motion.div
                key="preview"
                aria-hidden
                className="pointer-events-none absolute top-0 left-0 z-10 hidden h-56 w-80 overflow-hidden rounded-sm shadow-2xl ring-1 ring-black/10 [@media(hover:hover)]:block"
                style={{ x: sx, y: sy, translateX: "-50%", translateY: "-115%" }}
                initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.25 }}
              >
                {items.map((item, i) => (
                  <Image
                    key={item.image}
                    src={item.image}
                    alt=""
                    fill
                    sizes="320px"
                    className="object-cover transition-opacity duration-300"
                    style={{ opacity: active === i ? 1 : 0 }}
                  />
                ))}
                <span className="absolute bottom-2 left-2 rounded-[2px] bg-black/70 px-2 py-1 font-mono text-[10px] tracking-widest text-white uppercase">
                  {items[active].tag}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </ol>
      </div>
    </section>
  )
}
