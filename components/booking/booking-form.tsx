"use client"

import { useConfirm } from "@/components/shared/confirm"
import { useCallback, useEffect, useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRightIcon, LoaderIcon, PhoneCallIcon, SirenIcon } from "lucide-react"
import { ConsentCheckbox, Field, Honeypot, NativeSelect, SubmittedStub, TextArea, TextInput } from "@/components/forms/controls"
import { PhotoUpload } from "@/components/forms/photo-upload"
import { branches, type Branch } from "@/lib/config/branches"
import { contactLinks, siteConfig } from "@/lib/config/site"
import { cn } from "@/lib/utils"
import { TIME_SLOT_OPTIONS, bookingDateBounds, bookingSchema, validateBookingDate, weekdayOf, type BookingInput } from "@/lib/validation/booking"
import { submitBooking } from "@/server/actions/bookings"
import type { Service, ServiceCategory } from "@/types/domain"

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  preventive_maintenance: "Preventive maintenance",
  diagnostics: "Diagnostics & troubleshooting",
  repair: "Repairs",
  overhaul: "Overhaul",
  package: "Packages",
  roadside: "Roadside",
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function hoursSummary(b: Branch) {
  const open = Object.entries(b.hours).filter(([, h]) => h)
  const closed = Object.entries(b.hours)
    .filter(([, h]) => !h)
    .map(([d]) => DAYS[Number(d)])
  const first = open[0]?.[1]
  return `${first ? `${first.open}–${first.close}` : ""}${closed.length ? ` · closed ${closed.join(", ")}` : ""}`
}

function Step({ no, title, sub, children }: { no: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <fieldset className="relative grid gap-5 border-t border-border pt-8">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-baseline gap-4" aria-hidden>
        <span className="font-mono text-sm text-brand-ink">{no}</span>
        <span className="font-display text-3xl font-extrabold uppercase">{title}</span>
        {sub ? <span className="hidden text-sm text-muted-foreground sm:inline">{sub}</span> : null}
      </div>
      {children}
    </fieldset>
  )
}

