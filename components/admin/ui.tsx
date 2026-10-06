import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export const panel = "rounded-lg border border-border bg-card"

export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string
  icon?: React.ElementType
  action?: { href: string; label: string } | React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn(panel, "min-w-0", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="flex items-center gap-2.5 font-display text-lg font-extrabold uppercase">
          {Icon ? <Icon className="size-4 text-brand-ink" aria-hidden /> : null}
          {title}
        </h2>
        {action && typeof action === "object" && "href" in (action as object) ? (
          <Link href={(action as { href: string }).href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {(action as { label: string }).label} <ArrowRightIcon className="size-3.5" />
          </Link>
        ) : (
          (action as React.ReactNode)
        )}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export function StatCard({
  label,
  value,
  detail,
  href,
  icon: Icon,
  tone = "neutral",
}: {
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
  href?: string
  icon: React.ElementType
  tone?: "neutral" | "brand" | "warning" | "danger" | "success"
}) {
  const tones = {
    neutral: "bg-foreground/[0.06] text-foreground",
    brand: "bg-brand/10 text-brand-ink",
    warning: "bg-signal/20 text-signal-foreground dark:text-signal",
    danger: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  }
  const body = (
    <>
      <span className={cn("grid size-10 place-items-center rounded-md", tones[tone])}>
        <Icon className="size-5" />
      </span>
      <span className="mt-4 block font-display text-4xl leading-none font-black">{value}</span>
      <span className="mt-2 block text-sm font-semibold">{label}</span>
      {detail ? <span className="block truncate text-xs text-muted-foreground">{detail}</span> : null}
    </>
  )
  return href ? (
    <Link href={href} className={cn(panel, "block p-5 transition-all hover:-translate-y-0.5 hover:shadow-md")}>
      {body}
    </Link>
  ) : (
    <div className={cn(panel, "p-5")}>{body}</div>
  )
}

/** URL-driven segmented tabs (server-rendered links). */
export function FilterTabs({ tabs, active }: { tabs: { href: string; label: string; count?: number; key: string }[]; active: string }) {
  return (
    <nav aria-label="Filter" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 no-scrollbar">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
            t.key === active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
          )}
        >
          {t.label}
          {t.count !== undefined ? <span className="font-mono text-[10px] opacity-70">{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  )
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th scope="col" className={cn("px-4 py-3 text-left font-mono text-[10px] font-normal tracking-[0.18em] text-muted-foreground uppercase", className)}>{children}</th>
}
export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>
}

export function SearchBox({ action, defaultValue, placeholder, hidden }: { action: string; defaultValue?: string; placeholder: string; hidden?: Record<string, string | undefined> }) {
  return (
    <form action={action} method="get" className="relative w-full sm:w-72">
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20"
      />
    </form>
  )
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

export const btn = {
  primary: "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-50",
  dark: "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50",
  outline: "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:border-foreground/40 disabled:opacity-50",
  ghost: "inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50",
  danger: "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50",
}
