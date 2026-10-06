import { getSession } from "@/server/auth"
import { repoFor } from "@/server/admin/context"
import { can } from "@/server/admin/permissions"
import { renderDocumentPdf } from "@/server/pdf/documents"
import { getQuote } from "@/server/queries/portal"

/**
 * Quote PDF, rendered on request. Staff with quote access can open any quote;
 * customers only their own, and only once it has been priced (RLS / demo rules).
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/documents/quotes/[id]">) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return new Response("Sign in required", { status: 401 })

  let doc: Parameters<typeof renderDocumentPdf>[0] | null = null
  if (session.isStaff && can(session.profile.role, "quotes.read")) {
    const q = await (await repoFor(session)).getQuote(id)
    if (q && q.items.length) {
      doc = {
        kind: "QUOTATION",
        reference: q.reference,
        date: q.respondedAt ?? q.createdAt,
        validUntil: q.validUntil,
        status: q.status === "accepted" ? "Accepted" : undefined,
        billTo: { name: q.contactName, company: q.company, email: q.contactEmail, phone: q.contactPhone },
        subject: q.subject,
        intro: q.responseMessage,
        lines: q.items,
        discount: q.discount,
        vatRate: q.vatRate,
        terms: q.terms,
        branchSlug: q.branchSlug,
        preparedBy: q.assignedTo?.name ?? null,
      }
    }
  } else {
    const q = await getQuote(id)
    if (q && q.items.length && ["quoted", "accepted"].includes(q.status)) {
      doc = {
        kind: "QUOTATION",
        reference: q.reference,
        date: q.respondedAt ?? q.createdAt,
        validUntil: q.validUntil,
        billTo: { name: session.profile.fullName ?? session.email, email: session.email, phone: session.profile.phone },
        subject: q.subject,
        intro: q.responseMessage,
        lines: q.items,
        discount: q.discount,
        vatRate: q.vatRate,
        terms: q.terms,
      }
    }
  }
  if (!doc) return new Response("Not found", { status: 404 })

  const bytes = await renderDocumentPdf(doc)
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="JAC-Motors-${doc.reference}.pdf"`,
      "cache-control": "private, no-store",
    },
  })
}
