-- =============================================================================
-- JAC Motors — Row Level Security, role helpers, guard triggers, audit
--
-- Access model
--   anon / public     read published trucks + parts (and their images,
--                     compatibility), categories, active services, branches.
--                     Public form submissions go through Next.js Server
--                     Actions (Zod + rate limit + honeypot) using the service
--                     role — anon has NO insert rights on any table.
--   customer          read/write only rows tied to their customer record.
--   staff roles       admin · sales · parts · service_advisor · mechanic,
--                     scoped per table below.
--   service_role      bypasses RLS (server-only key; never shipped to clients).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER so they can read profiles without recursing
-- through profiles' own RLS. Wrapped in (select …) inside policies so Postgres
-- evaluates them once per statement instead of once per row.
-- -----------------------------------------------------------------------------
create or replace function public.app_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active;
$$;

create or replace function public.has_role(variadic roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.app_role() = any (roles), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.app_role() <> 'customer', false);
$$;

create or replace function public.my_customer_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id from public.customers c where c.profile_id = auth.uid();
$$;

create or replace function public.my_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.company_id from public.customers c
   where c.profile_id = auth.uid() and c.company_id is not null;
$$;

revoke all on function public.app_role(), public.is_staff(), public.my_customer_ids(), public.my_company_ids() from public;
revoke all on function public.has_role(public.user_role[]) from public;
grant execute on function public.app_role(), public.is_staff(), public.my_customer_ids(), public.my_company_ids() to anon, authenticated, service_role;
grant execute on function public.has_role(public.user_role[]) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
alter table public.branches              enable row level security;
alter table public.companies             enable row level security;
alter table public.profiles              enable row level security;
alter table public.customers             enable row level security;
alter table public.trucks                enable row level security;
alter table public.truck_images          enable row level security;
alter table public.part_categories       enable row level security;
alter table public.parts                 enable row level security;
alter table public.part_compatibility    enable row level security;
alter table public.services              enable row level security;
alter table public.fleet_units           enable row level security;
alter table public.service_bookings      enable row level security;
alter table public.job_orders            enable row level security;
alter table public.job_order_items       enable row level security;
alter table public.job_order_events      enable row level security;
alter table public.quotes                enable row level security;
alter table public.quote_items           enable row level security;
alter table public.invoices              enable row level security;
alter table public.invoice_items         enable row level security;
alter table public.staff_notes           enable row level security;
alter table public.notifications         enable row level security;
alter table public.maintenance_reminders enable row level security;
alter table public.audit_log             enable row level security;
alter table public.rate_limits           enable row level security;  -- no policies: service role only

-- =============================================================================
-- Reference data: branches, services, part categories
-- =============================================================================
create policy "branches: public read active" on public.branches
  for select to anon, authenticated using (is_active or (select public.is_staff()));
create policy "branches: admin write" on public.branches
  for all to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));

create policy "services: public read active" on public.services
  for select to anon, authenticated using (is_active or (select public.is_staff()));
create policy "services: admin/advisor write" on public.services
  for all to authenticated
  using ((select public.has_role('admin', 'service_advisor')))
  with check ((select public.has_role('admin', 'service_advisor')));

create policy "part_categories: public read" on public.part_categories
  for select to anon, authenticated using (true);
create policy "part_categories: admin/parts write" on public.part_categories
  for all to authenticated
  using ((select public.has_role('admin', 'parts')))
  with check ((select public.has_role('admin', 'parts')));

-- =============================================================================
-- Trucks
-- =============================================================================
create policy "trucks: public read published" on public.trucks
  for select to anon, authenticated using (is_published);
create policy "trucks: staff read all" on public.trucks
  for select to authenticated using ((select public.is_staff()));
create policy "trucks: admin/sales insert" on public.trucks
  for insert to authenticated with check ((select public.has_role('admin', 'sales')));
create policy "trucks: admin/sales update" on public.trucks
  for update to authenticated
  using ((select public.has_role('admin', 'sales')))
  with check ((select public.has_role('admin', 'sales')));
