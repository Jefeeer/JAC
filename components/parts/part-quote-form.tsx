"use client"

import { useConfirm } from "@/components/shared/confirm"
import { useCallback, useEffect, useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRightIcon, LoaderIcon, MinusIcon, PlusIcon } from "lucide-react"
import { ConsentCheckbox, Field, Honeypot, NativeSelect, SubmittedStub, TextArea, TextInput } from "@/components/forms/controls"
import { PhotoUpload } from "@/components/forms/photo-upload"
import { branches } from "@/lib/config/branches"
import { partQuoteSchema } from "@/lib/validation/quote"
import { submitPartQuote } from "@/server/actions/quotes"

type FormValues = z.input<typeof partQuoteSchema>

export function PartQuoteForm({
  partSlug,
  partName,
  partNumber,
  unit,
  compatibleModels,
}: {
  partSlug: string
  partName: string
  partNumber: string
  unit: string
  compatibleModels: string[]
}) {
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(partQuoteSchema),
    defaultValues: {
      partSlug,
      quantity: 1,
      name: "",
      email: "",
      phone: "",
      company: "",
      branch: "",
      truckModel: compatibleModels.length === 1 ? compatibleModels[0] : "",
      plateNumber: "",
      vin: "",
      message: "",
      photoPaths: [],
      website: "",
      startedAt: 0,
      consent: false as unknown as true,
    },
  })
  const { register, handleSubmit, formState, setError, setValue, getValues, reset, control } = form
  const e = formState.errors
  const qty = useWatch({ control, name: "quantity" })

  useEffect(() => setValue("startedAt", Date.now()), [setValue])
  const onPhotos = useCallback((paths: string[]) => setValue("photoPaths", paths), [setValue])

  const confirm = useConfirm()
  const onSubmit = handleSubmit(async (values) => {
    const ok = await confirm({
      title: "Send this parts enquiry?",
      description: "Our parts counter replies with price and availability, usually within one business day.",
      icon: "send",
      details: [
        ["Part", `${partName} (${partNumber})`],
        ["Quantity", `${values.quantity} ${unit}`],
        ["Contact", `${values.name} · ${values.phone}`],
      ],
      confirmLabel: "Send enquiry",
    })
    if (!ok) return
    setServerError(null)
    startTransition(async () => {
      const result = await submitPartQuote(values)
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
        title="Parts request logged"
        body={
          <>
            Our parts counter will confirm price, stock and pickup or delivery for <strong>{partNumber}</strong> — usually the same business day.
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

  const step = (d: number) => setValue("quantity", Math.min(999, Math.max(1, Number(getValues("quantity") || 1) + d)), { shouldValidate: true })

  return (
    <form onSubmit={onSubmit} noValidate className="relative grid gap-5">
      <Honeypot {...register("website")} />
      <input type="hidden" {...register("partSlug")} />

      <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
        <Field label={`Quantity (${unit})`} error={e.quantity?.message}>
          {(a) => (
            <div className="flex h-12 items-stretch overflow-hidden rounded-sm border border-input bg-surface">
              <button type="button" onClick={() => step(-1)} className="grid w-11 place-items-center hover:bg-muted" aria-label="Decrease quantity">
                <MinusIcon className="size-4" />
              </button>
              <input
                {...a}
                {...register("quantity", { valueAsNumber: true })}
                inputMode="numeric"
                className="w-16 border-x border-input bg-transparent text-center font-mono outline-none"
                aria-label={`Quantity for ${partName}`}
              />
              <button type="button" onClick={() => step(1)} className="grid w-11 place-items-center hover:bg-muted" aria-label="Increase quantity">
                <PlusIcon className="size-4" />
              </button>
            </div>
          )}
        </Field>
        <Field label="For which truck?" optional error={e.truckModel?.message} hint={qty && Number(qty) > 20 ? "Bulk order — ask about fleet pricing in your message." : undefined}>
          {(a) => (
            <NativeSelect {...a} {...register("truckModel")}>
              <option value="">Select model (optional)</option>
              {compatibleModels.map((m) => (
                <option key={m} value={m}>
                  JAC {m}
                </option>
              ))}
              <option value="Other / not sure">Other / not sure</option>
            </NativeSelect>
          )}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Plate number" optional error={e.plateNumber?.message}>
          {(a) => <TextInput {...a} {...register("plateNumber")} className="font-mono uppercase" placeholder="NAD 6513" autoCapitalize="characters" />}
        </Field>
        <Field label="VIN / chassis no." optional error={e.vin?.message} hint="Helps us confirm fitment.">
          {(a) => <TextInput {...a} {...register("vin")} className="font-mono uppercase" autoCapitalize="characters" placeholder="LJ11KBBC8N1000000" />}
        </Field>
        <Field label="Full name" error={e.name?.message}>
          {(a) => <TextInput {...a} {...register("name")} autoComplete="name" placeholder="Juan dela Cruz" />}
        </Field>
        <Field label="Company / shop" optional error={e.company?.message}>
          {(a) => <TextInput {...a} {...register("company")} autoComplete="organization" placeholder="e.g. Dela Cruz Auto Supply" />}
        </Field>
        <Field label="Mobile / phone" error={e.phone?.message}>
          {(a) => <TextInput {...a} {...register("phone")} type="tel" autoComplete="tel" placeholder="0917 123 4567" />}
        </Field>
        <Field label="Email" error={e.email?.message}>
          {(a) => <TextInput {...a} {...register("email")} type="email" autoComplete="email" placeholder="you@company.ph" />}
        </Field>
      </div>

      <Field label="Pick up at" optional error={e.branch?.message}>
        {(a) => (
          <NativeSelect {...a} {...register("branch")}>
            <option value="">Any branch / deliver to me</option>
            {branches.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name} · {b.city}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>

      <Field label="Notes" optional error={e.message?.message}>
        {(a) => <TextArea {...a} {...register("message")} rows={3} placeholder="Symptoms, the part number on the old part, delivery address…" />}
      </Field>

      <div>
        <p className="mb-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          Photos <span className="text-[10px] tracking-wider text-muted-foreground normal-case">optional</span>
        </p>
        <PhotoUpload onChange={onPhotos} onBusyChange={setUploading} />
      </div>

      <ConsentCheckbox {...register("consent")} error={e.consent?.message} />

      {serverError ? (
        <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {serverError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || uploading}
        className="shutter group inline-flex h-14 items-center justify-between gap-3 rounded-sm bg-foreground px-6 font-wide text-xs font-bold tracking-[0.14em] text-background uppercase transition-colors hover:text-white disabled:opacity-70 sm:min-w-72 sm:justify-self-start"
      >
        {pending ? "Sending…" : uploading ? "Uploading photos…" : "Request parts quote"}
        {pending || uploading ? <LoaderIcon className="size-4 animate-spin" /> : <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />}
      </button>
    </form>
  )
}
