# JAC Motors — Website & Dealer Platform

**Built to Keep You Moving.** Public website, customer portal and admin panel for **JAC Motors Philippines**: truck sales, genuine parts, after-sales service, maintenance and breakdown support across 7 branches.

| Layer | Tech |
| --- | --- |
| Web + API | Next.js 16 (App Router, TypeScript strict, Server Actions) on Vercel |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI primitives), lucide icons, Motion |
| Data / Auth / Storage / Realtime | Supabase (Postgres + RLS) |
| Heavy jobs | Python FastAPI service in `/python-service` (Railway / Render) |
| Email / SMS | Resend, optional Twilio |
| Validation / forms | Zod + React Hook Form |

---

## Build status

| Step | Scope | Status |
| --- | --- | --- |
| 1 | Project setup, design system, JAC branding, layout, home page | ✅ |
| 2 | Supabase schema, RLS, storage, seed data, DB test suite | ✅ |
| 3 | Trucks + parts catalog (public), quote forms, financing calculator | ✅ |
| 4 | Book Service form, branded email + SMS notifications, status webhooks | ✅ |
| 5 | Auth (magic link + code) + customer portal, demo mode | ✅ |
| 6 | Admin panel: role-based dashboard, job board, bookings, quotes + PDF, trucks, parts + import, customers | ✅ |
| 7 | Python service: CSV/Excel import, ReportLab PDFs, sales + inventory reports, daily PMS reminders — see `python-service/README.md` | ✅ |
| 8 | SEO, performance pass, deployment docs | ⏳ next |

---

## Folder structure

```
.
├── app/
│   ├── (site)/                 # public website (header, footer, sticky breakdown button)
│   │   ├── page.tsx            # home (ISR, 10 min)
│   │   ├── trucks/(list)/      # /trucks — search, filters, sort, pagination (dynamic)
│   │   ├── trucks/[slug]/      # truck detail (SSG + ISR 1 h): gallery, specs, calculator, quote form
│   │   ├── parts/(list)/       # /parts — part no./name search, fits-my-truck, categories, stock
│   │   ├── parts/[slug]/       # part detail (SSG + ISR 1 h): fitment, specs, quote form + photo upload
│   │   ├── book-service/       # service / breakdown booking form
│   ├── (auth)/login/           # magic link + 6-digit code sign-in, demo personas
│   ├── (portal)/account/       # customer portal: dashboard, fleet, jobs (live), bookings, quotes, notifications, profile
│   ├── (admin)/admin/          # staff panel: dashboard, job board, bookings, quotes, trucks, parts (+import), customers, notifications
│   ├── api/documents/          # quote + invoice PDFs (rendered on request, access-checked)
│   ├── auth/confirm/           # magic-link landing (token_hash or PKCE code)
│   ├── api/webhooks/supabase/  # DB webhook → booking & job status emails/SMS
│   ├── api/dev/emails/         # dev-only email previews
│   │   ├── credits/            # photo attribution
│   │   ├── loading.tsx · error.tsx
│   ├── layout.tsx              # fonts, theme, providers, global metadata
│   ├── not-found.tsx
│   ├── icon.svg · apple-icon.png
│   └── globals.css             # design tokens + signature utilities
├── components/
│   ├── brand/                  # JAC wordmark (SVG paths), channel icons
│   ├── catalog/                # URL-driven filter forms, search, chips, pagination, stock badge, breadcrumbs
│   ├── forms/                  # form controls, honeypot, consent, signed-URL photo upload
│   ├── parts/ · trucks/        # catalog rows/cards, gallery, spec sheet, finance calculator, quote forms
│   ├── home/                   # hero, stats, featured, lineup, services, tracker, testimonials, branches, contact
│   ├── layout/                 # header, nav, footer, breakdown button, theme toggle
│   ├── shared/                 # section heading, truck card, odometer, JSON-LD
│   └── ui/                     # shadcn/ui
├── lib/
│   ├── config/                 # site.ts (brand + contact), branches.ts (7 branches + hours)
│   ├── data/                   # seed-data.ts (sample catalog), testimonials.ts (samples)
│   ├── supabase/               # server / public / browser / admin (service role, server-only) clients
│   ├── validation/             # Zod: catalog URL params, quote forms, uploads
│   ├── format.ts               # ₱ / km / tonnes formatting
│   └── photo-credits.json
├── server/
│   ├── actions/                # Server Actions: quotes, bookings, uploads, portal, admin
│   ├── admin/                  # admin repository (Supabase + demo), permissions matrix
│   ├── demo/                   # DEMO MODE store, session, portal + mutations
│   ├── pdf/                    # branded quote/invoice PDFs (pdf-lib fallback)
│   ├── email/                  # branded email layout, templates, Resend sender
│   ├── notifications/          # email/SMS fan-out for quotes, bookings, job status
│   ├── sms.ts                  # optional Twilio SMS
│   ├── queries/catalog.ts      # catalog reads (Supabase → domain types, sample-data fallback)
│   ├── security/guards.ts      # IP rate limit (Postgres-backed), honeypot + timing check
│   └── customers.ts            # customer resolution for form submissions
├── types/domain.ts             # domain types mirroring the schema
├── supabase/
│   ├── migrations/             # 0100 core schema · 0200 RLS & security · 0300 storage
│   ├── seed.sql                # GENERATED from lib/data/seed-data.ts
│   └── tests/                  # PGlite-based migration + RLS test suite (no Docker)
├── scripts/generate-seed.ts
├── public/brand · public/images
└── python-service/             # (step 7)
```

