import type { Metadata } from "next"
import { PartEditor } from "@/components/admin/part-form"
import { PageHeader } from "@/components/portal/page-header"
import { adminPage } from "@/server/admin/context"
import { getPartCategories } from "@/server/queries/catalog"

export const metadata: Metadata = { title: "Add part" }

export default async function NewPartPage() {
  await adminPage("/admin/parts/new", "parts.write")
  const categories = await getPartCategories()
  return (
    <>
      <PageHeader back={{ href: "/admin/parts", label: "Parts & stock" }} eyebrow="Catalog" title="Add a part" />
      <PartEditor categories={categories} />
    </>
  )
}