create policy "trucks: admin delete" on public.trucks
  for delete to authenticated using ((select public.has_role('admin')));

create policy "truck_images: public read published" on public.truck_images
  for select to anon, authenticated
  using (exists (select 1 from public.trucks t where t.id = truck_id and t.is_published));
create policy "truck_images: staff read all" on public.truck_images
  for select to authenticated using ((select public.is_staff()));
create policy "truck_images: admin/sales write" on public.truck_images
  for all to authenticated
  using ((select public.has_role('admin', 'sales')))
  with check ((select public.has_role('admin', 'sales')));

-- =============================================================================
-- Parts
-- =============================================================================
create policy "parts: public read published" on public.parts
  for select to anon, authenticated using (is_published);
create policy "parts: staff read all" on public.parts
  for select to authenticated using ((select public.is_staff()));
create policy "parts: admin/parts insert" on public.parts
  for insert to authenticated with check ((select public.has_role('admin', 'parts')));
create policy "parts: admin/parts update" on public.parts
  for update to authenticated
  using ((select public.has_role('admin', 'parts')))
  with check ((select public.has_role('admin', 'parts')));
create policy "parts: admin delete" on public.parts
  for delete to authenticated using ((select public.has_role('admin')));

create policy "part_compat: public read published" on public.part_compatibility
  for select to anon, authenticated
  using (exists (select 1 from public.parts p where p.id = part_id and p.is_published));
create policy "part_compat: staff read all" on public.part_compatibility
  for select to authenticated using ((select public.is_staff()));
create policy "part_compat: admin/parts write" on public.part_compatibility
  for all to authenticated
  using ((select public.has_role('admin', 'parts')))
  with check ((select public.has_role('admin', 'parts')));

-- =============================================================================
-- People: profiles, customers, companies
-- =============================================================================
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: staff read all" on public.profiles
  for select to authenticated using ((select public.is_staff()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admin update any" on public.profiles
  for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));

create policy "customers: read own" on public.customers
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "customers: update own" on public.customers
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "customers: staff read" on public.customers
  for select to authenticated using ((select public.is_staff()));
create policy "customers: front-office write" on public.customers
  for all to authenticated
  using ((select public.has_role('admin', 'sales', 'parts', 'service_advisor')))
  with check ((select public.has_role('admin', 'sales', 'parts', 'service_advisor')));

create policy "companies: members read" on public.companies
  for select to authenticated using (id in (select public.my_company_ids()));
create policy "companies: members update" on public.companies
  for update to authenticated
  using (id in (select public.my_company_ids()))
  with check (id in (select public.my_company_ids()));
create policy "companies: customer create" on public.companies
  for insert to authenticated with check (created_by = (select auth.uid()));
-- lets a customer read a company they just created before linking it
create policy "companies: creator read" on public.companies
  for select to authenticated using (created_by = (select auth.uid()));
create policy "companies: staff read" on public.companies
  for select to authenticated using ((select public.is_staff()));
create policy "companies: front-office write" on public.companies
  for all to authenticated
  using ((select public.has_role('admin', 'sales', 'service_advisor')))
  with check ((select public.has_role('admin', 'sales', 'service_advisor')));

-- =============================================================================
-- Fleet units — full CRUD for the owning customer
-- =============================================================================
create policy "fleet: owner all" on public.fleet_units
  for all to authenticated
  using (customer_id in (select public.my_customer_ids()))
  with check (customer_id in (select public.my_customer_ids()));
create policy "fleet: staff read" on public.fleet_units
  for select to authenticated using ((select public.is_staff()));
create policy "fleet: front-office write" on public.fleet_units
  for all to authenticated
  using ((select public.has_role('admin', 'sales', 'service_advisor')))
  with check ((select public.has_role('admin', 'sales', 'service_advisor')));

create policy "reminders: owner read" on public.maintenance_reminders
  for select to authenticated
  using (exists (select 1 from public.fleet_units fu
                  where fu.id = fleet_unit_id and fu.customer_id in (select public.my_customer_ids())));
