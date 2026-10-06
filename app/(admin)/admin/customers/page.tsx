import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2Icon } from "lucide-react"
import { EmptyRow, SearchBox, Td, Th, panel } from "@/components/admin/ui"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { adminPage } from "@/server/admin/context"

export const metadata: Metadata = { title: "Customers & fleets" }

export default async function CustomersPage(props: PageProps<"/admin/customers">) {
  const { repo } = await adminPage("/admin/customers", "customers.read")
  const sp = await props.searchParams
  const q = typeof sp.q === "string" ? sp.q : undefined
  const rows = await repo.listCustomers({ q })

  return (
    <div className="grid gap-5 [&>*]:min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} customers · {rows.filter((r) => r.hasAccount).length} with portal accounts · {rows.reduce((s, r) => s + r.fleetCount, 0)} trucks on file
        </p>
        <SearchBox action="/admin/customers" defaultValue={q} placeholder="Name, email, phone…" />
      </div>
      <div className={cn(panel, "overflow-x-auto")}>
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <Th>Customer</Th>
              <Th>Company</Th>
              <Th>Contact</Th>
              <Th className="text-right">Fleet</Th>
              <Th className="text-right">Open jobs</Th>
              <Th className="text-right">Quotes</Th>
              <Th>Since</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-muted/40">
                <Td>
                  <Link href={`/admin/customers/${c.id}`} className="font-semibold hover:text-brand-ink hover:underline">
                    {c.fullName}
                  </Link>
                  {c.hasAccount ? (
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-success">
                      <CheckCircle2Icon className="size-3" /> Portal account
                    </span>
                  ) : (
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">Lead / walk-in</span>
                  )}
                </Td>
                <Td>{c.company ?? "—"}</Td>
                <Td className="text-xs">
                  <span className="block">{c.phone ?? "—"}</span>
                  <span className="block break-all text-muted-foreground">{c.email}</span>
                </Td>
                <Td className="text-right font-mono">{c.fleetCount}</Td>
                <Td className={cn("text-right font-mono", c.openJobs && "font-bold text-brand-ink")}>{c.openJobs}</Td>
                <Td className="text-right font-mono">{c.quoteCount}</Td>
                <Td className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</Td>
              </tr>
            ))}
            {rows.length === 0 ? <EmptyRow colSpan={7}>No customers match.</EmptyRow> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
