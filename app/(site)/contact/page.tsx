import type { Metadata } from "next"
import { MailIcon, PhoneCallIcon } from "lucide-react"
import { FacebookIcon, MessengerIcon, ViberIcon } from "@/components/brand/channel-icons"
import { BranchDirectory } from "@/components/contact/branch-directory"
import { JsonLd } from "@/components/shared/json-ld"
import { branches } from "@/lib/config/branches"
import { contactLinks, siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: "Contact & Branches",
  description:
    "Contact JAC Motors Philippines: 7 branches in Quezon City, Parañaque, Cavite, Pampanga and Tacloban. Phone, Viber, Messenger, branch hours and directions.",
  alternates: { canonical: "/contact" },
}

export default function ContactPage() {
  const { contact } = siteConfig
  const channels = [
    { icon: PhoneCallIcon, label: "Call head office", value: contact.phoneDisplay, href: contactLinks.tel(contact.phone) },
    { icon: ViberIcon, label: "Viber", value: "Chat with us", href: contactLinks.viber(contact.viber) },
    { icon: MessengerIcon, label: "Messenger", value: `@${contact.messengerHandle}`, href: contactLinks.messenger(contact.messengerHandle), external: true },
    { icon: MailIcon, label: "Email", value: contact.email, href: `mailto:${contact.email}` },
    { icon: FacebookIcon, label: "Facebook", value: "JAC Motors PH", href: siteConfig.social.facebook, external: true },
  ]

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": branches.map((b) => ({
            "@type": ["AutoDealer", "AutoRepair"],
            "@id": `${siteConfig.url}/contact#${b.slug}`,
            name: `JAC Motors ${b.name}`,
            parentOrganization: { "@id": `${siteConfig.url}/#dealer` },
            telephone: b.phone ?? b.mobile ?? undefined,
            address: { "@type": "PostalAddress", streetAddress: b.address, addressLocality: b.city, addressRegion: b.province, addressCountry: "PH" },
            geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng },
            openingHoursSpecification: Object.entries(b.hours)
              .filter(([, h]) => h)
              .map(([d, h]) => ({
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][Number(d)],
                opens: h!.open,
                closes: h!.close,
              })),
          })),
        }}
      />

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[1440px] px-4 pt-12 pb-10 sm:px-6 sm:pt-16">
          <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">Contact</p>
          <h1 className="mt-4 text-6xl leading-[0.85] font-black uppercase sm:text-8xl">
            Talk to a <span className="text-brand">person.</span>
          </h1>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
            {channels.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex h-full flex-col gap-3 bg-card p-5 transition-colors hover:bg-muted"
                >
                  <c.icon className="size-5 text-brand-ink" aria-hidden />
                  <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{c.label}</span>
                  <span className="font-semibold break-all group-hover:text-brand-ink">{c.value}</span>
                </a>
              </li>
            ))}
          </ul>
          <a
            href={contactLinks.tel(contact.breakdownPhone)}
            className="mt-4 flex items-center justify-between gap-4 rounded-sm bg-brand px-5 py-4 text-white"
          >
            <span className="font-wide text-xs font-bold tracking-[0.14em] uppercase">Breakdown? 24/7 line</span>
            <span className="font-mono text-lg">{contact.breakdownPhoneDisplay}</span>
          </a>
        </div>
      </section>

      <section className="py-12 sm:py-16" aria-labelledby="branches-heading">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <h2 id="branches-heading" className="mb-8 text-4xl font-extrabold uppercase sm:text-5xl">
            {branches.length} branches
          </h2>
          <BranchDirectory />
        </div>
      </section>
    </>
  )
}
