import type { Metadata } from "next"
import { LegalPage } from "@/components/shared/legal-page"
import { siteConfig } from "@/lib/config/site"

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How JAC Motors Philippines collects, uses and protects your personal data under the Data Privacy Act of 2012.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  const email = siteConfig.contact.email
  return (
    <LegalPage
      title="Privacy notice"
      updated="October 2026"
      sections={[
        {
          heading: "Who we are",
          body: [
            `${siteConfig.legalName} ("JAC Motors", "we") is the personal information controller for data collected through this website, our branches and the customer portal. We process personal data in accordance with Republic Act No. 10173, the Data Privacy Act of 2012, and its implementing rules.`,
          ],
        },
        {
          heading: "What we collect",
          body: [
            [
              "Contact details: name, mobile/phone number, email, company",
              "Vehicle details: make, model, plate number, VIN, odometer, service history",
              "Requests you send: quote and booking details, messages and photos you upload",
              "Account data: login email and activity in the customer portal",
              "Technical data: IP address and device information used for security and spam prevention",
            ],
          ],
        },
        {
          heading: "Why we use it",
          body: [
            [
              "To respond to quote, parts and service requests and to schedule and perform work on your vehicles",
              "To send booking confirmations, job status updates and maintenance reminders you've opted into",
              "To process sales, financing and warranty claims with manufacturers and financing partners",
              "To protect our services against fraud and abuse (e.g. rate limiting)",
              "To comply with legal, tax and regulatory obligations",
            ],
          ],
        },
        {
          heading: "Who we share it with",
          body: [
            "Only as needed to deliver what you asked for: the JAC manufacturer and distributor (warranty), banks and financing partners (if you request financing), insurers and the LTO (registration), and service providers that host our systems and send our emails/SMS under data-processing agreements. We do not sell personal data.",
          ],
        },
        {
          heading: "How long we keep it",
          body: [
            "Enquiries that don't lead to a sale are kept for up to 2 years. Customer, vehicle and service records are kept while you're a customer and for as long as required by tax and warranty rules afterwards.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You may request access to, correction of, or deletion of your personal data, object to processing, and withdraw consent to marketing at any time. You may also lodge a complaint with the National Privacy Commission.",
            `Contact our Data Protection Officer at ${email}.`,
          ],
        },
        {
          heading: "Security",
          body: [
            "Data is stored with access controls so customers can only see their own records and staff only what their role requires. Uploaded photos are kept in private storage. No system is perfectly secure; contact us immediately if you suspect misuse of your account.",
          ],
        },
      ]}
    />
  )
}
