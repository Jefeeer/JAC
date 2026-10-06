/**
 * SAMPLE TESTIMONIALS — placeholders for layout only.
 * Replace with real, consented customer quotes (name/company optional)
 * before launch. Do not publish these as genuine reviews.
 */
export type Testimonial = {
  quote: string
  role: string
  business: string
  location: string
  units: string
  service: "Sales" | "Parts" | "Service"
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "Our reefer went down on SLEX at 2 a.m. JAC had a technician on Viber in ten minutes and the truck back on the road before the morning run.",
    role: "Operations manager",
    business: "Cold-chain logistics",
    location: "Laguna",
    units: "12 × N55 Reefer",
    service: "Service",
  },
  {
    quote:
      "We order filters and brake shoes by part number on Monday, they're on our shelf Tuesday. Fewer trucks sitting idle waiting for parts.",
    role: "Fleet supervisor",
    business: "Hardware distribution",
    location: "Pampanga",
    units: "8 × N75 Dropside",
    service: "Parts",
  },
  {
    quote:
      "They traded in our old units, financed the new ones, and set up PMS reminders for the whole fleet. It feels like a partner, not a showroom.",
    role: "Owner",
    business: "Construction supply",
    location: "Cavite",
    units: "5 × Gallop K5",
    service: "Sales",
  },
]
