import type { Metadata } from "next"
import Image from "next/image"
import { BellRingIcon, ClipboardListIcon, RadioTowerIcon, TruckIcon } from "lucide-react"
import { DemoAccounts } from "@/components/auth/demo-accounts"
import { LoginForm } from "@/components/auth/login-form"
import { DEMO_MODE } from "@/lib/demo/accounts"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { safeNext } from "@/server/auth"

export const metadata: Metadata = {
  title: "Sign in — Customer Portal",
  description: "Sign in to the JAC Motors customer portal to track jobs live, manage your fleet and view quotes.",
  robots: { index: false },
}

const perks = [
  { icon: RadioTowerIcon, title: "Live job tracking", text: "Every workshop stage, as it happens" },
  { icon: TruckIcon, title: "Fleet records", text: "Service history per truck, forever" },
  { icon: BellRingIcon, title: "PMS reminders", text: "Before a unit falls overdue" },
  { icon: ClipboardListIcon, title: "Quotes & bookings", text: "All your requests in one place" },
]

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const next = safeNext(one(sp.next))
  const showEmail = isSupabaseConfigured

  return (
    <section className="grid min-h-[calc(100svh-4rem)] md:min-h-[calc(100svh-6rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel — sticky so its message stays in view however long the form side gets */}
      <aside className="dark relative hidden overflow-hidden bg-asphalt text-concrete lg:sticky lg:top-24 lg:block lg:h-[calc(100svh-6rem)] lg:self-start">
        <Image src="/images/jac-n55-reefer.webp" alt="" fill priority sizes="50vw" className="object-cover object-[60%_center] opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-asphalt/95 via-asphalt/70 to-asphalt/20" aria-hidden />
        <div className="grid-lines absolute inset-0 text-white opacity-40" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-concrete/70 uppercase">
            <span className="h-px w-8 bg-brand" aria-hidden /> Customer portal
          </p>
          <div>
            <h2 className="max-w-lg text-6xl leading-[0.86] font-black uppercase xl:text-7xl">
              Your fleet,
              <br />
              <span className="text-brand">one dashboard.</span>
            </h2>
            <p className="mt-5 max-w-md text-lg text-concrete/75">Track every truck we service — from check-in to release — and never miss a PMS again.</p>
          </div>
          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 backdrop-blur-sm">
            {perks.map((p) => (
              <li key={p.title} className="flex gap-3 bg-asphalt/70 p-4">
                <p.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">{p.title}</span>
                  <span className="block text-xs text-concrete/60">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form side */}
      <div className="flex min-w-0 justify-center px-4 py-12 sm:px-8 lg:py-16">
        <div className="w-full max-w-xl min-w-0">
          <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">{DEMO_MODE && !showEmail ? "Demo sign-in" : "Sign in or create an account"}</p>
          <h1 className="mt-3 text-5xl leading-[0.9] font-black uppercase sm:text-6xl">Welcome back.</h1>
          <p className="mt-3 text-muted-foreground">
            {DEMO_MODE && !showEmail
              ? "Pick a persona to explore the customer portal or the staff admin panel with sample data."
              : "Use the email you gave us for quotes or bookings — we'll link your history automatically."}
          </p>

          {showEmail ? (
            <div className="mt-8 rounded-md border border-border bg-card p-6">
              <LoginForm next={next} linkError={one(sp.error) === "link"} />
            </div>
          ) : null}

          {DEMO_MODE ? (
            <div className="mt-8">
              {showEmail ? (
                <div className="mb-6 flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                  <span className="h-px flex-1 bg-border" /> or try a demo account <span className="h-px flex-1 bg-border" />
                </div>
              ) : null}
              <DemoAccounts next={next} />
            </div>
          ) : null}

          {!showEmail && !DEMO_MODE ? (
            <p className="mt-8 rounded-md border border-border p-4 text-sm text-muted-foreground">Online sign-in isn&apos;t available yet. Please call us for help with your account.</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
