"""Daily maintenance reminders.

Reads the fleet_unit_maintenance view, picks units that are due soon or
overdue (reminders on, not reminded within the cooldown), then sends a branded
email via Resend, an in-app notification for portal customers, and logs to
maintenance_reminders so nobody is nagged twice.
"""

from __future__ import annotations

import html
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable

import httpx

from .config import get_settings

log = logging.getLogger("jac.reminders")


@dataclass
class Due:
    fleet_unit_id: str
    customer_id: str
    model: str
    plate_number: str | None
    state: str  # due_soon | overdue
    reason: str  # mileage | date
    km_remaining: int
    next_service_mileage_km: int
    next_service_date: str | None


def select_due(units: Iterable[dict[str, Any]], recent_unit_ids: set[str]) -> list[Due]:
    """Pure selection logic (tested)."""
    out: list[Due] = []
    for u in units:
        if not u.get("reminders_enabled") or u.get("maintenance_state") not in ("due_soon", "overdue"):
            continue
        if u["fleet_unit_id"] in recent_unit_ids:
            continue
        km_left = int(u.get("km_remaining") or 0)
        nxt = u.get("next_service_date")
        # mileage-driven if within 1,000 km, otherwise the calendar triggered it
        reason = "mileage" if km_left <= 1000 else "date"
        out.append(
            Due(
                fleet_unit_id=u["fleet_unit_id"],
                customer_id=u["customer_id"],
                model=u.get("model") or "truck",
                plate_number=u.get("plate_number"),
                state=u["maintenance_state"],
                reason=reason,
                km_remaining=km_left,
                next_service_mileage_km=int(u.get("next_service_mileage_km") or 0),
                next_service_date=nxt,
            )
        )
    return out


def _fmt_date(s: str | None) -> str:
    if not s:
        return ""
    d = date.fromisoformat(s[:10])
    return f"{d:%B} {d.day}, {d.year}"


def reminder_email(name: str, due: Due, site_url: str) -> tuple[str, str, str]:
    """Return (subject, html, text). Table layout + inline styles for email clients."""
    unit = f"JAC {due.model}" + (f" ({due.plate_number})" if due.plate_number else "")
    overdue = due.state == "overdue"
    subject = f"{'Overdue' if overdue else 'Coming up'}: PMS for your {unit}"
    if due.reason == "mileage":
        detail = (
            f"It has passed its {due.next_service_mileage_km:,} km service."
            if overdue or due.km_remaining == 0
            else f"About {due.km_remaining:,} km to go before its {due.next_service_mileage_km:,} km service."
        )
    else:
        detail = f"Its scheduled service date {'was' if overdue else 'is'} {_fmt_date(due.next_service_date)}."
    book = f"{site_url}/book-service?unit={due.fleet_unit_id}"
    first = html.escape(name.split()[0] if name else "there")
    e_unit, e_detail = html.escape(unit), html.escape(detail)
    accent = "#d7000f"
    body = f"""<!doctype html><html><body style="margin:0;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;color:#16171a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:24px 0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff">
<tr><td style="background:#141518;padding:20px 28px;border-bottom:5px solid {accent}">
<span style="font:900 28px Arial,Helvetica,sans-serif;color:{accent};letter-spacing:-1px">JAC</span>
<span style="font:700 10px Arial,Helvetica,sans-serif;color:#ffffff;letter-spacing:2px;margin-left:6px">MOTORS</span></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 6px;font:700 11px Arial;letter-spacing:2px;color:{accent};text-transform:uppercase">{'Service overdue' if overdue else 'Service reminder'}</p>
<h1 style="margin:0 0 16px;font:800 24px Arial;line-height:1.2">{e_unit} is {'overdue' if overdue else 'due'} for preventive maintenance</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6">Hi {first},</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6">{e_detail} Regular PMS keeps your warranty valid and your truck earning.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:{accent};border-radius:4px">
<a href="{book}" style="display:inline-block;padding:13px 22px;font:700 15px Arial;color:#ffffff;text-decoration:none">Book a service slot</a></td></tr></table>
<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#5e5c57">Already serviced elsewhere or updated the odometer? Update it in your
<a href="{site_url}/account/fleet/{due.fleet_unit_id}" style="color:{accent}">fleet page</a> and we'll adjust the next reminder.</p>
</td></tr>
<tr><td style="padding:16px 28px;background:#f9f8f6;font-size:12px;color:#5e5c57">JAC Motors Philippines · Breakdown hotline (02) 8361-3333<br>
You receive this because maintenance reminders are on for this truck. Turn them off from your fleet page.</td></tr>
</table></td></tr></table></body></html>"""
    text = f"Hi {name or 'there'},\n\n{unit}: {detail}\n\nBook a service: {book}\n\nJAC Motors Philippines · (02) 8361-3333"
    return subject, body, text


