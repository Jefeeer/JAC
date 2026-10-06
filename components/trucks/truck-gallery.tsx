"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { ChevronLeftIcon, ChevronRightIcon, Maximize2Icon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TruckImage } from "@/types/domain"

/**
 * Listing gallery: hero frame + thumbnail strip, keyboard arrows, and a
 * full-screen viewer. Collapses gracefully to a single photo.
 */
export function TruckGallery({ images, title, badge }: { images: TruckImage[]; title: string; badge?: React.ReactNode }) {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const count = images.length
  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count])

  useEffect(() => {
    if (!open || count < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, go, count])

  if (count === 0) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-sm border border-dashed border-border bg-muted font-mono text-xs tracking-widest text-muted-foreground uppercase">
        Photos coming soon
      </div>
    )
  }

  const current = images[index]

  return (
    <div className="grid gap-3">
      <div
        className="group relative aspect-[4/3] overflow-hidden rounded-sm bg-asphalt"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1)
          if (e.key === "ArrowLeft") go(-1)
        }}
      >
        {images.map((img, i) => (
          <Image
            key={img.url}
            src={img.url}
            alt={img.alt || `${title} photo ${i + 1}`}
            fill
            priority={i === 0}
            sizes="(min-width: 1024px) 58vw, 100vw"
            className={cn("object-cover transition-opacity duration-500", i === index ? "opacity-100" : "opacity-0")}
            aria-hidden={i !== index}
          />
        ))}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" aria-hidden />
        {badge ? <div className="absolute top-4 left-4">{badge}</div> : null}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-sm bg-black/60 px-3 py-2 font-mono text-[11px] tracking-widest text-white uppercase backdrop-blur transition-colors hover:bg-black/80"
        >
          <Maximize2Icon className="size-3.5" /> {count > 1 ? `${index + 1} / ${count}` : "Full screen"}
        </button>

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Previous photo"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Next photo"
            >
              <ChevronRightIcon className="size-5" />
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="flex gap-2 overflow-x-auto no-scrollbar" aria-label="Photos">
          {images.map((img, i) => (
            <li key={img.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index}
                aria-label={`Show photo ${i + 1}`}
                className={cn(
                  "relative block h-16 w-24 overflow-hidden rounded-sm ring-2 ring-offset-2 ring-offset-background transition-all sm:h-20 sm:w-28",
                  i === index ? "ring-brand" : "ring-transparent opacity-60 hover:opacity-100",
                )}
              >
                <Image src={img.url} alt="" fill sizes="112px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/92 data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity" />
          <DialogPrimitive.Popup className="fixed inset-0 z-50 flex flex-col text-white outline-none">
            <DialogPrimitive.Title className="sr-only">{title} — photos</DialogPrimitive.Title>
            <div className="flex items-center justify-between px-4 py-3 font-mono text-xs tracking-widest uppercase">
              <span className="truncate">
                {title} {count > 1 ? `· ${index + 1}/${count}` : ""}
              </span>
              <DialogPrimitive.Close className="grid size-10 place-items-center rounded-full hover:bg-white/10" aria-label="Close">
                <XIcon className="size-5" />
              </DialogPrimitive.Close>
            </div>
            <div className="relative flex-1">
              <Image src={current.url} alt={current.alt || title} fill sizes="100vw" className="object-contain" />
              {count > 1 ? (
                <>
                  <button type="button" onClick={() => go(-1)} className="absolute top-1/2 left-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Previous photo">
                    <ChevronLeftIcon className="size-6" />
                  </button>
                  <button type="button" onClick={() => go(1)} className="absolute top-1/2 right-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Next photo">
                    <ChevronRightIcon className="size-6" />
                  </button>
                </>
              ) : null}
            </div>
            <p className="px-4 py-3 text-center text-xs text-white/60">{current.alt}</p>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
