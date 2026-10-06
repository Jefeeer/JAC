import type { Metadata } from "next"
import { LegalPage } from "@/components/shared/legal-page"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for the JAC Motors Philippines website and customer portal.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="October 2026"
      sections={[
        {
          heading: "Using this website",
          body: [
            `This website is operated by ${siteConfig.legalName}. By using it or the customer portal you agree to these terms. If you don't agree, please don't use the site.`,
          ],
        },
        {
          heading: "Prices, specifications and stock",
          body: [
            "Prices, specifications, photos and stock levels are provided for information and may change without notice. A listing or online price is not an offer to sell; all sales are subject to a written quotation and sales agreement. Photos may show optional equipment or similar units.",
          ],
        },
        {
          heading: "Quotes, bookings and estimates",
          body: [
            "Quote and booking requests are not confirmed until a JAC Motors representative confirms them. Financing figures from the online calculator are estimates only and are not loan offers; actual terms depend on approval by the bank or financing partner.",
          ],
        },
        {
          heading: "Your account",
          body: [
            "Keep access to your email secure — sign-in links are sent there. You're responsible for information you add about your vehicles and for activity under your account. We may suspend accounts used for abuse or fraud.",
          ],
        },
        {
          heading: "Uploads",
          body: [
            "Only upload photos you have the right to share and that relate to your request. Don't upload images of other people's personal documents.",
          ],
        },
        {
          heading: "Liability",
          body: [
            "We take care to keep information accurate but provide this website as-is. To the extent permitted by law, we're not liable for indirect losses arising from use of the website. Nothing in these terms limits rights you have under the Consumer Act of the Philippines.",
          ],
        },
        {
          heading: "Contact",
          body: [`Questions about these terms: ${siteConfig.contact.email} or ${siteConfig.contact.phoneDisplay}.`],
        },
      ]}
    />
  )
}
