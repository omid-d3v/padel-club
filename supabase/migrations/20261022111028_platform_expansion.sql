-- Additive platform schema. Existing player/tournament tables and rankings are preserved.
begin;
create schema if not exists private;
revoke all on schema private from public;

create table public.cities (
 id uuid primary key default gen_random_uuid(), slug text not null unique check(slug ~ '^[a-z0-9-]+$'),
 name text not null check(length(trim(name)) between 2 and 80), description text not null default ''
);
create table public.clubs (
 id uuid primary key default gen_random_uuid(), city_id uuid not null references public.cities(id),
 slug text not null unique check(slug ~ '^[a-z0-9-]+$'), name text not null check(length(trim(name)) between 2 and 100),
 description text not null default '', address text not null, latitude numeric check(latitude between -90 and 90),
 longitude numeric check(longitude between -180 and 180), facilities text[] not null default '{}',
 photo_path text, published boolean not null default false, featured boolean not null default false,
 booking_mode text not null default 'MANUAL_APPROVAL' check(booking_mode in ('MANUAL_APPROVAL','EXTERNAL_AUTOMATED')),
 provider_key text, completion_cutoff_hours integer not null default 4 check(completion_cutoff_hours between 4 and 72), cancellation_policy jsonb not null default '{"full_refund_hours":24,"late_refund_percent":0}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.club_managers (
 club_id uuid not null references public.clubs(id), user_id uuid not null references auth.users(id), primary key(club_id,user_id)
);
create table public.courts (
 id uuid primary key default gen_random_uuid(), club_id uuid not null references public.clubs(id),
 name text not null, description text not null default '', active boolean not null default true,
 indoor boolean not null default false, hourly_price bigint not null check(hourly_price between 0 and 1000000000000),
 platform_fee bigint not null default 0 check(platform_fee between 0 and 1000000000), external_court_ref text,
 unique(club_id,name)
);
create table public.availability_rules (
 id uuid primary key default gen_random_uuid(), court_id uuid not null references public.courts(id),
 weekday integer not null check(weekday between 0 and 6), start_minute integer not null check(start_minute between 0 and 1439),
 end_minute integer not null check(end_minute between 1 and 1440), slot_minutes integer not null default 90 check(slot_minutes in (60,90,120)),
 price bigint not null check(price between 0 and 1000000000000), check(end_minute>start_minute), unique(court_id,weekday,start_minute)
);
create table public.court_slots (
 id uuid primary key default gen_random_uuid(), court_id uuid not null references public.courts(id),
 starts_at timestamptz not null, ends_at timestamptz not null, court_price bigint not null check(court_price between 0 and 1000000000000),
 published boolean not null default true, check(ends_at>starts_at and ends_at<=starts_at+interval '4 hours'), unique(court_id,starts_at)
);
create table public.equipment (
 id uuid primary key default gen_random_uuid(), club_id uuid not null references public.clubs(id), name text not null,
 kind text not null check(kind in ('personal','shared')), stock integer not null check(stock between 0 and 10000),
 price bigint not null default 0 check(price between 0 and 10000000000), active boolean not null default true
);
create table public.user_profiles (
 user_id uuid primary key references auth.users(id), player_id uuid unique references public.players(id),
 display_name text not null check(length(trim(display_name)) between 2 and 100), city_id uuid references public.cities(id),
 skill_level integer not null default 1 check(skill_level between 0 and 5), skill_verified boolean not null default false,
 avatar_path text, created_at timestamptz not null default now()
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 slot_id uuid not null references public.court_slots(id), kind text not null check(kind in ('private','open','event')),
 status text not null default 'pending_club' check(status in ('pending_club','awaiting_payment','collecting','booking_in_progress','confirmed','completed','cancelled','expired','needs_attention')),
 mode text not null check(mode in ('MANUAL_APPROVAL','EXTERNAL_AUTOMATED')),
 court_price bigint not null check(court_price>=0), shared_price bigint not null default 0 check(shared_price>=0),
 platform_fee bigint not null default 0 check(platform_fee>=0),
 cancellation_snapshot jsonb not null, club_reference text, hold_expires_at timestamptz, payment_deadline timestamptz,
 request_expires_at timestamptz not null default now()+interval '24 hours', external_reference text, external_hold_reference text, external_quote_id text,
 idempotency_key uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,idempotency_key),
 check(payment_deadline is null or (hold_expires_at is not null and payment_deadline<=hold_expires_at)),
 check(status not in ('confirmed','completed') or (mode='MANUAL_APPROVAL' and club_reference is not null) or (mode='EXTERNAL_AUTOMATED' and external_reference is not null))
);
create unique index bookings_single_active_slot on public.bookings(slot_id) where status not in ('cancelled','expired');
create table public.open_matches (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.bookings(id),
 organizer_id uuid not null references auth.users(id), title text not null check(length(trim(title)) between 2 and 100),
 description text not null default '', min_skill integer check(min_skill between 0 and 5), max_skill integer check(max_skill between 0 and 5),
 completion_cutoff_hours integer not null default 4 check(completion_cutoff_hours between 4 and 72),
 cutoff_at timestamptz not null, published boolean not null default true,
 check((min_skill is null and max_skill is null) or (min_skill is not null and max_skill is not null and min_skill<=max_skill))
);
create table public.booking_participants (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id), user_id uuid not null references auth.users(id),
 seat integer not null check(seat between 1 and 4), court_share bigint not null check(court_share>=0), shared_share bigint not null default 0 check(shared_share>=0),
 personal_price bigint not null default 0 check(personal_price>=0), fee bigint not null default 0 check(fee>=0),
 status text not null default 'reserved' check(status in ('interested','reserved','paid','withdrawn','refund_pending','refunded','no_show')),
 lock_expires_at timestamptz, created_at timestamptz not null default now(), unique(booking_id,user_id)
);
create unique index booking_seat_capacity on public.booking_participants(booking_id,seat) where status in ('interested','reserved','paid','no_show');
create table public.booking_items (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id), participant_id uuid references public.booking_participants(id),
 equipment_id uuid not null references public.equipment(id), quantity integer not null check(quantity between 1 and 20),
 unit_price bigint not null check(unit_price>=0), unique(booking_id,participant_id,equipment_id)
);
create table public.platform_events (
 id uuid primary key default gen_random_uuid(), slug text not null unique check(slug ~ '^[a-z0-9-]+$'), title text not null,
 kind text not null check(kind in ('americano','tournament')), club_id uuid not null references public.clubs(id),
 organizer_id uuid not null references auth.users(id), starts_at timestamptz not null, registration_deadline timestamptz not null,
 capacity integer not null check(capacity between 4 and 128), entry_fee bigint not null check(entry_fee between 0 and 1000000000000),
 description text not null default '', published boolean not null default false,
 status text not null default 'registration' check(status in ('registration','active','completed','cancelled')),
 tournament_id uuid unique references public.tournaments(id), cancellation_policy jsonb not null default '{"full_refund_hours":24,"late_refund_percent":0}',
 created_at timestamptz not null default now(), check(registration_deadline<starts_at), check(kind<>'americano' or capacity=8)
);
create table public.event_courts (
 event_id uuid not null references public.platform_events(id), slot_id uuid not null references public.court_slots(id),
 booking_id uuid not null unique references public.bookings(id), primary key(event_id,slot_id)
);
create table public.event_registrations (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.platform_events(id),
 user_id uuid not null references auth.users(id), status text not null check(status in ('reserved','paid','withdrawn','refund_pending','refunded')),
 amount bigint not null check(amount>=0), lock_expires_at timestamptz, created_at timestamptz not null default now(), unique(event_id,user_id)
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), participant_id uuid references public.booking_participants(id),
 registration_id uuid references public.event_registrations(id), amount bigint not null check(amount between 1 and 1000000000000),
 currency text not null default 'IRR' check(currency='IRR'), provider text not null default 'zarinpal' check(provider='zarinpal'),
 status text not null default 'created' check(status in ('created','pending','paid','failed','needs_attention')),
 authority text unique, reference text unique, request_key uuid not null unique, expires_at timestamptz not null,
 created_at timestamptz not null default now(), verified_at timestamptz,
 check((participant_id is null)<>(registration_id is null))
);
create unique index payment_one_attempt_seat on public.payments(participant_id) where status in ('created','pending','needs_attention') and reference is null;
create unique index payment_one_attempt_registration on public.payments(registration_id) where status in ('created','pending','needs_attention') and reference is null;
create table public.refunds (
 id uuid primary key default gen_random_uuid(), payment_id uuid not null unique references public.payments(id),
 amount bigint not null check(amount>0), reason text not null,
 status text not null default 'requested' check(status in ('requested','processing','completed','failed','manual_review')),
 provider_reference text, attempts integer not null default 0, created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.provider_attempts (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id),
 operation text not null, idempotency_key text not null unique, status text not null default 'queued' check(status in ('queued','running','succeeded','failed','unknown')),
 attempts integer not null default 0, last_error text, next_attempt_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), title text not null, body text not null,
 href text not null default '/account', read_at timestamptz, dedupe_key text unique, created_at timestamptz not null default now()
);
create table public.audit_log (
 id uuid primary key default gen_random_uuid(), actor_id uuid, entity text not null, entity_id text not null,
 operation text not null, before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);