create policy "reminders: staff read" on public.maintenance_reminders
  for select to authenticated using ((select public.is_staff()));

-- =============================================================================
-- Service bookings
-- =============================================================================
create policy "bookings: owner read" on public.service_bookings
  for select to authenticated using (customer_id in (select public.my_customer_ids()));
create policy "bookings: owner create" on public.service_bookings
  for insert to authenticated
  with check (
    customer_id in (select public.my_customer_ids())
    and status = 'pending'
    and scheduled_at is null and handled_by is null
  );
-- Customers may only cancel; the guard trigger below enforces which columns change.
create policy "bookings: owner cancel" on public.service_bookings
  for update to authenticated
  using (customer_id in (select public.my_customer_ids()) and status in ('pending', 'confirmed', 'rescheduled'))
  with check (customer_id in (select public.my_customer_ids()) and status = 'cancelled');
create policy "bookings: staff read" on public.service_bookings
  for select to authenticated using ((select public.has_role('admin', 'service_advisor', 'sales', 'mechanic')));
create policy "bookings: advisor write" on public.service_bookings
  for all to authenticated
  using ((select public.has_role('admin', 'service_advisor')))
  with check ((select public.has_role('admin', 'service_advisor')));

-- =============================================================================
-- Job orders
-- =============================================================================
create policy "jobs: owner read" on public.job_orders
  for select to authenticated using (customer_id in (select public.my_customer_ids()));
create policy "jobs: office read" on public.job_orders
  for select to authenticated using ((select public.has_role('admin', 'service_advisor', 'parts', 'sales')));
create policy "jobs: mechanic read assigned" on public.job_orders
  for select to authenticated
  using ((select public.has_role('mechanic')) and mechanic_id = (select auth.uid()));
create policy "jobs: advisor write" on public.job_orders
  for all to authenticated
  using ((select public.has_role('admin', 'service_advisor')))
  with check ((select public.has_role('admin', 'service_advisor')));
-- Mechanics update their own jobs; guard trigger limits the columns.
create policy "jobs: mechanic update assigned" on public.job_orders
  for update to authenticated
  using ((select public.has_role('mechanic')) and mechanic_id = (select auth.uid()))
  with check ((select public.has_role('mechanic')) and mechanic_id = (select auth.uid()));

create policy "job_items: owner read" on public.job_order_items
  for select to authenticated
  using (exists (select 1 from public.job_orders jo
                  where jo.id = job_order_id and jo.customer_id in (select public.my_customer_ids())));
create policy "job_items: office all" on public.job_order_items
  for all to authenticated
  using ((select public.has_role('admin', 'service_advisor', 'parts')))
  with check ((select public.has_role('admin', 'service_advisor', 'parts')));
create policy "job_items: mechanic read assigned" on public.job_order_items
  for select to authenticated
  using ((select public.has_role('mechanic')) and exists (
    select 1 from public.job_orders jo where jo.id = job_order_id and jo.mechanic_id = (select auth.uid())));
create policy "job_items: mechanic add labor/parts" on public.job_order_items
  for insert to authenticated
  with check ((select public.has_role('mechanic')) and exists (
    select 1 from public.job_orders jo where jo.id = job_order_id and jo.mechanic_id = (select auth.uid())
      and jo.status in ('diagnosing', 'awaiting_parts', 'in_progress')));

create policy "job_events: owner read visible" on public.job_order_events
  for select to authenticated
  using (is_customer_visible and exists (
    select 1 from public.job_orders jo
     where jo.id = job_order_id and jo.customer_id in (select public.my_customer_ids())));
create policy "job_events: staff read" on public.job_order_events
  for select to authenticated
  using ((select public.has_role('admin', 'service_advisor', 'parts', 'sales'))
         or ((select public.has_role('mechanic')) and exists (
              select 1 from public.job_orders jo where jo.id = job_order_id and jo.mechanic_id = (select auth.uid()))));
