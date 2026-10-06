import type { Metadata } from "next"
import { CalendarCheckIcon, ClipboardCheckIcon, PhoneCallIcon, RadioTowerIcon, WrenchIcon } from "lucide-react"
import { MessengerIcon, ViberIcon } from "@/components/brand/channel-icons"
import { BookingForm } from "@/components/booking/booking-form"
import { branches } from "@/lib/config/branches"
import { contactLinks, siteConfig } from "@/lib/config/site"
import { getPartModels, getServices, getTruckFacets } from "@/server/queries/catalog"

export const metadata: Metadata = {
  title: "Book a Service — Maintenance, Diagnostics & Repairs",
  description:
    "Book preventive maintenance, computer diagnostics, brake, clutch and engine repairs for your JAC truck at any of 7 JAC Motors branches. Breakdown? Call our 24/7 line.",
  alternates: { canonical: "/book-service" },
}

const steps = [
  { icon: ClipboardCheckIcon, title: "Request", text: "Tell us about your truck and pick a preferred slot." },
  { icon: CalendarCheckIcon, title: "Confirm", text: "A service advisor confirms by call or SMS." },
  { icon: WrenchIcon, title: "Drop off", text: "Check in at the branch — your job order opens." },
  { icon: RadioTowerIcon, title: "Track live", text: "Status updates by email and in your customer portal." },
]

export default async function BookServicePage(props: PageProps<"/book-service">) {
  const sp = await props.searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const [services, facets, partModels] = await Promise.all([getServices(), getTruckFacets(), getPartModels()])

  const serviceParam = one(sp.service)
  const branchParam = one(sp.branch)
  const modelParam = one(sp.model)?.slice(0, 60)
  const breakdown = one(sp.breakdown) === "1"
  const models = [...new Set([...facets.models.map((m) => m.value), ...partModels])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  return (
    <>
      <section className="dark grain relative overflow-hidden bg-asphalt text-concrete">
        <div className="grid-lines absolute inset-0 text-white opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-[1440px] px-4 pt-12 pb-12 sm:px-6 sm:pt-16">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.22em] text-concrete/60 uppercase">
            <span className="shrink-0 rounded-[2px] bg-brand px-1.5 py-0.5 font-semibold whitespace-nowrap text-white">Service bay</span>
            <span>7 branches · Luzon &amp; Visayas</span>
          </div>
          <h1 className="mt-4 max-w-4xl text-6xl leading-[0.85] font-black uppercase sm:text-8xl">
            Book your <span className="text-brand">bay.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-concrete/75">
            Preventive maintenance, diagnostics and repairs by JAC-trained technicians, with genuine parts from our own counter.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <BookingForm
          services={services}
          models={models}
          defaults={{
            serviceSlug: services.some((s) => s.slug === serviceParam) ? serviceParam : undefined,
            branch: branches.some((b) => b.slug === branchParam) ? branchParam : undefined,
            model: modelParam,
            breakdown,
          }}
        />

        <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="How booking works">
          <div className="rounded-sm border border-border bg-card">
            <div className="hazard h-1.5" aria-hidden />
            <div className="p-6">
              <h2 className="font-mono text-[11px] font-normal tracking-[0.22em] text-muted-foreground uppercase">What happens next</h2>
              <ol className="mt-5 grid gap-5">
                {steps.map((s, i) => (
                  <li key={s.title} className="relative flex gap-4">
                    {i < steps.length - 1 ? <span className="absolute top-10 left-[19px] h-[calc(100%-1.5rem)] w-px bg-border" aria-hidden /> : null}
                    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface">
                      <s.icon className="size-4 text-brand-ink" aria-hidden />
                    </span>
                    <span>
                      <span className="block font-semibold">
                        <span className="mr-2 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                        {s.title}
                      </span>
                      <span className="text-sm text-muted-foreground">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="dark mt-4 rounded-sm bg-asphalt p-6 text-concrete">
            <p className="font-mono text-[11px] tracking-[0.22em] text-signal uppercase">Breakdown? Skip the form</p>
            <a href={contactLinks.tel(siteConfig.contact.breakdownPhone)} className="mt-3 flex items-center gap-3 font-display text-3xl font-extrabold">
              <PhoneCallIcon className="size-6 text-brand" /> {siteConfig.contact.breakdownPhoneDisplay}
            </a>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={contactLinks.viber(siteConfig.contact.viber)} className="inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-white/15 text-sm hover:border-white/40">
                <ViberIcon className="size-4" /> Viber
              </a>
              <a
                href={contactLinks.messenger(siteConfig.contact.messengerHandle)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-white/15 text-sm hover:border-white/40"
              >
                <MessengerIcon className="size-4" /> Messenger
              </a>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-concrete/55">Send your location pin, plate number and a photo — we&apos;ll triage remotely and dispatch help.</p>
          </div>
        </aside>
      </div>
    </>
  )
}
