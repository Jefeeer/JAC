"use client"

import { useEffect, useId } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { usePollingMode } from "@/components/portal/live-mode"

type Sub = { table: string; filter?: string; event?: "INSERT" | "UPDATE" | "DELETE" | "*" }

/**
 * Subscribes to Supabase Realtime postgres_changes and re-renders the server
 * components (router.refresh) when a matching row changes. Realtime applies
 * the user's RLS, so customers only receive events for their own rows.
 * Without Supabase (DEMO MODE) it falls back to polling every 8 s.
 */
export function RealtimeRefresh({ subscriptions, onEvent }: { subscriptions: Sub[]; onEvent?: () => void }) {
  const router = useRouter()
  const id = useId()
  const key = JSON.stringify(subscriptions)
  const polling = usePollingMode() || !isSupabaseConfigured

  useEffect(() => {
    // DEMO MODE / no Supabase: poll instead of Realtime while the tab is visible.
    if (polling) {
      const poll = setInterval(() => {
        if (document.visibilityState === "visible") router.refresh()
      }, 8000)
      return () => clearInterval(poll)
    }
    const supabase = getSupabaseBrowserClient()
    const subs: Sub[] = JSON.parse(key)
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      // Coalesce bursts (e.g. job status + event insert in one transaction)
      clearTimeout(timer)
      timer = setTimeout(() => {
        onEvent?.()
        router.refresh()
      }, 250)
    }
    const channel = supabase.channel(`rt-${id}`)
    for (const s of subs) {
      channel.on("postgres_changes", { event: s.event ?? "*", schema: "public", table: s.table, ...(s.filter ? { filter: s.filter } : {}) }, refresh)
    }
    channel.subscribe()
    return () => {
      clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [key, id, router, onEvent, polling])

  return null
}
