import Link from "next/link"
import { UserRoundIcon, WrenchIcon } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { MessengerIcon, ViberIcon } from "@/components/brand/channel-icons"
import { DesktopNav } from "@/components/layout/desktop-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { contactLinks, siteConfig } from "@/lib/config/site"

export function SiteHeader() {
  const { contact } = siteConfig

  return (
    <header className="sticky top-0 z-40">
      {/* Utility strip */}
      <div className="hidden border-b border-white/10 bg-asphalt text-[11px] text-concrete/75 md:block">
        <div className="mx-auto flex h-8 max-w-[1440px] items-center justify-between gap-6 px-6 font-mono tracking-wide">
          <a
            href={contactLinks.tel(contact.breakdownPhone)}
            className="group inline-flex items-center gap-2 uppercase transition-colors hover:text-white"
          >
            <span className="size-1.5 animate-blink rounded-full bg-brand" aria-hidden />
            Breakdown line
            <span className="text-white group-hover:text-brand-ink">{contact.breakdownPhoneDisplay}</span>
          </a>
          <p className="hidden uppercase lg:block">
            7 branches · Metro Manila · Cavite · Pampanga · Tacloban
          </p>
          <div className="flex items-center gap-4">
            <a
              href={contactLinks.messenger(contact.messengerHandle)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <MessengerIcon className="size-3.5" /> Messenger
            </a>
            <a href={contactLinks.viber(contact.viber)} className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
              <ViberIcon className="size-3.5" /> Viber
            </a>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="shrink-0 rounded-sm">
            <Logo showRegion />
            <span className="sr-only"> — home</span>
          </Link>

          <DesktopNav />

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle className="hidden sm:grid" />
            <Link
              href="/account"
              className="hidden size-10 place-items-center rounded-sm border border-border text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground sm:grid"
              aria-label="Customer portal"
            >
              <UserRoundIcon className="size-4" />
            </Link>
            <Link
              href="/book-service"
              className="shutter hidden h-10 items-center gap-2 rounded-sm bg-foreground px-4 font-wide text-[11px] font-bold tracking-[0.14em] text-background uppercase transition-colors hover:text-white md:inline-flex"
            >
              <WrenchIcon className="size-3.5" />
              Book service
            </Link>
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  )
}
