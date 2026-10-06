"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3Icon,
  BellIcon,
  CalendarCheckIcon,
  ClipboardListIcon,
  CogIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  SettingsIcon,
  TruckIcon,
  UserRoundIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { NavGroup, NavIconKey, NavItem } from "./nav-config"

export const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboardIcon,
  fleet: TruckIcon,
  jobs: WrenchIcon,
  bookings: CalendarCheckIcon,
  quotes: ClipboardListIcon,
  notifications: BellIcon,
  profile: UserRoundIcon,
  trucks: TruckIcon,
  parts: CogIcon,
  customers: UsersIcon,
  invoices: ReceiptIcon,
  reports: BarChart3Icon,
  settings: SettingsIcon,
}

export function isActive(pathname: string, item: Pick<NavItem, "href" | "exact">) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function SidebarNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Sections" className="grid gap-6">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 font-mono text-[10px] tracking-[0.22em] text-concrete/65 uppercase">{g.label}</p>
          <ul className="mt-2 grid gap-0.5">
            {g.items.map((item) => {
              const Icon = NAV_ICONS[item.icon]
              const active = isActive(pathname, item)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                      active ? "bg-white/[0.09] font-semibold text-white" : "text-concrete/65 hover:bg-white/[0.05] hover:text-concrete",
                    )}
                  >
                    {active ? <span className="absolute inset-y-2 -left-3 w-[3px] rounded-r-full bg-brand" aria-hidden /> : null}
                    <Icon className={cn("size-[18px] shrink-0", active ? "text-brand" : "text-concrete/65 group-hover:text-concrete/80")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.count ? (
                      <span
                        className={cn(
                          "grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[10px] font-bold",
                          item.alert ? "bg-brand text-white" : "bg-white/10 text-concrete/80",
                        )}
                      >
                        {item.count > 99 ? "99+" : item.count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/** Current page title for the top bar, derived from the nav config. */
export function TopbarTitle({ groups, fallback }: { groups: NavGroup[]; fallback: string }) {
  const pathname = usePathname()
  const items = groups.flatMap((g) => g.items)
  const match = items.filter((i) => isActive(pathname, i)).sort((a, b) => b.href.length - a.href.length)[0]
  const Icon = match ? NAV_ICONS[match.icon] : null
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {Icon ? (
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted">
          <Icon className="size-4 text-brand-ink" />
        </span>
      ) : null}
      <span className="truncate font-display text-xl font-extrabold uppercase">{match?.label ?? fallback}</span>
    </span>
  )
}
