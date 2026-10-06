"""Branded quotation / invoice PDFs with ReportLab.

Mirrors server/pdf/documents.ts (the Node fallback) so documents look the
same whichever path generated them.
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal
from zoneinfo import ZoneInfo

from reportlab.lib.colors import Color, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen.canvas import Canvas

C = {
    "asphalt": Color(0.078, 0.082, 0.094),
    "red": Color(0.843, 0, 0.059),
    "ink": Color(0.086, 0.09, 0.102),
    "muted": Color(0.37, 0.36, 0.34),
    "line": Color(0.88, 0.87, 0.84),
    "paper": Color(0.98, 0.976, 0.965),
}
REG, BOLD, MONO, MONO_B = "Helvetica", "Helvetica-Bold", "Courier", "Courier-Bold"
CENT = Decimal("0.01")
MNL = ZoneInfo("Asia/Manila")

COMPANY_LINE = "JAC Motors Philippines  -  1133 EDSA, Balintawak, Quezon City  -  (02) 8361-3333"


@dataclass
class DocLine:
    description: str
    quantity: Decimal
    unit_price: Decimal

    @property
    def total(self) -> Decimal:
        return (self.quantity * self.unit_price).quantize(CENT, ROUND_HALF_UP)


@dataclass
class BillTo:
    name: str
    company: str | None = None
    tin: str | None = None
    address: str | None = None
    email: str | None = None
    phone: str | None = None


@dataclass
class DocData:
    kind: Literal["QUOTATION", "INVOICE"]
    reference: str
    date: str
    bill_to: BillTo
    lines: list[DocLine]
    discount: Decimal = Decimal(0)
    vat_rate: Decimal = Decimal("0.12")
    valid_until: str | None = None
    due_date: str | None = None
    status: str | None = None
    subject: str | None = None
    intro: str | None = None
    terms: str | None = None
    branch_name: str | None = None
    amount_paid: Decimal = Decimal(0)
    extra: dict[str, str] = field(default_factory=dict)

    @property
    def subtotal(self) -> Decimal:
        return sum((l.total for l in self.lines), Decimal(0))

    @property
    def taxable(self) -> Decimal:
        return max(self.subtotal - self.discount, Decimal(0))

    @property
    def vat(self) -> Decimal:
        return (self.taxable * self.vat_rate).quantize(CENT, ROUND_HALF_UP)

    @property
    def total(self) -> Decimal:
        return (self.taxable * (1 + self.vat_rate)).quantize(CENT, ROUND_HALF_UP)


def money(n: Decimal | float, prefix: bool = True) -> str:
    s = f"{Decimal(str(n)).quantize(CENT, ROUND_HALF_UP):,.2f}"
    return f"PHP {s}" if prefix else s


def fmt_date(s: str | None) -> str:
    if not s:
        return "-"
    if len(s) == 10:
        d = date.fromisoformat(s)
    else:
        d = datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(MNL).date()
    return f"{d:%B} {d.day}, {d.year}"


def safe(s: str | None) -> str:
    """Standard PDF fonts are Latin-1: swap characters they can't encode."""
    if not s:
        return ""
    s = s.replace("₱", "PHP ").replace("—", " - ").replace("–", "-").replace("’", "'").replace("“", '"').replace("”", '"').replace("·", "-")
    return s.encode("latin-1", "replace").decode("latin-1")


def wrap(text: str, font: str, size: float, width: float) -> list[str]:
    out: list[str] = []
    for para in safe(text).split("\n"):
        line = ""
        for word in para.split():
            trial = f"{line} {word}".strip()
            if stringWidth(trial, font, size) <= width:
                line = trial
            else:
                if line:
                    out.append(line)
                line = word
        out.append(line)
    return out


