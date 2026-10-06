"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard for theme-dependent icon
  useEffect(() => setMounted(true), [])

  const isDark = mounted ? resolvedTheme === "dark" : true

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative grid size-10 place-items-center rounded-sm border border-border text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground",
        className,
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <SunIcon className={cn("size-4 transition-all", isDark ? "scale-0 -rotate-90" : "scale-100 rotate-0")} />
      <MoonIcon className={cn("absolute size-4 transition-all", isDark ? "scale-100 rotate-0" : "scale-0 rotate-90")} />
    </button>
  )
}