create table public.result_submissions (
 id uuid primary key default gen_random_uuid(), match_id uuid not null unique references public.open_matches(id), submitted_by uuid not null references auth.users(id),
 team1_users uuid[] not null, team2_users uuid[] not null, team1_sets integer not null check(team1_sets between 0 and 3),
 team2_sets integer not null check(team2_sets between 0 and 3), competitive boolean not null default false,
 status text not null default 'pending' check(status in ('pending','disputed','accepted','rejected')), version integer not null default 0,
 created_at timestamptz not null default now(), check(cardinality(team1_users)=2 and cardinality(team2_users)=2), check(team1_sets<>team2_sets)
);
create table public.result_confirmations (
 result_id uuid not null references public.result_submissions(id), user_id uuid not null references auth.users(id),
 decision text not null check(decision in ('confirm','dispute')), reason text, created_at timestamptz not null default now(), primary key(result_id,user_id)
);
create table public.rating_history (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), result_id uuid references public.result_submissions(id),
 rating_before integer not null, rating_after integer not null, reason text not null, actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(), unique(user_id,result_id)
);

create index clubs_city_published on public.clubs(city_id,published);
create index courts_club on public.courts(club_id);
create index slots_court_start on public.court_slots(court_id,starts_at);
create index equipment_club on public.equipment(club_id);
create index bookings_owner on public.bookings(user_id,created_at desc);
create index bookings_deadlines on public.bookings(status,payment_deadline,hold_expires_at);
create index participants_owner on public.booking_participants(user_id,booking_id);
create index items_equipment on public.booking_items(equipment_id,booking_id);
create index open_match_cutoff on public.open_matches(cutoff_at) where published;
create index events_public on public.platform_events(published,starts_at);
create index registrations_owner on public.event_registrations(user_id,event_id);
create index payments_owner on public.payments(user_id,created_at desc);
create index refunds_status on public.refunds(status,created_at);
create index notifications_owner on public.notifications(user_id,created_at desc);
create index provider_queue on public.provider_attempts(status,next_attempt_at);
create index rating_user on public.rating_history(user_id,created_at desc);
create index audit_entity on public.audit_log(entity,entity_id,created_at desc);

