import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLinkIcon, Trash2Icon } from "lucide-react"
import { PublishToggle } from "@/components/admin/publish-toggle"
import { TruckEditor } from "@/components/admin/truck-form"
import { TruckImages } from "@/components/admin/truck-images"
import { Panel, btn } from "@/components/admin/ui"
import { PageHeader } from "@/components/portal/page-header"
import credits from "@/lib/photo-credits.json"
import { toKeyValues } from "@/lib/validation/admin"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { deleteTruckAction } from "@/server/actions/admin"
import { adminPage } from "@/server/admin/context"
import { can } from "@/server/admin/permissions"

export const metadata: Metadata = { title: "Edit truck" }

export default async function EditTruckPage(props: PageProps<"/admin/trucks/[id]">) {
  const { id } = await props.params
  const { repo, role, session } = await adminPage(`/admin/trucks/${id}`, "trucks.write")
  const t = await repo.getTruck(id)
  if (!t) notFound()

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <PageHeader
        back={{ href: "/admin/trucks", label: "Trucks" }}
        eyebrow={`${t.stockNumber ?? "No stock no."} · ${t.availability}`}
        title={t.title}
        actions={
          <>
            <PublishToggle kind="truck" id={t.id} published={t.isPublished} />
            {t.isPublished ? (
              <Link href={`/trucks/${t.slug}`} target="_blank" className={btn.outline}>
                <ExternalLinkIcon className="size-4" /> View listing
              </Link>
            ) : null}
          </>
        }
      />

      <Panel title={`Photos (${t.images.length})`} bodyClassName="p-5">
        <TruckImages
          truckId={t.id}
          title={t.title}
          images={t.images}
          uploads={isSupabaseConfigured && !session.isDemo}
          library={credits.filter((c) => c.src.includes("/jac-")).map((c) => ({ src: c.src, title: c.title }))}
        />
      </Panel>

      <TruckEditor
        initial={{
          id: t.id,
          title: t.title,
          slug: t.slug,
          stockNumber: t.stockNumber ?? "",
          brand: t.brand,
          model: t.model,
          series: t.series ?? "",
          variant: t.variant ?? "",
          bodyType: t.bodyType,
          year: t.year,
          condition: t.condition,
          availability: t.availability,
          payloadTons: t.payloadTons ?? "",
          gvwKg: t.gvwKg ?? "",
          wheelConfig: t.wheelConfig ?? "",
          engine: t.engine ?? "",
          displacementCc: t.displacementCc ?? "",
          horsepower: t.horsepower ?? "",
          torqueNm: t.torqueNm ?? "",
          transmission: t.transmission ?? "",
          fuelType: t.fuelType,
          emissionStandard: t.emissionStandard ?? "",
          wheelbaseMm: t.wheelbaseMm ?? "",
          mileageKm: t.mileageKm,
          color: t.color ?? "",
          price: t.price ?? "",
          priceOnRequest: t.priceOnRequest,
          summary: t.summary ?? "",
          description: t.description ?? "",
          featuresText: t.features.join("\n"),
          specsText: toKeyValues(t.specs),
          branchSlug: t.branchSlug ?? "",
          isFeatured: t.isFeatured,
        } as never}
      />

      {can(role, "trucks.delete") ? (
        <form action={deleteTruckAction.bind(null, t.id)} className="flex justify-end">
          <button type="submit" className={btn.danger}>
            <Trash2Icon className="size-4" /> Delete truck permanently
          </button>
        </form>
      ) : null}
    </div>
  )
}
