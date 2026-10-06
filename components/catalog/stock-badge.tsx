import { cn } from "@/lib/utils"
import type { StockStatus } from "@/types/domain"

const styles: Record<StockStatus, { dot: string; chip: string; label: string }> = {
  in_stock: { dot: "bg-success", chip: "border-success/35 text-success", label: "In stock" },
  low_stock: { dot: "bg-signal", chip: "border-signal/60 text-signal-foreground dark:text-signal", label: "Low stock" },
  out_of_stock: { dot: "bg-muted-foreground", chip: "border-border text-muted-foreground", label: "Out of stock" },
}

export function StockBadge({
  status,
  qty,
  leadTimeDays,
  showQty = false,
  className,
}: {
  status: StockStatus
  qty?: number
  leadTimeDays?: number | null
  showQty?: boolean
  className?: string
}) {
  const s = styles[status]
  const detail =
    status === "low_stock" && showQty && qty !== undefined
      ? ` · ${qty} left`
      : status === "out_of_stock" && leadTimeDays
        ? ` · ~${leadTimeDays} days`
        : status === "in_stock" && showQty && qty !== undefined
          ? ` · ${qty}+`
          : ""
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium tracking-wider whitespace-nowrap uppercase",
        s.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot, status === "in_stock" && "animate-blink")} aria-hidden />
      {status === "out_of_stock" && leadTimeDays ? "Order in" : s.label}
      {detail}
    </span>
  )
}
