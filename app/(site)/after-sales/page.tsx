import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon, BellRingIcon, CheckIcon, CogIcon, LifeBuoyIcon, PlusIcon, ShieldCheckIcon, WrenchIcon } from "lucide-react"
import { JsonLd } from "@/components/shared/json-ld"
import { SectionHeading } from "@/components/shared/section-heading"
import { claimSteps, faqs, warrantyKeepsValid } from "@/lib/content/after-sales"
import { contactLinks, siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: "After-Sales Support & Warranty",
  description:
    "JAC Motors after-sales: warranty support, genuine parts, scheduled maintenance, a 24/7 breakdown line and a customer portal that tracks every truck you own.",
  alternates: { canonical: "/after-sales" },
}

const pillars = [
  { icon: ShieldCheckIcon, title: "Warranty support", text: "We handle claims end-to-end at any branch — diagnosis, assessment and repair." },
  { icon: CogIcon, title: "Genuine parts", text: "Counter stock at every branch, searchable online, reserved in minutes." },
  { icon: WrenchIcon, title: "Service network", text: "7 service bays across Metro Manila, Cavite, Pampanga and Leyte." },
  { icon: LifeBuoyIcon, title: "Breakdown line", text: "Call, Viber or Messenger — remote triage, dispatch and towing coordination." },
  { icon: BellRingIcon, title: "Fleet portal", text: "Live job tracking, service history per unit and maintenance reminders." },
]

export default function AfterSalesPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />

      <section className="dark grain relative overflow-hidden bg-asphalt text-concrete">
        <Image src="/images/road-slex.webp" alt="" fill priority sizes="100vw" className="object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-asphalt via-asphalt/80 to-asphalt/20" aria-hidden />
        <div className="relative mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-28">
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.22em] text-concrete/60 uppercase">
            <span className="shrink-0 rounded-[2px] bg-brand px-1.5 py-0.5 font-semibold whitespace-nowrap text-white">After-sales</span>
            <span>Warranty · Parts · Service · Roadside</span>
          </div>
          <h1 className="mt-4 max-w-4xl text-6xl leading-[0.85] font-black uppercase sm:text-8xl">
            The sale is <span className="text-brand">day one.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-concrete/75">
            A truck earns money only when it&apos;s moving. Everything after the handover — warranty, parts, maintenance, breakdowns — is built to keep it that way.
          </p>
        </div>
      </section>

      <section className="border-b border-border" aria-label="What's included">
        <ul className="mx-auto grid max-w-[1440px] sm:grid-cols-2 lg:grid-cols-5">
          {pillars.map((p, i) => (
            <li key={p.title} className={`flex flex-col gap-3 border-border px-4 py-8 sm:px-6 ${i ? "border-t sm:border-t-0 sm:border-l" : ""}`}>
              <p.icon className="size-6 text-brand-ink" aria-hidden />
              <h2 className="font-display text-2xl font-extrabold uppercase">{p.title}</h2>
              <p className="text-sm text-muted-foreground">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="warranty">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionHeading
              bay="W"
              label="Warranty"
              title={<span id="warranty">Covered, and kept that way.</span>}
              description="Every new JAC truck comes with the manufacturer's warranty. Terms vary by model and component — they're explained at release and printed in your warranty booklet. Here's how to keep coverage valid:"
            />
            <ul className="mt-8 grid gap-3">
              {warrantyKeepsValid.map((w) => (
                <li key={w} className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 size-5 shrink-0 text-brand-ink" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-sm border border-border bg-card p-6 sm:p-8">
            <h3 className="font-mono text-[11px] font-normal tracking-[0.22em] text-muted-foreground uppercase">Making a claim</h3>
            <ol className="mt-6 grid gap-6">
              {claimSteps.map((s, i) => (
                <li key={s.title} className="flex gap-5">
                  <span className="font-display text-4xl leading-none font-black text-brand">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block font-semibold">{s.title}</span>
                    <span className="text-sm text-muted-foreground">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link href="/book-service" className="shutter mt-8 inline-flex h-12 items-center gap-3 rounded-sm bg-foreground px-5 font-wide text-xs font-bold tracking-[0.14em] text-background uppercase hover:text-white">
              Start a claim <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface py-16 sm:py-20" aria-labelledby="faq">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
          <SectionHeading bay="?" label="FAQ" title={<span id="faq">Straight answers.</span>} />
          <div className="divide-y divide-border border-y border-border">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold">
                  {f.q}
                  <PlusIcon className="mt-1 size-5 shrink-0 transition-transform group-open:rotate-45" aria-hidden />
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <h2 className="max-w-2xl text-5xl leading-[0.9] font-black uppercase sm:text-6xl">Put your whole fleet on one dashboard.</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="shutter inline-flex h-14 items-center gap-3 rounded-sm bg-brand px-6 font-wide text-xs font-bold tracking-[0.14em] text-white uppercase">
              Open customer portal <ArrowRightIcon className="size-4" />
            </Link>
            <a href={contactLinks.tel(siteConfig.contact.phone)} className="inline-flex h-14 items-center rounded-sm border border-border px-6 text-sm font-medium">
              Talk to us
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
