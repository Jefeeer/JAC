import { Odometer } from "@/components/shared/odometer"
import { siteConfig } from "@/lib/config/site"
import { cn } from "@/lib/utils"

/** Instrument-cluster style trust band directly under the hero. */
export function StatsCluster() {
  return (
    <section aria-label="JAC Motors at a glance" className="border-b border-border bg-surface">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {siteConfig.stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                "relative flex flex-col gap-3 py-8 pr-4 sm:py-10",
                i % 2 === 1 && "border-l border-border pl-4 sm:pl-8",
                i >= 2 && "border-t border-border lg:border-t-0",
                i === 2 && "lg:border-l lg:pl-8",
              )}
            >
              <span className="ticks absolute inset-x-0 top-0 h-3 text-muted-foreground/60" aria-hidden />
              <dt className="order-2 font-mono text-[11px] tracking-[0.2em] uppercase">
                {stat.label}
                <span className="mt-1 block font-sans text-xs tracking-normal text-muted-foreground normal-case">{stat.detail}</span>
              </dt>
              <dd className="order-1 font-display text-6xl font-black sm:text-7xl">
                <Odometer value={stat.value} suffix={stat.suffix} digitClassName="text-foreground" />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
