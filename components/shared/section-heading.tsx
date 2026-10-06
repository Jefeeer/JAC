import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Section header styled like a workshop bay marker:
 *   BAY 02 ─┼┼┼┼┼┼┼┼┼  FLEET
 *   Big condensed title
 */
export function SectionHeading({
  bay,
  label,
  title,
  description,
  action,
  className,
  align = "left",
}: {
  bay: string
  label: string
  title: React.ReactNode
  description?: React.ReactNode
  action?: { href: string; label: string }
  className?: string
  align?: "left" | "center"
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        align === "center" && "items-center text-center md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("max-w-3xl", align === "center" && "mx-auto")}>
        <div className={cn("flex items-center gap-3 font-mono text-[11px] tracking-[0.22em] uppercase", align === "center" && "justify-center")}>
          <span className="rounded-[2px] bg-brand px-1.5 py-0.5 font-semibold text-white">Bay {bay}</span>
          <span className="ticks h-3 w-16 text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">{label}</span>
        </div>
        <h2 className="mt-4 text-5xl leading-[0.88] font-extrabold uppercase sm:text-6xl lg:text-7xl">{title}</h2>
        {description ? <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-3 self-start border-b-2 border-foreground pb-1 font-wide text-xs font-bold tracking-[0.14em] uppercase transition-colors hover:border-brand hover:text-brand-ink md:self-auto"
        >
          {action.label}
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      ) : null}
    </div>
  )
}
