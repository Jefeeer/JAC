import { SectionHeading } from "@/components/shared/section-heading"
import { testimonials } from "@/lib/data/testimonials"
import { cn } from "@/lib/utils"

/** Customer stories printed as waybill tickets with a RELEASED stamp. */
export function Testimonials() {
  return (
    <section className="py-20 sm:py-28" aria-labelledby="stories-title">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <SectionHeading
          bay="05"
          label="Word on the road"
          title={<span id="stories-title">Fleets that keep moving.</span>}
        />

        <ul className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <li
              key={t.quote}
              className={cn(
                "perforated relative flex flex-col bg-card px-7 pt-8 pb-6 shadow-sm ring-1 ring-border",
                i === 1 && "md:translate-y-8",
              )}
            >
              <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                <span>Waybill · {String(i + 1).padStart(4, "0")}</span>
                <span>{t.service}</span>
              </div>

              <blockquote className="mt-6 flex-1">
                <p className="font-display text-2xl leading-[1.15] font-semibold">
                  <span className="text-brand">“</span>
                  {t.quote}
                  <span className="text-brand">”</span>
                </p>
              </blockquote>

              <div className="mt-8 border-t border-dashed border-border pt-4">
                <p className="text-sm font-semibold">
                  {t.role}, {t.business}
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {t.location} · {t.units}
                </p>
              </div>

              <span
                aria-hidden
                className="absolute right-6 bottom-7 rotate-[-10deg] rounded-[3px] border-2 border-brand px-2 py-0.5 font-wide text-[11px] font-black tracking-[0.2em] text-brand-ink uppercase"
              >
                Released
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
