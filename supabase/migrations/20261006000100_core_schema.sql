-- =============================================================================
-- JAC Motors — core schema
-- Trucks, parts, customers, fleet, bookings, job orders, quotes, invoices,
-- notifications and audit. RLS lives in the next migration.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum (
  'customer', 'admin', 'sales', 'parts', 'service_advisor', 'mechanic'
);
create type public.truck_condition as enum ('new', 'used');
create type public.truck_availability as enum ('available', 'reserved', 'sold', 'incoming');
create type public.stock_status as enum ('in_stock', 'low_stock', 'out_of_stock');
create type public.quote_type as enum ('truck', 'part', 'service');
create type public.quote_status as enum (
  'new', 'in_review', 'quoted', 'accepted', 'rejected', 'expired', 'closed'
);
create type public.booking_status as enum (
  'pending', 'confirmed', 'rescheduled', 'converted', 'completed', 'cancelled', 'no_show'
);
create type public.job_status as enum (
  'received', 'diagnosing', 'awaiting_parts', 'in_progress', 'ready', 'released', 'cancelled'
);
create type public.line_item_type as enum ('labor', 'part', 'truck', 'misc');
create type public.invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'void');
create type public.service_category as enum (
  'preventive_maintenance', 'diagnostics', 'repair', 'overhaul', 'package', 'roadside'
);

-- -----------------------------------------------------------------------------
-- Shared trigger functions
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Human-readable references: Q-2610-00042, BK-2610-00007, JO-…, INV-…
create sequence public.quote_ref_seq;
create sequence public.booking_ref_seq;
create sequence public.job_order_ref_seq;
create sequence public.invoice_ref_seq;

create or replace function public.make_reference(prefix text, seq regclass)
returns text
language sql
volatile
security definer  -- callers need no direct sequence privileges
set search_path = ''
as $$
  select prefix || '-' || to_char(now() at time zone 'Asia/Manila', 'YYMM') || '-'
         || lpad(nextval(seq)::text, 5, '0');
$$;

