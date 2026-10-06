"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { LoaderIcon } from "lucide-react"
import { Field, NativeSelect, TextArea, TextInput } from "@/components/forms/controls"
import { btn } from "@/components/admin/ui"
import { useConfirm } from "@/components/shared/confirm"
import { branches } from "@/lib/config/branches"
import { BODY_TYPES, truckSchema, type TruckForm as TruckFormValues } from "@/lib/validation/admin"
import { saveTruckAction } from "@/server/actions/admin"
import { BODY_TYPE_LABELS } from "@/types/domain"

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-lg border border-border bg-card p-5">
      <legend className="px-1 font-display text-lg font-extrabold uppercase">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </fieldset>
  )
}

export function TruckEditor({ initial }: { initial?: TruckFormValues }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const confirm = useConfirm()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const { register, handleSubmit, formState, setError, getValues } = useForm<TruckFormValues, unknown, z.output<typeof truckSchema>>({
    resolver: zodResolver(truckSchema),
    defaultValues: initial ?? { brand: "JAC", condition: "new", availability: "available", bodyType: "dropside", fuelType: "diesel", year: new Date().getFullYear(), mileageKm: 0, wheelConfig: "4x2", emissionStandard: "Euro 4" },
  })
  const e = formState.errors as Record<string, { message?: string } | undefined>

  const submit = handleSubmit(async () => {
    const v = getValues()
    const ok = await confirm({
      title: initial?.id ? "Save changes to this truck?" : "Create this truck listing?",
      description: initial?.id ? "Live listings update on the website right away." : "It starts as a draft — add photos, then publish.",
      details: [
        ["Title", String(v.title ?? "")],
        ["Price", v.priceOnRequest ? "On request" : v.price ? `₱${String(v.price)}` : "—"],
        ["Status", String(v.availability ?? "")],
      ],
      confirmLabel: initial?.id ? "Save changes" : "Create truck",
    })
    if (!ok) return
    start(async () => {
      setMsg(null)
      // send raw inputs — the server action re-validates with the same schema
      const res = await saveTruckAction(getValues())
      if (!res.ok) {
        setMsg({ ok: false, text: res.error })
        for (const [k, m] of Object.entries(res.fieldErrors ?? {})) if (m?.[0]) setError(k as keyof TruckFormValues, { message: m[0] })
        return
      }
      setMsg({ ok: true, text: "Saved" })
      if (!initial?.id) router.push(`/admin/trucks/${res.data?.id}`)
      router.refresh()
    })
  })

  const T = (name: keyof TruckFormValues, label: string, opts: { optional?: boolean; hint?: string; mono?: boolean; placeholder?: string; span?: boolean; numeric?: boolean } = {}) => (
    <Field label={label} optional={opts.optional} hint={opts.hint} error={e[name]?.message} className={opts.span ? "sm:col-span-2 xl:col-span-3" : undefined}>
      {(a) => <TextInput {...a} {...register(name)} inputMode={opts.numeric ? "decimal" : undefined} placeholder={opts.placeholder} className={opts.mono ? "font-mono" : undefined} />}
    </Field>
  )

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {initial?.id ? <input type="hidden" {...register("id")} /> : null}
      <Group title="Listing">
        {T("title", "Title", { span: true, placeholder: "JAC N55 Refrigerated Van" })}
        {T("model", "Model", { placeholder: "N55" })}
        {T("series", "Series", { optional: true, placeholder: "N-Series" })}
        {T("variant", "Variant", { optional: true, placeholder: "Reefer · 14 ft" })}
        <Field label="Body type" error={e.bodyType?.message}>
          {(a) => (
            <NativeSelect {...a} {...register("bodyType")}>
              {BODY_TYPES.map((b) => (
                <option key={b} value={b}>
                  {BODY_TYPE_LABELS[b]}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        {T("year", "Year", { numeric: true, mono: true })}
        <Field label="Condition">
          {(a) => (
            <NativeSelect {...a} {...register("condition")}>
              <option value="new">New</option>
              <option value="used">Used</option>
            </NativeSelect>
          )}
        </Field>
        <Field label="Availability">
          {(a) => (
            <NativeSelect {...a} {...register("availability")}>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="incoming">Incoming</option>
              <option value="sold">Sold</option>
            </NativeSelect>
          )}
        </Field>
        <Field label="Branch" optional>
          {(a) => (
            <NativeSelect {...a} {...register("branchSlug")}>
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        {T("stockNumber", "Stock no.", { optional: true, mono: true })}
        {T("slug", "URL slug", { optional: true, mono: true, hint: "Leave blank to generate from the title" })}
        <label className="flex items-center gap-3 self-end pb-3 text-sm">
          <input type="checkbox" {...register("isFeatured")} className="size-4 accent-[var(--brand)]" /> Feature on the home page
        </label>
      </Group>

      <Group title="Pricing">
        {T("price", "Cash price (₱, VAT incl.)", { optional: true, numeric: true, mono: true })}
        <label className="flex items-center gap-3 self-end pb-3 text-sm">
          <input type="checkbox" {...register("priceOnRequest")} className="size-4 accent-[var(--brand)]" /> Show “price on request”
        </label>
      </Group>

      <Group title="Powertrain">
        {T("engine", "Engine", { optional: true, span: true })}
        {T("displacementCc", "Displacement (cc)", { optional: true, numeric: true, mono: true })}
        {T("horsepower", "Power (hp)", { optional: true, numeric: true, mono: true })}
        {T("torqueNm", "Torque (N·m)", { optional: true, numeric: true, mono: true })}
        {T("transmission", "Transmission", { optional: true })}
        {T("wheelConfig", "Drive", { optional: true, placeholder: "4x2" })}
        {T("emissionStandard", "Emission", { optional: true })}
      </Group>

      <Group title="Capacity & condition">
        {T("payloadTons", "Payload (tonnes)", { optional: true, numeric: true, mono: true })}
        {T("gvwKg", "GVW (kg)", { optional: true, numeric: true, mono: true })}
        {T("wheelbaseMm", "Wheelbase (mm)", { optional: true, numeric: true, mono: true })}
        {T("mileageKm", "Odometer (km)", { numeric: true, mono: true })}
        {T("color", "Color", { optional: true })}
      </Group>

      <fieldset className="grid gap-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 font-display text-lg font-extrabold uppercase">Content</legend>
        <Field label="Summary" optional hint="One or two sentences shown on cards and search results." error={e.summary?.message}>
          {(a) => <TextArea {...a} {...register("summary")} rows={2} />}
        </Field>
        <Field label="Description" optional error={e.description?.message}>
          {(a) => <TextArea {...a} {...register("description")} rows={5} />}
        </Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Key features" optional hint="One per line">
            {(a) => <TextArea {...a} {...register("featuresText")} rows={6} className="font-mono text-sm" />}
          </Field>
          <Field label="Extra specs" optional hint="Key: value — one per line (e.g. Body length: 14 ft)">
            {(a) => <TextArea {...a} {...register("specsText")} rows={6} className="font-mono text-sm" />}
          </Field>
        </div>
      </fieldset>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} {initial?.id ? "Save changes" : "Create truck"}
        </button>
        {msg ? <span className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</span> : null}
        {!initial?.id ? <span className="text-xs text-muted-foreground">New trucks start as drafts — add photos, then publish.</span> : null}
      </div>
    </form>
  )
}
