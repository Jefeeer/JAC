"use client"

import { useConfirm } from "@/components/shared/confirm"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderIcon } from "lucide-react"
import { Field, TextArea, TextInput } from "@/components/forms/controls"
import { fleetUnitSchema, type FleetUnitInput } from "@/lib/validation/portal"
import { saveFleetUnit } from "@/server/actions/portal"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-5 border-t border-border pt-6">
      <legend className="float-left mb-1 w-full font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{title}</legend>
      <div className="clear-both grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

export function FleetForm({ initial, models }: { initial?: FleetUnitInput; models: string[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const editing = Boolean(initial?.id)

  const { register, handleSubmit, formState, setError: setFieldError } = useForm<FleetUnitInput>({
    resolver: zodResolver(fleetUnitSchema),
    defaultValues: {
      make: "JAC",
      model: "",
      serviceIntervalKm: 10000,
      serviceIntervalMonths: 6,
      remindersEnabled: true,
      ...initial,
    },
  })
  const e = formState.errors as Record<string, { message?: string } | undefined>
  const confirm = useConfirm()

  const onSubmit = handleSubmit(async (values) => {
    const ok = await confirm({
      title: values.id ? "Save changes to this truck?" : "Add this truck to your fleet?",
      description: values.id ? "Service reminders are recalculated from the updated details." : "We'll track its maintenance and remind you before each PMS.",
      details: [
        ["Truck", `${values.make ?? "JAC"} ${values.model ?? ""}`.trim()],
        ...(values.plateNumber ? ([["Plate", String(values.plateNumber).toUpperCase()]] as [string, string][]) : []),
      ],
      confirmLabel: values.id ? "Save changes" : "Add truck",
    })
    if (!ok) return
    start(async () => {
      setError(null)
      const res = await saveFleetUnit(values)
      if (res.ok) {
        router.push(`/account/fleet/${res.data.id}`)
        router.refresh()
        return
      }
      setError(res.error)
      for (const [k, m] of Object.entries(res.fieldErrors ?? {})) if (m?.[0]) setFieldError(k as keyof FleetUnitInput, { message: m[0] })
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8">
      {initial?.id ? <input type="hidden" {...register("id")} /> : null}
      <Section title="Unit">
        <Field label="Make" error={e.make?.message}>
          {(a) => <TextInput {...a} {...register("make")} placeholder="e.g. JAC, Isuzu, Fuso" />}
        </Field>
        <Field label="Model" error={e.model?.message}>
          {(a) => (
            <>
              <TextInput {...a} {...register("model")} list="fleet-models" placeholder="e.g. N55" autoComplete="off" />
              <datalist id="fleet-models">
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Nickname" optional error={e.nickname?.message} hint="e.g. “Reefer 3” or the driver's name">
          {(a) => <TextInput {...a} {...register("nickname")} placeholder="e.g. Reefer 3" />}
        </Field>
        <Field label="Year" optional error={e.year?.message}>
          {(a) => <TextInput {...a} {...register("year")} inputMode="numeric" maxLength={4} placeholder="2022" />}
        </Field>
        <Field label="Plate number" optional error={e.plateNumber?.message}>
          {(a) => <TextInput {...a} {...register("plateNumber")} className="font-mono uppercase" autoCapitalize="characters" placeholder="NAD 6513" />}
        </Field>
        <Field label="Color" optional error={e.color?.message}>
          {(a) => <TextInput {...a} {...register("color")} placeholder="e.g. White" />}
        </Field>
        <Field label="VIN / chassis no." optional error={e.vin?.message}>
          {(a) => <TextInput {...a} {...register("vin")} className="font-mono uppercase" autoCapitalize="characters" placeholder="LJ11KBBC8N1000000" />}
        </Field>
        <Field label="Engine no." optional error={e.engineNumber?.message}>
          {(a) => <TextInput {...a} {...register("engineNumber")} className="font-mono uppercase" autoCapitalize="characters" placeholder="ISF38E5000000" />}
        </Field>
        <Field label="Purchase date" optional error={e.purchaseDate?.message}>
          {(a) => <TextInput {...a} {...register("purchaseDate")} type="date" className="font-mono" />}
        </Field>
      </Section>

      <Section title="Odometer & maintenance">
        <Field label="Current odometer (km)" error={e.currentMileageKm?.message}>
          {(a) => <TextInput {...a} {...register("currentMileageKm")} inputMode="numeric" className="font-mono" placeholder="48000" />}
        </Field>
        <Field label="Last service date" optional error={e.lastServiceDate?.message}>
          {(a) => <TextInput {...a} {...register("lastServiceDate")} type="date" className="font-mono" />}
        </Field>
        <Field label="Odometer at last service (km)" optional error={e.lastServiceMileageKm?.message}>
          {(a) => <TextInput {...a} {...register("lastServiceMileageKm")} inputMode="numeric" className="font-mono" placeholder="40000" />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Service every (km)" error={e.serviceIntervalKm?.message}>
            {(a) => <TextInput {...a} {...register("serviceIntervalKm")} inputMode="numeric" className="font-mono" placeholder="10000" />}
          </Field>
          <Field label="…or months" error={e.serviceIntervalMonths?.message}>
            {(a) => <TextInput {...a} {...register("serviceIntervalMonths")} inputMode="numeric" className="font-mono" placeholder="6" />}
          </Field>
        </div>
        <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
          <input type="checkbox" {...register("remindersEnabled")} className="size-4 accent-[var(--brand)]" />
          <span>
            <span className="font-medium">Email me maintenance reminders</span>
            <span className="block text-xs text-muted-foreground">Sent when this unit is within 1,000 km or 2 weeks of its next service.</span>
          </span>
        </label>
        <Field label="Notes" optional className="sm:col-span-2" error={e.notes?.message}>
          {(a) => <TextArea {...a} {...register("notes")} rows={3} placeholder="Body type, route, driver, special equipment…" />}
        </Field>
      </Section>

      {error ? (
        <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="inline-flex h-12 items-center gap-2 rounded-sm bg-brand px-6 font-wide text-xs font-bold tracking-[0.14em] text-white uppercase disabled:opacity-60">
          {pending ? <LoaderIcon className="size-4 animate-spin" /> : null}
          {editing ? "Save changes" : "Add to my fleet"}
        </button>
        <button type="button" onClick={() => router.back()} className="h-12 rounded-sm border border-border px-5 text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