create policy "job_events: staff add notes" on public.job_order_events
  for insert to authenticated
  with check (actor_id = (select auth.uid()) and (
    (select public.has_role('admin', 'service_advisor'))
    or ((select public.has_role('mechanic')) and exists (
          select 1 from public.job_orders jo where jo.id = job_order_id and jo.mechanic_id = (select auth.uid())))));

-- =============================================================================
-- Quotes
-- =============================================================================
create policy "quotes: owner read" on public.quotes
  for select to authenticated using (customer_id in (select public.my_customer_ids()));
create policy "quotes: owner create" on public.quotes
  for insert to authenticated
  with check (
    customer_id in (select public.my_customer_ids())
    and status = 'new' and subtotal = 0 and discount = 0
    and assigned_to is null and pdf_path is null and responded_at is null
  );
create policy "quotes: staff read" on public.quotes
  for select to authenticated using ((select public.has_role('admin', 'sales', 'parts', 'service_advisor')));
create policy "quotes: staff write" on public.quotes
  for all to authenticated
  using ((select public.has_role('admin', 'sales', 'parts', 'service_advisor')))
  with check ((select public.has_role('admin', 'sales', 'parts', 'service_advisor')));

create policy "quote_items: owner read" on public.quote_items
  for select to authenticated
  using (exists (select 1 from public.quotes q
                  where q.id = quote_id and q.customer_id in (select public.my_customer_ids())
                    and q.status not in ('new', 'in_review')));   -- only once a quote is sent
create policy "quote_items: staff all" on public.quote_items
  for all to authenticated
  using ((select public.has_role('admin', 'sales', 'parts', 'service_advisor')))
  with check ((select public.has_role('admin', 'sales', 'parts', 'service_advisor')));

-- =============================================================================
-- Invoices
-- =============================================================================
create policy "invoices: owner read issued" on public.invoices
  for select to authenticated
  using (customer_id in (select public.my_customer_ids()) and status <> 'draft');
create policy "invoices: staff all" on public.invoices
  for all to authenticated
  using ((select public.has_role('admin', 'sales', 'parts', 'service_advisor')))
  with check ((select public.has_role('admin', 'sales', 'parts', 'service_advisor')));

create policy "invoice_items: owner read" on public.invoice_items
  for select to authenticated
  using (exists (select 1 from public.invoices i
                  where i.id = invoice_id and i.customer_id in (select public.my_customer_ids())
                    and i.status <> 'draft'));
create policy "invoice_items: staff all" on public.invoice_items
  for all to authenticated
  using ((select public.has_role('admin', 'sales', 'parts', 'service_advisor')))
  with check ((select public.has_role('admin', 'sales', 'parts', 'service_advisor')));

-- =============================================================================
-- Staff notes, notifications, audit
-- =============================================================================
create policy "staff_notes: staff read" on public.staff_notes
  for select to authenticated using ((select public.is_staff()));
create policy "staff_notes: staff create" on public.staff_notes
  for insert to authenticated
  with check ((select public.is_staff()) and author_id = (select auth.uid()));
create policy "staff_notes: author/admin delete" on public.staff_notes
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.has_role('admin')));

create policy "notifications: read own or role" on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid())
         or (recipient_role is not null and recipient_role = (select public.app_role()))
         or (recipient_role is not null and (select public.has_role('admin'))));
create policy "notifications: mark own read" on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create policy "audit: admin read" on public.audit_log
  for select to authenticated using ((select public.has_role('admin')));

