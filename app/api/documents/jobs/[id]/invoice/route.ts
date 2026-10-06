import { getSession } from "@/server/auth"
import { repoFor } from "@/server/admin/context"
import { can } from "@/server/admin/permissions"
import { renderDocumentPdf } from "@/server/pdf/documents"

/** Invoice PDF for a job order (staff with invoice access). */
export async function GET(_req: Request, ctx: RouteContext<"/api/documents/jobs/[id]/invoice">) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.isStaff || !can(session.profile.role, "invoices.write")) return new Response("Not allowed", { status: 403 })
  const job = await (await repoFor(session)).getJob(id)
  if (!job?.invoice) return new Response("No invoice for this job yet", { status: 404 })

  const bytes = await renderDocumentPdf({
    kind: "INVOICE",
    reference: job.invoice.reference,
    date: new Date().toISOString(),
    status: job.invoice.status,
    billTo: { name: job.customerName, email: job.customerEmail, phone: job.customerPhone },
    subject: `${job.truckLabel}${job.plateNumber ? ` · ${job.plateNumber}` : ""} — Job order ${job.reference}`,
    lines: job.items,
    discount: 0,
    vatRate: 0.12,
    terms: "Payment due upon release unless covered by a fleet account. Workshop warranty applies to labour and genuine parts supplied.",
    branchSlug: job.branchSlug,
    preparedBy: job.advisor?.name ?? null,
  })
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="JAC-Motors-${job.invoice.reference}.pdf"`,
      "cache-control": "private, no-store",
    },
  })
}
