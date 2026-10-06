import type { Metadata } from "next"
import { FleetForm } from "@/components/portal/fleet-form"
import { PageHeader } from "@/components/portal/page-header"
import { getPartModels, getTruckFacets } from "@/server/queries/catalog"

export const metadata: Metadata = { title: "Add a truck" }

export default async function NewFleetUnitPage() {
  const [facets, partModels] = await Promise.all([getTruckFacets(), getPartModels()])
  const models = [...new Set([...facets.models.map((m) => m.value), ...partModels])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return (
    <>
      <PageHeader back={{ href: "/account/fleet", label: "My fleet" }} eyebrow="Fleet" title="Add a truck" description="Any make is welcome — we service what we sell, and we'll keep the records either way." />
      <div className="max-w-3xl">
        <FleetForm models={models} />
      </div>
    </>
  )
}
