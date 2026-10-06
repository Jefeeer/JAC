"use client"

import { useConfirm } from "@/components/shared/confirm"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckIcon, LoaderIcon } from "lucide-react"
import { Field, TextInput } from "@/components/forms/controls"
import { companySchema, profileSchema } from "@/lib/validation/portal"
import { saveCompany, updateProfile } from "@/server/actions/portal"

function SaveBar({ pending, saved, error, label }: { pending: boolean; saved: boolean; error: string | null; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-sm bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60">
        {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} {label}
      </button>
      {saved ? (
        <span className="inline-flex items-center gap-1.5 text-sm text-success" role="status">
          <CheckIcon className="size-4" /> Saved
        </span>
      ) : null}
      {error ? (
        <span className="text-sm text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

export function ProfileForm({ initial, email }: { initial: z.input<typeof profileSchema>; email: string }) {
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirm = useConfirm()
  const { register, handleSubmit, formState } = useForm<z.input<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: initial })
  return (
    <form
      onSubmit={handleSubmit(async (v) => {
        if (!(await confirm({ title: "Save your profile?", description: "Your name and phone are used on bookings, quotes and job updates.", confirmLabel: "Save profile" }))) return
        start(async () => {
          setSaved(false)
          const res = await updateProfile(v)
          if (res.ok) setSaved(true)
          else setError(res.error)
        })
      })}
      className="grid gap-5"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={formState.errors.fullName?.message}>
          {(a) => <TextInput {...a} {...register("fullName")} autoComplete="name" placeholder="Juan dela Cruz" />}
        </Field>
        <Field label="Mobile number" optional error={formState.errors.phone?.message} hint="Used for booking confirmations and job SMS.">
          {(a) => <TextInput {...a} {...register("phone")} type="tel" autoComplete="tel" placeholder="0917 123 4567" />}
        </Field>
        <Field label="Email" hint="Your sign-in address. Contact us to change it.">
          {(a) => <TextInput {...a} value={email} readOnly disabled />}
        </Field>
      </div>
      <SaveBar pending={pending} saved={saved} error={error} label="Save profile" />
    </form>
  )
}

export function CompanyForm({ initial, exists }: { initial: z.input<typeof companySchema>; exists: boolean }) {
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirm = useConfirm()
  const { register, handleSubmit, formState } = useForm<z.input<typeof companySchema>>({ resolver: zodResolver(companySchema), defaultValues: initial })
  const e = formState.errors
  return (
    <form
      onSubmit={handleSubmit(async (v) => {
        if (!(await confirm({ title: "Save company details?", description: "These appear on your quotations and invoices (bill-to name, TIN, address).", confirmLabel: "Save company" }))) return
        start(async () => {
          setSaved(false)
          setError(null)
          const res = await saveCompany(v)
          if (res.ok) setSaved(true)
          else setError(res.error)
        })
      })}
      className="grid gap-5"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company name" error={e.name?.message} className="sm:col-span-2">
          {(a) => <TextInput {...a} {...register("name")} autoComplete="organization" placeholder="e.g. Dela Cruz Trucking Services" />}
        </Field>
        <Field label="TIN" optional error={e.tin?.message} hint="For invoices.">
          {(a) => <TextInput {...a} {...register("tin")} className="font-mono" placeholder="000-000-000-000" />}
        </Field>
        <Field label="Industry" optional error={e.industry?.message}>
          {(a) => <TextInput {...a} {...register("industry")} placeholder="Logistics, construction, LGU…" />}
        </Field>
        <Field label="Fleet size" optional error={e.fleetSize?.message}>
          {(a) => <TextInput {...a} {...register("fleetSize")} inputMode="numeric" placeholder="e.g. 12" />}
        </Field>
        <Field label="Company phone" optional error={e.phone?.message}>
          {(a) => <TextInput {...a} {...register("phone")} type="tel" placeholder="(02) 8123-4567" />}
        </Field>
        <Field label="Billing email" optional error={e.email?.message}>
          {(a) => <TextInput {...a} {...register("email")} type="email" placeholder="billing@company.ph" />}
        </Field>
        <Field label="Address" optional error={e.address?.message} className="sm:col-span-2">
          {(a) => <TextInput {...a} {...register("address")} autoComplete="street-address" placeholder="e.g. 123 EDSA, Brgy. Balintawak" />}
        </Field>
        <Field label="City" optional error={e.city?.message}>
          {(a) => <TextInput {...a} {...register("city")} placeholder="e.g. Quezon City" />}
        </Field>
        <Field label="Province" optional error={e.province?.message}>
          {(a) => <TextInput {...a} {...register("province")} placeholder="e.g. Metro Manila" />}
        </Field>
      </div>
      <SaveBar pending={pending} saved={saved} error={error} label={exists ? "Save company" : "Create company account"} />
    </form>
  )
}
