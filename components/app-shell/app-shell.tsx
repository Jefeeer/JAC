import Link from "next/link"
import { ArrowUpRightIcon, LogOutIcon, PhoneCallIcon } from "lucide-react"
import { JacMark } from "@/components/brand/logo"
import { DemoToolbar } from "@/components/demo/demo-toolbar"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LiveModeProvider } from "@/components/portal/live-mode"
import { NotificationBell } from "@/components/portal/notification-bell"
import { contactLinks, siteConfig } from "@/lib/config/site"
import { signOut } from "@/server/actions/auth"
import { MobileShellNav } from "./mobile-shell-nav"
import type { NavGroup } from "./nav-config"
import { SidebarNav, TopbarTitle } from "./sidebar-nav"

export type ShellUser = { name: string; email: string; subtitle: string; role: string; isDemo: boolean; userId: string; unread: number }

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

/**
 * Application chrome for the customer portal and the admin panel:
 * dark fixed sidebar (grouped nav with live counts) + slim top bar.
 */
export function AppShell({
  area,
  groups,
  user,
  notificationsHref,
  sidebarFooter,
  children,
}: {
  area: "Customer portal" | "Admin"
  groups: NavGroup[]
  user: ShellUser
  notificationsHref: string
  sidebarFooter?: React.ReactNode
  children: React.ReactNode
}) {
  const userCard = (
    <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand font-display text-base font-black text-white">{initials(user.name)}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-white">{user.name}</span>
        <span className="block truncate text-xs text-concrete/55">{user.subtitle}</span>
      </span>
    </div>
  )

  const helpCard = (
    <div className="rounded-md border border-white/10 bg-gradient-to-br from-brand/25 to-transparent p-4">
      <p className="font-mono text-[10px] tracking-[0.2em] text-concrete/60 uppercase">Breakdown line · 24/7</p>
      <a href={contactLinks.tel(siteConfig.contact.breakdownPhone)} className="mt-1 flex items-center gap-2 font-display text-xl font-extrabold text-white">
        <PhoneCallIcon className="size-4 text-brand" /> {siteConfig.contact.breakdownPhoneDisplay}
      </a>
      {sidebarFooter}
    </div>
  )

  const footerRow = (
    <div className="flex items-center gap-2">
      <Link href="/" className="inline-flex h-9 flex-1 items-center gap-1.5 rounded-md px-2 text-xs text-concrete/60 hover:bg-white/5 hover:text-concrete">
        <ArrowUpRightIcon className="size-3.5" /> Website
      </Link>
      <ThemeToggle className="size-9 border-white/10 text-concrete/70 hover:border-white/30 hover:text-white" />
      <form action={signOut}>
        <button type="submit" className="grid size-9 place-items-center rounded-sm border border-white/10 text-concrete/70 hover:border-white/30 hover:text-white" aria-label="Sign out">
          <LogOutIcon className="size-4" />
        </button>
      </form>
    </div>
  )

  return (
    <LiveModeProvider polling={user.isDemo}>
      <div className="min-h-svh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="dark sticky top-0 hidden h-svh flex-col border-r border-white/5 bg-asphalt text-concrete lg:flex">
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/5 px-6">
            <Link href="/" aria-label="JAC Motors website">
              <JacMark title={null} className="h-5" />
            </Link>
            <span className="rounded-[3px] border border-white/15 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-concrete/60 uppercase">{area}</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-6 no-scrollbar">
            {userCard}
            <SidebarNav groups={groups} />
            <div className="mt-auto grid gap-4">
              {helpCard}
              {footerRow}
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-col">
          {user.isDemo ? <DemoToolbar name={user.name} role={user.role} /> : null}
          <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
              <MobileShellNav area={area} groups={groups} userCard={userCard} helpCard={helpCard} footerRow={footerRow} />
              <TopbarTitle groups={groups} fallback={area} />
              <div className="ml-auto flex items-center gap-2">
                <NotificationBell userId={user.userId} initialUnread={user.unread} href={notificationsHref} />
                <span className="hidden items-center gap-2.5 border-l border-border pl-3 sm:flex">
                  <span className="grid size-9 place-items-center rounded-full bg-brand font-mono text-xs font-bold text-white">{initials(user.name)}</span>
                  <span className="hidden min-w-0 xl:block">
                    <span className="block max-w-40 truncate text-sm leading-tight font-semibold">{user.name}</span>
                    <span className="block max-w-40 truncate text-xs leading-tight text-muted-foreground">{user.email}</span>
                  </span>
                </span>
              </div>
            </div>
          </header>
          <main id="main" className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </LiveModeProvider>
  )
}
