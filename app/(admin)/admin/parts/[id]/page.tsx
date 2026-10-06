import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLinkIcon } from "lucide-react"
import { PartEditor } from "@/components/admin/part-form"
import { btn } from "@/components/admin/ui"
import { StockBadge } from "@/components/catalog/stock-badge"
import { PageHeader } from "@/components/portal/page-header"
import { toCompat, toKeyValues } from "@/lib/validation/admin"
import { adminPage } from "@/server/admin/context"
import { getPartCategories } from "@/server/queries/catalog"

export const metadata: Metadata = { title: "Edit part" }

export default async function EditPartPage(props: PageProps<"/admin/parts/[id]">) {
  const { id } = await props.params
  const { repo } = await adminPage(`/admin/parts/${id}`, "parts.write")
  const [p, categories] = await Promise.all([repo.getPart(id), getPartCategories()])
  if (!p) notFound()
  return (
    <>
      <PageHeader
        back={{ href: "/admin/parts", label: "Parts & stock" }}
        eyebrow={p.partNumber}
        title={p.name}
        actions={
          <>
            <StockBadge status={p.stockStatus} qty={p.stockQty} showQty leadTimeDays={p.leadTimeDays} />
            {p.isPublished ? (
              <Link href={`/parts/${p.slug}`} target="_blank" className={btn.outline}>
                <ExternalLinkIcon className="size-4" /> View on site
              </Link>
            ) : null}
          </>
        }
      />
      <PartEditor
        categories={categories}
        initial={{
          id: p.id,
          partNumber: p.partNumber,
          oemNumber: p.oemNumber ?? "",
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          categorySlug: p.categorySlug,
          summary: p.summary ?? "",
          description: p.description ?? "",
          price: p.price ?? "",
          priceOnRequest: p.priceOnRequest,
          unit: p.unit,
          stockQty: p.stockQty,
          reorderLevel: p.reorderLevel,
          leadTimeDays: p.leadTimeDays ?? "",
          weightKg: p.weightKg ?? "",
          imageUrl: p.imageUrl ?? "",
          isPublished: p.isPublished,
          specsText: toKeyValues(p.specs),
          compatText: toCompat(p.compatibility),
        } as never}
      />
    </>
  )
}
