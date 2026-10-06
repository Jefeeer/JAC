import type { Metadata } from "next"
import { ImportForm } from "@/components/admin/import-form"
import { Panel } from "@/components/admin/ui"
import { PageHeader } from "@/components/portal/page-header"
import { adminPage } from "@/server/admin/context"
import { pythonConfigured } from "@/server/python"

export const metadata: Metadata = { title: "Import parts" }

const COLUMNS: [string, string][] = [
  ["part_number", "Required. Matches existing parts → update, otherwise insert"],
  ["name", "Required"],
  ["category", "Category slug, e.g. brakes, engine-filtration"],
  ["price", "VAT-inclusive ₱; blank = price on request"],
  ["stock_qty / reorder_level", "Whole numbers"],
  ["compatible_models", "Semicolon-separated, e.g. N55;N75;T8 Pro"],
  ["oem_number, brand, unit, summary, lead_time_days", "Optional"],
]

export default async function ImportPartsPage() {
  const { session } = await adminPage("/admin/parts/import", "parts.write")
  const viaService = pythonConfigured() && !session.isDemo
  return (
    <>
      <PageHeader back={{ href: "/admin/parts", label: "Parts & stock" }} eyebrow="Bulk update" title="Import supplier list" description="Upsert prices, stock and fitment from a supplier CSV in one go." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ImportForm viaService={viaService} />
        <Panel title="Columns" bodyClassName="p-5">
          <dl className="grid gap-3 text-sm">
            {COLUMNS.map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-xs font-semibold text-brand-ink">{k}</dt>
                <dd className="text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </>
  )
}
