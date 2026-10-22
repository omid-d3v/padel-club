create function public.configure_calendar(p_id uuid,p_club uuid,p_enabled boolean,p_interval integer,p_horizon integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 perform private.platform_lock();
 if exists(select 1 from public.calendar_connections where id=p_id and club_id is distinct from p_club) then
   update public.calendar_court_mappings set active=false where connection_id=p_id;
   update public.court_slots set published=false,external_available=false where calendar_connection_id=p_id;
 end if;
 update public.calendar_sync_runs set status='superseded',finished_at=now() where connection_id=p_id and status='syncing';
 update public.calendar_connections set club_id=p_club,enabled=p_enabled,interval_minutes=p_interval,horizon_days=p_horizon,
 status=case when p_enabled then 'pending' else 'disabled' end,next_sync_at=now(),lease_token=null,lease_until=null,last_error=null where id=p_id;
 if not found then raise exception 'CONNECTION_NOT_FOUND'; end if;
end $$;
create function public.map_calendar_court(p_connection uuid,p_court uuid,p_ref text) returns void
language plpgsql security definer set search_path='' as $$
declare conn public.calendar_connections; begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 perform private.platform_lock();
 select * into conn from public.calendar_connections where id=p_connection for update;
 if not exists(select 1 from public.courts where id=p_court and club_id=conn.club_id) then raise exception 'COURT_CLUB_MISMATCH'; end if;
 if not exists(select 1 from jsonb_array_elements(conn.discovered_courts) e where e->>'reference'=p_ref) then raise exception 'UNKNOWN_EXTERNAL_COURT'; end if;
 if exists(select 1 from public.calendar_court_mappings where court_id=p_court and connection_id<>p_connection and active) then raise exception 'COURT_ALREADY_MAPPED'; end if;
 update public.court_slots set published=false,external_available=false where court_id=p_court and calendar_connection_id=p_connection;
 insert into public.calendar_court_mappings(connection_id,court_id,external_ref) values(p_connection,p_court,p_ref)
 on conflict(court_id) where active do update set external_ref=excluded.external_ref;
 update public.calendar_sync_runs set status='superseded',finished_at=now() where connection_id=p_connection and status='syncing';
 update public.calendar_connections set lease_token=null,lease_until=null,next_sync_at=now(),status=case when enabled then 'pending' else 'disabled' end where id=p_connection;
end $$;
create function public.unmap_calendar_court(p_mapping uuid) returns void
language plpgsql security definer set search_path='' as $$
declare m public.calendar_court_mappings; begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 perform private.platform_lock();
 update public.calendar_court_mappings set active=false where id=p_mapping and active returning * into m;
 update public.court_slots set published=false,external_available=false where court_id=m.court_id and calendar_connection_id=m.connection_id;
 update public.calendar_connections set lease_token=null,lease_until=null,next_sync_at=now(),status=case when enabled then 'pending' else 'disabled' end where id=m.connection_id;
 update public.calendar_sync_runs set status='superseded',finished_at=now() where connection_id=m.connection_id and status='syncing';
end $$;
create function public.request_calendar_sync(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 update public.calendar_connections set next_sync_at=now() where id=p_id and enabled;
 if not found then raise exception 'CALENDAR_DISABLED'; end if;
end $$;
