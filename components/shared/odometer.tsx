"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

/**
 * Mechanical odometer: each digit is a vertical 0–9 strip that rolls into
 * place when scrolled into view. Screen readers get the plain number.
 */
export function Odometer({
  value,
  suffix,
  className,
  digitClassName,
}: {
  value: number
  suffix?: string
  className?: string
  digitClassName?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-10% 0px" })
  const reduce = useReducedMotion()
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (inView) {
      const id = requestAnimationFrame(() => setArmed(true))
      return () => cancelAnimationFrame(id)
    }
  }, [inView])

  const digits = String(value).split("")
  const show = armed || reduce

  return (
    <span ref={ref} className={cn("inline-flex items-baseline tabular-nums", className)}>
      <span className="sr-only">
        {value}
        {suffix}
      </span>
      <span aria-hidden className="inline-flex overflow-hidden">
        {digits.map((d, i) => (
          <span key={i} className={cn("relative inline-block h-[1em] overflow-hidden leading-none", digitClassName)}>
            {/* invisible final digit sets the cell width so narrow glyphs (1) don't leave gaps */}
            <span className="invisible">{d}</span>
            <span
              className="absolute inset-x-0 top-0 flex flex-col items-center transition-transform duration-[1400ms] ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{
                transform: `translateY(-${show ? Number(d) : 0}em)`,
                transitionDelay: `${(digits.length - i) * 90}ms`,
              }}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span key={n} className="h-[1em] leading-none">
                  {n}
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
      {suffix ? (
        <span aria-hidden className="leading-none">
          {suffix}
        </span>
      ) : null}
    </span>
  )
}
