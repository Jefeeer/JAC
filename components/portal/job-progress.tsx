import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { JOB_STATUS_FLOW, type JobStatus } from "@/types/domain"

/** Six-stage job rail. `compact` drops labels below the dots (for cards). */
export function JobProgress({ status, compact = false, timestamps }: { status: JobStatus; compact?: boolean; timestamps?: Partial<Record<JobStatus, string>> }) {
  const current = JOB_STATUS_FLOW.findIndex((s) => s.status === status)
  const cancelled = status === "cancelled"

  return (
    <div className={cn("relative", cancelled && "opacity-50")} aria-label={`Job status: ${status.replace("_", " ")}`}>
      <div className="absolute top-[11px] right-[8%] left-[8%] h-[3px] bg-border" aria-hidden />
      <div
        className="absolute top-[11px] left-[8%] h-[3px] bg-brand transition-[width] duration-700"
        style={{ width: `${(Math.max(current, 0) / (JOB_STATUS_FLOW.length - 1)) * 84}%` }}
        aria-hidden
      />
      <ol className="relative grid grid-cols-6">
        {JOB_STATUS_FLOW.map((s, i) => {
          const done = i < current
          const now = i === current
          return (
            <li key={s.status} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border-2 font-mono text-[8px] font-bold",
                  done && "border-brand bg-brand text-white",
                  now && "border-brand bg-background text-brand-ink ring-4 ring-brand/20",
                  !done && !now && "border-border bg-background text-muted-foreground",
                )}
              >
                {done ? <CheckIcon className="size-3" /> : s.short}
              </span>
              {!compact ? (
                <span className={cn("text-[11px] leading-tight", now ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {s.label}
                  {timestamps?.[s.status] ? <span className="mt-0.5 block font-mono text-[9px] text-muted-foreground">{timestamps[s.status]}</span> : null}
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
