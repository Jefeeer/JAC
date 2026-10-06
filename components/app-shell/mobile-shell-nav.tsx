"use client"

import { useState } from "react"
import { MenuIcon } from "lucide-react"
import { JacMark } from "@/components/brand/logo"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { NavGroup } from "./nav-config"
import { SidebarNav } from "./sidebar-nav"

export function MobileShellNav({
  area,
  groups,
  userCard,
  helpCard,
  footerRow,
}: {
  area: string
  groups: NavGroup[]
  userCard: React.ReactNode
  helpCard: React.ReactNode
  footerRow: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="grid size-10 shrink-0 place-items-center rounded-sm border border-border lg:hidden" aria-label="Open navigation">
        <MenuIcon className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="dark w-[300px] gap-0 border-r-0 bg-asphalt p-0 text-concrete data-[side=left]:w-[300px] [&_[data-slot=sheet-close]]:text-concrete"
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/5 px-5">
          <JacMark title={null} className="h-5" />
          <span className="rounded-[3px] border border-white/15 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-concrete/60 uppercase">{area}</span>
        </div>
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">{area} sections</SheetDescription>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-6">
          {userCard}
          <SidebarNav groups={groups} onNavigate={() => setOpen(false)} />
          <div className="mt-auto grid gap-4">
            {helpCard}
            {footerRow}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
