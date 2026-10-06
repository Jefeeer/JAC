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
import { partSchema, type PartForm as PartFormValues } from "@/lib/validation/admin"
import { savePartAction } from "@/server/actions/admin"

export function PartEditor({ initial, categories }: { initial?: PartFormValues; categories: { slug: string; name: string }[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const confirm = useConfirm()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const { register, handleSubmit, formState, setError, getValues } = useForm<PartFormValues, unknown, z.output<typeof partSchema>>({
    resolver: zodResolver(partSchema),
    defaultValues: initial ?? { brand: "JAC Genuine", unit: "pc", stockQty: 0, reorderLevel: 5, isPublished: true, categorySlug: categories[0]?.slug },
  })
  const e = formState.errors as Record<string, { message?: string } | undefined>
  const T = (name: keyof PartFormValues, label: string, o: { optional?: boolean; mono?: boolean; hint?: string; numeric?: boolean; span?: boolean } = {}) => (
    <Field label={label} optional={o.optional} hint={o.hint} error={e[name]?.message} className={o.span ? "sm:col-span-2" : undefined}>
      {(a) => <TextInput {...a} {...register(name)} inputMode={o.numeric ? "decimal" : undefined} className={o.mono ? "font-mono" : undefined} />}
    </Field>
  )

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async () => {
        const v = getValues()
        const ok = await confirm({
          title: initial?.id ? "Save changes to this part?" : "Create this part?",
          description: v.isPublished ? "Shown on the website parts catalog right away." : "Saved as hidden from the website.",
          details: [
            ["Part", `${String(v.partNumber ?? "")} · ${String(v.name ?? "")}`],
            ["Price", v.priceOnRequest ? "On request" : v.price ? `₱${String(v.price)}` : "—"],
            ["On hand", String(v.stockQty ?? 0)],
          ],
          confirmLabel: initial?.id ? "Save changes" : "Create part",
        })
        if (!ok) return
        start(async () => {
          setMsg(null)
          // send raw inputs — the server action re-validates with the same schema
          const res = await savePartAction(getValues())
          if (!res.ok) {
            setMsg({ ok: false, text: res.error })
            for (const [k, m] of Object.entries(res.fieldErrors ?? {})) if (m?.[0]) setError(k as keyof PartFormValues, { message: m[0] })
            return
          }
          setMsg({ ok: true, text: "Saved" })
          if (!initial?.id) router.push(`/admin/parts/${res.data?.id}`)
          router.refresh()
        })
      })}
      className="grid gap-5"
    >
      {initial?.id ? <input type="hidden" {...register("id")} /> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <fieldset className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
          <legend className="px-1 font-display text-lg font-extrabold uppercase">Part</legend>
          {T("partNumber", "Part number", { mono: true })}
          {T("oemNumber", "OEM number", { optional: true, mono: true })}
          {T("name", "Name", { span: true })}
          <Field label="Category" error={e.categorySlug?.message}>
            {(a) => (
              <NativeSelect {...a} {...register("categorySlug")}>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          {T("brand", "Brand")}
          {T("slug", "URL slug", { optional: true, mono: true, hint: "Blank = generated", span: true })}
          {T("imageUrl", "Image URL", { optional: true, hint: "/images/… or a storage URL", span: true })}
        </fieldset>

        <fieldset className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
          <legend className="px-1 font-display text-lg font-extrabold uppercase">Price & stock</legend>
          {T("price", "Price (₱, VAT incl.)", { optional: true, numeric: true, mono: true })}
          {T("unit", "Sold per", { hint: "pc, set, kit, pail…" })}
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" {...register("priceOnRequest")} className="size-4 accent-[var(--brand)]" /> Price on request
          </label>
          {T("stockQty", "On hand", { numeric: true, mono: true })}
          {T("reorderLevel", "Reorder level", { numeric: true, mono: true, hint: "“Low stock” at or below this" })}
          {T("leadTimeDays", "Lead time (days)", { optional: true, numeric: true, mono: true, hint: "Shown when out of stock" })}
          {T("weightKg", "Weight (kg)", { optional: true, numeric: true, mono: true })}
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" {...register("isPublished")} className="size-4 accent-[var(--brand)]" /> Show on the website
          </label>
        </fieldset>
      </div>

      <fieldset className="grid gap-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 font-display text-lg font-extrabold uppercase">Details & fitment</legend>
        <Field label="Summary" optional error={e.summary?.message}>
          {(a) => <TextArea {...a} {...register("summary")} rows={2} />}
        </Field>
        <Field label="Description" optional>
          {(a) => <TextArea {...a} {...register("description")} rows={3} />}
        </Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Compatible models" optional hint="One per line: Model | Engine | Years — e.g. N55 | Cummins ISF 3.8 | 2019-2025">
            {(a) => <TextArea {...a} {...register("compatText")} rows={6} className="font-mono text-sm" />}
          </Field>
          <Field label="Specs" optional hint="Key: value — one per line">
            {(a) => <TextArea {...a} {...register("specsText")} rows={6} className="font-mono text-sm" />}
          </Field>
        </div>
      </fieldset>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} {initial?.id ? "Save changes" : "Create part"}
        </button>
        {msg ? <span className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</span> : null}
      </div>
    </form>
  )
}
