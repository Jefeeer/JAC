import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon, UploadIcon } from "lucide-react"
import { PublishToggle } from "@/components/admin/publish-toggle"
import { StockEditor } from "@/components/admin/stock-editor"
import { EmptyRow, FilterTabs, SearchBox, Td, Th, btn, panel } from "@/components/admin/ui"
import { StockBadge } from "@/components/catalog/stock-badge"
import { priceLabel } from "@/lib/format"
import { cn } from "@/lib/utils"
import { adminPage } from "@/server/admin/context"
import { fallbackCategories } from "@/server/queries/catalog"

export const metadata: Metadata = { title: "Parts & stock" }

export default async function AdminPartsPage(props: PageProps<"/admin/parts">) {
  const { repo } = await adminPage("/admin/parts", "parts.write")
  const sp = await props.searchParams
  const stock = sp.stock === "low" || sp.stock === "out" ? sp.stock : undefined
  const q = typeof sp.q === "string" ? sp.q : undefined
  const category = typeof sp.category === "string" ? sp.category : undefined
  const parts = await repo.listParts({ q, stock, category })

  return (
    <div className="grid gap-5 [&>*]:min-w-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          tabs={[
            { key: "all", label: "All", href: "/admin/parts" },
            { key: "low", label: "Low & out", href: "/admin/parts?stock=low" },
            { key: "out", label: "Out of stock", href: "/admin/parts?stock=out" },
          ]}
          active={stock ?? "all"}
        />
        <div className="flex flex-wrap gap-2">
          <form action="/admin/parts" className="flex gap-2">
            {stock ? <input type="hidden" name="stock" value={stock} /> : null}
            <select name="category" defaultValue={category ?? ""} className="h-9 rounded-md border border-input bg-surface px-2 text-sm" aria-label="Category">
              <option value="">All categories</option>
              {fallbackCategories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="submit" className={btn.ghost}>
              Filter
            </button>
          </form>
          <SearchBox action="/admin/parts" defaultValue={q} placeholder="Part no., OEM or name…" hidden={{ stock, category }} />
          <Link href="/admin/parts/import" className={btn.outline}>
            <UploadIcon className="size-4" /> Import CSV
          </Link>
          <Link href="/admin/parts/new" className={btn.primary}>
            <PlusIcon className="size-4" /> Add part
          </Link>
        </div>
      </div>

      <div className={cn(panel, "overflow-x-auto")}>
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <Th>Part</Th>
              <Th>Fits</Th>
              <Th>Status</Th>
              <Th>On hand</Th>
              <Th className="text-right">Reorder at</Th>
              <Th className="text-right">Price</Th>
              <Th>Website</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parts.map((p) => (
              <tr key={p.id} className="hover:bg-muted/40">
                <Td>
                  <Link href={`/admin/parts/${p.id}`} className="font-mono text-xs font-semibold text-brand-ink hover:underline">
                    {p.partNumber}
                  </Link>
                  <span className="block max-w-72 truncate">{p.name}</span>
                </Td>
                <Td className="max-w-48 truncate font-mono text-[11px] text-muted-foreground">{[...new Set(p.compatibility.map((c) => c.model))].join(", ") || "—"}</Td>
                <Td>
                  <StockBadge status={p.stockStatus} leadTimeDays={p.leadTimeDays} />
                </Td>
                <Td>
                  <StockEditor id={p.id} qty={p.stockQty} reorderLevel={p.reorderLevel} />
                </Td>
                <Td className="text-right font-mono text-xs">{p.reorderLevel}</Td>
                <Td className="text-right font-mono text-xs">{priceLabel(p)}</Td>
                <Td>
                  <PublishToggle kind="part" id={p.id} published={p.isPublished} />
                </Td>
              </tr>
            ))}
            {parts.length === 0 ? <EmptyRow colSpan={7}>No parts match.</EmptyRow> : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{parts.length} parts shown</p>
    </div>
  )
}
