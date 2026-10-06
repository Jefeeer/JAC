import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { PlusIcon, StarIcon } from "lucide-react"
import { PublishToggle } from "@/components/admin/publish-toggle"
import { EmptyRow, FilterTabs, SearchBox, Td, Th, btn, panel } from "@/components/admin/ui"
import { formatKm, priceLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import { adminPage } from "@/server/admin/context"
import { BODY_TYPE_LABELS } from "@/types/domain"

export const metadata: Metadata = { title: "Trucks" }

export default async function AdminTrucksPage(props: PageProps<"/admin/trucks">) {
  const { repo } = await adminPage("/admin/trucks", "trucks.write")
  const sp = await props.searchParams
  const status = sp.status === "published" || sp.status === "draft" || sp.status === "sold" ? sp.status : undefined
  const q = typeof sp.q === "string" ? sp.q : undefined
  const trucks = await repo.listTrucks({ q, status })

  return (
    <div className="grid gap-5 [&>*]:min-w-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          tabs={[
            { key: "all", label: "All", href: "/admin/trucks" },
            { key: "published", label: "Live", href: "/admin/trucks?status=published" },
            { key: "draft", label: "Drafts", href: "/admin/trucks?status=draft" },
            { key: "sold", label: "Sold", href: "/admin/trucks?status=sold" },
          ]}
          active={status ?? "all"}
        />
        <div className="flex gap-2">
          <SearchBox action="/admin/trucks" defaultValue={q} placeholder="Search title, model, stock no…" hidden={{ status }} />
          <Link href="/admin/trucks/new" className={btn.primary}>
            <PlusIcon className="size-4" /> Add truck
          </Link>
        </div>
      </div>

      <div className={cn(panel, "overflow-x-auto")}>
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <Th className="w-24" />
              <Th>Unit</Th>
              <Th>Stock no.</Th>
              <Th>Body · payload</Th>
              <Th>Availability</Th>
              <Th className="text-right">Price</Th>
              <Th>Website</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trucks.map((t) => (
              <tr key={t.id} className="hover:bg-muted/40">
                <Td>
                  <span className="relative block h-12 w-20 overflow-hidden rounded bg-muted">
                    {t.images[0] ? <Image src={t.images[0].url} alt="" fill sizes="80px" className="object-cover" /> : null}
                  </span>
                </Td>
                <Td>
                  <Link href={`/admin/trucks/${t.id}`} className="font-semibold hover:text-brand-ink hover:underline">
                    {t.title}
                  </Link>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {t.isFeatured ? <StarIcon className="size-3 fill-signal text-signal" aria-label="Featured" /> : null}
                    {t.year} · {t.condition === "new" ? "New" : `Used · ${formatKm(t.mileageKm)}`}
                  </span>
                </Td>
                <Td className="font-mono text-xs">{t.stockNumber ?? "—"}</Td>
                <Td className="text-xs">
                  {BODY_TYPE_LABELS[t.bodyType]} · {t.payloadTons ?? "—"} T
                </Td>
                <Td className="text-xs capitalize">{t.availability}</Td>
                <Td className="text-right font-mono text-xs">{priceLabel(t)}</Td>
                <Td>
                  <PublishToggle kind="truck" id={t.id} published={t.isPublished} name={t.title} />
                </Td>
              </tr>
            ))}
            {trucks.length === 0 ? <EmptyRow colSpan={7}>No trucks match.</EmptyRow> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
