"use client"

import { forwardRef, useId } from "react"
import { CheckCircle2Icon, ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export const controlClass =
  "w-full rounded-sm border border-input bg-surface px-3.5 text-[15px] text-foreground shadow-none outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-foreground/30 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 aria-invalid:border-destructive aria-invalid:ring-destructive/15 disabled:opacity-60"

/** Label + control + hint/error, wiring aria-describedby automatically. */
export function Field({
  label,
  error,
  hint,
  optional,
  className,
  children,
}: {
  label: string
  error?: string
  hint?: string
  optional?: boolean
  className?: string
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode
}) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between font-mono text-[11px] tracking-[0.16em] uppercase">
        <span>{label}</span>
        {optional ? <span className="text-[10px] tracking-wider text-muted-foreground normal-case">optional</span> : null}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const TextInput = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={cn(controlClass, "h-12", className)} {...props} />
})

export const TextArea = forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(function TextArea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(controlClass, "min-h-28 resize-y py-3 leading-relaxed", className)} {...props} />
})

export const NativeSelect = forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(function NativeSelect(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(controlClass, "h-12 cursor-pointer appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  )
})

/**
 * Off-screen honeypot. Real users never see or tab to it; naive bots fill it.
 * (Not `display:none` — some bots skip hidden inputs.)
 */
export const Honeypot = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function Honeypot(props, ref) {
  return (
    <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0">
      <label>
        Website
        <input ref={ref} type="text" tabIndex={-1} autoComplete="off" {...props} />
      </label>
    </div>
  )
})

export function ConsentCheckbox({
  error,
  ...props
}: React.ComponentProps<"input"> & { error?: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-muted-foreground">
        <input
          id={id}
          type="checkbox"
          className="mt-1 size-4 shrink-0 cursor-pointer accent-[var(--brand)]"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        <span>
          I agree that JAC Motors may contact me about this request and process my details under the Data Privacy Act of 2012.{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy notice
          </a>
        </span>
      </label>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Shown after a successful submission — styled like a printed claim stub. */
export function SubmittedStub({
  reference,
  title,
  body,
  onReset,
}: {
  reference: string
  title: string
  body: React.ReactNode
  onReset?: () => void
}) {
  return (
    <div className="rounded-sm border border-success/40 bg-success/5 p-6 sm:p-8" role="status" aria-live="polite">
      <CheckCircle2Icon className="size-8 text-success" aria-hidden />
      <h3 className="mt-4 font-display text-3xl font-extrabold uppercase">{title}</h3>
      <p className="mt-2 text-muted-foreground">{body}</p>
      {reference !== "Q-RECEIVED" ? (
        <div className="mt-6 inline-flex flex-col rounded-sm border border-dashed border-foreground/30 px-5 py-3">
          <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">Your reference</span>
          <span className="font-mono text-2xl font-bold tracking-wider">{reference}</span>
        </div>
      ) : null}
      {onReset ? (
        <button type="button" onClick={onReset} className="mt-6 block text-sm underline underline-offset-4 hover:text-brand-ink">
          Send another request
        </button>
      ) : null}
    </div>
  )
}
