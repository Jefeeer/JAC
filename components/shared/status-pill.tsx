import { cn } from "@/lib/utils"
import { toneClass, type Tone } from "@/lib/status"

export function StatusPill({ label, tone, className, pulse }: { label: string; tone: Tone; className?: string; pulse?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium tracking-wider whitespace-nowrap uppercase",
        toneClass[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full bg-current", pulse && "animate-blink")} aria-hidden />
      {label}
    </span>
  )
}
