"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { AlertTriangleIcon, CheckCircle2Icon, InfoIcon, LogInIcon, LogOutIcon, SendIcon, Trash2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * App-wide confirmation dialog.
 *
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: "Cancel booking?", tone: "danger" }))) return
 *
 * Every state-changing action (sign in/out, submits, status changes,
 * publish, delete…) goes through this so nothing happens on a stray tap.
 */

export type ConfirmTone = "default" | "danger" | "success"
export type ConfirmIcon = "info" | "warning" | "delete" | "send" | "login" | "logout" | "check"

export type ConfirmOptions = {
  title: string
  description?: React.ReactNode
  /** Short key/value facts shown in a ticket-style box (e.g. Booking → BK-2610-00009). */
  details?: [string, React.ReactNode][]
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  icon?: ConfirmIcon
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void }

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null)

const ICONS = {
  info: InfoIcon,
  warning: AlertTriangleIcon,
  delete: Trash2Icon,
  send: SendIcon,
  login: LogInIcon,
  logout: LogOutIcon,
  check: CheckCircle2Icon,
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const [open, setOpen] = useState(false)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false) // a newer request supersedes an unanswered one
        resolver.current = resolve
        setPending({ ...o, resolve })
        setOpen(true)
      }),
    [],
  )

  const settle = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOpen(false)
  }

  const tone = pending?.tone ?? "default"
  const Icon = ICONS[pending?.icon ?? (tone === "danger" ? "warning" : tone === "success" ? "check" : "info")]

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={open} onOpenChange={(o) => !o && settle(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-[2px] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <AlertDialog.Popup
            className={cn(
              "fixed top-1/2 left-1/2 z-[101] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-2xl outline-none",
              "transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            )}
          >
            <div className={cn("h-1.5", tone === "danger" ? "hazard-red" : tone === "success" ? "bg-success" : "hazard")} aria-hidden />
            <div className="flex gap-4 p-6">
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-md",
                  tone === "danger" ? "bg-destructive/10 text-destructive" : tone === "success" ? "bg-success/10 text-success" : "bg-brand/10 text-brand-ink",
                )}
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <AlertDialog.Title className="font-display text-2xl leading-tight font-extrabold uppercase">{pending?.title}</AlertDialog.Title>
                {pending?.description ? <AlertDialog.Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{pending.description}</AlertDialog.Description> : null}
                {pending?.details?.length ? (
                  <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-sm">
                    {pending.details.map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase self-center">{k}</dt>
                        <dd className="min-w-0 font-medium break-words">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
              <AlertDialog.Close className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                {pending?.cancelLabel ?? "Cancel"}
              </AlertDialog.Close>
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none",
                  tone === "danger" ? "bg-destructive hover:bg-destructive/90" : tone === "success" ? "bg-success hover:bg-success/90" : "bg-brand hover:bg-brand/90",
                )}
              >
                {pending?.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>")
  return ctx
}

/**
 * Submit button for (server-rendered) forms that asks first. The form only
 * submits after the user confirms.
 */
export function ConfirmSubmitButton({ confirm: options, className, children, disabled }: { confirm: ConfirmOptions; className?: string; children: React.ReactNode; disabled?: boolean }) {
  const confirm = useConfirm()
  return (
    <button
      type="submit"
      disabled={disabled}
      className={className}
      onClick={async (e) => {
        const form = e.currentTarget.form
        e.preventDefault()
        if (form && (await confirm(options))) form.requestSubmit()
      }}
    >
      {children}
    </button>
  )
}