export function BookingForm({
  services,
  models,
  defaults,
}: {
  services: Service[]
  models: string[]
  defaults: { serviceSlug?: string; model?: string; breakdown?: boolean; branch?: string }
}) {
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState<{ reference: string; isBreakdown: boolean } | null>(null)
  const [bounds, setBounds] = useState<{ min: string; max: string } | null>(null)

  const form = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      branch: defaults.branch ?? "",
      isBreakdown: Boolean(defaults.breakdown),
      truckMake: "JAC",
      truckModel: defaults.model ?? "",
      truckYear: "" as unknown as undefined,
      plateNumber: "",
      mileageKm: "" as unknown as undefined,
      serviceSlug: defaults.serviceSlug ?? (defaults.breakdown ? "roadside-assistance" : ""),
      issue: "",
      preferredDate: "",
      timeSlot: undefined,
      photoPaths: [],
      website: "",
      startedAt: 0,
      consent: false as unknown as true,
    },
  })
  const { register, handleSubmit, formState, setError, setValue, control, reset, trigger, getValues } = form
  const e = formState.errors
  const [isBreakdown, branchSlug, preferredDate] = useWatch({ control, name: ["isBreakdown", "branch", "preferredDate"] })
  const branch = branches.find((b) => b.slug === branchSlug)

  useEffect(() => setValue("startedAt", Date.now()), [setValue])
  // Date bounds depend on "now" — compute on the client after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- "now"-dependent bounds must be client-only
  useEffect(() => setBounds(bookingDateBounds(Boolean(isBreakdown))), [isBreakdown])
  // Re-check the date when branch / breakdown changes (closed days differ per branch).
  useEffect(() => {
    if (getValues("preferredDate")) void trigger("preferredDate")
  }, [branchSlug, isBreakdown, trigger, getValues])

  const onPhotos = useCallback((paths: string[]) => setValue("photoPaths", paths), [setValue])

  const confirm = useConfirm()
  const onSubmit = handleSubmit(async (values) => {
    const svc = services.find((s) => s.slug === values.serviceSlug)
    const ok = await confirm({
      title: values.isBreakdown ? "Send breakdown request?" : "Request this service slot?",
      description: values.isBreakdown
        ? "A service advisor is alerted immediately and will call you back. For anything urgent, call the 24/7 line too."
        : "A service advisor confirms the slot by phone or email — usually within the same business day.",
      tone: values.isBreakdown ? "danger" : "default",
      icon: "send",
      details: [
        ["Truck", [values.truckMake, values.truckModel, values.plateNumber].filter(Boolean).join(" ")],
        ["Service", svc?.name ?? (values.isBreakdown ? "Breakdown / roadside" : "General check")],
        ["Branch", branches.find((b) => b.slug === values.branch)?.name ?? values.branch],
        ["When", `${values.preferredDate} · ${TIME_SLOT_OPTIONS.find((t) => t.value === values.timeSlot)?.label ?? values.timeSlot}`],
        ["Contact", `${values.name} · ${values.phone}`],
      ],
      confirmLabel: values.isBreakdown ? "Send request" : "Book slot",
    })
    if (!ok) return
    setServerError(null)
    startTransition(async () => {
      const result = await submitBooking(values)
      if (result.ok) {
        setDone(result.data)
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
      }
      setServerError(result.error)
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof BookingInput, { message: messages[0] })
      }
    })
  })

  if (done) {
    return (
      <div className="grid gap-4">
        {done.isBreakdown ? (
          <a
            href={contactLinks.tel(siteConfig.contact.breakdownPhone)}
            className="flex items-center justify-between gap-4 rounded-sm bg-brand p-5 text-white"
          >
            <span>
              <span className="block font-mono text-[11px] tracking-[0.2em] uppercase opacity-80">Still stranded? Don&apos;t wait</span>
              <span className="mt-1 block font-display text-3xl font-extrabold uppercase">Call {siteConfig.contact.breakdownPhoneDisplay}</span>
            </span>
            <PhoneCallIcon className="size-8" />
          </a>
        ) : null}
        <SubmittedStub
          reference={done.reference === "BK-RECEIVED" ? "Q-RECEIVED" : done.reference}
          title={done.isBreakdown ? "Breakdown logged" : "Booking requested"}
          body={
            done.isBreakdown
              ? "Our service team has been alerted and will call you shortly to triage and dispatch help."
              : "A service advisor will confirm your slot by call or SMS during branch hours. We've emailed you a copy."
          }
          onReset={() => {
            reset()
            setDone(null)
            setValue("startedAt", Date.now())
          }}
        />
      </div>
    )
  }

  const dateHint = preferredDate && branch && !validateBookingDate(preferredDate, branch.slug, Boolean(isBreakdown))
    ? `${DAYS[weekdayOf(preferredDate)]} at ${branch.name}`
    : branch
      ? `${branch.name}: ${hoursSummary(branch)}`
      : "Choose a branch first to see its hours."

  return (
    <form onSubmit={onSubmit} noValidate className="relative grid gap-10">
      <Honeypot {...register("website")} />

      {/* Breakdown switch */}
      <label
        className={cn(
          "flex cursor-pointer items-start gap-4 rounded-sm border p-5 transition-colors",
          isBreakdown ? "border-brand bg-brand/10" : "border-border hover:border-foreground/30",
        )}
      >
        <input type="checkbox" {...register("isBreakdown")} className="peer sr-only" />
        <span
          aria-hidden
          className="relative mt-1 h-6 w-11 shrink-0 rounded-full bg-input transition-colors after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-background after:shadow after:transition-transform peer-checked:bg-brand peer-checked:after:translate-x-5 peer-focus-visible:ring-3 peer-focus-visible:ring-brand/30"
        />
        <span className="flex-1">
          <span className="flex items-center gap-2 font-semibold">
            <SirenIcon className={cn("size-4", isBreakdown ? "text-brand-ink" : "text-muted-foreground")} aria-hidden /> This is a breakdown
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">Truck won&apos;t start, warning lights, stuck on the road — we prioritise these.</span>
          {isBreakdown ? (
            <a
              href={contactLinks.tel(siteConfig.contact.breakdownPhone)}
              className="mt-3 inline-flex items-center gap-2 rounded-sm bg-brand px-4 py-2.5 text-sm font-semibold text-white"
              onClick={(ev) => ev.stopPropagation()}
            >
              <PhoneCallIcon className="size-4" /> Fastest: call {siteConfig.contact.breakdownPhoneDisplay}
            </a>
          ) : null}
        </span>
      </label>

      <Step no="01" title="You" sub="So we can confirm your slot">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" error={e.name?.message}>
            {(a) => <TextInput {...a} {...register("name")} autoComplete="name" />}
          </Field>
          <Field label="Company / fleet" optional error={e.company?.message}>
            {(a) => <TextInput {...a} {...register("company")} autoComplete="organization" />}
          </Field>
          <Field label="Mobile number" error={e.phone?.message} hint="We confirm bookings by call or SMS.">
            {(a) => <TextInput {...a} {...register("phone")} type="tel" autoComplete="tel" placeholder="0917 123 4567" />}
          </Field>
          <Field label="Email" error={e.email?.message}>
            {(a) => <TextInput {...a} {...register("email")} type="email" autoComplete="email" />}
          </Field>
        </div>
      </Step>

      <Step no="02" title="Truck" sub="Make, model, plate and odometer">
        <div className="grid gap-5 sm:grid-cols-[1fr_1.4fr_0.8fr]">
          <Field label="Make" error={e.truckMake?.message}>
            {(a) => <TextInput {...a} {...register("truckMake")} />}
          </Field>
          <Field label="Model" error={e.truckModel?.message}>
            {(a) => (
              <>
                <TextInput {...a} {...register("truckModel")} list="jac-models" placeholder="e.g. N55, T8 Pro" autoComplete="off" />
                <datalist id="jac-models">
                  {models.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Year" optional error={e.truckYear?.message}>
            {(a) => <TextInput {...a} {...register("truckYear")} inputMode="numeric" maxLength={4} placeholder="2022" />}
          </Field>
          <Field label="Plate number" optional error={e.plateNumber?.message} className="sm:col-span-1">
            {(a) => <TextInput {...a} {...register("plateNumber")} className="font-mono uppercase" autoCapitalize="characters" placeholder="NAD 6513" />}
          </Field>
          <Field label="Odometer (km)" optional error={e.mileageKm?.message} className="sm:col-span-2">
            {(a) => <TextInput {...a} {...register("mileageKm")} inputMode="numeric" className="font-mono" placeholder="48,000" />}
          </Field>
        </div>
      </Step>

      <Step no="03" title="Issue" sub="What do you need?">
        <Field label="Service" optional error={e.serviceSlug?.message}>
          {(a) => (
            <NativeSelect {...a} {...register("serviceSlug")}>
              <option value="">Not sure — please diagnose</option>
              {Object.entries(
                services.reduce<Record<string, Service[]>>((acc, s) => {
                  ;(acc[s.category] ??= []).push(s)
                  return acc
                }, {}),
              ).map(([cat, list]) => (
                <optgroup key={cat} label={CATEGORY_LABELS[cat as ServiceCategory] ?? cat}>
                  {list.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Describe the issue" error={e.issue?.message}>
          {(a) => (
            <TextArea
              {...a}
              {...register("issue")}
              rows={5}
              placeholder={
                isBreakdown
                  ? "Where are you? (landmark / km marker) What happened — won't start, overheating, flat tyre, warning light…"
                  : "e.g. Due for 40,000 km PMS. Squealing from rear brakes when loaded. Check-engine light came on last week."
              }
            />
          )}
        </Field>
        <div>
          <p className="mb-2 font-mono text-[11px] tracking-[0.16em] uppercase">
            Photos <span className="text-[10px] tracking-wider text-muted-foreground normal-case">optional</span>
          </p>
          <PhotoUpload onChange={onPhotos} onBusyChange={setUploading} hint="photos of the damage, leak, warning lights or dashboard" />
        </div>
      </Step>

      <Step no="04" title="When & where" sub="Your preferred drop-off">
        <Field label="Branch" error={e.branch?.message}>
          {(a) => (
            <NativeSelect {...a} {...register("branch")}>
              <option value="">Choose a branch</option>
              {branches.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name} — {b.city}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Preferred date" error={e.preferredDate?.message} hint={dateHint}>
          {(a) => <TextInput {...a} {...register("preferredDate")} type="date" min={bounds?.min} max={bounds?.max} className="font-mono" />}
        </Field>
        <fieldset>
          <legend className="font-mono text-[11px] tracking-[0.16em] uppercase">Time slot</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIME_SLOT_OPTIONS.map((slot) => (
              <label key={slot.value} className="cursor-pointer">
                <input type="radio" value={slot.value} {...register("timeSlot")} className="peer sr-only" />
                <span className="flex h-full flex-col rounded-sm border border-border px-4 py-3 transition-colors peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-brand/30 hover:border-foreground/40">
                  <span className="font-mono text-sm font-semibold">{slot.label}</span>
                  <span className="text-xs opacity-70">{slot.sub}</span>
                </span>
              </label>
            ))}
          </div>
          {e.timeSlot?.message ? (
            <p className="mt-1.5 text-xs font-medium text-destructive" role="alert">
              {e.timeSlot.message}
            </p>
          ) : null}
        </fieldset>
      </Step>

      <div className="grid gap-5 border-t border-border pt-8">
        <ConsentCheckbox {...register("consent")} error={e.consent?.message} />

        {serverError ? (
          <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            {serverError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || uploading}
          className={cn(
            "shutter group inline-flex h-16 items-center justify-between gap-3 rounded-sm px-6 font-wide text-sm font-bold tracking-[0.14em] uppercase transition-colors disabled:opacity-70 sm:min-w-80 sm:justify-self-start",
            isBreakdown ? "bg-brand text-white" : "bg-foreground text-background hover:text-white",
          )}
        >
          {pending ? "Sending…" : uploading ? "Uploading photos…" : isBreakdown ? "Send breakdown request" : "Request booking"}
          {pending || uploading ? <LoaderIcon className="size-5 animate-spin" /> : <ArrowRightIcon className="size-5 transition-transform group-hover:translate-x-1" />}
        </button>
        <p className="text-xs text-muted-foreground">Bookings are confirmed by a service advisor by call, SMS or email.</p>
      </div>
    </form>
  )
}
