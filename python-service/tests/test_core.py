"""Unit tests for the pure parts of the service (no network, no Supabase)."""

from __future__ import annotations

import io
from decimal import Decimal

import pytest

from app.importer import ImportError_, parse_parts, upsert_parts
from app.pdf import BillTo, DocData, DocLine, money, render_document, safe
from app.reminders import reminder_email, select_due
from app.reports import bucket, summarize_inventory, summarize_sales
from app.security import secret_matches

# ------------------------------------------------------------------ importer


CSV = (
    "Part No,Description,Category,SRP,Qty,reorder_level,compatible_models\n"
    'tst-001,"Test Filter, heavy duty",Engine Filtration,"₱1,250",12,3,N55;N75\n'
    "JAC-1017100-T8,Oil Filter — T8 Pro,engine-filtration,650,30,10,T8 Pro\n"
    ",missing number,brakes,10,1,1,\n"
    "BAD-1,Bad price,brakes,abc,1,1,\n"
    "TST-001,Duplicate,brakes,1,1,1,\n"
    "POR-1,Price on request,brakes,,0,,\n"
)


def test_parse_csv_aliases_and_normalisation():
    r = parse_parts("list.csv", CSV.encode())
    assert [p.part_number for p in r.rows] == ["TST-001", "JAC-1017100-T8", "POR-1"]
    first = r.rows[0]
    assert first.name == "Test Filter, heavy duty"
    assert first.category_slug == "engine-filtration"
    assert first.price == Decimal("1250.00")
    assert first.stock_qty == 12 and first.reorder_level == 3
    assert first.compatible_models == ["N55", "N75"]
    assert r.rows[2].price is None and r.rows[2].reorder_level == 5
    assert r.skipped == ["Row 4: (no part number)", "Row 5: BAD-1 (invalid price)", "Row 6: TST-001 (duplicate in file)"]


def test_parse_xlsx():
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(["part_number", "name", "price", "stock_qty"])
    ws.append(["X-1", "Excel part", 99.5, 4])
    ws.append([None, None, None, None])  # blank row ignored
    buf = io.BytesIO()
    wb.save(buf)
    r = parse_parts("list.xlsx", buf.getvalue())
    assert len(r.rows) == 1 and r.rows[0].price == Decimal("99.50") and r.rows[0].stock_qty == 4


def test_parse_rejects_bad_files():
    with pytest.raises(ImportError_):
        parse_parts("list.pdf", b"x")
    with pytest.raises(ImportError_):
        parse_parts("list.csv", b"sku_missing,name\n1,2\n".replace(b"sku_missing", b"code"))
    with pytest.raises(ImportError_):
        parse_parts("list.csv", b"")


class FakeQuery:
    def __init__(self, db, table):
        self.db, self.table, self.op, self.payload, self.filters = db, table, "select", None, []

    def select(self, *_):
        return self

    def in_(self, col, vals):
        self.filters.append(("in", col, list(vals)))
        return self

    def eq(self, col, val):
        self.filters.append(("eq", col, val))
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def delete(self):
        self.op = "delete"
        return self

    def execute(self):
        self.db.calls.append((self.table, self.op, self.payload, self.filters))
        rows = self.db.data.setdefault(self.table, [])
        if self.op == "select":
            out = rows
            for kind, col, val in self.filters:
                out = [r for r in out if (r.get(col) in val if kind == "in" else r.get(col) == val)]
            return type("R", (), {"data": out})
        if self.op == "insert":
            items = self.payload if isinstance(self.payload, list) else [self.payload]
            for i, it in enumerate(items):
                it.setdefault("id", f"{self.table}-{len(rows) + i}")
            rows.extend(items)
            return type("R", (), {"data": items})
        return type("R", (), {"data": []})


class FakeDB:
    def __init__(self, data):
        self.data, self.calls = data, []

    def table(self, name):
        return FakeQuery(self, name)


def test_upsert_parts_inserts_updates_and_replaces_fitment():
    db = FakeDB(
        {
            "part_categories": [{"id": "cat-ef", "slug": "engine-filtration"}],
            "parts": [{"id": "p-existing", "slug": "oil-filter", "part_number": "JAC-1017100-T8"}],
        }
    )
    rows = parse_parts("l.csv", CSV.encode()).rows
    res = upsert_parts(db, rows)
    assert res == {"inserted": 2, "updated": 1}
    inserted = [c for c in db.calls if c[0] == "parts" and c[1] == "insert"]
    assert inserted[0][2]["category_id"] == "cat-ef" and inserted[0][2]["slug"] == "test-filter-heavy-duty-tst-001"
    assert inserted[1][2]["price_on_request"] is True
    updates = [c for c in db.calls if c[0] == "parts" and c[1] == "update"]
    assert updates[0][3] == [("eq", "id", "p-existing")]
    compat = [c for c in db.calls if c[0] == "part_compatibility" and c[1] == "insert"]
    assert [x["model"] for x in compat[0][2]] == ["N55", "N75"]
    # POR-1 has no models → its fitment is left alone
    assert len(compat) == 2


# ----------------------------------------------------------------------- pdf


