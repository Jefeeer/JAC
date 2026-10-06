import type { Metadata } from "next"
import Link from "next/link"
import { CalendarPlusIcon } from "lucide-react"
import { AppShell } from "@/components/app-shell/app-shell"
import type { NavGroup } from "@/components/app-shell/nav-config"
import { Logo } from "@/components/brand/logo"
import { DEMO_MODE } from "@/lib/demo/accounts"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { requireUser } from "@/server/auth"
import { countUnread, getCompany, listBookings, listFleet, listJobs, listQuotes } from "@/server/queries/portal"

export const metadata: Metadata = {
  title: { default: "Customer Portal", template: "%s · Customer Portal | JAC Motors" },
  robots: { index: false, follow: false },
}

function PortalUnavailable() {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-4">
      <Logo />
      <h1 className="mt-8 text-5xl font-black uppercase">Portal not connected</h1>
      <p className="mt-4 text-muted-foreground">
        The customer portal needs Supabase (or demo mode). Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and the publishable key — or{" "}
        <code className="font-mono">NEXT_PUBLIC_DEMO_MODE=1</code> — in <code className="font-mono">.env.local</code>, then restart.
      </p>
      <Link href="/" className="mt-8 text-sm underline underline-offset-4">
        Back to the website
      </Link>
    </main>
  )
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured && !DEMO_MODE) return <PortalUnavailable />
  const session = await requireUser("/account")

  const [unread, jobs, bookings, quotes, fleet, company] = await Promise.all([
    countUnread(session.userId),
    listJobs({ active: true }),
    listBookings(50),
    listQuotes(50),
    listFleet(),
    getCompany(session.customer?.companyId ?? null),
  ])
  const due = fleet.filter((u) => u.maintenance && u.maintenance.state !== "ok").length
  const upcoming = bookings.filter((b) => ["pending", "confirmed", "rescheduled"].includes(b.status)).length
  const openQuotes = quotes.filter((q) => ["new", "in_review", "quoted"].includes(q.status))
  const readyJobs = jobs.filter((j) => j.status === "ready").length

  const groups: NavGroup[] = [
    { label: "Overview", items: [{ href: "/account", label: "Dashboard", icon: "dashboard", exact: true }] },
    {
      label: "My trucks",
      items: [
        { href: "/account/fleet", label: "My fleet", icon: "fleet", count: due || undefined, alert: due > 0 },
        { href: "/account/jobs", label: "Service jobs", icon: "jobs", count: jobs.length || undefined, alert: readyJobs > 0 },
        { href: "/account/bookings", label: "Bookings", icon: "bookings", count: upcoming || undefined },
      ],
    },
    {
      label: "Sales",
      items: [{ href: "/account/quotes", label: "Quotes", icon: "quotes", count: openQuotes.length || undefined, alert: openQuotes.some((q) => q.status === "quoted") }],
    },
    {
      label: "Account",
      items: [
        { href: "/account/notifications", label: "Notifications", icon: "notifications", count: unread || undefined, alert: unread > 0 },
        { href: "/account/profile", label: "Profile & company", icon: "profile" },
      ],
    },
  ]

  const name = session.profile.fullName ?? session.email
  return (
    <AppShell
      area="Customer portal"
      groups={groups}
      notificationsHref="/account/notifications"
      user={{ name, email: session.email, subtitle: company?.name ?? "Customer", role: session.profile.role, isDemo: session.isDemo, userId: session.userId, unread }}
      sidebarFooter={
        <Link href="/book-service" className="mt-4 flex h-10 items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold text-white hover:brightness-110">
          <CalendarPlusIcon className="size-4" /> Book a service
        </Link>
      }
    >
      {children}
    </AppShell>
  )
}