create function private.manages(p_club uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or exists(select 1 from public.club_managers where club_id=p_club and user_id=auth.uid());
$$;
create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_log(actor_id,entity,entity_id,operation,before_data,after_data)
 values(auth.uid(),TG_TABLE_NAME,coalesce(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id',''),TG_OP,
 case when TG_OP<>'INSERT' then to_jsonb(OLD) end,case when TG_OP<>'DELETE' then to_jsonb(NEW) end);
 if TG_OP='DELETE' then return OLD; end if; return NEW;
end; $$;
do $$ declare n text; begin
 foreach n in array array['cities','clubs','club_managers','courts','availability_rules','court_slots','equipment','user_profiles','bookings','open_matches','booking_participants','booking_items','platform_events','event_courts','event_registrations','payments','refunds','provider_attempts','notifications','audit_log','result_submissions','result_confirmations','rating_history'] loop
 execute format('alter table public.%I enable row level security',n);
 execute format('revoke all on public.%I from anon,authenticated',n);
 execute format('grant select on public.%I to authenticated',n);
 execute format('create policy admin_read on public.%I for select to authenticated using ((select public.is_admin()))',n);
 end loop;
 foreach n in array array['clubs','courts','equipment','bookings','payments','refunds','platform_events','result_submissions','rating_history','match_sets','matches','tournaments'] loop
 execute format('create trigger audit_platform_change after insert or update or delete on public.%I for each row execute function private.audit_change()',n);
 end loop;
end $$;
grant usage on schema private to authenticated;
grant execute on function private.manages(uuid) to authenticated;
grant select on public.cities,public.clubs,public.courts,public.court_slots,public.equipment,public.open_matches,public.platform_events to anon;
create policy public_city on public.cities for select to anon,authenticated using(true);
create policy published_club on public.clubs for select to anon,authenticated using(published);
create policy club_manager on public.clubs for all to authenticated using(private.manages(id)) with check(private.manages(id));
create policy published_court on public.courts for select to anon,authenticated using(active and exists(select 1 from public.clubs c where c.id=club_id and c.published));
create policy court_manager on public.courts for all to authenticated using(private.manages(club_id)) with check(private.manages(club_id));
create policy published_slot on public.court_slots for select to anon,authenticated using(published and exists(select 1 from public.courts c join public.clubs cl on cl.id=c.club_id where c.id=court_id and c.active and cl.published));
create policy slot_manager on public.court_slots for all to authenticated using(exists(select 1 from public.courts c where c.id=court_id and private.manages(c.club_id))) with check(exists(select 1 from public.courts c where c.id=court_id and private.manages(c.club_id)));
create policy rules_manager on public.availability_rules for all to authenticated using(exists(select 1 from public.courts c where c.id=court_id and private.manages(c.club_id))) with check(exists(select 1 from public.courts c where c.id=court_id and private.manages(c.club_id)));
create policy published_equipment on public.equipment for select to anon,authenticated using(active and exists(select 1 from public.clubs c where c.id=club_id and c.published));
create policy equipment_manager on public.equipment for all to authenticated using(private.manages(club_id)) with check(private.manages(club_id));
create policy city_admin on public.cities for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
grant insert,update on public.cities,public.clubs,public.courts,public.availability_rules,public.court_slots,public.equipment to authenticated;
create policy own_profile on public.user_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy own_booking on public.bookings for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.booking_participants p where p.booking_id=bookings.id and p.user_id=(select auth.uid())));
create policy own_participation on public.booking_participants for select to authenticated using(user_id=(select auth.uid()));
create policy own_items on public.booking_items for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and b.user_id=(select auth.uid())) or exists(select 1 from public.booking_participants p where p.id=participant_id and p.user_id=(select auth.uid())));
create policy own_registration on public.event_registrations for select to authenticated using(user_id=(select auth.uid()));
create policy own_payment on public.payments for select to authenticated using(user_id=(select auth.uid()));
create policy own_refund on public.refunds for select to authenticated using(exists(select 1 from public.payments p where p.id=payment_id and p.user_id=(select auth.uid())));
create policy own_notification on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy public_match on public.open_matches for select to anon,authenticated using(published);
create policy public_event on public.platform_events for select to anon,authenticated using(published);
create policy event_organizer on public.platform_events for select to authenticated using(organizer_id=(select auth.uid()));
create policy own_rating on public.rating_history for select to authenticated using(user_id=(select auth.uid()));