def test_pdf_totals_and_render():
    doc = DocData(
        kind="QUOTATION",
        reference="Q-2610-00041",
        date="2026-10-05T03:00:00Z",
        valid_until="2026-10-20",
        bill_to=BillTo(name="Ana Reyes", email="ana@example.ph"),
        subject="JAC N90 Box Van",
        intro="Hi Ana — fleet pricing below.",
        lines=[
            DocLine("JAC N90 Box Van 18 ft", Decimal(2), Decimal("2098214.29")),
            DocLine("Rear liftgate, 1,000 kg", Decimal(2), Decimal("89285.71")),
        ],
        terms="Delivery 3–4 weeks.",
    )
    assert doc.subtotal == Decimal("4375000.00")
    assert doc.vat == Decimal("525000.00")
    assert doc.total == Decimal("4900000.00")
    pdf = render_document(doc)
    assert pdf.startswith(b"%PDF-") and len(pdf) > 1500


def test_pdf_paginates_long_documents():
    lines = [DocLine(f"Line item {i} with a fairly long description to wrap", Decimal(1), Decimal(100)) for i in range(80)]
    doc = DocData(kind="INVOICE", reference="INV-1", date="2026-10-06", bill_to=BillTo(name="X"), lines=lines, amount_paid=Decimal(1000))
    pdf = render_document(doc)
    assert pdf.count(b"/Type /Page\n") + pdf.count(b"/Type /Page ") + pdf.count(b"/Type /Page>") >= 2 or b"/Count 3" in pdf or b"/Count 2" in pdf


def test_text_helpers():
    assert money(Decimal("1234.5")) == "PHP 1,234.50"
    assert safe("₱5 — “ok”") == 'PHP 5  -  "ok"'


# ------------------------------------------------------------------- reports


def test_sales_summary():
    invs = [
        {"issued_at": "2026-09-30T17:00:00Z", "status": "paid", "total": 112, "amount_paid": 112, "branch": {"name": "North EDSA"}, "items": [{"item_type": "labor", "line_total": 100}]},
        {"issued_at": "2026-10-05T01:00:00Z", "status": "issued", "total": 224, "amount_paid": 0, "branch": None, "items": [{"item_type": "part", "line_total": 200}]},
        {"issued_at": "2026-10-05T01:00:00Z", "status": "draft", "total": 999, "amount_paid": 0},
        {"issued_at": "2026-10-05T01:00:00Z", "status": "void", "total": 999, "amount_paid": 0},
    ]
    s = summarize_sales(invs, "month")
    # 2026-09-30T17:00Z is Oct 1 in Manila
    assert [p["period"] for p in s["periods"]] == ["2026-10"]
    assert s["totals"] == {"invoices": 2, "revenue": 336.0, "collected": 112.0, "outstanding": 224.0, "average_invoice": 168.0}
    assert s["by_branch"] == {"Unassigned": 224.0, "North EDSA": 112.0}
    assert bucket(__import__("datetime").date(2026, 10, 8), "week") == "2026-10-05"


def test_inventory_summary():
    parts = [
        {"part_number": "A", "name": "a", "price": 10, "stock_qty": 0, "reorder_level": 3, "stock_status": "out_of_stock", "category": {"name": "Brakes"}},
        {"part_number": "B", "name": "b", "price": 5, "stock_qty": 2, "reorder_level": 4, "stock_status": "low_stock", "category": {"name": "Brakes"}},
        {"part_number": "C", "name": "c", "price": None, "stock_qty": 50, "reorder_level": 5, "stock_status": "in_stock", "category": None},
    ]
    trucks = [{"availability": "available", "price": 1000}, {"availability": "sold", "price": 5000}]
    s = summarize_inventory(parts, trucks)
    assert s["parts"]["status"] == {"in_stock": 1, "low_stock": 1, "out_of_stock": 1}
    assert s["parts"]["stock_value"] == 10.0
    assert [r["part_number"] for r in s["parts"]["reorder"]] == ["A", "B"]
    assert s["parts"]["reorder"][0]["suggested_order"] == 6
    assert s["trucks"] == {"units": 2, "by_availability": {"available": 1, "sold": 1}, "listed_value": 1000.0}


# ----------------------------------------------------------------- reminders


def _unit(**kw):
    base = {
        "fleet_unit_id": "u1",
        "customer_id": "c1",
        "model": "N55",
        "plate_number": "NAD 6513",
        "maintenance_state": "due_soon",
        "km_remaining": 400,
        "next_service_mileage_km": 50000,
        "next_service_date": "2027-01-01",
        "reminders_enabled": True,
    }
    return {**base, **kw}


def test_select_due_filters_and_reason():
    units = [
        _unit(),
        _unit(fleet_unit_id="u2", maintenance_state="ok"),
        _unit(fleet_unit_id="u3", reminders_enabled=False),
        _unit(fleet_unit_id="u4"),
        _unit(fleet_unit_id="u5", maintenance_state="overdue", km_remaining=6000, next_service_date="2026-09-01"),
    ]
    due = select_due(units, recent_unit_ids={"u4"})
    assert [(d.fleet_unit_id, d.reason) for d in due] == [("u1", "mileage"), ("u5", "date")]


def test_reminder_email_is_escaped_and_linked():
    d = select_due([_unit(plate_number="<b>X</b>")], set())[0]
    subject, body, text = reminder_email("Ana <Reyes>", d, "https://jacmotors.ph")
    assert subject == "Coming up: PMS for your JAC N55 (<b>X</b>)"
    assert "&lt;b&gt;X&lt;/b&gt;" in body and "<b>X</b>" not in body
    assert "Hi Ana," in body
    assert "https://jacmotors.ph/book-service?unit=u1" in body and "400 km to go" in text


# ------------------------------------------------------------------ security


def test_secret_matches():
    assert secret_matches("s3cret", "s3cret")
    assert not secret_matches("s3cret", "nope")
    assert not secret_matches("", "")
    assert not secret_matches("s3cret", None)
