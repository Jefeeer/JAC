import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"
import { SectionHeading } from "@/components/shared/section-heading"
import { BODY_TYPE_LABELS, type BodyType } from "@/types/domain"

type LineupItem = { model: string; series: string | null; bodyType: BodyType; payloadTons: number; slug: string }

const MAX_T = 25
// sqrt scale so a 1-tonne pickup and a 25-tonne 8x4 both read clearly
const pct = (t: number) => Math.max(4, Math.sqrt(t / MAX_T) * 100)

/**
 * "Weighbridge" — the JAC lineup plotted by payload. Doubles as the
 * brands/models-carried block (JAC is the only brand we sell).
 */
export function LineupScale({ items }: { items: LineupItem[] }) {
  const marks = [1, 3, 5, 10, 15, 25]

  return (
    <section className="dark relative overflow-hidden bg-asphalt py-20 text-concrete sm:py-28" aria-labelledby="lineup-title">
      <div className="grid-lines absolute inset-0 text-white opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6">
        <SectionHeading
          bay="02"
          label="The JAC lineup"
          title={
            <span id="lineup-title">
              Pick your <span className="text-outline text-concrete">payload.</span>
            </span>
          }
          description="One brand, done properly. From the 1-tonne T8 Pro to the 25-tonne Gallop K5 — every JAC we sell is supported by our parts counters and service bays."
          action={{ href: "/trucks", label: "Compare all models" }}
        />

        <div className="mt-14 rounded-sm border border-white/10 bg-black/30 backdrop-blur-sm">
          {/* Scale header */}
          <div className="relative hidden h-10 border-b border-white/10 sm:mr-[8.5rem] sm:ml-[13.5rem] sm:block" aria-hidden>
            {marks.map((m) => (
              <span key={m} className="absolute bottom-0 -translate-x-1/2 pb-2 font-mono text-[10px] text-concrete/50" style={{ left: `${pct(m)}%` }}>
                {m}T
                <span className="absolute -bottom-px left-1/2 h-2 w-px bg-concrete/40" />
              </span>
            ))}
          </div>

          <ol className="divide-y divide-white/5">
            {items.map((item, i) => (
              <li key={item.model}>
                <Link
                  href={`/trucks?model=${encodeURIComponent(item.model)}`}
                  className="group grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-4 px-4 py-4 transition-colors hover:bg-white/[0.04] sm:grid-cols-[11rem_1fr_6rem] sm:px-6"
                >
                  <span>
                    <span className="block font-display text-2xl leading-none font-extrabold uppercase group-hover:text-brand-ink sm:text-3xl">
                      {item.model}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[10px] tracking-wider text-concrete/50 uppercase">
                      {BODY_TYPE_LABELS[item.bodyType]}
                    </span>
                  </span>
                  <span className="relative h-3 overflow-hidden rounded-[1px] bg-white/[0.06]" aria-hidden>
                    <span
                      className="absolute inset-y-0 left-0 origin-left bg-brand transition-[filter] group-hover:brightness-125 motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:fade-in motion-safe:duration-1000"
                      style={{ width: `${pct(item.payloadTons)}%`, animationDelay: `${i * 80}ms` }}
                    />
                    <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_9px,rgb(0_0_0/0.35)_9px_10px)]" />
                  </span>
                  <span className="flex items-center justify-end gap-2 font-mono text-sm tabular-nums">
                    {item.payloadTons} T
                    <ArrowUpRightIcon className="hidden size-4 opacity-0 transition-opacity group-hover:opacity-100 sm:block" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-4 font-mono text-[10px] tracking-[0.18em] text-concrete/65 uppercase">
          Rated payload, top variant per model · Scale is square-root for legibility
        </p>
      </div>
    </section>
  )
}
