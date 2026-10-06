"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BellIcon } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { usePollingMode } from "@/components/portal/live-mode"
import { cn } from "@/lib/utils"

/** Unread badge that ticks up live when a new notification row arrives. */
export function NotificationBell({ userId, initialUnread, href }: { userId: string; initialUnread: number; href: string }) {
  const [unread, setUnread] = useState(initialUnread)
  const [ping, setPing] = useState(false)
  const polling = usePollingMode() || !isSupabaseConfigured

  // Re-sync when the server sends a fresh count (e.g. after router.refresh)
  const [lastInitial, setLastInitial] = useState(initialUnread)
  if (lastInitial !== initialUnread) {
    setLastInitial(initialUnread)
    setUnread(initialUnread)
  }

  useEffect(() => {
    if (polling) return // DEMO MODE: the count refreshes with the page
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`bell-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, () => {
        setUnread((u) => u + 1)
        setPing(true)
        setTimeout(() => setPing(false), 2000)
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, polling])

  return (
    <Link
      href={href}
      className="relative grid size-10 place-items-center rounded-sm border border-border hover:border-foreground/40"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <BellIcon className={cn("size-4", ping && "animate-bounce")} />
      {unread > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 font-mono text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  )
}
