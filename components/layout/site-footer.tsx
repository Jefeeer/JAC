import { NavLink } from "@/components/layout/nav-link"
import { JacMark } from "@/components/brand/logo"
import { FacebookIcon, MessengerIcon, ViberIcon } from "@/components/brand/channel-icons"
import { branches } from "@/lib/config/branches"
import { contactLinks, footerNav, siteConfig } from "@/lib/config/site"

export function SiteFooter() {
  const year = new Date().getFullYear()
  const { contact } = siteConfig

  return (
    <footer className="dark relative overflow-hidden bg-asphalt pb-24 text-concrete sm:pb-0">
      <div className="hazard-red h-2" aria-hidden />

      <div className="mx-auto max-w-[1440px] px-4 pt-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <p className="font-display text-5xl leading-[0.9] font-extrabold uppercase sm:text-6xl">
              Built to keep
              <br />
              you <span className="text-brand">moving.</span>
            </p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-concrete/65">
              New JAC trucks, genuine parts and a workshop that answers the phone. We&apos;re the partner that stays with your fleet long after the
              keys change hands.
            </p>
            <div className="mt-6 flex gap-2">
              <a
                href={siteConfig.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="JAC Motors Philippines on Facebook"
                className="grid size-10 place-items-center rounded-sm border border-white/15 transition-colors hover:border-white/40"
              >
                <FacebookIcon className="size-4" />
              </a>
              <a
                href={contactLinks.messenger(contact.messengerHandle)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Message JAC Motors on Messenger"
                className="grid size-10 place-items-center rounded-sm border border-white/15 transition-colors hover:border-white/40"
              >
                <MessengerIcon className="size-4" />
              </a>
              <a
                href={contactLinks.viber(contact.viber)}
                aria-label="Chat with JAC Motors on Viber"
                className="grid size-10 place-items-center rounded-sm border border-white/15 transition-colors hover:border-white/40"
              >
                <ViberIcon className="size-4" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {footerNav.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="font-mono text-[11px] font-normal tracking-[0.2em] text-concrete/65 uppercase">{group.title}</h2>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <NavLink href={item.href} className="text-concrete/80 transition-colors hover:text-white">
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div>
              <h2 className="font-mono text-[11px] font-normal tracking-[0.2em] text-concrete/65 uppercase">Branches</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {branches.map((b) => (
                  <li key={b.slug}>
                    <NavLink href={`/contact#${b.slug}`} className="group flex items-baseline gap-2 text-concrete/80 hover:text-white">
                      <span className="font-mono text-[10px] text-concrete/65 group-hover:text-brand-ink">{b.code}</span>
                      {b.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Giant wordmark */}
        <div className="relative mt-16 select-none" aria-hidden>
          <JacMark title={null} className="h-auto w-full text-white/[0.04]" />
          <span className="absolute right-0 bottom-[6%] font-mono text-[10px] tracking-[0.3em] text-concrete/65 uppercase sm:text-xs">
            Motors · Philippines
          </span>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 py-6 font-mono text-[11px] text-concrete/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.legalName}. All rights reserved.
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            <NavLink href="/credits" className="hover:text-concrete">
              Photo credits
            </NavLink>
            <NavLink href="/privacy" className="hover:text-concrete">
              Privacy
            </NavLink>
            <NavLink href="/terms" className="hover:text-concrete">
              Terms
            </NavLink>
            <a href={`mailto:${contact.email}`} className="hover:text-concrete">
              {contact.email}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
