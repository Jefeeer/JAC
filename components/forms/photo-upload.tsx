"use client"

import { useEffect, useId, useRef, useState } from "react"
import { CameraIcon, LoaderIcon, TriangleAlertIcon, XIcon } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOADS, MAX_UPLOAD_BYTES } from "@/lib/validation/quote"
import { createUploadTargets } from "@/server/actions/uploads"
import { cn } from "@/lib/utils"

type Item = { id: string; file: File; preview: string; status: "uploading" | "done" | "error"; path?: string; error?: string }

/**
 * Optional photo attachments. Files go straight from the browser to the
 * private `uploads` bucket via one-time signed URLs issued by a Server
 * Action — they never pass through our serverless functions.
 * Reports the uploaded storage paths through `onChange`.
 */
export function PhotoUpload({
  onChange,
  onBusyChange,
  hint = "photos of the old part, its label or part number",
}: {
  onChange: (paths: string[]) => void
  onBusyChange?: (busy: boolean) => void
  /** What to photograph, e.g. "photos of the damage or warning lights" */
  hint?: string
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onChange(items.filter((i) => i.status === "done" && i.path).map((i) => i.path!))
    onBusyChange?.(items.some((i) => i.status === "uploading"))
  }, [items, onChange, onBusyChange])

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.preview)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (list: FileList | null) => {
    setError(null)
    if (!list?.length) return
    const room = MAX_UPLOADS - items.length
    const files = [...list].slice(0, room)
    if (list.length > room) setError(`Up to ${MAX_UPLOADS} photos — extra files were skipped.`)

    const bad = files.find((f) => !(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(f.type) || f.size > MAX_UPLOAD_BYTES)
    if (bad) {
      setError(bad.size > MAX_UPLOAD_BYTES ? `“${bad.name}” is over 8 MB.` : `“${bad.name}” isn't a JPG, PNG, WebP or HEIC photo.`)
      return
    }

    const pending: Item[] = files.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), status: "uploading" }))
    setItems((cur) => [...cur, ...pending])

    const res = await createUploadTargets({ files: files.map((f) => ({ name: f.name, type: f.type as (typeof ALLOWED_UPLOAD_TYPES)[number], size: f.size })) })
    if (!res.ok) {
      setItems((cur) => cur.map((i) => (pending.some((p) => p.id === i.id) ? { ...i, status: "error", error: res.error } : i)))
      setError(res.error)
      return
    }

    const supabase = getSupabaseBrowserClient()
    await Promise.all(
      pending.map(async (item, idx) => {
        const target = res.data.targets[idx]
        const { error: upErr } = await supabase.storage.from("uploads").uploadToSignedUrl(target.path, target.token, item.file, { contentType: item.file.type })
        setItems((cur) =>
          cur.map((i) => (i.id === item.id ? (upErr ? { ...i, status: "error", error: "Upload failed" } : { ...i, status: "done", path: target.path }) : i)),
        )
      }),
    )
  }

  const remove = (id: string) =>
    setItems((cur) => {
      const it = cur.find((i) => i.id === id)
      if (it) URL.revokeObjectURL(it.preview)
      return cur.filter((i) => i.id !== id)
    })

  if (!isSupabaseConfigured) {
    return (
      <p className="rounded-sm border border-dashed border-border p-4 text-sm text-muted-foreground">
        Photo uploads aren&apos;t available right now — send photos to us on Viber after submitting.
      </p>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item.id} className="relative size-24 overflow-hidden rounded-sm border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={item.preview} alt={`Selected photo ${item.file.name}`} className={cn("size-full object-cover", item.status !== "done" && "opacity-50")} />
            {item.status === "uploading" ? (
              <span className="absolute inset-0 grid place-items-center">
                <LoaderIcon className="size-5 animate-spin" aria-label="Uploading" />
              </span>
            ) : null}
            {item.status === "error" ? (
              <span className="absolute inset-0 grid place-items-center bg-destructive/20">
                <TriangleAlertIcon className="size-5 text-destructive" aria-label={item.error ?? "Upload failed"} />
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
              aria-label={`Remove ${item.file.name}`}
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ))}

        {items.length < MAX_UPLOADS ? (
          <label
            htmlFor={inputId}
            className="grid size-24 cursor-pointer place-items-center rounded-sm border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-brand hover:text-brand-ink focus-within:border-brand"
          >
            <span className="flex flex-col items-center gap-1 text-center text-[11px] leading-tight">
              <CameraIcon className="size-5" />
              Add photo
            </span>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={ALLOWED_UPLOAD_TYPES.join(",")}
              multiple
              className="sr-only"
              onChange={(e) => {
                void add(e.target.files)
                e.target.value = ""
              }}
            />
          </label>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Up to {MAX_UPLOADS} {hint} — JPG, PNG, WebP or HEIC, 8 MB each.
      </p>
      {error ? (
        <p className="mt-1 text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