-- -----------------------------------------------------------------------------
-- Branches
-- -----------------------------------------------------------------------------
create table public.branches (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  code          text not null unique check (code ~ '^[A-Z]{3}$'),
  name          text not null,
  address       text not null,
  city          text not null,
  province      text not null,
  region        text not null,
  phone         text,
  mobile        text,
  email         extensions.citext,
  is_head_office boolean not null default false,
  offers_sales  boolean not null default true,
  offers_parts  boolean not null default true,
  offers_service boolean not null default true,
  -- {"1": {"open": "08:00", "close": "17:00"}, "0": null, …}
  hours         jsonb not null default '{}'::jsonb,
  latitude      numeric(9, 6),
  longitude     numeric(9, 6),
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Companies (fleet / business accounts)
-- -----------------------------------------------------------------------------
create table public.companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  tin           text,                         -- PH Tax Identification Number
  industry      text,
  fleet_size    int check (fleet_size is null or fleet_size >= 0),
  email         extensions.citext,
  phone         text,
  address       text,
  city          text,
  province      text,
  notes         text,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index companies_name_trgm_idx on public.companies using gin (name extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         extensions.citext not null,
  full_name     text,
  phone         text,
  avatar_url    text,
  role          public.user_role not null default 'customer',
  branch_id     uuid references public.branches (id) on delete set null,  -- staff home branch
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role) where role <> 'customer';
create index profiles_branch_idx on public.profiles (branch_id);

-- -----------------------------------------------------------------------------
-- Customers — every person we do business with. May exist without a login
-- (walk-ins, phone enquiries, public quote forms). Linked to a profile when
-- the person signs up with the same email.
-- -----------------------------------------------------------------------------
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid unique references public.profiles (id) on delete set null,
  company_id    uuid references public.companies (id) on delete set null,
  full_name     text not null,
  email         extensions.citext,
  phone         text,
  address       text,
  city          text,
  province      text,
  preferred_branch_id uuid references public.branches (id) on delete set null,
  marketing_opt_in boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- lower() so lookups work from SECURITY DEFINER functions with an empty search_path
-- (where citext's case-insensitive = operator is not visible).
create index customers_email_idx on public.customers (lower(email::text));
create index customers_company_idx on public.customers (company_id);
create index customers_name_trgm_idx on public.customers using gin (full_name extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Trucks (inventory listings)
-- -----------------------------------------------------------------------------
create table public.trucks (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  stock_number    text unique,
  title           text not null,
  brand           text not null default 'JAC',
  model           text not null,              -- e.g. "N55", "T8 Pro"
  series          text,                       -- e.g. "N-Series", "Gallop K"
  variant         text,                       -- e.g. "Aluminum Van", "Dropside"
  body_type       text not null,              -- pickup | dropside | aluminum_van | reefer | dump | tractor_head | cab_chassis | tanker
  year            int not null check (year between 1990 and 2100),
  condition       public.truck_condition not null default 'new',
  availability    public.truck_availability not null default 'available',
  payload_tons    numeric(5, 2) check (payload_tons is null or payload_tons >= 0),
  gvw_kg          int check (gvw_kg is null or gvw_kg > 0),
  wheel_config    text,                       -- 4x2, 4x4, 6x4, 8x4
  engine          text,
  displacement_cc int,
  horsepower      int,
  torque_nm       int,
  transmission    text,
  fuel_type       text not null default 'diesel',
  emission_standard text,                     -- Euro 4 / Euro 5
  wheelbase_mm    int,
  mileage_km      int not null default 0 check (mileage_km >= 0),
  color           text,
  price           numeric(12, 2) check (price is null or price >= 0),
  price_on_request boolean not null default false,
  currency        char(3) not null default 'PHP',
  summary         text,
  description     text,
  features        text[] not null default '{}',
  specs           jsonb not null default '{}'::jsonb,   -- free-form extra spec rows
  branch_id       uuid references public.branches (id) on delete set null,
  is_featured     boolean not null default false,
  is_published    boolean not null default false,
  published_at    timestamptz,
  seo_title       text,
  seo_description text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  search          tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(model, '') || ' ' || coalesce(series, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(variant, '') || ' ' || coalesce(body_type, '') || ' ' || coalesce(engine, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(description, '')), 'C')
  ) stored,
  constraint trucks_price_or_request check (price is not null or price_on_request)
);
create index trucks_public_idx on public.trucks (is_published, availability, created_at desc);
create index trucks_model_idx on public.trucks (model);
create index trucks_filters_idx on public.trucks (condition, body_type, year, payload_tons);
create index trucks_price_idx on public.trucks (price) where price is not null;
create index trucks_featured_idx on public.trucks (is_featured) where is_featured and is_published;
create index trucks_search_idx on public.trucks using gin (search);
create index trucks_branch_idx on public.trucks (branch_id);

create table public.truck_images (
  id            uuid primary key default gen_random_uuid(),
  truck_id      uuid not null references public.trucks (id) on delete cascade,
  storage_path  text,             -- path inside the truck-images bucket (null for external/static)
  url           text not null,    -- public URL (storage public URL or /images/… static asset)
  alt           text not null default '',
  width         int,
  height        int,
  sort_order    int not null default 0,
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index truck_images_truck_idx on public.truck_images (truck_id, sort_order);
create unique index truck_images_one_primary_idx on public.truck_images (truck_id) where is_primary;

-- -----------------------------------------------------------------------------
-- Parts
-- -----------------------------------------------------------------------------
create table public.part_categories (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null,
  description   text,
  icon          text,                         -- lucide icon name
  parent_id     uuid references public.part_categories (id) on delete set null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index part_categories_parent_idx on public.part_categories (parent_id);

create table public.parts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  part_number     text not null unique,
  oem_number      text,
  name            text not null,
  brand           text not null default 'JAC Genuine',
  category_id     uuid references public.part_categories (id) on delete set null,
  summary         text,
  description     text,
  specs           jsonb not null default '{}'::jsonb,
  price           numeric(12, 2) check (price is null or price >= 0),
  price_on_request boolean not null default false,
  currency        char(3) not null default 'PHP',
  unit            text not null default 'pc',
  stock_qty       int not null default 0 check (stock_qty >= 0),
  reorder_level   int not null default 5 check (reorder_level >= 0),
  stock_status    public.stock_status generated always as (
    case
      when stock_qty <= 0 then 'out_of_stock'::public.stock_status
      when stock_qty <= reorder_level then 'low_stock'::public.stock_status
      else 'in_stock'::public.stock_status
    end
  ) stored,
  lead_time_days  int check (lead_time_days is null or lead_time_days >= 0),
  weight_kg       numeric(8, 2),
  image_url       text,
  image_path      text,                       -- path inside part-images bucket
  is_published    boolean not null default false,
  supplier        text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  search          tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(part_number, '') || ' ' || coalesce(oem_number, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(description, '')), 'C')
  ) stored,
  constraint parts_price_or_request check (price is not null or price_on_request)
);
create index parts_public_idx on public.parts (is_published, category_id);
create index parts_stock_idx on public.parts (stock_status);
create index parts_search_idx on public.parts using gin (search);
create index parts_number_trgm_idx on public.parts using gin (part_number extensions.gin_trgm_ops);
create index parts_name_trgm_idx on public.parts using gin (name extensions.gin_trgm_ops);

create table public.part_compatibility (
  id            uuid primary key default gen_random_uuid(),
  part_id       uuid not null references public.parts (id) on delete cascade,
  model         text not null,                -- matches trucks.model, e.g. "N55"
  series        text,
  engine        text,
  year_from     int,
  year_to       int,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint part_compat_years check (year_from is null or year_to is null or year_from <= year_to)
);
create unique index part_compat_unique_idx
  on public.part_compatibility (part_id, model, coalesce(engine, ''), coalesce(year_from, 0), coalesce(year_to, 0));
create index part_compat_model_idx on public.part_compatibility (model);

-- -----------------------------------------------------------------------------
-- Service catalogue (what can be booked)
-- -----------------------------------------------------------------------------
create table public.services (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  category          public.service_category not null,
  summary           text,
  description       text,
  inclusions        text[] not null default '{}',
  est_duration_hours numeric(5, 1),
  starting_price    numeric(12, 2),
  interval_km       int,                      -- for maintenance packages
  interval_months   int,
  is_package        boolean not null default false,
  is_active         boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Fleet units (trucks a customer owns — ours or otherwise)
-- -----------------------------------------------------------------------------
create table public.fleet_units (
  id                    uuid primary key default gen_random_uuid(),
  customer_id           uuid not null references public.customers (id) on delete cascade,
  company_id            uuid references public.companies (id) on delete set null,
  truck_id              uuid references public.trucks (id) on delete set null,  -- if bought from JAC Motors
  nickname              text,
  make                  text not null default 'JAC',
  model                 text not null,
  year                  int check (year is null or year between 1980 and 2100),
  plate_number          text,
  vin                   text,
  engine_number         text,
  color                 text,
  purchase_date         date,
  current_mileage_km    int not null default 0 check (current_mileage_km >= 0),
  mileage_updated_at    timestamptz,
  last_service_date     date,
  last_service_mileage_km int,
  service_interval_km   int not null default 10000 check (service_interval_km > 0),
  service_interval_months int not null default 6 check (service_interval_months > 0),
  reminders_enabled     boolean not null default true,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index fleet_units_customer_idx on public.fleet_units (customer_id);
create index fleet_units_company_idx on public.fleet_units (company_id);
create unique index fleet_units_plate_idx on public.fleet_units (upper(plate_number)) where plate_number is not null;
create unique index fleet_units_vin_idx on public.fleet_units (upper(vin)) where vin is not null;

-- -----------------------------------------------------------------------------
-- Service bookings
-- -----------------------------------------------------------------------------
create table public.service_bookings (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default public.make_reference('BK', 'public.booking_ref_seq'),
  customer_id       uuid references public.customers (id) on delete set null,
  fleet_unit_id     uuid references public.fleet_units (id) on delete set null,
  service_id        uuid references public.services (id) on delete set null,
  branch_id         uuid references public.branches (id) on delete set null,
  status            public.booking_status not null default 'pending',
  -- contact snapshot (kept even if the customer record changes)
  contact_name      text not null,
  contact_email     extensions.citext,
  contact_phone     text not null,
  company_name      text,
  -- vehicle snapshot
  truck_make        text not null default 'JAC',
  truck_model       text not null,
  truck_year        int,
  plate_number      text,
  mileage_km        int check (mileage_km is null or mileage_km >= 0),
  issue_description text not null,
  is_breakdown      boolean not null default false,
  photo_paths       text[] not null default '{}',       -- uploads bucket paths
  preferred_date    date not null,
  preferred_time_slot text not null,                    -- e.g. "08:00-10:00"
  scheduled_at      timestamptz,                        -- set when confirmed / rescheduled
  confirmed_at      timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text,
  source            text not null default 'website',    -- website | portal | phone | walk_in | messenger
  handled_by        uuid references public.profiles (id) on delete set null,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index service_bookings_customer_idx on public.service_bookings (customer_id, created_at desc);
create index service_bookings_status_idx on public.service_bookings (status, preferred_date);
create index service_bookings_branch_idx on public.service_bookings (branch_id, preferred_date);
create index service_bookings_fleet_idx on public.service_bookings (fleet_unit_id);

-- -----------------------------------------------------------------------------
-- Job orders (workshop)
-- -----------------------------------------------------------------------------
create table public.job_orders (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default public.make_reference('JO', 'public.job_order_ref_seq'),
  booking_id        uuid unique references public.service_bookings (id) on delete set null,
  customer_id       uuid references public.customers (id) on delete set null,
  fleet_unit_id     uuid references public.fleet_units (id) on delete set null,
  branch_id         uuid references public.branches (id) on delete set null,
  status            public.job_status not null default 'received',
  service_advisor_id uuid references public.profiles (id) on delete set null,
  mechanic_id       uuid references public.profiles (id) on delete set null,
  -- vehicle snapshot
  truck_make        text not null default 'JAC',
  truck_model       text not null,
  plate_number      text,
  mileage_in_km     int check (mileage_in_km is null or mileage_in_km >= 0),
  complaint         text not null,
  diagnosis         text,
  recommendation    text,
  customer_notes    text,                      -- visible to the customer (staff-only notes live in staff_notes)
  promised_at       timestamptz,
  received_at       timestamptz not null default now(),
  diagnosing_at     timestamptz,
  awaiting_parts_at timestamptz,
  in_progress_at    timestamptz,
  ready_at          timestamptz,
  released_at       timestamptz,
  labor_total       numeric(12, 2) not null default 0,
  parts_total       numeric(12, 2) not null default 0,
  misc_total        numeric(12, 2) not null default 0,
  grand_total       numeric(12, 2) generated always as (labor_total + parts_total + misc_total) stored,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index job_orders_status_idx on public.job_orders (status, branch_id);
create index job_orders_customer_idx on public.job_orders (customer_id, created_at desc);
create index job_orders_mechanic_idx on public.job_orders (mechanic_id) where status not in ('released', 'cancelled');
create index job_orders_fleet_idx on public.job_orders (fleet_unit_id, created_at desc);

create table public.job_order_items (
  id            uuid primary key default gen_random_uuid(),
  job_order_id  uuid not null references public.job_orders (id) on delete cascade,
  item_type     public.line_item_type not null,
  part_id       uuid references public.parts (id) on delete set null,
  description   text not null,
  quantity      numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price    numeric(12, 2) not null default 0 check (unit_price >= 0),
  line_total    numeric(12, 2) generated always as (round(quantity * unit_price, 2)) stored,
  sort_order    int not null default 0,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index job_order_items_job_idx on public.job_order_items (job_order_id, sort_order);
create index job_order_items_part_idx on public.job_order_items (part_id);

-- Status timeline shown to the customer (live via Realtime)
create table public.job_order_events (
  id            uuid primary key default gen_random_uuid(),
  job_order_id  uuid not null references public.job_orders (id) on delete cascade,
  from_status   public.job_status,
  to_status     public.job_status not null,
  note          text,
  is_customer_visible boolean not null default true,
  actor_id      uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index job_order_events_job_idx on public.job_order_events (job_order_id, created_at);

-- -----------------------------------------------------------------------------
-- Quotes
-- -----------------------------------------------------------------------------
create table public.quotes (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default public.make_reference('Q', 'public.quote_ref_seq'),
  quote_type        public.quote_type not null,
  customer_id       uuid references public.customers (id) on delete set null,
  truck_id          uuid references public.trucks (id) on delete set null,
  part_id           uuid references public.parts (id) on delete set null,
  branch_id         uuid references public.branches (id) on delete set null,
  status            public.quote_status not null default 'new',
  contact_name      text not null,
  contact_email     extensions.citext not null,
  contact_phone     text not null,
  company_name      text,
  message           text,
  quantity          int check (quantity is null or quantity > 0),
  -- {"down_payment_pct": 20, "term_months": 36, "est_monthly": 32000}
  financing         jsonb,
  -- {"make": "Isuzu", "model": "Elf", "year": 2016, "mileage_km": 210000, "est_value": 450000}
  trade_in          jsonb,
  attachment_paths  text[] not null default '{}',
  subtotal          numeric(12, 2) not null default 0,
  discount          numeric(12, 2) not null default 0 check (discount >= 0),
  vat_rate          numeric(5, 4) not null default 0.12,   -- PH VAT 12%
  vat_amount        numeric(12, 2) generated always as (round(greatest(subtotal - discount, 0) * vat_rate, 2)) stored,
  total             numeric(12, 2) generated always as (
    round(greatest(subtotal - discount, 0) * (1 + vat_rate), 2)
  ) stored,
  valid_until       date,
  terms             text,
  response_message  text,
  pdf_path          text,                       -- documents bucket
  assigned_to       uuid references public.profiles (id) on delete set null,
  responded_at      timestamptz,
  source            text not null default 'website',
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index quotes_customer_idx on public.quotes (customer_id, created_at desc);
create index quotes_status_idx on public.quotes (status, quote_type, created_at desc);
create index quotes_assigned_idx on public.quotes (assigned_to) where status in ('new', 'in_review');
create index quotes_truck_idx on public.quotes (truck_id);
create index quotes_part_idx on public.quotes (part_id);

create table public.quote_items (
  id            uuid primary key default gen_random_uuid(),
  quote_id      uuid not null references public.quotes (id) on delete cascade,
  item_type     public.line_item_type not null default 'part',
  truck_id      uuid references public.trucks (id) on delete set null,
  part_id       uuid references public.parts (id) on delete set null,
  description   text not null,
  quantity      numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price    numeric(12, 2) not null default 0 check (unit_price >= 0),
  line_total    numeric(12, 2) generated always as (round(quantity * unit_price, 2)) stored,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index quote_items_quote_idx on public.quote_items (quote_id, sort_order);

-- -----------------------------------------------------------------------------
-- Invoices (generated from job orders or accepted quotes; PDF via Python svc)
-- -----------------------------------------------------------------------------
create table public.invoices (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique default public.make_reference('INV', 'public.invoice_ref_seq'),
  customer_id   uuid references public.customers (id) on delete set null,
  job_order_id  uuid references public.job_orders (id) on delete set null,
  quote_id      uuid references public.quotes (id) on delete set null,
  branch_id     uuid references public.branches (id) on delete set null,
  status        public.invoice_status not null default 'draft',
  bill_to_name  text not null,
  bill_to_company text,
  bill_to_tin   text,
  bill_to_address text,
  subtotal      numeric(12, 2) not null default 0,
  discount      numeric(12, 2) not null default 0 check (discount >= 0),
  vat_rate      numeric(5, 4) not null default 0.12,
  vat_amount    numeric(12, 2) generated always as (round(greatest(subtotal - discount, 0) * vat_rate, 2)) stored,
  total         numeric(12, 2) generated always as (round(greatest(subtotal - discount, 0) * (1 + vat_rate), 2)) stored,
  amount_paid   numeric(12, 2) not null default 0 check (amount_paid >= 0),
  issued_at     timestamptz,
  due_date      date,
  pdf_path      text,
  notes         text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index invoices_customer_idx on public.invoices (customer_id, created_at desc);
create index invoices_status_idx on public.invoices (status, issued_at desc);
create index invoices_job_idx on public.invoices (job_order_id);

create table public.invoice_items (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices (id) on delete cascade,
  item_type     public.line_item_type not null,
  part_id       uuid references public.parts (id) on delete set null,
  truck_id      uuid references public.trucks (id) on delete set null,
  description   text not null,
  quantity      numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price    numeric(12, 2) not null default 0 check (unit_price >= 0),
  line_total    numeric(12, 2) generated always as (round(quantity * unit_price, 2)) stored,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id, sort_order);

-- -----------------------------------------------------------------------------
-- Staff-only notes. Kept out of customer-readable rows on purpose: RLS is
-- row-level, so a private column on a customer-visible row would leak.
-- -----------------------------------------------------------------------------
create table public.staff_notes (
  id            uuid primary key default gen_random_uuid(),
  entity_type   text not null check (entity_type in ('quote', 'booking', 'job_order', 'customer', 'invoice', 'fleet_unit')),
  entity_id     uuid not null,
  body          text not null check (length(body) between 1 and 5000),
  author_id     uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index staff_notes_entity_idx on public.staff_notes (entity_type, entity_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Notifications (in-app; email/SMS are sent by the app / Python service)
-- -----------------------------------------------------------------------------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  recipient_id    uuid references public.profiles (id) on delete cascade,  -- direct
  recipient_role  public.user_role,                                        -- or broadcast to a staff role
  type            text not null,     -- quote.created | booking.received | booking.confirmed | job.status_changed | job.ready | reminder.maintenance
  title           text not null,
  body            text,
  link            text,
  data            jsonb not null default '{}'::jsonb,
  read_at         timestamptz,
  created_at      timestamptz not null default now(),
  constraint notifications_target check (recipient_id is not null or recipient_role is not null)
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;
create index notifications_role_idx on public.notifications (recipient_role, created_at desc) where recipient_role is not null;

-- Maintenance reminder log (prevents duplicate sends by the scheduler)
create table public.maintenance_reminders (
  id              uuid primary key default gen_random_uuid(),
  fleet_unit_id   uuid not null references public.fleet_units (id) on delete cascade,
  reason          text not null,           -- 'mileage' | 'date'
  due_mileage_km  int,
  due_date        date,
  channel         text not null default 'email',
  sent_at         timestamptz not null default now()
);
create index maintenance_reminders_unit_idx on public.maintenance_reminders (fleet_unit_id, sent_at desc);

-- -----------------------------------------------------------------------------
-- Audit log
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid,                       -- auth.uid() at time of change (null = service/system)
  action        text not null,              -- INSERT | UPDATE | DELETE | custom verb
  table_name    text not null,
  record_id     uuid,
  old_data      jsonb,
  new_data      jsonb,
  changed_fields text[],
  created_at    timestamptz not null default now()
);
create index audit_log_record_idx on public.audit_log (table_name, record_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Rate limiting for public forms (fixed window; called by the server only)
-- -----------------------------------------------------------------------------
create table public.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  hits          int not null default 1,
  primary key (key, window_start)
);
create index rate_limits_window_idx on public.rate_limits (window_start);

-- =============================================================================
-- updated_at triggers
-- =============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'branches', 'companies', 'profiles', 'customers', 'trucks', 'truck_images',
    'part_categories', 'parts', 'part_compatibility', 'services', 'fleet_units',
    'service_bookings', 'job_orders', 'job_order_items', 'quotes', 'quote_items',
    'invoices', 'invoice_items'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- =============================================================================
-- Domain triggers
-- =============================================================================

-- Keep published_at in sync with is_published
create or replace function public.trucks_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_published and (tg_op = 'INSERT' or not old.is_published) then
    new.published_at := coalesce(new.published_at, now());
  elsif not new.is_published then
    new.published_at := null;
  end if;
  return new;
end;
$$;
create trigger trucks_published_at before insert or update of is_published on public.trucks
  for each row execute function public.trucks_set_published_at();

-- Job order: stamp stage timestamps + write timeline event on status change
create or replace function public.job_orders_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  case new.status
    when 'diagnosing'     then new.diagnosing_at     := coalesce(new.diagnosing_at, now());
    when 'awaiting_parts' then new.awaiting_parts_at := now();
    when 'in_progress'    then new.in_progress_at    := coalesce(new.in_progress_at, now());
    when 'ready'          then new.ready_at          := now();
    when 'released'       then new.released_at       := now();
    else null;
  end case;
  return new;
end;
$$;
create trigger job_orders_status_stamp before insert or update of status on public.job_orders
  for each row execute function public.job_orders_on_status_change();

create or replace function public.job_orders_log_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  insert into public.job_order_events (job_order_id, from_status, to_status, actor_id)
  values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid());

  -- in-app notification to the customer (if they have an account)
  select c.profile_id into v_profile from public.customers c where c.id = new.customer_id;
  if v_profile is not null then
    insert into public.notifications (recipient_id, type, title, body, link, data)
    values (
      v_profile,
      case when new.status = 'ready' then 'job.ready' else 'job.status_changed' end,
      case new.status
        when 'received'       then 'We''ve received your truck'
        when 'diagnosing'     then 'Diagnosis in progress'
        when 'awaiting_parts' then 'Waiting on parts'
        when 'in_progress'    then 'Repair work has started'
        when 'ready'          then 'Your truck is ready for release'
        when 'released'       then 'Truck released — drive safe'
        when 'cancelled'      then 'Job order cancelled'
      end,
      'Job order ' || new.reference || ' · ' || new.truck_model || coalesce(' · ' || new.plate_number, ''),
      '/account/jobs/' || new.id,
      jsonb_build_object('job_order_id', new.id, 'status', new.status)
    );
  end if;

  -- When released, roll the fleet unit's service history forward
  if new.status = 'released' and new.fleet_unit_id is not null then
    update public.fleet_units fu
       set last_service_date = (now() at time zone 'Asia/Manila')::date,
           last_service_mileage_km = coalesce(new.mileage_in_km, fu.last_service_mileage_km),
           current_mileage_km = greatest(fu.current_mileage_km, coalesce(new.mileage_in_km, 0)),
           mileage_updated_at = case when new.mileage_in_km is not null then now() else fu.mileage_updated_at end
     where fu.id = new.fleet_unit_id;
  end if;

  return new;
end;
$$;
create trigger job_orders_log_event after insert or update of status on public.job_orders
  for each row execute function public.job_orders_log_event();

-- Recompute job order totals from line items
create or replace function public.job_orders_recalc_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job uuid := coalesce(new.job_order_id, old.job_order_id);
begin
  update public.job_orders jo
     set labor_total = coalesce((select sum(line_total) from public.job_order_items where job_order_id = v_job and item_type = 'labor'), 0),
         parts_total = coalesce((select sum(line_total) from public.job_order_items where job_order_id = v_job and item_type = 'part'), 0),
         misc_total  = coalesce((select sum(line_total) from public.job_order_items where job_order_id = v_job and item_type in ('misc', 'truck')), 0)
   where jo.id = v_job;
  return null;
end;
$$;
create trigger job_order_items_totals after insert or update or delete on public.job_order_items
  for each row execute function public.job_orders_recalc_totals();

-- Recompute quote subtotal from line items
create or replace function public.quotes_recalc_subtotal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote uuid := coalesce(new.quote_id, old.quote_id);
begin
  update public.quotes q
     set subtotal = coalesce((select sum(line_total) from public.quote_items where quote_id = v_quote), 0)
   where q.id = v_quote;
  return null;
end;
$$;
create trigger quote_items_subtotal after insert or update or delete on public.quote_items
  for each row execute function public.quotes_recalc_subtotal();

create or replace function public.invoices_recalc_subtotal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices i
     set subtotal = coalesce((select sum(line_total) from public.invoice_items where invoice_id = v_invoice), 0)
   where i.id = v_invoice;
  return null;
end;
$$;
create trigger invoice_items_subtotal after insert or update or delete on public.invoice_items
  for each row execute function public.invoices_recalc_subtotal();

-- Notify staff roles about new public submissions
create or replace function public.notify_staff_on_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'quotes' then
    insert into public.notifications (recipient_role, type, title, body, link, data)
    values (
      case new.quote_type when 'part' then 'parts'::public.user_role
                          when 'service' then 'service_advisor'::public.user_role
                          else 'sales'::public.user_role end,
      'quote.created',
      'New ' || new.quote_type || ' quote request',
      new.reference || ' · ' || new.contact_name,
      '/admin/quotes/' || new.id,
      jsonb_build_object('quote_id', new.id)
    );
  elsif tg_table_name = 'service_bookings' then
    insert into public.notifications (recipient_role, type, title, body, link, data)
    values (
      'service_advisor',
      'booking.received',
      case when new.is_breakdown then 'BREAKDOWN booking' else 'New service booking' end,
      new.reference || ' · ' || new.contact_name || ' · ' || new.truck_model,
      '/admin/bookings/' || new.id,
      jsonb_build_object('booking_id', new.id)
    );
  end if;
  return new;
end;
$$;
create trigger quotes_notify_staff after insert on public.quotes
  for each row execute function public.notify_staff_on_submission();
create trigger bookings_notify_staff after insert on public.service_bookings
  for each row execute function public.notify_staff_on_submission();

-- =============================================================================
-- Auth hook: profile + customer link for every new user
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  v_phone text := new.raw_user_meta_data ->> 'phone';
  v_customer uuid;
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email, v_name, v_phone)
  on conflict (id) do nothing;

  -- Claim the most recent unlinked customer record with the same email
  -- (created earlier from a public quote/booking form), otherwise create one.
  select id into v_customer
    from public.customers
   where profile_id is null and lower(email::text) = lower(new.email)
   order by created_at desc
   limit 1;

  if v_customer is not null then
    update public.customers set profile_id = new.id where id = v_customer;
  else
    insert into public.customers (profile_id, full_name, email, phone)
    values (new.id, v_name, new.email, v_phone)
    returning id into v_customer;
  end if;

  -- Public forms never attach to an existing account (anyone can type an
  -- email), so one person may have several unlinked customer rows. Now that
  -- they've proven ownership of the email, fold those into the linked one.
  update public.quotes           set customer_id = v_customer where customer_id in (select id from public.customers where profile_id is null and lower(email::text) = lower(new.email));
  update public.service_bookings set customer_id = v_customer where customer_id in (select id from public.customers where profile_id is null and lower(email::text) = lower(new.email));
  update public.fleet_units      set customer_id = v_customer where customer_id in (select id from public.customers where profile_id is null and lower(email::text) = lower(new.email));
  update public.job_orders       set customer_id = v_customer where customer_id in (select id from public.customers where profile_id is null and lower(email::text) = lower(new.email));
  update public.invoices         set customer_id = v_customer where customer_id in (select id from public.customers where profile_id is null and lower(email::text) = lower(new.email));
  delete from public.customers where profile_id is null and lower(email::text) = lower(new.email);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Views
-- =============================================================================

-- Maintenance due-state per fleet unit; used by the portal and the reminder job.
create or replace view public.fleet_unit_maintenance
with (security_invoker = true)
as
select
  fu.id as fleet_unit_id,
  fu.customer_id,
  fu.model,
  fu.plate_number,
  fu.current_mileage_km,
  fu.last_service_date,
  fu.last_service_mileage_km,
  coalesce(fu.last_service_mileage_km, 0) + fu.service_interval_km as next_service_mileage_km,
  (coalesce(fu.last_service_date, fu.purchase_date, fu.created_at::date)
     + make_interval(months => fu.service_interval_months))::date as next_service_date,
  greatest(coalesce(fu.last_service_mileage_km, 0) + fu.service_interval_km - fu.current_mileage_km, 0) as km_remaining,
  case
    when fu.current_mileage_km >= coalesce(fu.last_service_mileage_km, 0) + fu.service_interval_km
      or (coalesce(fu.last_service_date, fu.purchase_date, fu.created_at::date)
            + make_interval(months => fu.service_interval_months))::date <= current_date
      then 'overdue'
    when fu.current_mileage_km >= coalesce(fu.last_service_mileage_km, 0) + fu.service_interval_km - 1000
      or (coalesce(fu.last_service_date, fu.purchase_date, fu.created_at::date)
            + make_interval(months => fu.service_interval_months))::date <= current_date + 14
      then 'due_soon'
    else 'ok'
  end as maintenance_state,
  fu.reminders_enabled
from public.fleet_units fu;