create function public.save_my_profile(p_name text,p_skill integer,p_city uuid default null,p_avatar text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 if length(trim(p_name)) not between 2 and 100 or p_skill not between 0 and 5 then raise exception 'INVALID_PROFILE'; end if;
 if p_avatar is not null and p_avatar not like auth.uid()::text||'/%' then raise exception 'INVALID_AVATAR'; end if;
 select player_id into pid from public.user_profiles where user_id=auth.uid() for update;
 if pid is null then
 insert into public.players(first_name,last_name) values(split_part(trim(p_name),' ',1),coalesce(nullif(trim(substr(trim(p_name),length(split_part(trim(p_name),' ',1))+1)),''),'بازیکن')) returning id into pid;
 end if;
 insert into public.user_profiles(user_id,player_id,display_name,skill_level,city_id,avatar_path) values(auth.uid(),pid,trim(p_name),p_skill,p_city,p_avatar)
 on conflict(user_id) do update set display_name=excluded.display_name,skill_level=excluded.skill_level,city_id=excluded.city_id,avatar_path=excluded.avatar_path,
 skill_verified=case when public.user_profiles.skill_level=excluded.skill_level then public.user_profiles.skill_verified else false end;
 return pid;
end; $$;

-- Serialize timetable writes on the court. Slots never overlap, even when inserted concurrently.
create function private.check_slot() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.courts where id=NEW.court_id for update;
 if TG_OP='UPDATE' and exists(select 1 from public.bookings where slot_id=OLD.id) and
 (NEW.starts_at<>OLD.starts_at or NEW.ends_at<>OLD.ends_at or NEW.court_id<>OLD.court_id or NEW.court_price<>OLD.court_price) then raise exception 'SLOT_HAS_BOOKINGS'; end if;
 if exists(select 1 from public.court_slots s where s.court_id=NEW.court_id and s.id<>NEW.id and s.starts_at<NEW.ends_at and s.ends_at>NEW.starts_at) then raise exception 'SLOT_OVERLAP'; end if;
 return NEW;
end; $$;
create trigger no_overlapping_slots before insert or update on public.court_slots for each row execute function private.check_slot();
create function public.generate_court_slots(p_court uuid,p_date date) returns integer language plpgsql security definer set search_path='' as $$
declare c public.courts; r public.availability_rules; minute integer; amount integer:=0; begin
 select * into c from public.courts where id=p_court for update;
 if not found or not private.manages(c.club_id) then raise exception 'ADMIN_REQUIRED'; end if;
 for r in select * from public.availability_rules where court_id=p_court and weekday=extract(dow from p_date) loop
 minute:=r.start_minute;
 while minute+r.slot_minutes<=r.end_minute loop
 if not exists(select 1 from public.court_slots where court_id=p_court and starts_at=(p_date+make_interval(mins=>minute)) at time zone 'Asia/Tehran') then
 insert into public.court_slots(court_id,starts_at,ends_at,court_price) values(p_court,(p_date+make_interval(mins=>minute)) at time zone 'Asia/Tehran',(p_date+make_interval(mins=>minute+r.slot_minutes)) at time zone 'Asia/Tehran',r.price);
 amount:=amount+1;
 end if; minute:=minute+r.slot_minutes;
 end loop; end loop; return amount;
end; $$;

-- Safe discovery RPC projects public booking state only; never exposes owner IDs, references or payments.
create function public.discover_slots(p_court uuid,p_from timestamptz,p_to timestamptz) returns table(id uuid,starts_at timestamptz,ends_at timestamptz,court_price bigint,available boolean) language sql stable security definer set search_path='' as $$
 select s.id,s.starts_at,s.ends_at,s.court_price,not exists(select 1 from public.bookings b where b.slot_id=s.id and b.status not in ('cancelled','expired'))
 from public.court_slots s join public.courts c on c.id=s.court_id join public.clubs cl on cl.id=c.club_id
 where c.id=p_court and c.active and cl.published and s.published and s.starts_at>=greatest(p_from,now()) and s.starts_at<p_to
 order by s.starts_at limit 500;
$$;

-- No mutation/finance function inherits PUBLIC execute privileges.
revoke all on all functions in schema private from public;
revoke all on function public.save_my_profile(text,integer,uuid,text),public.generate_court_slots(uuid,date),public.discover_slots(uuid,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function private.manages(uuid) to authenticated;
grant execute on function public.save_my_profile(text,integer,uuid,text),public.generate_court_slots(uuid,date) to authenticated;
grant execute on function public.discover_slots(uuid,timestamptz,timestamptz) to anon,authenticated;
commit;
