import type { Metadata } from "next"
import { TruckEditor } from "@/components/admin/truck-form"
import { PageHeader } from "@/components/portal/page-header"
import { adminPage } from "@/server/admin/context"

export const metadata: Metadata = { title: "Add truck" }

export default async function NewTruckPage() {
  await adminPage("/admin/trucks/new", "trucks.write")
  return (
    <>
      <PageHeader back={{ href: "/admin/trucks", label: "Trucks" }} eyebrow="Inventory" title="Add a truck" />
      <TruckEditor />
    </>
  )
}
