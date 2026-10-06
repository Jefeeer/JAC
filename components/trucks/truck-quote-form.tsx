"use client"

import { useConfirm } from "@/components/shared/confirm"
import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRightIcon, CalculatorIcon, LoaderIcon, XIcon } from "lucide-react"
import { ConsentCheckbox, Field, Honeypot, NativeSelect, SubmittedStub, TextArea, TextInput } from "@/components/forms/controls"
import { usePurchase } from "@/components/trucks/purchase-context"
import { branches } from "@/lib/config/branches"
import { formatPeso } from "@/lib/format"
import { truckQuoteSchema } from "@/lib/validation/quote"
import { submitTruckQuote } from "@/server/actions/quotes"

const formSchema = truckQuoteSchema.omit({ financing: true, tradeIn: true })
type FormValues = z.input<typeof formSchema>

export function TruckQuoteForm({ truckSlug, truckTitle, defaultBranch }: { truckSlug: string; truckTitle: string; defaultBranch?: string | null }) {
  const { estimate, tradeIn, attach, setAttach } = usePurchase()
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      truckSlug,
      name: "",
      email: "",
      phone: "",
      company: "",
      branch: defaultBranch ?? "",
      message: "",
      website: "",
      startedAt: 0,
      consent: false as unknown as true,
    },
  })
  const { register, handleSubmit, formState, setError, reset, setValue } = form
  const e = formState.errors

  // Timestamp for the bot timing check — set after mount, never during render.
  useEffect(() => setValue("startedAt", Date.now()), [setValue])

  const confirm = useConfirm()
  const onSubmit = handleSubmit(async (values) => {
    const ok = await confirm({
      title: "Request a quotation?",
      description: "A JAC Motors sales consultant will send pricing and contact you, usually within one business day.",
      icon: "send",
      details: [
        ["Truck", truckTitle],
        ...(attach && estimate ? ([["Financing", "Estimate attached"]] as [string, string][]) : []),
        ...(tradeIn ? ([["Trade-in", "Details attached"]] as [string, string][]) : []),
        ["Contact", `${values.name} · ${values.phone}`],
      ],
      confirmLabel: "Send request",
    })
    if (!ok) return
    setServerError(null)
    startTransition(async () => {
      const result = await submitTruckQuote({
        ...(values as z.output<typeof formSchema>),
        financing: attach && estimate ? estimate : undefined,
        tradeIn: tradeIn ?? undefined,
      })
      if (result.ok) {
        setReference(result.data.reference)
        return
      }
      setServerError(result.error)
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof FormValues, { message: messages[0] })
      }
    })
  })

  if (reference) {
    return (
      <SubmittedStub
        reference={reference}
        title="Request received"
        body={
          <>
            Thanks — a JAC Motors sales consultant will contact you about the <strong>{truckTitle}</strong>, usually within one business day.
            Keep your reference handy when you call.
          </>
        }
        onReset={() => {
          reset()
          setReference(null)
          setValue("startedAt", Date.now())
        }}
      />
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative grid gap-5">
      <Honeypot {...register("website")} />
      <input type="hidden" {...register("truckSlug")} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={e.name?.message}>
          {(a) => <TextInput {...a} {...register("name")} autoComplete="name" />}
        </Field>
        <Field label="Company" optional error={e.company?.message}>
          {(a) => <TextInput {...a} {...register("company")} autoComplete="organization" />}
        </Field>
        <Field label="Mobile / phone" error={e.phone?.message}>
          {(a) => <TextInput {...a} {...register("phone")} type="tel" autoComplete="tel" placeholder="0917 123 4567" />}
        </Field>
        <Field label="Email" error={e.email?.message}>
          {(a) => <TextInput {...a} {...register("email")} type="email" autoComplete="email" placeholder="you@company.ph" />}
        </Field>
      </div>

      <Field label="Preferred branch" optional error={e.branch?.message}>
        {(a) => (
          <NativeSelect {...a} {...register("branch")}>
            <option value="">Nearest branch — any is fine</option>
            {branches.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name} · {b.city}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>

      <Field label="Message" optional error={e.message?.message}>
        {(a) => (
          <TextArea
            {...a}
            {...register("message")}
            rows={4}
            placeholder="How many units, body configuration, delivery timing, fleet or LGU requirements…"
          />
        )}
      </Field>

      {/* Attached estimate */}
      {estimate && attach ? (
        <div className="flex items-start gap-3 rounded-sm border border-brand/40 bg-brand/5 p-4 text-sm">
          <CalculatorIcon className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
          <div className="flex-1">
            <p className="font-medium">Financing estimate attached</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {estimate.downPaymentPct}% down · {estimate.termMonths} mo · ≈ {formatPeso(estimate.monthly)}/mo
              {estimate.tradeInValue > 0 ? ` · trade-in ${formatPeso(estimate.tradeInValue)}` : ""}
            </p>
          </div>
          <button type="button" onClick={() => setAttach(false)} className="text-muted-foreground hover:text-foreground" aria-label="Remove financing estimate">
            <XIcon className="size-4" />
          </button>
        </div>
      ) : estimate ? (
        <button type="button" onClick={() => setAttach(true)} className="inline-flex items-center gap-2 self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          <CalculatorIcon className="size-4" /> Attach my financing estimate ({formatPeso(estimate.monthly)}/mo)
        </button>
      ) : (
        <a href="#financing" className="inline-flex items-center gap-2 self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          <CalculatorIcon className="size-4" /> Want financing? Estimate your monthly first
        </a>
      )}

      <ConsentCheckbox {...register("consent")} error={e.consent?.message} />

      {serverError ? (
        <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="shutter group inline-flex h-14 items-center justify-between gap-3 rounded-sm bg-foreground px-6 font-wide text-xs font-bold tracking-[0.14em] text-background uppercase transition-colors hover:text-white disabled:opacity-70 sm:justify-self-start sm:min-w-72"
      >
        {pending ? "Sending…" : "Request quote"}
        {pending ? <LoaderIcon className="size-4 animate-spin" /> : <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />}
      </button>
    </form>
  )
}