-- =============================================================================
-- Guard triggers (column-level rules RLS can't express)
-- =============================================================================

-- Only admins (or the service role) may change roles / activation.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.has_role('admin') then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.branch_id is distinct from old.branch_id
       or new.email is distinct from old.email then
      raise exception 'Not allowed to change role, status, branch or email' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- Customers editing their own customer record cannot re-link it.
create or replace function public.customers_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if new.profile_id is distinct from old.profile_id then
      raise exception 'Not allowed to change account link' using errcode = '42501';
    end if;
    -- Customers may attach a company they created / belong to, nothing else.
    if new.company_id is distinct from old.company_id and new.company_id is not null
       and not exists (select 1 from public.companies co
                        where co.id = new.company_id
                          and (co.created_by = auth.uid() or co.id in (select public.my_company_ids()))) then
      raise exception 'Unknown company' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger customers_guard before update on public.customers
  for each row execute function public.customers_guard();

-- Customers can only cancel a booking (status + reason); nothing else changes.
create or replace function public.bookings_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if (to_jsonb(new) - array['status', 'cancel_reason', 'cancelled_at', 'updated_at'])
       is distinct from (to_jsonb(old) - array['status', 'cancel_reason', 'cancelled_at', 'updated_at']) then
      raise exception 'Customers can only cancel bookings' using errcode = '42501';
    end if;
    new.cancelled_at := now();
  end if;
  return new;
end;
$$;
create trigger bookings_guard before update on public.service_bookings
  for each row execute function public.bookings_guard();

-- Mechanics may move status forward and write diagnosis/recommendation notes.
-- (grand_total is excluded because generated columns are NULL in BEFORE triggers.)
create or replace function public.job_orders_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and public.has_role('mechanic') then
    if (to_jsonb(new) - array['status', 'diagnosis', 'recommendation', 'customer_notes',
                              'diagnosing_at', 'awaiting_parts_at', 'in_progress_at', 'ready_at',
                              'released_at', 'updated_at',
                              'grand_total'])
       is distinct from
       (to_jsonb(old) - array['status', 'diagnosis', 'recommendation', 'customer_notes',
                              'diagnosing_at', 'awaiting_parts_at', 'in_progress_at', 'ready_at',
                              'released_at', 'updated_at',
                              'grand_total']) then
      raise exception 'Mechanics can only update status and diagnosis notes' using errcode = '42501';
    end if;
    if new.status in ('released', 'cancelled') then
      raise exception 'Only a service advisor can release or cancel a job' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger job_orders_guard before update on public.job_orders
  for each row execute function public.job_orders_guard();

-- Notifications: recipients may only flip read_at.
create or replace function public.notifications_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and (to_jsonb(new) - 'read_at') is distinct from (to_jsonb(old) - 'read_at') then
    raise exception 'Only read_at can be updated' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger notifications_guard before update on public.notifications
  for each row execute function public.notifications_guard();

-- =============================================================================
-- Audit trail
-- =============================================================================
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_changed text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into v_changed
      from jsonb_each(v_new) n
     where n.key not in ('updated_at', 'search')
       and n.value is distinct from (v_old -> n.key);
    if v_changed is null then
      return null;  -- no-op update
    end if;
  end if;

  insert into public.audit_log (actor_id, action, table_name, record_id, old_data, new_data, changed_fields)
  values (
    auth.uid(), tg_op, tg_table_name,
    coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid),
    v_old - 'search', v_new - 'search', v_changed
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'customers', 'companies', 'trucks', 'parts', 'services',
    'service_bookings', 'job_orders', 'quotes', 'invoices', 'branches'
  ]
  loop
    execute format(
      'create trigger audit_row_change after insert or update or delete on public.%I
         for each row execute function public.audit_row_change()', t);
  end loop;
end;
$$;

-- =============================================================================
-- Rate limiting (fixed window). Returns TRUE when the call is allowed.
-- Only the server (service role) may call it.
-- =============================================================================
create or replace function public.hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_limits as rl (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = rl.hits + 1
  returning hits into v_hits;

  -- opportunistic cleanup of old windows
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;
revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;

-- Trigger/internal functions should never be callable through the API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.make_reference(text, regclass) from public, anon, authenticated;
grant execute on function public.make_reference(text, regclass) to authenticated, service_role;

-- =============================================================================
-- Realtime: live job / booking status + notifications
-- (postgres_changes events are filtered through the RLS policies above)
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.job_orders,
      public.job_order_events,
      public.service_bookings,
      public.quotes,
      public.notifications;
  end if;
end;
$$;
