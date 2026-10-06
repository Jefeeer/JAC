"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { LoaderIcon, LockIcon } from "lucide-react"
import { useConfirm } from "@/components/shared/confirm"
import { formatRelative } from "@/lib/format"
import { addNoteAction } from "@/server/actions/admin"
import type { StaffNote } from "@/server/admin/types"

/** Internal staff notes — never shown to customers (separate table, staff-only RLS). */
export function NotesThread({ entityType, entityId, notes }: { entityType: "quote" | "booking" | "job_order" | "customer"; entityId: string; notes: StaffNote[] }) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const confirm = useConfirm()
  return (
    <div className="grid gap-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!(await confirm({ title: "Add internal note?", description: "Visible to staff only — never shown to the customer. Notes can't be edited later.", details: [["Note", body.trim().slice(0, 140) + (body.trim().length > 140 ? "…" : "")]], confirmLabel: "Add note" }))) return
          start(async () => {
            const res = await addNoteAction({ entityType, entityId, body })
            if (res.ok) {
              setBody("")
              router.refresh()
            } else setError(res.error)
          })
        }}
        className="grid gap-2"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Add an internal note…"
          aria-label="Internal note"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-brand"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <LockIcon className="size-3" /> Staff only
          </span>
          <button type="submit" disabled={pending || !body.trim()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background disabled:opacity-40">
            {pending ? <LoaderIcon className="size-3.5 animate-spin" /> : null} Add note
          </button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </form>
      <ol className="grid gap-3">
        {notes.map((n) => (
          <li key={n.id} className="rounded-md bg-muted/50 p-3 text-sm">
            <p className="whitespace-pre-line">{n.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {n.author} · {formatRelative(n.at)}
            </p>
          </li>
        ))}
        {notes.length === 0 ? <li className="text-sm text-muted-foreground">No notes yet.</li> : null}
      </ol>
    </div>
  )
}
