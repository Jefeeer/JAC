"""FastAPI entry point.

All endpoints except /health require the X-Service-Secret header. The
service talks to Supabase with the service-role key and is only ever called
server-to-server (Next.js server actions, cron).
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import date, timedelta
from typing import Literal

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .config import get_settings
from .db import get_db
from .documents import NotFound, generate
from .importer import ImportError_, parse_parts, upsert_parts
from .reminders import run_reminders
from .reports import fetch_inventory, fetch_sales, summarize_inventory, summarize_sales
from .security import require_service_secret

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("jac")


@asynccontextmanager
async def lifespan(_: FastAPI):
    s = get_settings()
    if not s.shared_secret:
        log.warning("SERVICE_SHARED_SECRET is not set — every protected endpoint will return 401")
    scheduler = None
    if s.enable_scheduler:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = BackgroundScheduler(timezone=s.timezone)
        # Single instance only. On multiple replicas, disable this and call
        # POST /jobs/maintenance-reminders from one cron instead.
        scheduler.add_job(
            lambda: run_reminders(get_db()),
            CronTrigger(hour=s.reminder_hour, minute=0),
            id="maintenance-reminders",
            max_instances=1,
            coalesce=True,
            misfire_grace_time=3600,
        )
        scheduler.start()
        log.info("Maintenance reminders scheduled daily at %02d:00 %s", s.reminder_hour, s.timezone)
    yield
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(title="JAC Motors service", version=__version__, lifespan=lifespan, docs_url="/docs", redoc_url=None)
if get_settings().allowed_origins:
    app.add_middleware(CORSMiddleware, allow_origins=list(get_settings().allowed_origins), allow_methods=["GET", "POST"], allow_headers=["X-Service-Secret"])

protected = [Depends(require_service_secret)]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@app.post("/import/parts", dependencies=protected)
async def import_parts(file: UploadFile = File(...)) -> dict:
    data = await file.read(get_settings().max_import_bytes + 1)
    if len(data) > get_settings().max_import_bytes:
        raise HTTPException(413, "File too large (max 10 MB)")
    try:
        parsed = parse_parts(file.filename or "upload.csv", data)
    except ImportError_ as e:
        raise HTTPException(422, str(e)) from e
    result = await run_in_threadpool(upsert_parts, get_db(), parsed.rows)
    return {**result, "skipped": parsed.skipped}


async def _pdf(kind: str, row_id: str) -> dict:
    try:
        return await run_in_threadpool(generate, get_db(), kind, row_id)
    except NotFound as e:
        raise HTTPException(404, str(e)) from e
    except ValueError as e:
        raise HTTPException(422, str(e)) from e


@app.post("/quotes/{quote_id}/pdf", dependencies=protected)
async def quote_pdf(quote_id: str) -> dict:
    return await _pdf("quote", quote_id)


@app.post("/invoices/{invoice_id}/pdf", dependencies=protected)
async def invoice_pdf(invoice_id: str) -> dict:
    return await _pdf("invoice", invoice_id)


@app.get("/reports/sales", dependencies=protected)
async def sales_report(
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    group: Literal["day", "week", "month"] = "month",
) -> dict:
    end = end or date.today()
    start = start or (end - timedelta(days=365)).replace(day=1)
    if start > end:
        raise HTTPException(422, "'from' must be on or before 'to'")
    if (end - start).days > 3 * 366:
        raise HTTPException(422, "Range is limited to 3 years")
    rows = await run_in_threadpool(fetch_sales, get_db(), start, end)
    return {"from": start.isoformat(), "to": end.isoformat(), **summarize_sales(rows, group)}


@app.get("/reports/inventory", dependencies=protected)
async def inventory_report() -> dict:
    parts, trucks = await run_in_threadpool(fetch_inventory, get_db())
    return summarize_inventory(parts, trucks)


@app.post("/jobs/maintenance-reminders", dependencies=protected)
async def maintenance_reminders(dry_run: bool = False) -> dict:
    """Run the reminder job now (cron hook / manual trigger)."""
    return await run_in_threadpool(run_reminders, get_db(), dry_run)
