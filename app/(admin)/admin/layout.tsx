import type { Metadata } from "next"
import Link from "next/link"
import { ExternalLinkIcon } from "lucide-react"
import { AppShell } from "@/components/app-shell/app-shell"
import type { NavGroup, NavItem } from "@/components/app-shell/nav-config"
import { Logo } from "@/components/brand/logo"
import { DEMO_MODE } from "@/lib/demo/accounts"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { repoFor } from "@/server/admin/context"
import { ROLE_LABELS, can } from "@/server/admin/permissions"
import { requireStaff } from "@/server/auth"

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin | JAC Motors" },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured && !DEMO_MODE) {
    return (
      <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-4">
        <Logo />
        <h1 className="mt-8 text-5xl font-black uppercase">Admin not connected</h1>
        <p className="mt-4 text-muted-foreground">Connect Supabase (or enable NEXT_PUBLIC_DEMO_MODE) to use the admin panel.</p>
      </main>
    )
  }
  const session = await requireStaff("/admin")
  const role = session.profile.role
  const repo = await repoFor(session)
  const [stats, unread] = await Promise.all([repo.stats(), repo.unreadCount()])

  const item = (i: NavItem, show: boolean) => (show ? [i] : [])
  const allGroups: NavGroup[] = [
    { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: "dashboard", exact: true }] },
    {
      label: "Workshop",
      items: [
        ...item({ href: "/admin/jobs", label: role === "mechanic" ? "My jobs" : "Job board", icon: "jobs", count: stats.jobsActive || undefined, alert: stats.jobsReady > 0 }, can(role, "jobs.read")),
        ...item({ href: "/admin/bookings", label: "Bookings", icon: "bookings", count: stats.pendingBookings || undefined, alert: stats.breakdownBookings > 0 }, can(role, "bookings.read")),
      ],
    },
    {
      label: "Sales & parts",
      items: [
        ...item({ href: "/admin/quotes", label: "Quotes inbox", icon: "quotes", count: stats.newQuotes || undefined, alert: stats.newQuotes > 0 }, can(role, "quotes.read")),
        ...item({ href: "/admin/trucks", label: "Trucks", icon: "trucks", count: stats.trucksTotal || undefined }, can(role, "trucks.write")),
        ...item({ href: "/admin/parts", label: "Parts & stock", icon: "parts", count: stats.lowStock + stats.outOfStock || undefined, alert: stats.outOfStock > 0 }, can(role, "parts.write")),
      ],
    },
    {
      label: "People",
      items: [
        ...item({ href: "/admin/customers", label: "Customers & fleets", icon: "customers" }, can(role, "customers.read")),
        { href: "/admin/notifications", label: "Notifications", icon: "notifications", count: unread || undefined, alert: unread > 0 },
      ],
    },
  ]
  const groups = allGroups.filter((g) => g.items.length)

  return (
    <AppShell
      area="Admin"
      groups={groups}
      notificationsHref="/admin/notifications"
      user={{ name: session.profile.fullName ?? session.email, email: session.email, subtitle: ROLE_LABELS[role], role, isDemo: session.isDemo, userId: session.userId, unread }}
      sidebarFooter={
        <Link href="/" target="_blank" className="mt-4 flex h-10 items-center justify-center gap-2 rounded-md border border-white/15 text-sm text-concrete/80 hover:bg-white/5">
          <ExternalLinkIcon className="size-4" /> View website
        </Link>
      }
    >
      {children}
    </AppShell>
  )
}
