"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { ArrowRightIcon, LoaderIcon, MailCheckIcon } from "lucide-react"
import { Field, Honeypot, TextInput } from "@/components/forms/controls"
import { requestSignIn, verifySignInCode } from "@/server/actions/auth"

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(linkError ? "That sign-in link has expired or was already used. Request a new one below." : null)
  const [pending, startTransition] = useTransition()
  const startedAt = useRef(0)
  const honeypot = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    startedAt.current = Date.now()
  }, [])
  useEffect(() => {
    if (step === "code") codeRef.current?.focus()
  }, [step])

  const send = () =>
    startTransition(async () => {
      setError(null)
      const res = await requestSignIn({ email, fullName, next, website: honeypot.current?.value ?? "", startedAt: startedAt.current || Date.now() })
      if (res.ok) setStep("code")
      else setError(res.fieldErrors?.email?.[0] ?? res.error)
    })

  const verify = () =>
    startTransition(async () => {
      setError(null)
      const res = await verifySignInCode({ email, code, next })
      // On success the action redirects; we only get here on failure.
      if (res && !res.ok) setError(res.error)
    })

  if (step === "code") {
    return (
      <div className="grid gap-6">
        <div className="flex items-start gap-4 rounded-sm border border-success/40 bg-success/5 p-5">
          <MailCheckIcon className="mt-0.5 size-6 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-semibold">Check your inbox</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a sign-in link and a 6-digit code to <strong className="text-foreground">{email}</strong>. Tap the link, or enter the code here.
            </p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            verify()
          }}
          className="grid gap-4"
        >
          <Field label="6-digit code" error={error ?? undefined}>
            {(a) => (
              <TextInput
                {...a}
                ref={codeRef}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                className="h-16 text-center font-mono text-3xl tracking-[0.5em]"
              />
            )}
          </Field>
          <button
            type="submit"
            disabled={pending || code.length !== 6}
            className="inline-flex h-14 items-center justify-between rounded-sm bg-brand px-6 font-wide text-xs font-bold tracking-[0.14em] text-white uppercase disabled:opacity-50"
          >
            {pending ? "Checking…" : "Sign in"}
            {pending ? <LoaderIcon className="size-4 animate-spin" /> : <ArrowRightIcon className="size-4" />}
          </button>
        </form>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <button type="button" onClick={send} disabled={pending} className="underline underline-offset-4 hover:text-foreground">
            Resend email
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email")
              setCode("")
              setError(null)
            }}
            className="underline underline-offset-4 hover:text-foreground"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
      className="relative grid gap-5"
      noValidate
    >
      <Honeypot ref={honeypot} name="website" />
      <Field label="Email" error={error ?? undefined}>
        {(a) => (
          <TextInput {...a} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.ph" required autoFocus />
        )}
      </Field>
      <Field label="Your name" optional hint="First time here? We'll create your account with this name.">
        {(a) => <TextInput {...a} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />}
      </Field>
      <button
        type="submit"
        disabled={pending || !email}
        className="shutter inline-flex h-14 items-center justify-between rounded-sm bg-foreground px-6 font-wide text-xs font-bold tracking-[0.14em] text-background uppercase transition-colors hover:text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
        {pending ? <LoaderIcon className="size-4 animate-spin" /> : <ArrowRightIcon className="size-4" />}
      </button>
      <p className="text-xs text-muted-foreground">No password needed. By continuing you agree to our terms and privacy notice.</p>
    </form>
  )
}
