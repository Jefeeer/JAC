-- =============================================================================
-- JAC Motors — let workshop staff annotate a job timeline event with a
-- customer-visible note (e.g. "Rear brake shoes worn to 1.2 mm"). Only the
-- note may change; status history itself stays immutable.
-- =============================================================================

create policy "job_events: staff annotate" on public.job_order_events
  for update to authenticated
  using (
    (select public.has_role('admin', 'service_advisor'))
    or ((select public.has_role('mechanic')) and exists (
          select 1 from public.job_orders jo where jo.id = job_order_id and jo.mechanic_id = (select auth.uid())))
  )
  with check (
    (select public.has_role('admin', 'service_advisor'))
    or ((select public.has_role('mechanic')) and exists (
          select 1 from public.job_orders jo where jo.id = job_order_id and jo.mechanic_id = (select auth.uid())))
  );

create or replace function public.job_events_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'note') is distinct from (to_jsonb(old) - 'note') then
    raise exception 'Only the note of a timeline event can be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger job_events_guard before update on public.job_order_events
  for each row execute function public.job_events_guard();
