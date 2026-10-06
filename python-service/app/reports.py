"""Sales and inventory reports. Aggregation is pure; fetching is separate."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Iterable, Literal
from zoneinfo import ZoneInfo

MNL = ZoneInfo("Asia/Manila")
Group = Literal["day", "week", "month"]
PAID_STATES = {"issued", "partially_paid", "paid"}


def _d(v: Any) -> Decimal:
    return Decimal(str(v or 0))


def _local_date(ts: str) -> date:
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(MNL).date()


def bucket(d: date, group: Group) -> str:
    if group == "day":
        return d.isoformat()
    if group == "week":
        monday = d - timedelta(days=d.weekday())
        return monday.isoformat()
    return f"{d.year:04d}-{d.month:02d}"


def summarize_sales(invoices: Iterable[dict[str, Any]], group: Group = "month") -> dict[str, Any]:
    """invoices: rows with issued_at, status, total, amount_paid, items[{item_type, line_total}],
    branch {name}. Drafts and voids are excluded."""
    periods: dict[str, dict[str, Decimal | int]] = defaultdict(lambda: {"invoices": 0, "revenue": Decimal(0), "collected": Decimal(0)})
    by_type: dict[str, Decimal] = defaultdict(Decimal)
    by_branch: dict[str, Decimal] = defaultdict(Decimal)
    count = 0
    revenue = collected = Decimal(0)
    for inv in invoices:
        if inv.get("status") not in PAID_STATES or not inv.get("issued_at"):
            continue
        key = bucket(_local_date(inv["issued_at"]), group)
        total, paid = _d(inv.get("total")), _d(inv.get("amount_paid"))
        p = periods[key]
        p["invoices"] += 1  # type: ignore[operator]
        p["revenue"] += total  # type: ignore[operator]
        p["collected"] += paid  # type: ignore[operator]
        count += 1
        revenue += total
        collected += paid
        by_branch[(inv.get("branch") or {}).get("name") or "Unassigned"] += total
        for it in inv.get("items") or []:
            by_type[it.get("item_type") or "other"] += _d(it.get("line_total"))

    money = lambda v: float(v.quantize(Decimal("0.01")))  # noqa: E731
    return {
        "group": group,
        "totals": {
            "invoices": count,
            "revenue": money(revenue),
            "collected": money(collected),
            "outstanding": money(revenue - collected),
            "average_invoice": money(revenue / count) if count else 0.0,
        },
        "periods": [
            {"period": k, "invoices": v["invoices"], "revenue": money(v["revenue"]), "collected": money(v["collected"])}  # type: ignore[arg-type]
            for k, v in sorted(periods.items())
        ],
        # line totals are ex-VAT
        "by_item_type": {k: money(v) for k, v in sorted(by_type.items(), key=lambda kv: -kv[1])},
        "by_branch": {k: money(v) for k, v in sorted(by_branch.items(), key=lambda kv: -kv[1])},
    }


def summarize_inventory(parts: Iterable[dict[str, Any]], trucks: Iterable[dict[str, Any]]) -> dict[str, Any]:
    parts = list(parts)
    trucks = list(trucks)
    status_counts = {"in_stock": 0, "low_stock": 0, "out_of_stock": 0}
    stock_value = Decimal(0)
    by_category: dict[str, dict[str, Any]] = defaultdict(lambda: {"skus": 0, "units": 0, "value": Decimal(0)})
    reorder: list[dict[str, Any]] = []
    for p in parts:
        status_counts[p.get("stock_status") or "in_stock"] = status_counts.get(p.get("stock_status") or "in_stock", 0) + 1
        qty = int(p.get("stock_qty") or 0)
        value = _d(p.get("price")) * qty
        stock_value += value
        cat = (p.get("category") or {}).get("name") or "Uncategorized"
        by_category[cat]["skus"] += 1
        by_category[cat]["units"] += qty
        by_category[cat]["value"] += value
        if p.get("stock_status") in ("low_stock", "out_of_stock"):
            level = int(p.get("reorder_level") or 0)
            reorder.append(
                {
                    "part_number": p["part_number"],
                    "name": p["name"],
                    "stock_qty": qty,
                    "reorder_level": level,
                    # bring stock to 2x the reorder level
                    "suggested_order": max(level * 2 - qty, 1),
                    "status": p["stock_status"],
                }
            )
    reorder.sort(key=lambda r: (r["status"] != "out_of_stock", r["stock_qty"] - r["reorder_level"]))

    t_avail: dict[str, int] = defaultdict(int)
    t_value = Decimal(0)
    for t in trucks:
        t_avail[t.get("availability") or "available"] += 1
        if t.get("availability") in ("available", "reserved", "incoming"):
            t_value += _d(t.get("price"))

    f = lambda v: float(v.quantize(Decimal("0.01")))  # noqa: E731
    return {
        "parts": {
            "skus": len(parts),
            "status": status_counts,
            "stock_value": f(stock_value),  # at VAT-inclusive list price
            "by_category": {k: {**v, "value": f(v["value"])} for k, v in sorted(by_category.items())},
            "reorder": reorder,
        },
        "trucks": {"units": len(trucks), "by_availability": dict(t_avail), "listed_value": f(t_value)},
    }


def fetch_sales(db: Any, start: date, end: date) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        res = (
            db.table("invoices")
            .select("issued_at, status, total, amount_paid, branch:branches(name), items:invoice_items(item_type, line_total)")
            .gte("issued_at", f"{start.isoformat()}T00:00:00+08:00")
            .lt("issued_at", f"{(end + timedelta(days=1)).isoformat()}T00:00:00+08:00")
            .order("issued_at")
            .range(offset, offset + 999)
            .execute()
        )
        batch = res.data or []
        rows += batch
        if len(batch) < 1000:
            return rows
        offset += 1000


def fetch_inventory(db: Any) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    parts = db.table("parts").select("part_number, name, price, stock_qty, reorder_level, stock_status, category:part_categories(name)").limit(10000).execute().data or []
    trucks = db.table("trucks").select("availability, price").limit(5000).execute().data or []
    return parts, trucks
