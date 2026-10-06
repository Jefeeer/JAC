import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { SectionHeading } from "@/components/shared/section-heading"
import { branches } from "@/lib/config/branches"

export const metadata: Metadata = {
  title: "About JAC Motors Philippines",
  description:
    "JAC Motors Philippines sells, services and supports JAC trucks and pickups through 7 branches in Metro Manila, Cavite, Pampanga and Leyte. Built to keep you moving.",
  alternates: { canonical: "/about" },
}

const principles = [
  { no: "01", title: "Partner, not seller", text: "We measure success in kilometres you drive after the sale — not in units we move off the floor." },
  { no: "02", title: "Uptime first", text: "Parts on the shelf, bays that open on time and a breakdown line that answers. Downtime is the enemy." },
  { no: "03", title: "Straight talk", text: "A written diagnosis and a quote before any wrench turns. No surprises on the invoice." },
  { no: "04", title: "Close to the road", text: "Seven branches along the routes our customers actually drive — from EDSA to the Pan-Philippine Highway." },
]

export default function AboutPage() {
  return (
    <>
      <section className="dark grain relative overflow-hidden bg-asphalt text-concrete">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="font-mono text-[11px] tracking-[0.22em] text-concrete/60 uppercase">About JAC Motors</p>
            <h1 className="mt-4 text-6xl leading-[0.85] font-black uppercase sm:text-8xl">
              We keep the country&apos;s <span className="text-brand">cargo</span> moving.
            </h1>
          </div>
          <p className="max-w-lg text-lg leading-relaxed text-concrete/75">
            JAC Motors Philippines sells, services and supports JAC trucks and pickups for the people who keep goods, food and materials moving — from
            single-truck owners to logistics fleets and LGUs.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {["/images/jac-light-truck-ph.webp", "/images/workshop-suspension.webp", "/images/jac-heavy-cargo-8x4.webp"].map((src) => (
            <div key={src} className="relative aspect-[4/3]">
              <Image src={src} alt="" fill sizes="33vw" className="object-cover" />
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <SectionHeading bay="01" label="The brand" title="Built by JAC. Backed here." />
          <div className="grid gap-5 text-lg leading-relaxed">
            <p>
              JAC — Anhui Jianghuai Automobile — has built commercial vehicles in Hefei, China since 1964, and its light and medium trucks work in markets
              across Asia, Africa and Latin America.
            </p>
            <p>
              Here in the Philippines, our job is everything that happens around the truck: helping you pick the right configuration, financing it, registering
              it, and then keeping it on the road for years with genuine parts and a service network that knows it inside out.
            </p>
            <p className="text-muted-foreground">That&apos;s what &ldquo;Built to Keep You Moving&rdquo; means to us.</p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface py-16 sm:py-24" aria-labelledby="principles">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeading bay="02" label="How we work" title={<span id="principles">Four rules on the workshop wall.</span>} />
          <ol className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
            {principles.map((p) => (
              <li key={p.no} className="rivets bg-card p-7 [--rivet:color-mix(in_oklch,var(--foreground)_18%,transparent)]">
                <span className="font-display text-5xl font-black text-brand">{p.no}</span>
                <h3 className="mt-4 font-display text-2xl font-extrabold uppercase">{p.title}</h3>
                <p className="mt-2 text-muted-foreground">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-16 sm:py-24" aria-labelledby="network">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeading
            bay="03"
            label="Branch network"
            title={<span id="network">{branches.length} branches. Sales, parts and service at each.</span>}
            action={{ href: "/contact", label: "Find a branch" }}
          />
          <ul className="mt-10 flex flex-wrap gap-2">
            {branches.map((b) => (
              <li key={b.slug}>
                <Link href={`/contact#${b.slug}`} className="inline-flex items-baseline gap-2 rounded-sm border border-border px-4 py-3 hover:border-brand">
                  <span className="font-mono text-xs text-brand-ink">{b.code}</span>
                  <span className="font-semibold">{b.name}</span>
                  <span className="text-sm text-muted-foreground">{b.city}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link href="/trucks" className="shutter inline-flex h-14 items-center gap-3 rounded-sm bg-foreground px-6 font-wide text-xs font-bold tracking-[0.14em] text-background uppercase hover:text-white">
              See the trucks <ArrowRightIcon className="size-4" />
            </Link>
            <Link href="/services" className="inline-flex h-14 items-center rounded-sm border border-border px-6 text-sm font-medium">
              Our service menu
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
