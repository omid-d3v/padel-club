begin;

-- Publication is the existing single source of truth for club availability.
-- Keep historical rows and financial processing; reject new capacity/purchases.
create function public.is_club_available(p_club uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.clubs where id=p_club and published);
$$;
create function public.is_booking_club_available(p_booking uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.bookings b join public.court_slots s on s.id=b.slot_id
 join public.courts c on c.id=s.court_id join public.clubs cl on cl.id=c.club_id
 where b.id=p_booking and c.active and cl.published);
$$;
revoke all on function public.is_club_available(uuid),public.is_booking_club_available(uuid) from public,anon,authenticated,service_role;
grant execute on function public.is_club_available(uuid),public.is_booking_club_available(uuid) to anon,authenticated,service_role;

alter policy public_match on public.open_matches using(published and public.is_booking_club_available(booking_id));
alter policy public_event on public.platform_events using(published and public.is_club_available(club_id));

create or replace function public.event_roster(p_event uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('name',p.display_name,'paid',r.status='paid','player_id',p.player_id) order by r.created_at),'[]')
 from public.event_registrations r join public.user_profiles p on p.user_id=r.user_id
 where r.event_id=p_event and (r.status='paid' or r.status='reserved' and r.lock_expires_at>now())
 and exists(select 1 from public.platform_events e where e.id=p_event
 and ((e.published and public.is_club_available(e.club_id)) or e.organizer_id=auth.uid() or public.is_admin()));
$$;
create or replace function public.event_result_table(p_event uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('name',u.display_name,'rank',p.rank,'points',p.points) order by p.rank),'[]')
 from public.event_placements p join public.event_registrations r on r.id=p.registration_id join public.user_profiles u on u.user_id=r.user_id
 where p.event_id=p_event and exists(select 1 from public.platform_events e where e.id=p_event and e.published and public.is_club_available(e.club_id));
$$;

-- A statement lock precedes row locks, matching the reservation transaction's
-- lock order even for direct API updates. Managers cannot undo an admin closure.
create function private.lock_club_publication() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if current_setting('role',true) in ('anon','authenticated') and not public.is_admin() then
  raise exception 'ADMIN_REQUIRED';
 end if;
 perform private.platform_lock();
 return null;
end $$;
create trigger lock_club_publication before update of published on public.clubs
for each statement execute function private.lock_club_publication();

create function public.set_club_availability(p_club uuid,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if p_enabled is null then raise exception 'INVALID_REQUEST'; end if;
 perform private.platform_lock();
 update public.clubs set published=p_enabled,updated_at=now() where id=p_club;
 if not found then raise exception 'NOT_FOUND'; end if;
end $$;
revoke all on function public.set_club_availability(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.set_club_availability(uuid,boolean) to authenticated;

create function private.guard_club_reservation() returns trigger
language plpgsql security definer set search_path='' as $$
declare slot uuid; club uuid; begin
 if TG_TABLE_NAME='bookings' then
  if TG_OP='UPDATE' and NEW.slot_id=OLD.slot_id then return NEW; end if;
  slot:=NEW.slot_id;
 elsif TG_TABLE_NAME='booking_participants' then
  if TG_OP='UPDATE' then
   if NEW.status not in ('interested','reserved') then return NEW; end if;
   if NEW.status=OLD.status then return NEW; end if;
  end if;
  select b.slot_id into slot from public.bookings b where b.id=NEW.booking_id;
 elsif TG_TABLE_NAME='event_registrations' then
  if TG_OP='UPDATE' then
   if NEW.status<>'reserved' then return NEW; end if;
   if NEW.status=OLD.status then return NEW; end if;
  end if;
  select e.club_id into club from public.platform_events e where e.id=NEW.event_id;
 elsif TG_TABLE_NAME='booking_reschedules' then
  if TG_OP='UPDATE' and (NEW.status<>'accepted' or NEW.status=OLD.status) then return NEW; end if;
  slot:=NEW.new_slot_id;
 elsif TG_TABLE_NAME='payments' then
  if NEW.participant_id is not null then
   select b.slot_id into slot from public.booking_participants bp join public.bookings b on b.id=bp.booking_id where bp.id=NEW.participant_id;
  else
   select e.club_id into club from public.event_registrations r join public.platform_events e on e.id=r.event_id where r.id=NEW.registration_id;
  end if;
 end if;
 perform private.platform_lock();
 if slot is not null then
  select c.club_id into club from public.court_slots s join public.courts c on c.id=s.court_id where s.id=slot and c.active;
 end if;
 if not public.is_club_available(club) then raise exception 'CLUB_UNAVAILABLE'; end if;
 return NEW;
end $$;
create trigger active_club_booking before insert or update of slot_id on public.bookings
for each row execute function private.guard_club_reservation();
create trigger active_club_participation before insert or update of status on public.booking_participants
for each row execute function private.guard_club_reservation();
create trigger active_club_registration before insert or update of status on public.event_registrations
for each row execute function private.guard_club_reservation();
create trigger active_club_replacement before insert or update of status on public.booking_reschedules
for each row execute function private.guard_club_reservation();
create trigger active_club_payment before insert on public.payments
for each row execute function private.guard_club_reservation();
revoke all on function private.lock_club_publication(),private.guard_club_reservation() from public,anon,authenticated,service_role;

-- Block a cached checkout too, including when prepare_checkout would return an
-- existing unpaid payment rather than insert another row. Bank callbacks and
-- receipt/reconciliation/refund paths intentionally keep working for old orders.
create or replace function public.start_payment(p_participant uuid default null,p_registration uuid default null,p_provider text default 'zarinpal') returns uuid
language plpgsql security definer set search_path='' as $$
declare settings public.payment_settings; pid uuid; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform private.platform_lock();
 if exists(select 1 from public.booking_participants bp where bp.id=p_participant and bp.user_id=auth.uid() and not public.is_booking_club_available(bp.booking_id))
 or exists(select 1 from public.event_registrations r join public.platform_events e on e.id=r.event_id where r.id=p_registration and r.user_id=auth.uid() and not public.is_club_available(e.club_id))
 then raise exception 'CLUB_UNAVAILABLE'; end if;
 select * into settings from public.payment_settings where id;
 if p_provider is null or p_provider not in ('zarinpal','card_transfer') or (p_provider='zarinpal' and not settings.zarinpal_enabled) or (p_provider='card_transfer' and not settings.card_enabled) then raise exception 'PAYMENT_METHOD_DISABLED'; end if;
 pid:=private.prepare_checkout(p_participant,p_registration,p_provider);
 if p_provider='card_transfer' then
  insert into public.card_transfer_receipts(payment_id,user_id,card_number,card_holder)
  values(pid,auth.uid(),settings.card_number,settings.card_holder) on conflict(payment_id) do nothing;
 end if;
 return pid;
end $$;

create or replace function public.claim_payment_request(p_payment uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform private.platform_lock();
 update public.payments p set status='needs_attention'
 where p.id=p_payment and p.provider='zarinpal' and p.status='created'
 and p.authority is null and p.expires_at>now()
 and (
  exists(select 1 from public.booking_participants bp where bp.id=p.participant_id and public.is_booking_club_available(bp.booking_id))
  or exists(select 1 from public.event_registrations r join public.platform_events e on e.id=r.event_id where r.id=p.registration_id and public.is_club_available(e.club_id))
 );
 return found;
end $$;
commit;
