"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRightIcon, MenuIcon, UserRoundIcon } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { contactLinks, mainNav, siteConfig } from "@/lib/config/site"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="grid size-10 place-items-center rounded-sm border border-border lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l-0 bg-asphalt p-0 text-concrete data-[side=right]:w-full data-[side=right]:sm:max-w-md [&_[data-slot=sheet-close]]:top-4 [&_[data-slot=sheet-close]]:right-4 [&_[data-slot=sheet-close]]:text-concrete"
      >
        <div className="hazard h-1.5 w-full" aria-hidden />
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Main navigation for JAC Motors</SheetDescription>

        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 pt-4">
          <ol className="divide-y divide-white/10 border-y border-white/10">
            {mainNav.map((item, i) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className="group flex items-baseline gap-4 py-4"
                  >
                    <span className="font-mono text-xs text-concrete/65">{String(i + 1).padStart(2, "0")}</span>
                    <span
                      className={cn(
                        "font-display text-4xl font-extrabold uppercase transition-colors group-hover:text-brand-ink",
                        active && "text-brand-ink",
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="ml-auto self-center text-xs text-concrete/50">{item.description}</span>
                  </Link>
                </li>
              )
            })}
          </ol>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              href="/book-service"
              onClick={() => setOpen(false)}
              className="col-span-2 inline-flex h-14 items-center justify-between rounded-sm bg-brand px-5 font-wide text-xs font-bold tracking-[0.14em] text-white uppercase"
            >
              Book a service <ArrowUpRightIcon className="size-4" />
            </Link>
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-white/15 text-sm"
            >
              <UserRoundIcon className="size-4" /> Portal
            </Link>
            <ThemeToggle className="h-12 w-full border-white/15 text-concrete" />
          </div>
        </nav>

        <div className="border-t border-white/10 px-5 py-5 font-mono text-xs text-concrete/60">
          <p className="uppercase">Head office · North EDSA</p>
          <a href={contactLinks.tel(siteConfig.contact.phone)} className="mt-1 block text-base text-concrete">
            {siteConfig.contact.phoneDisplay}
          </a>
        </div>
      </SheetContent>
    </Sheet>
  )
}
