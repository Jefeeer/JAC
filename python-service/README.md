# JAC Motors — Python service

FastAPI service for the heavy and scheduled work the Next.js app hands off. It uses the Supabase **service-role key**, so it runs server-side only. Every endpoint except `/health` requires the `X-Service-Secret` header.

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/health` | Liveness probe (no auth) |
| POST | `/import/parts` | Multipart `file` (.csv / .xlsx, ≤10 MB, ≤2,000 rows). Upserts by `part_number` and replaces fitment when `compatible_models` is given. Returns `{inserted, updated, skipped[]}` |
| POST | `/quotes/{id}/pdf` | Renders the branded quotation, stores it at `documents/customers/{customer}/quotes/{ref}.pdf`, sets `quotes.pdf_path`. Returns `{path, url}` (signed for 10 min) |
| POST | `/invoices/{id}/pdf` | Same for invoices (shows paid / balance due) |
| GET | `/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD&group=day\|week\|month` | Revenue, collected and outstanding by period, item type and branch (issued / partially paid / paid invoices; Manila dates) |
| GET | `/reports/inventory` | Parts by stock status and category, stock value, reorder list with suggested quantities, and trucks by availability |
| POST | `/jobs/maintenance-reminders?dry_run=true` | Runs the reminder job now |

## Maintenance reminders

Each day at `REMINDER_HOUR` (Asia/Manila), the job reads the `fleet_unit_maintenance` view and picks units that are **due soon** (within 1,000 km or 14 days) or **overdue**, with reminders on and no reminder in the last `REMINDER_COOLDOWN_DAYS`. For each unit it then:

- emails the customer a branded reminder via Resend, using an idempotency key per unit per day
- adds an in-app notification if the customer has a portal account
- logs the send to `maintenance_reminders`

Run the scheduler on **one** instance only (`ENABLE_SCHEDULER=1`). If you scale out, set `ENABLE_SCHEDULER=0` and call `POST /jobs/maintenance-reminders` from a platform cron instead.

## Run locally

```bash
cd python-service
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env    # fill in values, then export them (or use `uvicorn --env-file .env`)
uvicorn app.main:app --reload --port 8000 --env-file .env
pytest -q
```

To connect it to the web app, set these in the Next.js env:

```
PYTHON_SERVICE_URL=http://localhost:8000
PYTHON_SERVICE_SECRET=<same as SERVICE_SHARED_SECRET>
```

Without these settings the web app falls back to its built-in Node PDF renderer and a CSV-only importer.

## Deploy

**Railway:** create a new service from this repo, set the root directory to `python-service` (the Dockerfile is detected automatically), add the variables from `.env.example`, and set the health check path to `/health`.

**Render:** create a new Web Service with Docker runtime, root directory `python-service`, and health check path `/health`. Add the env vars. For multiple instances, add a Render Cron Job instead:
`curl -fsS -X POST -H "X-Service-Secret: $SECRET" https://<service>/jobs/maintenance-reminders`.

The container runs as a non-root user and listens on `$PORT`.
