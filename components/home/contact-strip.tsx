import Link from "next/link"
import { ArrowRightIcon, PhoneCallIcon } from "lucide-react"
import { MessengerIcon, ViberIcon } from "@/components/brand/channel-icons"
import { contactLinks, siteConfig } from "@/lib/config/site"

export function ContactStrip() {
  const { contact } = siteConfig
  return (
    <section className="relative overflow-hidden bg-brand text-white" aria-labelledby="contact-strip-title">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12] [background:repeating-linear-gradient(-45deg,#000_0_2px,transparent_2px_14px)]"
      />
      <div className="relative mx-auto grid max-w-[1440px] gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <p className="font-mono text-[11px] tracking-[0.25em] text-white/75 uppercase">Breakdown · Parts · Service · Sales</p>
          <h2 id="contact-strip-title" className="mt-4 text-[clamp(3rem,8vw,7rem)] leading-[0.85] font-black uppercase">
            Stuck on the road?
            <br />
            <span className="text-asphalt">We pick up.</span>
          </h2>
        </div>

        <div className="grid gap-3">
          <a
            href={contactLinks.tel(contact.breakdownPhone)}
            className="group flex h-16 items-center justify-between rounded-sm bg-asphalt px-5 text-concrete transition-colors hover:bg-black"
          >
            <span className="flex items-center gap-3">
              <PhoneCallIcon className="size-5 text-brand" />
              <span className="font-wide text-xs font-bold tracking-[0.14em] uppercase">Call now</span>
            </span>
            <span className="font-mono text-lg">{contact.breakdownPhoneDisplay}</span>
          </a>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={contactLinks.viber(contact.viber)}
              className="flex h-14 items-center justify-center gap-2 rounded-sm border-2 border-white/80 font-semibold transition-colors hover:bg-white hover:text-brand"
            >
              <ViberIcon className="size-5" /> Viber
            </a>
            <a
              href={contactLinks.messenger(contact.messengerHandle)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 items-center justify-center gap-2 rounded-sm border-2 border-white/80 font-semibold transition-colors hover:bg-white hover:text-brand"
            >
              <MessengerIcon className="size-5" /> Messenger
            </a>
          </div>
          <Link href="/book-service" className="group mt-1 inline-flex items-center gap-2 self-start text-sm font-medium text-white/85 hover:text-white">
            Not urgent? Book a service slot online
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
