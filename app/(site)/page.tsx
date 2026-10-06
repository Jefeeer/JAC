import { BranchBoard } from "@/components/home/branch-board"
import { ContactStrip } from "@/components/home/contact-strip"
import { FeaturedTrucks } from "@/components/home/featured-trucks"
import { Hero } from "@/components/home/hero"
import { JobTrackerDemo } from "@/components/home/job-tracker-demo"
import { LineupScale } from "@/components/home/lineup-scale"
import { ServicesOverview } from "@/components/home/services-overview"
import { StatsCluster } from "@/components/home/stats-cluster"
import { Testimonials } from "@/components/home/testimonials"
import { JsonLd } from "@/components/shared/json-ld"
import { branches } from "@/lib/config/branches"
import { siteConfig } from "@/lib/config/site"
import { getFeaturedTrucks, getLineup } from "@/server/queries/catalog"

// ISR: refresh featured stock every 10 minutes (admin publishes also revalidate on demand).
export const revalidate = 600

export default async function HomePage() {
  const [featured, lineup] = await Promise.all([getFeaturedTrucks(4), getLineup()])

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AutoDealer",
          "@id": `${siteConfig.url}/#dealer`,
          name: siteConfig.legalName,
          url: siteConfig.url,
          logo: `${siteConfig.url}/brand/jac-motors-logo.png`,
          image: `${siteConfig.url}/images/jac-n55-reefer.webp`,
          slogan: siteConfig.tagline,
          telephone: siteConfig.contact.phone,
          sameAs: [siteConfig.social.facebook],
          department: branches.map((b) => ({
            "@type": "AutoRepair",
            name: `${siteConfig.name} ${b.name}`,
            telephone: b.phone ?? b.mobile ?? undefined,
            address: {
              "@type": "PostalAddress",
              streetAddress: b.address,
              addressLocality: b.city,
              addressRegion: b.province,
              addressCountry: "PH",
            },
            geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng },
          })),
        }}
      />
      <Hero />
      <StatsCluster />
      <FeaturedTrucks trucks={featured} />
      <LineupScale items={lineup} />
      <ServicesOverview />
      <JobTrackerDemo />
      <Testimonials />
      <BranchBoard />
      <ContactStrip />
    </>
  )
}
