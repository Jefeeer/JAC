import { ArrowUpRightIcon, ClipboardListIcon, CogIcon, ShieldCheckIcon, TruckIcon, UserRoundIcon, WrenchIcon } from "lucide-react"
import { DEMO_ACCOUNTS, type DemoAccount } from "@/lib/demo/accounts"
import { cn } from "@/lib/utils"
import { demoSignIn } from "@/server/actions/demo"

const roleIcon: Record<string, React.ElementType> = {
  admin: ShieldCheckIcon,
  service_advisor: ClipboardListIcon,
  mechanic: WrenchIcon,
  sales: TruckIcon,
  parts: CogIcon,
  customer: UserRoundIcon,
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")

function CustomerCard({ a, next }: { a: DemoAccount; next: string }) {
  return (
    <form action={demoSignIn.bind(null, a.id, next)} className="min-w-0">
      <button
        type="submit"
        className="group relative flex h-full w-full flex-col overflow-hidden rounded-md border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10"
      >
        <span className="absolute inset-x-0 top-0 h-1 bg-brand opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        <span className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand font-display text-lg font-black text-white">{initials(a.fullName)}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{a.fullName}</span>
            <span className="block font-mono text-[10px] tracking-[0.16em] text-brand-ink uppercase">{a.title}</span>
          </span>
          <ArrowUpRightIcon className="ml-auto size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-ink" />
        </span>
        <span className="mt-3 text-sm leading-snug text-muted-foreground">{a.blurb}</span>
      </button>
    </form>
  )
}

function StaffCard({ a, next }: { a: DemoAccount; next: string }) {
  const Icon = roleIcon[a.role] ?? UserRoundIcon
  return (
    <form action={demoSignIn.bind(null, a.id, next)} className="min-w-0">
      <button
        type="submit"
        title={a.blurb}
        className="group flex w-full items-center gap-3 rounded-md border border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-foreground/40 hover:bg-muted/40"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-asphalt text-concrete">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{a.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{a.fullName}</span>
        </span>
        <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
      </button>
    </form>
  )
}

/** One-click demo personas (rendered only in DEMO MODE). */
export function DemoAccounts({ next, className }: { next: string; className?: string }) {
  const customers = DEMO_ACCOUNTS.filter((a) => a.role === "customer")
  const staff = DEMO_ACCOUNTS.filter((a) => a.role !== "customer")
  return (
    <section aria-labelledby="demo-accounts" className={cn("grid gap-6", className)}>
      <div>
        <h2 id="demo-accounts" className="font-mono text-[11px] font-normal tracking-[0.2em] text-muted-foreground uppercase">
          Customer portal
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {customers.map((a) => (
            <CustomerCard key={a.id} a={a} next={next} />
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-mono text-[11px] font-normal tracking-[0.2em] text-muted-foreground uppercase">Staff · admin panel</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {staff.map((a) => (
            <StaffCard key={a.id} a={a} next={next} />
          ))}
        </div>
      </div>
      <p className="flex items-start gap-2 rounded-md bg-signal/15 px-3.5 py-2.5 text-xs leading-relaxed">
        <span className="mt-0.5 rounded-[2px] bg-signal px-1.5 font-mono text-[9px] font-bold tracking-wider text-signal-foreground">DEMO</span>
        Sample data only — no email needed. Anything you change resets when the server restarts.
      </p>
    </section>
  )
}
