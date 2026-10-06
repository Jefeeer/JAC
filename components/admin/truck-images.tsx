"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ImagePlusIcon, LoaderIcon, StarIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { btn } from "@/components/admin/ui"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { cn } from "@/lib/utils"
import { addTruckImageAction, removeTruckImageAction, setPrimaryTruckImageAction } from "@/server/actions/admin"

type Img = { url: string; alt: string; isPrimary?: boolean }

/**
 * Photo manager. With Supabase, staff upload directly to the public
 * truck-images bucket (storage RLS: admin/sales only). The site's photo
 * library is always available (and is the only source in DEMO MODE).
 */
export function TruckImages({ truckId, title, images, library, uploads }: { truckId: string; title: string; images: Img[]; library: { src: string; title: string }[]; uploads: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showLib, setShowLib] = useState(false)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const res = await fn()
      if (!res.ok) setError(res.error ?? "Something went wrong")
      router.refresh()
    })

  const upload = (files: FileList | null) => {
    if (!files?.length) return
    start(async () => {
      setError(null)
      const supabase = getSupabaseBrowserClient()
      for (const file of [...files].slice(0, 8)) {
        if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
          setError(`${file.name}: images up to 10 MB only`)
          continue
        }
        const path = `${truckId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "-").slice(-60)}`
        const { error: upErr } = await supabase.storage.from("truck-images").upload(path, file, { contentType: file.type, cacheControl: "31536000" })
        if (upErr) {
          setError(upErr.message)
          continue
        }
        const { data } = supabase.storage.from("truck-images").getPublicUrl(path)
        const dims = await new Promise<{ w: number; h: number } | null>((res) => {
          const img = new window.Image()
          img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight })
          img.onerror = () => res(null)
          img.src = URL.createObjectURL(file)
        })
        const res = await addTruckImageAction({ truckId, url: data.publicUrl, alt: title, storagePath: path, width: dims?.w ?? null, height: dims?.h ?? null })
        if (!res.ok) setError(res.error)
      }
      router.refresh()
    })
  }

  return (
    <div className="grid gap-4">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {images.map((img) => (
          <li key={img.url} className={cn("group relative overflow-hidden rounded-md border-2", img.isPrimary ? "border-brand" : "border-transparent")}>
            <div className="relative aspect-[4/3] bg-muted">
              <Image src={img.url} alt={img.alt} fill sizes="240px" className="object-cover" />
            </div>
            {img.isPrimary ? <span className="absolute top-2 left-2 rounded-[2px] bg-brand px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-white uppercase">Cover</span> : null}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              {!img.isPrimary ? (
                <button type="button" onClick={() => run(() => setPrimaryTruckImageAction(truckId, img.url))} className="grid size-8 place-items-center rounded bg-white/90 text-black" aria-label="Make cover photo">
                  <StarIcon className="size-4" />
                </button>
              ) : null}
              <button type="button" onClick={() => run(() => removeTruckImageAction(truckId, img.url))} className="grid size-8 place-items-center rounded bg-white/90 text-destructive" aria-label="Remove photo">
                <Trash2Icon className="size-4" />
              </button>
            </div>
          </li>
        ))}
        {images.length === 0 ? <li className="col-span-full rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No photos yet — the listing can&apos;t be published without one.</li> : null}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        {uploads ? (
          <label className={cn(btn.dark, "cursor-pointer")}>
            {pending ? <LoaderIcon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />} Upload photos
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
          </label>
        ) : null}
        <button type="button" onClick={() => setShowLib((v) => !v)} className={btn.outline}>
          <ImagePlusIcon className="size-4" /> {showLib ? "Hide" : "Add from"} photo library
        </button>
        {!uploads ? <span className="text-xs text-muted-foreground">Uploads need Supabase Storage — using the site photo library in demo mode.</span> : null}
      </div>

      {showLib ? (
        <ul className="grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-4 lg:grid-cols-6">
          {library
            .filter((l) => !images.some((i) => i.url === l.src))
            .map((l) => (
              <li key={l.src}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => addTruckImageAction({ truckId, url: l.src, alt: title }))}
                  className="relative block aspect-[4/3] w-full overflow-hidden rounded border border-border hover:ring-2 hover:ring-brand"
                  title={l.title}
                >
                  <Image src={l.src} alt={l.title} fill sizes="160px" className="object-cover" />
                </button>
              </li>
            ))}
        </ul>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
