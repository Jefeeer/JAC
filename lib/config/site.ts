/**
 * Single source of truth for brand + business facts.
 *
 * Values marked `CONFIRM` are placeholders that still need sign-off from
 * JAC Motors (they are wired through env vars so they can change without a
 * code deploy).
 */

// NEXT_PUBLIC_* vars must be read with literal `process.env.X` access so Next.js
// can inline them into client bundles.
const or = (value: string | undefined, fallback: string) =>
  value && value.length > 0 ? value : fallback

export const siteConfig = {
  name: "JAC Motors",
  legalName: "JAC Motors Philippines",
  tagline: "Built to Keep You Moving",
  description:
    "JAC Motors Philippines — new JAC trucks and pickups, genuine JAC spare parts, and an after-sales service bay that keeps your fleet earning. 7 branches across Luzon and Visayas.",
  url: or(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"),
  locale: "en_PH",
  currency: "PHP",
  timezone: "Asia/Manila",

  contact: {
    /** Main line — North EDSA head office */
    phone: or(process.env.NEXT_PUBLIC_MAIN_PHONE, "+63283613333"),
    phoneDisplay: or(process.env.NEXT_PUBLIC_MAIN_PHONE_DISPLAY, "(02) 8361-3333"),
    /** CONFIRM: dedicated 24/7 breakdown hotline. Defaults to the HQ landline. */
    breakdownPhone: or(process.env.NEXT_PUBLIC_BREAKDOWN_PHONE, "+63283613333"),
    breakdownPhoneDisplay: or(process.env.NEXT_PUBLIC_BREAKDOWN_PHONE_DISPLAY, "(02) 8361-3333"),
    /** CONFIRM: Viber needs a mobile number. Defaults to the A. Bonifacio branch mobile. */
    viber: or(process.env.NEXT_PUBLIC_VIBER_NUMBER, "+639081111999"),
    messengerHandle: or(process.env.NEXT_PUBLIC_MESSENGER_HANDLE, "jacmotorsph"),
    /** CONFIRM */
    email: or(process.env.NEXT_PUBLIC_CONTACT_EMAIL, "sales@jacmotors.ph"),
  },

  social: {
    facebook: "https://www.facebook.com/jacmotorsph",
  },

  /** CONFIRM: headline numbers shown on the home page. */
  stats: [
    { value: 7, suffix: "", label: "Branches", detail: "Metro Manila · Cavite · Pampanga · Leyte" },
    { value: 24, suffix: "/7", label: "Breakdown line", detail: "Call, Viber or Messenger" },
    { value: 25, suffix: "T", label: "Top payload", detail: "From 1-tonne pickups to 8×4 haulers" },
    { value: 100, suffix: "%", label: "Genuine parts", detail: "JAC-approved, warranty-backed" },
  ],
} as const

export const contactLinks = {
  tel: (number: string) => `tel:${number.replace(/[^\d+]/g, "")}`,
  viber: (number: string) => `viber://chat?number=${encodeURIComponent(number.replace(/[^\d+]/g, ""))}`,
  messenger: (handle: string) => `https://m.me/${handle}`,
}

export type NavItem = { href: string; label: string; description?: string }

export const mainNav: NavItem[] = [
  { href: "/trucks", label: "Trucks", description: "New JAC trucks & pickups" },
  { href: "/parts", label: "Parts", description: "Genuine JAC spare parts" },
  { href: "/services", label: "Service", description: "Maintenance, diagnostics, repair" },
  { href: "/after-sales", label: "After-Sales", description: "Warranty & support" },
  { href: "/about", label: "About", description: "The JAC Motors story" },
  { href: "/contact", label: "Contact", description: "7 branches nationwide" },
]

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Buy",
    items: [
      { href: "/trucks", label: "Truck inventory" },
      { href: "/trucks?condition=new", label: "New units" },
      { href: "/trucks?body=pickup", label: "Pickups" },
      { href: "/trucks#financing", label: "Financing & trade-in" },
    ],
  },
  {
    title: "Parts & Service",
    items: [
      { href: "/parts", label: "Parts catalog" },
      { href: "/services", label: "Service menu" },
      { href: "/book-service", label: "Book a service" },
      { href: "/after-sales", label: "Warranty" },
    ],
  },
  {
    title: "Company",
    items: [
      { href: "/about", label: "About JAC Motors" },
      { href: "/contact", label: "Branches & hours" },
      { href: "/account", label: "Customer portal" },
      { href: "/credits", label: "Photo credits" },
    ],
  },
]
