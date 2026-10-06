"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { ChevronUpIcon, MessageCircleIcon, PhoneCallIcon, TriangleAlertIcon } from "lucide-react"
import { MessengerIcon, ViberIcon } from "@/components/brand/channel-icons"
import { contactLinks, siteConfig } from "@/lib/config/site"
import { cn } from "@/lib/utils"

/**
 * Sticky "Breakdown? Call JAC Now" control on every public page.
 * - Main segment is a direct tel: link (one tap to call on mobile).
 * - Chevron segment opens chat channels (Viber / Messenger) + breakdown booking.
 * Mobile: full-width bar pinned to the bottom (respecting safe-area).
 * Desktop: compact pill bottom-right.
 */
export function BreakdownButton() {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const { contact } = siteConfig

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onClick)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onClick)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 sm:inset-x-auto sm:right-5 sm:bottom-5"
    >
      {/* Channel panel */}
      <div
        id={panelId}
        role="region"
        aria-label="Breakdown contact options"
        hidden={!open}
        className="mb-2 overflow-hidden rounded-sm border border-white/10 bg-asphalt text-concrete shadow-2xl shadow-black/50 sm:w-80"
      >
        <div className="hazard h-1.5" aria-hidden />
        <div className="p-4">
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-signal uppercase">
            <TriangleAlertIcon className="size-3.5" /> Stranded? Stay safe first
          </p>
          <p className="mt-2 text-sm leading-relaxed text-concrete/80">
            Switch on hazards, set your early-warning device, then send us your location and plate number.
          </p>
          <ul className="mt-4 grid gap-2">
            <li>
              <a
                href={contactLinks.tel(contact.breakdownPhone)}
                className="flex items-center gap-3 rounded-sm bg-brand px-3 py-3 text-white transition-[filter] hover:brightness-110"
              >
                <PhoneCallIcon className="size-4" />
                <span className="font-semibold">Call</span>
                <span className="ml-auto font-mono text-sm">{contact.breakdownPhoneDisplay}</span>
              </a>
            </li>
            <li>
              <a
                href={contactLinks.viber(contact.viber)}
                className="flex items-center gap-3 rounded-sm border border-white/10 px-3 py-3 transition-colors hover:border-[#7360f2] hover:bg-[#7360f2]/15"
              >
                <ViberIcon className="size-4 text-[#9d8ff7]" />
                <span className="font-semibold">Viber</span>
                <span className="ml-auto text-xs text-concrete/60">Send pin + photos</span>
              </a>
            </li>
            <li>
              <a
                href={contactLinks.messenger(contact.messengerHandle)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-sm border border-white/10 px-3 py-3 transition-colors hover:border-[#0a7cff] hover:bg-[#0a7cff]/15"
              >
                <MessengerIcon className="size-4 text-[#4ea1ff]" />
                <span className="font-semibold">Messenger</span>
                <span className="ml-auto text-xs text-concrete/60">@{contact.messengerHandle}</span>
              </a>
            </li>
          </ul>
          <Link
            href="/book-service?breakdown=1"
            onClick={() => setOpen(false)}
            className="mt-3 block text-center text-xs text-concrete/60 underline-offset-4 hover:text-concrete hover:underline"
          >
            Not urgent? Book a diagnostic slot instead →
          </Link>
        </div>
      </div>

      {/* Pill */}
      <div className="flex h-14 overflow-hidden rounded-sm bg-brand text-white shadow-xl shadow-brand/30 sm:h-12">
        <a
          href={contactLinks.tel(contact.breakdownPhone)}
          className="flex flex-1 items-center gap-3 pr-4 pl-4 transition-[filter] hover:brightness-110"
          aria-label={`Breakdown? Call JAC now at ${contact.breakdownPhoneDisplay}`}
        >
          <span className="relative grid size-7 shrink-0 place-items-center rounded-full bg-white/15">
            <span className="absolute inset-0 animate-beacon rounded-full" aria-hidden />
            <PhoneCallIcon className="size-3.5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-mono text-[10px] tracking-[0.2em] text-white/75 uppercase">Breakdown?</span>
            <span className="mt-1 font-wide text-[13px] font-bold tracking-[0.06em] uppercase">Call JAC now</span>
          </span>
        </a>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex items-center gap-1.5 border-l border-white/20 px-3.5 transition-colors hover:bg-black/15"
        >
          <MessageCircleIcon className="size-4" />
          <span className="sr-only">{open ? "Hide chat options" : "Show chat options"}</span>
          <ChevronUpIcon className={cn("size-3.5 transition-transform", !open && "rotate-180")} aria-hidden />
        </button>
      </div>
    </div>
  )
}
