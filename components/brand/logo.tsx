import { cn } from "@/lib/utils"

/**
 * JAC wordmark drawn as pure SVG paths (no font dependency) so it renders
 * identically in the header, footer, favicon, OG images, PDFs and emails.
 * viewBox is 330×80; keep the 4.125:1 ratio when sizing.
 */
export const JAC_WORDMARK_PATHS = [
  // J
  "M72 0H100V50C100 69 88 80 68 80H32C11 80 0 69 0 52V42H28V48C28 53 31 56 36 56H64C69 56 72 53 72 48Z",
  // A — lambda body
  "M108 80L151 0H179L222 80H192L165 29L138 80Z",
  // A — forward-cut crossbar
  "M155 64H186L178 48H163Z",
  // C
  "M330 0H268C245 0 230 14 230 36V44C230 66 245 80 268 80H330V56H272C263 56 258 51 258 44V36C258 29 263 24 272 24H330Z",
] as const

export function JacMark({
  className,
  title = "JAC",
}: {
  className?: string
  title?: string | null
}) {
  return (
    <svg
      viewBox="0 0 330 80"
      fill="currentColor"
      className={cn("h-6 w-auto text-brand", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title ?? undefined}
    >
      {JAC_WORDMARK_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

/**
 * Full lockup: JAC mark + MOTORS.
 * - `horizontal`: header / compact contexts
 * - `stacked`: footer, PDFs, splash
 */
export function Logo({
  variant = "horizontal",
  className,
  showRegion = false,
}: {
  variant?: "horizontal" | "stacked"
  className?: string
  showRegion?: boolean
}) {
  if (variant === "stacked") {
    return (
      <span
        className={cn("inline-flex flex-col items-center gap-[0.18em] leading-none", className)}
        aria-label="JAC Motors"
        role="img"
      >
        <JacMark title={null} className="h-[1em] w-auto" />
        <span
          aria-hidden
          className="font-sans text-[0.36em] font-medium tracking-[0.42em] text-current [margin-right:-0.42em]"
        >
          MOTORS
        </span>
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5 leading-none", className)} aria-label="JAC Motors" role="img">
      <JacMark title={null} className="h-[22px] w-auto" />
      <span aria-hidden className="h-6 w-px bg-current opacity-25" />
      <span aria-hidden className="flex flex-col gap-1">
        <span className="font-wide text-[11px] font-bold tracking-[0.28em]">MOTORS</span>
        {showRegion ? (
          <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground">PHILIPPINES</span>
        ) : null}
      </span>
    </span>
  )
}