def _wordmark(c: Canvas, x: float, y: float) -> None:
    """JAC wordmark drawn as text (heavy, red) + MOTORS label."""
    c.setFillColor(C["red"])
    c.setFont(BOLD, 34)
    c.drawString(x, y, "JAC")
    c.setFillColor(white)
    c.setFont(BOLD, 7.5)
    c.drawString(x + 1, y - 13, "MOTORS")


def render_document(d: DocData) -> bytes:
    buf = io.BytesIO()
    W, H = A4
    M = 48
    c = Canvas(buf, pagesize=A4, pageCompression=1)
    c.setTitle(f"{d.kind.title()} {d.reference}")
    c.setAuthor("JAC Motors Philippines")
    page_no = [1]

    def header() -> float:
        c.setFillColor(C["asphalt"])
        c.rect(0, H - 100, W, 100, stroke=0, fill=1)
        c.setFillColor(C["red"])
        c.rect(0, H - 107, W, 7, stroke=0, fill=1)
        _wordmark(c, M, H - 62)
        c.setFillColor(white)
        c.setFont(BOLD, 22)
        c.drawRightString(W - M, H - 52, d.kind)
        c.setFont(MONO_B, 10)
        c.setFillColor(Color(0.8, 0.8, 0.8))
        c.drawRightString(W - M, H - 70, d.reference)
        return H - 140

    def footer() -> None:
        c.setFont(REG, 7.5)
        c.setFillColor(C["muted"])
        note = (
            "This quotation is not an official receipt. Prices and availability are subject to confirmation upon order."
            if d.kind == "QUOTATION"
            else "This is a billing statement. An official receipt is issued upon payment."
        )
        c.drawString(M, 74, note)
        c.setStrokeColor(C["line"])
        c.line(M, 62, W - M, 62)
        c.drawString(M, 48, safe(COMPANY_LINE))
        c.drawRightString(W - M, 48, f"Page {page_no[0]}")
        c.setFillColor(C["red"])
        c.setFont(BOLD, 7.5)
        c.drawString(M, 36, "Built to keep you moving.")

    def new_page() -> float:
        footer()
        c.showPage()
        page_no[0] += 1
        return header()

    y = header()

    # Bill to / details
    c.setFillColor(C["red"])
    c.setFont(BOLD, 7.5)
    c.drawString(M, y, "BILL TO")
    c.drawString(330, y, f"{d.kind} DETAILS")
    by = y - 17
    c.setFillColor(C["ink"])
    c.setFont(BOLD, 12)
    c.drawString(M, by, safe(d.bill_to.name)[:48])
    by -= 16
    c.setFont(REG, 9)
    for v in (d.bill_to.company, f"TIN {d.bill_to.tin}" if d.bill_to.tin else None, d.bill_to.address, d.bill_to.email, d.bill_to.phone):
        if v:
            for ln in wrap(v, REG, 9, 250)[:2]:
                c.drawString(M, by, ln)
                by -= 13

    details = [("Date", fmt_date(d.date))]
    if d.valid_until:
        details.append(("Valid until", fmt_date(d.valid_until)))
    if d.due_date:
        details.append(("Due", fmt_date(d.due_date)))
    if d.status:
        details.append(("Status", d.status.replace("_", " ").title()))
    if d.branch_name:
        details.append(("Branch", d.branch_name))
    details += list(d.extra.items())
    dy = y - 17
    for k, v in details:
        c.setFont(REG, 9)
        c.setFillColor(C["muted"])
        c.drawString(330, dy, k)
        c.setFont(BOLD, 9)
        c.setFillColor(C["ink"])
        c.drawString(420, dy, safe(v)[:40])
        dy -= 15
    y = min(by, dy) - 14

    if d.subject:
        c.setFont(BOLD, 13)
        c.setFillColor(C["ink"])
        c.drawString(M, y, safe(d.subject)[:70])
        y -= 22
    if d.intro:
        c.setFont(REG, 9)
        for ln in wrap(d.intro, REG, 9, W - 2 * M):
            c.drawString(M, y, ln)
            y -= 13
        y -= 8

    cols = {"desc": M + 10, "qty_right": 372, "unit_right": 462, "total_right": W - M - 10}

    def table_head(y: float) -> float:
        c.setFillColor(C["asphalt"])
        c.rect(M, y - 9, W - 2 * M, 24, stroke=0, fill=1)
        c.setFillColor(white)
        c.setFont(BOLD, 7.5)
        c.drawString(cols["desc"], y, "DESCRIPTION")
        c.drawRightString(cols["qty_right"], y, "QTY")
        c.drawRightString(cols["unit_right"], y, "UNIT PRICE")
        c.drawRightString(cols["total_right"], y, "AMOUNT")
        return y - 28

    y = table_head(y)
    for i, line in enumerate(d.lines):
        desc = wrap(line.description, REG, 9, cols["qty_right"] - cols["desc"] - 40)
        row_h = 15 * len(desc) + 2
        if y - row_h < 200:
            y = table_head(new_page())
        if i % 2 == 0:
            c.setFillColor(C["paper"])
            c.rect(M, y - row_h + 11, W - 2 * M, row_h, stroke=0, fill=1)
        c.setFillColor(C["ink"])
        c.setFont(REG, 9)
        for j, ln in enumerate(desc):
            c.drawString(cols["desc"], y - j * 15, ln)
        c.setFont(MONO, 9)
        q = line.quantity.normalize()
        c.drawRightString(cols["qty_right"], y, f"{q:f}" if q == q.to_integral() else f"{line.quantity:,.2f}")
        c.drawRightString(cols["unit_right"], y, money(line.unit_price, False))
        c.drawRightString(cols["total_right"], y, money(line.total, False))
        y -= row_h + 2

    # Totals
    if y < 230:
        y = new_page()
    y -= 10
    c.setStrokeColor(C["line"])
    c.line(330, y + 6, W - M, y + 6)
    y -= 12
    rows = [("Subtotal", money(d.subtotal))]
    if d.discount > 0:
        rows.append(("Discount", f"- {money(d.discount)}"))
    rows.append((f"VAT ({(d.vat_rate * 100).normalize():f}%)", money(d.vat)))
    for k, v in rows:
        c.setFont(REG, 9)
        c.setFillColor(C["muted"])
        c.drawString(340, y, k)
        c.setFont(MONO, 9)
        c.setFillColor(C["ink"])
        c.drawRightString(W - M - 10, y, v)
        y -= 16
    y -= 6
    c.setFillColor(C["red"])
    c.rect(330, y - 12, W - M - 330, 30, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont(BOLD, 12)
    c.drawString(340, y - 1, "TOTAL")
    c.setFont(MONO_B, 12)
    c.drawRightString(W - M - 10, y - 1, money(d.total))
    y -= 36
    if d.kind == "INVOICE" and d.amount_paid > 0:
        balance = max(d.total - d.amount_paid, Decimal(0))
        for k, v in (("Paid", money(d.amount_paid)), ("Balance due", money(balance))):
            c.setFont(BOLD if k == "Balance due" else REG, 9)
            c.setFillColor(C["ink"])
            c.drawString(340, y, k)
            c.setFont(MONO_B if k == "Balance due" else MONO, 9)
            c.drawRightString(W - M - 10, y, v)
            y -= 15
        y -= 6

    if d.terms:
        lines = wrap(d.terms, REG, 9, W - 2 * M)
        if y - 20 - 13 * len(lines) < 100:
            y = new_page()
        y -= 10
        c.setFillColor(C["red"])
        c.setFont(BOLD, 7.5)
        c.drawString(M, y, "TERMS & NOTES")
        y -= 15
        c.setFillColor(C["muted"])
        c.setFont(REG, 9)
        for ln in lines:
            c.drawString(M, y, ln)
            y -= 13

    footer()
    c.save()
    return buf.getvalue()