def send_email(to: str, subject: str, html_body: str, text: str, idempotency_key: str) -> bool:
    s = get_settings()
    if not s.resend_api_key:
        log.info("RESEND_API_KEY not set — would email %s: %s", to, subject)
        return False
    r = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {s.resend_api_key}", "Idempotency-Key": idempotency_key},
        json={"from": s.email_from, "to": [to], "subject": subject, "html": html_body, "text": text, "tags": [{"name": "type", "value": "maintenance_reminder"}]},
        timeout=20,
    )
    if r.status_code >= 300:
        log.warning("Resend %s: %s", r.status_code, r.text[:300])
        return False
    return True


def run_reminders(db: Any, dry_run: bool = False) -> dict[str, Any]:
    s = get_settings()
    units = db.table("fleet_unit_maintenance").select("*").in_("maintenance_state", ["due_soon", "overdue"]).eq("reminders_enabled", True).execute().data or []
    since = (datetime.now(timezone.utc) - timedelta(days=s.reminder_cooldown_days)).isoformat()
    recent = db.table("maintenance_reminders").select("fleet_unit_id").gte("sent_at", since).execute().data or []
    due = select_due(units, {r["fleet_unit_id"] for r in recent})

    customers: dict[str, dict[str, Any]] = {}
    ids = list({d.customer_id for d in due})
    for i in range(0, len(ids), 200):
        rows = db.table("customers").select("id, full_name, email, profile_id").in_("id", ids[i : i + 200]).execute().data or []
        customers.update({c["id"]: c for c in rows})

    sent = notified = 0
    results = []
    today = date.today().isoformat()
    for d in due:
        c = customers.get(d.customer_id) or {}
        channels = []
        if dry_run:
            results.append({"fleet_unit_id": d.fleet_unit_id, "state": d.state, "reason": d.reason, "email": c.get("email")})
            continue
        if c.get("email"):
            subject, body, text = reminder_email(c.get("full_name") or "", d, s.site_url)
            if send_email(c["email"], subject, body, text, f"pms-{d.fleet_unit_id}-{today}"):
                sent += 1
                channels.append("email")
        if c.get("profile_id"):
            unit = f"JAC {d.model}" + (f" {d.plate_number}" if d.plate_number else "")
            db.table("notifications").insert(
                {
                    "recipient_id": c["profile_id"],
                    "type": "reminder.maintenance",
                    "title": f"{'Overdue' if d.state == 'overdue' else 'Due soon'}: PMS for {unit}",
                    "body": f"{d.km_remaining:,} km to go" if d.reason == "mileage" and d.km_remaining else f"Service date {_fmt_date(d.next_service_date)}",
                    "link": f"/account/fleet/{d.fleet_unit_id}",
                    "data": {"fleet_unit_id": d.fleet_unit_id, "state": d.state},
                }
            ).execute()
            notified += 1
            channels.append("in_app")
        if channels:
            db.table("maintenance_reminders").insert(
                {
                    "fleet_unit_id": d.fleet_unit_id,
                    "reason": d.reason,
                    "due_mileage_km": d.next_service_mileage_km,
                    "due_date": d.next_service_date,
                    "channel": "+".join(channels),
                }
            ).execute()
        results.append({"fleet_unit_id": d.fleet_unit_id, "state": d.state, "channels": channels})

    summary = {"candidates": len(units), "due": len(due), "emailed": sent, "notified": notified, "dry_run": dry_run, "results": results}
    log.info("reminders: %s", {k: v for k, v in summary.items() if k != "results"})
    return summary
