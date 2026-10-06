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
| 3 | Trucks + parts catalog (public) | ⏳ next |
| 4 | Quote & booking forms + email notifications | ⏳ |
| 5 | Auth + customer portal | ⏳ |
| 6 | Admin panel | ⏳ |
| 7 | Python service (imports, PDFs, reports, reminders) | ⏳ |
| 8 | SEO, performance pass, deployment docs | ⏳ |

---

## Folder structure

```
.
├── app/
│   ├── (site)/                 # public website (header, footer, sticky breakdown button)
│   │   ├── page.tsx            # home (ISR, 10 min)
│   │   ├── credits/            # photo attribution
│   │   ├── loading.tsx · error.tsx
│   ├── layout.tsx              # fonts, theme, providers, global metadata
│   ├── not-found.tsx
│   ├── icon.svg · apple-icon.png
│   └── globals.css             # design tokens + signature utilities
├── components/
│   ├── brand/                  # JAC wordmark (SVG paths), channel icons
│   ├── home/                   # hero, stats, featured, lineup, services, tracker, testimonials, branches, contact
│   ├── layout/                 # header, nav, footer, breakdown button, theme toggle
│   ├── shared/                 # section heading, truck card, odometer, JSON-LD
│   └── ui/                     # shadcn/ui
├── lib/
│   ├── config/                 # site.ts (brand + contact), branches.ts (7 branches + hours)
│   ├── data/                   # seed-data.ts (sample catalog), testimonials.ts (samples)
│   ├── supabase/               # server / public / browser / admin (service role, server-only) clients
│   ├── format.ts               # ₱ / km / tonnes formatting
│   └── photo-credits.json
├── server/
│   └── queries/catalog.ts      # catalog reads (Supabase → domain types, sample-data fallback)
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

The site runs **without Supabase** — catalog queries fall back to the sample data in `lib/data/seed-data.ts` and log a warning. Wire Supabase before working on forms, auth, portal or admin.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:test` | Applies every migration + seed in PGlite and runs 58 RLS/trigger assertions |
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
4. `supabase/seed.sql` (optional sample data)

### 3. Auth settings
- **Authentication → Providers → Email**: enable, magic link on.
- **Authentication → URL configuration**: Site URL = your domain; add `http://localhost:3000/**` to redirect URLs.

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

### Security model

- **RLS on every table.** Public (anon) reads only published trucks/parts, categories, active services and branches.
- Customers read/write only rows tied to their own `customers` record.
- Staff access is per role; guard triggers enforce column-level rules (customers can only cancel bookings; mechanics can only move status/diagnosis on their assigned jobs, never release; only admins change roles).
- Staff-only notes live in `staff_notes` — never as a column on customer-visible rows.
- Public form submissions go through Server Actions (Zod + honeypot + `hit_rate_limit()`), using the service-role client **server-side only** (`lib/supabase/admin.ts` imports `server-only`).
- Storage: `truck-images` & `part-images` public (staff write), `uploads` private (`{user_id}/…`), `documents` private (`customers/{customer_id}/…`).
- Realtime enabled on `job_orders`, `job_order_events`, `service_bookings`, `quotes`, `notifications` (filtered by RLS).

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
