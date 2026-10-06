-- =============================================================================
-- JAC Motors — in-app notification to the customer when a booking is
-- confirmed, rescheduled or cancelled by staff. (Emails/SMS for the same
-- events are sent by the Next.js webhook handler.)
-- =============================================================================

create or replace function public.bookings_notify_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile uuid;
  v_when text;
begin
  if new.status is not distinct from old.status
     or new.status not in ('confirmed', 'rescheduled', 'cancelled') then
    return new;
  end if;

  select c.profile_id into v_profile from public.customers c where c.id = new.customer_id;
  if v_profile is null then
    return new;
  end if;

  v_when := to_char(coalesce(new.scheduled_at, new.preferred_date::timestamptz) at time zone 'Asia/Manila', 'Dy DD Mon, HH12:MI AM');

  insert into public.notifications (recipient_id, type, title, body, link, data)
  values (
    v_profile,
    'booking.' || new.status,
    case new.status
      when 'confirmed'   then 'Service booking confirmed'
      when 'rescheduled' then 'Service booking rescheduled'
      else 'Service booking cancelled'
    end,
    new.reference || ' · ' || new.truck_model ||
      case when new.status = 'cancelled' then '' else ' · ' || v_when end,
    '/account/bookings/' || new.id,
    jsonb_build_object('booking_id', new.id, 'status', new.status)
  );
  return new;
end;
$$;

create trigger bookings_notify_customer after update of status on public.service_bookings
  for each row execute function public.bookings_notify_customer();

revoke all on function public.bookings_notify_customer() from public, anon, authenticated;