---

## Getting started

Requirements: **Node 22.18+** (scripts use native TypeScript type-stripping), npm.

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys when ready
npm run dev                  # http://localhost:3000
```

The site runs **without Supabase** — catalog queries fall back to the sample data in `lib/data/seed-data.ts` and log a warning.

### Demo mode (no Supabase needed)

Set `NEXT_PUBLIC_DEMO_MODE=1` in `.env.local` and restart. The login page then offers one-click **demo accounts**:

| Persona | Area | What to try |
| --- | --- | --- |
| Ana Reyes — fleet customer | `/account` | A truck in the workshop advances one stage every 40 s (or use **Advance live job**); a priced quote; overdue units; cancel a booking; add a truck |
| Ben Santos — single-truck owner | `/account` | Pending booking, one used unit |
| Carla (admin), Jun (service advisor), Rico (mechanic), Mika (sales), Leo (parts) | `/admin` | Staff views per role |

Demo data lives in server memory (`server/demo/*`), is shared by all demo sessions and resets on restart or via **Reset data**. Quote/booking forms on the public site also land in the demo data. **Turn demo mode off on the production site** once Supabase is live.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:test` | Applies every migration + seed in PGlite and runs 63 RLS/trigger assertions |
| `npm run db:seed:generate` | Regenerates `supabase/seed.sql` from `lib/data/seed-data.ts` |
| `npm run db:types` | Generates Supabase TS types (requires a linked project) |

---

## Supabase setup

### 1. Create the project
Create a project at [supabase.com](https://supabase.com) (region: **Singapore** is closest to PH). Copy the URL, publishable key and secret key into `.env.local`.

### 2. Apply migrations

**Option A — Supabase CLI (recommended)**

```bash
npx supabase init            # once; keeps the existing supabase/migrations folder
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push         # applies supabase/migrations/*
# optional sample data — run supabase/seed.sql in the SQL editor, or:
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

**Option B — SQL editor**
Paste and run, in order:
1. `supabase/migrations/20261006000100_core_schema.sql`
2. `supabase/migrations/20261006000200_security_rls.sql`
3. `supabase/migrations/20261006000300_storage.sql`
4. `supabase/migrations/20261006000400_booking_notifications.sql`
5. `supabase/migrations/20261006000500_job_event_notes.sql`
6. `supabase/seed.sql` (optional sample data)

### 3. Auth settings
- **Authentication → Providers → Email**: enable (magic link / OTP).
- **Authentication → URL configuration**: Site URL = your domain; add `https://YOUR-DOMAIN/auth/confirm` and `http://localhost:3000/**` to redirect URLs.
- **Authentication → Emails → Templates**: paste `supabase/templates/magic-link.html` into *Magic Link* and *Confirm signup* (branded; uses `token_hash` so links work on any device, and shows the 6-digit code fallback).

### 4. Make yourself an admin
Sign up on the site (step 5) or create a user in **Authentication → Users**, then:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Roles: `customer` (default), `admin`, `sales`, `parts`, `service_advisor`, `mechanic`.

### Data model (summary)

`branches` · `companies` · `profiles` (1:1 auth.users, role) · `customers` (may exist without login; auto-linked by email on sign-up) · `trucks` + `truck_images` · `part_categories` · `parts` (generated `stock_status`) · `part_compatibility` · `services` · `fleet_units` · `service_bookings` · `job_orders` + `job_order_items` + `job_order_events` (live timeline) · `quotes` + `quote_items` · `invoices` + `invoice_items` · `staff_notes` · `notifications` · `maintenance_reminders` · `audit_log` · `rate_limits`

Highlights:
- Human references via sequences: `Q-2610-00042`, `BK-…`, `JO-…`, `INV-…`.
- Job status changes stamp timestamps, write a timeline event, notify the customer and (on release) roll the fleet unit's service history forward.
- Quote / job / invoice totals are recomputed from line items by triggers; PH VAT 12% default.
- `fleet_unit_maintenance` view computes next-service km/date and `ok | due_soon | overdue`.
- Full-text + trigram search on trucks and parts.

### Admin roles

| Role | Sees |
| --- | --- |
| admin | Everything, incl. deleting trucks |
| sales | Trucks (CRUD, photos, publish), quotes (defaults to truck quotes), customers, bookings (read) |
| parts | Parts & stock (CRUD, CSV import), quotes (parts), customers, job items |
| service_advisor | Bookings (confirm / reschedule / convert), job board (full), quotes (service), customers, invoices |
| mechanic | Only jobs assigned to them; move stages diagnosing → ready, add items and notes; cannot release/cancel |

The UI hides what a role can’t do (`server/admin/permissions.ts`), and RLS enforces it in the database.

### Security model

- **RLS on every table.** Public (anon) reads only published trucks/parts, categories, active services and branches.
- Customers read/write only rows tied to their own `customers` record.
- Staff access is per role; guard triggers enforce column-level rules (customers can only cancel bookings; mechanics can only move status/diagnosis on their assigned jobs, never release; only admins change roles).
- Staff-only notes live in `staff_notes` — never as a column on customer-visible rows.
- Public form submissions go through Server Actions (Zod + honeypot + `hit_rate_limit()`), using the service-role client **server-side only** (`lib/supabase/admin.ts` imports `server-only`).
- Storage: `truck-images` & `part-images` public (staff write), `uploads` private (`{user_id}/…`), `documents` private (`customers/{customer_id}/…`).
- Realtime enabled on `job_orders`, `job_order_events`, `service_bookings`, `quotes`, `notifications` (filtered by RLS).

---

## Notifications (email, SMS, in-app)

| Event | Customer | Staff | Trigger |
| --- | --- | --- | --- |
| Quote requested (truck / part) | Email | Email (sales / parts inbox) + in-app | Server Action → `after()` |
| Booking requested | Email (+ SMS if breakdown) | Email (service inbox) + in-app | Server Action → `after()` |
| Booking confirmed / rescheduled / cancelled | Email + SMS + in-app | — | Database webhook |
| Job status change (received → released) | Email + in-app (SMS when ready) | — | Database webhook |

- In-app notifications are written by **database triggers**, so they fire no matter where a change happens.
- Emails are sent with **Resend** idempotency keys — webhook re-deliveries never double-send. Without `RESEND_API_KEY` emails are logged (dev) or skipped.
- SMS uses Twilio only when `TWILIO_*` is set; Philippine mobiles are normalised to +63.
- Templates: `server/email/templates.ts`. **Preview in dev:** [localhost:3000/api/dev/emails/index](http://localhost:3000/api/dev/emails/index) (404 in production).

### Setup
1. **Resend:** add and verify your sending domain (e.g. `jacmotors.ph`), then set `RESEND_API_KEY` and `EMAIL_FROM`.
2. Set `STAFF_NOTIFY_EMAILS` (and optionally `STAFF_NOTIFY_SALES` / `_PARTS` / `_SERVICE`).
3. Generate a secret: `openssl rand -hex 32` → `SUPABASE_WEBHOOK_SECRET`.
4. **Supabase → Database → Webhooks → Create** — two webhooks:
   - Table `service_bookings`, event **Update**, type HTTP POST, URL `https://YOUR-DOMAIN/api/webhooks/supabase`, header `x-webhook-secret: <secret>`
   - Table `job_orders`, event **Update**, same URL and header

---

## Design system

- **Concept:** a working service bay at night — asphalt + concrete neutrals, **JAC red** as the only brand accent, hazard amber reserved for warnings/breakdown/low stock.
- **Type:** Big Shoulders (condensed display), Archivo with its width axis (body + extended labels), JetBrains Mono (spec read-outs, part numbers, plates).
- **Signature details:** roll-up "shutter" CTAs, riveted data-plate truck cards, weighbridge payload chart, departure-board branch list with live open/closed state, odometer counters, waybill testimonials, looping job-order tracker demo.
- **Theme:** dark by default, light mode via toggle / system; tokens in `app/globals.css`.
- **Accessibility:** skip link, visible focus rings, `prefers-reduced-motion` respected, semantic landmarks, AA contrast on text tokens.

---

## Business details to confirm (marked `CONFIRM` in code)

- 24/7 breakdown hotline number (currently HQ landline) and Viber mobile (currently A. Bonifacio mobile)
- Contact email(s) and staff notification inboxes
- Branch opening hours (placeholder Mon–Sat 8 AM–5 PM) and exact map coordinates
- Home-page stats, official model names/specs/prices (seed data is representative only)
- Real customer testimonials (current ones are labelled samples)
- Warranty terms for the After-Sales page

## Photo credits

Interim photography is from Wikimedia Commons (CC BY / CC BY-SA / CC0 / OGL); see `/credits` and `lib/photo-credits.json`. Replace with JAC Motors' own photography before launch.
