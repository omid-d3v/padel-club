-- A short database lease fences concurrent workers and stale responses.
create or replace function public.claim_calendar_sync() returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.calendar_connections; token uuid:=gen_random_uuid(); begin
 perform private.platform_lock();
 select * into c from public.calendar_connections where enabled and next_sync_at<=now()
 and (lease_until is null or lease_until<now()) order by next_sync_at limit 1 for update skip locked;
 if not found then return null; end if;
 update public.calendar_sync_runs set status='error',finished_at=now(),message='WORKER_TIMEOUT' where connection_id=c.id and status='syncing';
 update public.calendar_connections set lease_token=token,lease_until=now()+interval '4 minutes',status='syncing',last_attempt_at=now() where id=c.id;
 insert into public.calendar_sync_runs(id,connection_id) values(token,c.id);
 return to_jsonb(c)||jsonb_build_object('token',token,'mappings',coalesce((select jsonb_agg(to_jsonb(m)) from public.calendar_court_mappings m join public.courts ct on ct.id=m.court_id where m.connection_id=c.id and m.active and ct.club_id=c.club_id and ct.active),'[]'::jsonb));
end $$;

create or replace function public.finish_calendar_sync(p_id uuid,p_token uuid,p_status text,p_courts jsonb,p_slots jsonb,p_from timestamptz,p_to timestamptz,p_error text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.calendar_connections; m public.calendar_court_mappings; x jsonb; s public.court_slots;
 imported integer:=0; conflicts integer:=0; count_slots integer:=0; a timestamptz; b timestamptz; price bigint; begin
 perform private.platform_lock();
 select * into c from public.calendar_connections where id=p_id for update;
 if c.lease_token is distinct from p_token or c.lease_until<now() or not c.enabled then raise exception 'STALE_CALENDAR_RUN'; end if;
 if p_status not in ('ok','needs_mapping','login_required','error') then raise exception 'INVALID_CALENDAR_STATUS'; end if;
 if p_status in ('ok','needs_mapping') then
 if jsonb_typeof(p_courts)<>'array' or jsonb_array_length(p_courts)>100 or jsonb_typeof(p_slots)<>'array' or jsonb_array_length(p_slots)>10000 or p_from is null or p_to is null or p_to<=p_from or p_to>p_from+interval '15 days' then raise exception 'INVALID_CALENDAR_PAYLOAD'; end if;
 count_slots:=jsonb_array_length(p_slots);
 -- Only slots owned by this importer are withdrawn. Manual inventory and all bookings remain intact.
 update public.court_slots set published=false,external_available=false where calendar_connection_id=p_id and starts_at>=p_from and starts_at<p_to;
 for m in select cm.* from public.calendar_court_mappings cm join public.courts ct on ct.id=cm.court_id where cm.connection_id=p_id and cm.active and ct.club_id=c.club_id and ct.active loop
 for x in select value from jsonb_array_elements(p_slots) where value->>'courtRef'=m.external_ref loop
 a:=(x->>'startsAt')::timestamptz; b:=(x->>'endsAt')::timestamptz; price:=(x->>'price')::bigint;
 if a is null or b is null or price is null or price<=0 or price>100000000000 or a<p_from or a>=p_to or b<=a or b>a+interval '2 hours' or jsonb_typeof(x->'available')<>'boolean' then raise exception 'INVALID_CALENDAR_SLOT'; end if;
 select * into s from public.court_slots where court_id=m.court_id and starts_at=a and ends_at=b for update;
 if found then
   if s.calendar_connection_id is distinct from p_id then conflicts:=conflicts+1; continue; end if;
   if exists(select 1 from public.bookings where slot_id=s.id) then
     update public.court_slots set external_available=(x->>'available')::boolean,calendar_checked_at=now(),published=(x->>'available')::boolean where id=s.id;
     -- Never mutate a price/time snapshot already referenced by a booking.
     if s.court_price<>price then conflicts:=conflicts+1; end if;
   else
     update public.court_slots set court_price=price,external_available=(x->>'available')::boolean,calendar_checked_at=now(),published=(x->>'available')::boolean where id=s.id;
   end if;
 else
   if exists(select 1 from public.court_slots where court_id=m.court_id and starts_at<b and ends_at>a) then conflicts:=conflicts+1; continue; end if;
   insert into public.court_slots(court_id,starts_at,ends_at,court_price,published,calendar_connection_id,calendar_checked_at,external_available)
   values(m.court_id,a,b,price,(x->>'available')::boolean,p_id,now(),(x->>'available')::boolean);
 end if;
 imported:=imported+1;
 end loop; end loop;
 end if;
 update public.calendar_connections set status=p_status,last_error=left(p_error,500),lease_token=null,lease_until=null,
 next_sync_at=now()+make_interval(mins=>interval_minutes),
 last_success_at=case when p_status in ('ok','needs_mapping') then now() else last_success_at end,
 discovered_courts=case when p_status in ('ok','needs_mapping') then p_courts else discovered_courts end,
 last_slot_count=case when p_status in ('ok','needs_mapping') then count_slots else last_slot_count end where id=p_id;
 update public.calendar_sync_runs set status=p_status,finished_at=now(),slot_count=count_slots,imported_count=imported,conflict_count=conflicts,message=left(p_error,500) where id=p_token;
 return jsonb_build_object('imported',imported,'conflicts',conflicts);
end $$;
