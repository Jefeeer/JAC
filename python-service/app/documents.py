"""Load quotes / invoices from Supabase, render, store in the documents bucket."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from .config import get_settings
from .pdf import BillTo, DocData, DocLine, render_document


class NotFound(LookupError):
    pass


def _d(v: Any) -> Decimal:
    return Decimal(str(v or 0))


def _lines(items: list[dict[str, Any]]) -> list[DocLine]:
    return [
        DocLine(description=i["description"], quantity=_d(i["quantity"]), unit_price=_d(i["unit_price"]))
        for i in sorted(items or [], key=lambda i: i.get("sort_order") or 0)
    ]


def quote_doc(db: Any, quote_id: str) -> tuple[DocData, str]:
    res = (
        db.table("quotes")
        .select(
            "id, reference, created_at, responded_at, status, customer_id, contact_name, contact_email, contact_phone, company_name,"
            " discount, vat_rate, valid_until, terms, response_message, truck:trucks(title), part:parts(name), branch:branches(name),"
            " items:quote_items(description, quantity, unit_price, sort_order)"
        )
        .eq("id", quote_id)
        .maybe_single()
        .execute()
    )
    q = res.data if res else None
    if not q:
        raise NotFound("Quote not found")
    if not q.get("items"):
        raise ValueError("Add at least one line item before generating a PDF")
    subject = (q.get("truck") or {}).get("title") or (q.get("part") or {}).get("name")
    doc = DocData(
        kind="QUOTATION",
        reference=q["reference"],
        date=q.get("responded_at") or q["created_at"],
        valid_until=q.get("valid_until"),
        bill_to=BillTo(name=q["contact_name"], company=q.get("company_name"), email=q.get("contact_email"), phone=q.get("contact_phone")),
        subject=subject,
        intro=q.get("response_message"),
        lines=_lines(q["items"]),
        discount=_d(q.get("discount")),
        vat_rate=_d(q.get("vat_rate") or "0.12"),
        terms=q.get("terms"),
        branch_name=(q.get("branch") or {}).get("name"),
    )
    path = f"customers/{q.get('customer_id') or 'walk-in'}/quotes/{q['reference']}.pdf"
    return doc, path


def invoice_doc(db: Any, invoice_id: str) -> tuple[DocData, str]:
    res = (
        db.table("invoices")
        .select(
            "id, reference, created_at, issued_at, due_date, status, customer_id, bill_to_name, bill_to_company, bill_to_tin, bill_to_address,"
            " discount, vat_rate, amount_paid, notes, branch:branches(name), job:job_orders(reference),"
            " customer:customers(email, phone), items:invoice_items(description, quantity, unit_price, sort_order)"
        )
        .eq("id", invoice_id)
        .maybe_single()
        .execute()
    )
    inv = res.data if res else None
    if not inv:
        raise NotFound("Invoice not found")
    cust = inv.get("customer") or {}
    job = inv.get("job") or {}
    doc = DocData(
        kind="INVOICE",
        reference=inv["reference"],
        date=inv.get("issued_at") or inv["created_at"],
        due_date=inv.get("due_date"),
        status=inv.get("status"),
        bill_to=BillTo(
            name=inv["bill_to_name"],
            company=inv.get("bill_to_company"),
            tin=inv.get("bill_to_tin"),
            address=inv.get("bill_to_address"),
            email=cust.get("email"),
            phone=cust.get("phone"),
        ),
        lines=_lines(inv.get("items") or []),
        discount=_d(inv.get("discount")),
        vat_rate=_d(inv.get("vat_rate") or "0.12"),
        amount_paid=_d(inv.get("amount_paid")),
        terms=inv.get("notes"),
        branch_name=(inv.get("branch") or {}).get("name"),
        extra={"Job order": job["reference"]} if job.get("reference") else {},
    )
    path = f"customers/{inv.get('customer_id') or 'walk-in'}/invoices/{inv['reference']}.pdf"
    return doc, path


def store_pdf(db: Any, table: str, row_id: str, path: str, pdf: bytes) -> dict[str, str]:
    bucket = get_settings().documents_bucket
    db.storage.from_(bucket).upload(path, pdf, {"content-type": "application/pdf", "upsert": "true"})
    db.table(table).update({"pdf_path": path}).eq("id", row_id).execute()
    signed = db.storage.from_(bucket).create_signed_url(path, 600)
    url = signed.get("signedURL") or signed.get("signedUrl") or ""
    return {"path": path, "url": url}


def generate(db: Any, kind: str, row_id: str) -> dict[str, str]:
    if kind == "quote":
        doc, path = quote_doc(db, row_id)
        return store_pdf(db, "quotes", row_id, path, render_document(doc))
    doc, path = invoice_doc(db, row_id)
    return store_pdf(db, "invoices", row_id, path, render_document(doc))
