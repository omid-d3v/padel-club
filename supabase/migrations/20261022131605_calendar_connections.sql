-- Public calendar readers are independent of purchase/hold providers.
create table public.calendar_connections (
 id uuid primary key default gen_random_uuid(),
 source text not null unique check(source in ('guilan','sabaland')),
 club_id uuid unique references public.clubs(id),
 enabled boolean not null default true,
 interval_minutes integer not null default 60 check(interval_minutes between 15 and 1440),
 horizon_days integer not null default 7 check(horizon_days between 1 and 14),
 status text not null default 'pending' check(status in ('pending','syncing','ok','needs_mapping','login_required','error','disabled')),
 last_attempt_at timestamptz, last_success_at timestamptz,
 next_sync_at timestamptz not null default now(),
 lease_token uuid, lease_until timestamptz,
 last_error text, last_slot_count integer not null default 0,
 discovered_courts jsonb not null default '[]',
 created_at timestamptz not null default now()
);
create index calendar_due on public.calendar_connections(next_sync_at) where enabled;
create table public.calendar_court_mappings (
 id uuid primary key default gen_random_uuid(),
 connection_id uuid not null references public.calendar_connections(id),
 court_id uuid not null unique references public.courts(id),
 external_ref text not null check(length(external_ref) between 1 and 100),
 unique(connection_id,external_ref)
);
create table public.calendar_sync_runs (
 id uuid primary key,
 connection_id uuid not null references public.calendar_connections(id),
 started_at timestamptz not null default now(), finished_at timestamptz,
 status text not null default 'syncing',
 slot_count integer not null default 0, imported_count integer not null default 0,
 conflict_count integer not null default 0, message text
);
create index calendar_runs_recent on public.calendar_sync_runs(connection_id,started_at desc);
alter table public.court_slots add column calendar_connection_id uuid references public.calendar_connections(id);
alter table public.court_slots add column calendar_checked_at timestamptz;
alter table public.court_slots add column external_available boolean;
create index imported_calendar_slots on public.court_slots(calendar_connection_id,court_id,starts_at) where calendar_connection_id is not null;
do $$ declare n text; begin
 foreach n in array array['calendar_connections','calendar_court_mappings','calendar_sync_runs'] loop
 execute format('alter table public.%I enable row level security',n);
 execute format('revoke all on public.%I from anon,authenticated',n);
 execute format('grant select on public.%I to authenticated,service_role',n);
 execute format('create policy admin_read on public.%I for select to authenticated using ((select public.is_admin()))',n);
 end loop;
 foreach n in array array['calendar_connections','calendar_court_mappings'] loop
 execute format('create trigger audit_platform_change after insert or update or delete on public.%I for each row execute function private.audit_change()',n);
 end loop;
end $$;
insert into public.calendar_connections(source) values ('guilan'),('sabaland');
