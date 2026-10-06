import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon, CogIcon, TruckIcon, WrenchIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const bays = [
  {
    href: "/trucks",
    no: "01",
    title: "Browse trucks",
    sub: "Pickups to 25-tonne haulers",
    icon: TruckIcon,
  },
  {
    href: "/parts",
    no: "02",
    title: "Order parts",
    sub: "Genuine JAC, by part no. or model",
    icon: CogIcon,
  },
  {
    href: "/book-service",
    no: "03",
    title: "Book service",
    sub: "PMS, diagnostics, repairs",
    icon: WrenchIcon,
  },
]

export function Hero() {
  return (
    <section className="dark grain relative isolate overflow-hidden bg-asphalt text-concrete" aria-labelledby="hero-title">
      {/* Photo */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/jac-n55-reefer.webp"
          alt="JAC N55 refrigerated truck on the road"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[72%_35%] opacity-70 lg:object-[80%_40%] lg:opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-asphalt via-asphalt/85 to-asphalt/5 lg:via-asphalt/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-asphalt via-transparent to-asphalt/40" />
        <div className="grid-lines absolute inset-0 text-white opacity-60 [mask-image:linear-gradient(to_right,black,transparent_60%)]" />
      </div>

      {/* Viewfinder on the unit (desktop) */}
      <div className="pointer-events-none absolute top-[14%] right-[6%] hidden h-[46%] w-[30%] xl:block" aria-hidden>
        {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => (
          <span key={c} className={cn("absolute size-6 border-brand", c)} />
        ))}
        <span className="absolute -bottom-7 left-0 font-mono text-[10px] tracking-[0.25em] text-concrete/80 uppercase">
          N55 · Reefer · 3.5 T · Cummins ISF
        </span>
        <span className="absolute -top-6 right-0 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.25em] text-concrete/70 uppercase">
          <span className="size-1.5 animate-blink rounded-full bg-brand" /> In stock
        </span>
      </div>

      <div className="mx-auto flex min-h-[calc(100svh-6rem)] max-w-[1440px] flex-col px-4 sm:px-6">
        <div className="flex flex-1 flex-col justify-center py-12 lg:py-14">
          <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.25em] text-concrete/70 uppercase">
            <span className="h-px w-10 bg-brand" aria-hidden />
            JAC Motors Philippines — Sales · Parts · Service
          </p>

          <h1
            id="hero-title"
            className="mt-6 max-w-[14ch] text-[clamp(3.6rem,10vw,9rem)] leading-[0.82] font-black tracking-[-0.02em] uppercase"
          >
            Built to keep you{" "}
            <span className="relative inline-block text-brand">
              moving.
              <span aria-hidden className="absolute inset-x-0 -bottom-[0.08em] h-[0.07em] overflow-hidden">
                <span className="absolute inset-y-0 left-0 w-[calc(100%+48px)] animate-lane bg-[repeating-linear-gradient(90deg,var(--signal)_0_28px,transparent_28px_48px)] will-change-transform" />
              </span>
            </span>
          </h1>

          <p className="mt-7 max-w-lg text-lg leading-relaxed text-concrete/80">
            New JAC trucks, genuine parts and a service bay that picks up when you call. We&apos;re the partner that keeps your fleet earning —
            long after the sale.
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.18em] text-concrete/60 uppercase">
            <li>◼ Financing &amp; trade-ins</li>
            <li>◼ Fleet accounts</li>
            <li>◼ 7 branches nationwide</li>
          </ul>
        </div>

        {/* Bay-door CTAs */}
        <nav aria-label="Get started" className="-mx-4 grid border-t border-white/10 sm:-mx-6 md:grid-cols-3">
          {bays.map((bay, i) => (
            <Link
              key={bay.href}
              href={bay.href}
              className={cn(
                "shutter group relative flex items-center gap-5 px-4 py-5 transition-colors sm:px-6 md:flex-col md:items-start md:gap-6 md:py-6",
                i > 0 && "border-t border-white/10 md:border-t-0 md:border-l",
                i === 2 && "md:bg-brand/90",
              )}
            >
              <span className="font-mono text-xs text-concrete/50 group-hover:text-white/80">{bay.no}</span>
              <bay.icon className="hidden size-7 text-brand transition-colors group-hover:text-white md:block" aria-hidden />
              <span className="flex flex-1 flex-col md:w-full">
                <span className="flex items-center justify-between">
                  <span className="font-display text-3xl font-extrabold uppercase sm:text-4xl">{bay.title}</span>
                  <ArrowRightIcon className="size-6 -translate-x-2 opacity-60 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </span>
                <span className="mt-1 text-sm text-concrete/60 group-hover:text-white/85">{bay.sub}</span>
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  )
}
