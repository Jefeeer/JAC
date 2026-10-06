"use client"

import { NavLink } from "@/components/layout/nav-link"
import { usePathname } from "next/navigation"
import { mainNav } from "@/lib/config/site"
import { cn } from "@/lib/utils"

export function DesktopNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center">
        {mainNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <li key={item.href}>
              <NavLink
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-16 items-center px-3.5 font-wide text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors",
                  "after:absolute after:inset-x-3.5 after:bottom-0 after:h-[3px] after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-300",
                  "hover:text-foreground hover:after:scale-x-100",
                  active ? "text-foreground after:scale-x-100" : "text-muted-foreground",
                )}
              >
                {item.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
