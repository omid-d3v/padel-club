-- Stale or disabled feeds cannot be used to create a new booking, even via a direct RPC.
create function private.calendar_slot_fresh(p_slot uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select case when s.calendar_connection_id is null then true else
 s.external_available and c.enabled and c.status='ok' and s.calendar_checked_at>now()-make_interval(mins=>c.interval_minutes+5)
 and exists(select 1 from public.calendar_court_mappings m join public.courts ct on ct.id=m.court_id where m.connection_id=c.id and m.active and m.court_id=s.court_id and ct.club_id=c.club_id and ct.active)
 end from public.court_slots s left join public.calendar_connections c on c.id=s.calendar_connection_id where s.id=p_slot),false);
$$;
create function private.check_calendar_booking() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not private.calendar_slot_fresh(NEW.slot_id) then raise exception 'CALENDAR_STALE'; end if;
 return NEW;
end $$;
create trigger require_fresh_calendar before insert on public.bookings for each row execute function private.check_calendar_booking();
create or replace function public.discover_slots(p_court uuid,p_from timestamptz,p_to timestamptz) returns table(id uuid,starts_at timestamptz,ends_at timestamptz,court_price bigint,available boolean) language sql stable security definer set search_path='' as $$
 select s.id,s.starts_at,s.ends_at,s.court_price,not exists(select 1 from public.bookings b where b.slot_id=s.id and b.status not in ('cancelled','expired'))
 from public.court_slots s join public.courts c on c.id=s.court_id join public.clubs cl on cl.id=c.club_id
 where c.id=p_court and c.active and cl.published and s.published and s.starts_at>=greatest(p_from,now()) and s.starts_at<p_to and private.calendar_slot_fresh(s.id)
 order by s.starts_at limit 500;
$$;
revoke all on function private.calendar_slot_fresh(uuid),private.check_calendar_booking() from public,anon,authenticated;
revoke all on function public.configure_calendar(uuid,uuid,boolean,integer,integer),public.map_calendar_court(uuid,uuid,text),public.unmap_calendar_court(uuid),public.request_calendar_sync(uuid),public.claim_calendar_sync(),public.finish_calendar_sync(uuid,uuid,text,jsonb,jsonb,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.configure_calendar(uuid,uuid,boolean,integer,integer),public.map_calendar_court(uuid,uuid,text),public.unmap_calendar_court(uuid),public.request_calendar_sync(uuid) to authenticated;
grant execute on function public.claim_calendar_sync(),public.finish_calendar_sync(uuid,uuid,text,jsonb,jsonb,timestamptz,timestamptz,text) to service_role;
