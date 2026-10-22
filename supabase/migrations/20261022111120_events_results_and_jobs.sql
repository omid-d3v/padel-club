begin;
create function public.my_booking_locations() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('booking_id',b.id,'club',cl.name,'court',c.name,'address',cl.address,'starts_at',s.starts_at,'ends_at',s.ends_at)),'[]')
 from public.bookings b join public.court_slots s on s.id=b.slot_id join public.courts c on c.id=s.court_id join public.clubs cl on cl.id=c.club_id
 where b.user_id=auth.uid() or exists(select 1 from public.booking_participants bp where bp.booking_id=b.id and bp.user_id=auth.uid());
$$;
revoke all on function public.my_booking_locations() from public,anon,authenticated;
grant execute on function public.my_booking_locations() to authenticated;
create table public.event_placements (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.platform_events(id),
 registration_id uuid not null unique references public.event_registrations(id), rank integer not null check(rank between 1 and 128),
 points integer not null check(points between 0 and 1000000), unique(event_id,rank)
);
alter table public.event_placements enable row level security;
revoke all on public.event_placements from anon,authenticated;
grant select on public.event_placements to authenticated;
create policy placement_admin on public.event_placements for select to authenticated using((select public.is_admin()));
create trigger audit_event_placement after insert or update on public.event_placements for each row execute function private.audit_change();
create trigger audit_profile_change after insert or update on public.user_profiles for each row execute function private.audit_change();
create function public.save_event_placement(p_registration uuid,p_rank integer,p_points integer) returns void language plpgsql security definer set search_path='' as $$
declare r public.event_registrations; e public.platform_events; begin
 perform private.platform_lock();select * into r from public.event_registrations where id=p_registration;select * into e from public.platform_events where id=r.event_id;
 if e.id is null or (not public.is_admin() and e.organizer_id is distinct from auth.uid()) then raise exception 'FORBIDDEN'; end if;
 if r.status<>'paid' or e.status<>'active' or e.kind<>'tournament' or p_rank>e.capacity then raise exception 'INVALID_RESULT'; end if;
 insert into public.event_placements(event_id,registration_id,rank,points) values(e.id,r.id,p_rank,p_points) on conflict(registration_id) do update set rank=excluded.rank,points=excluded.points;
end; $$;
create function public.event_result_table(p_event uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('name',u.display_name,'rank',p.rank,'points',p.points) order by p.rank),'[]') from public.event_placements p join public.event_registrations r on r.id=p.registration_id join public.user_profiles u on u.user_id=r.user_id
 where p.event_id=p_event and exists(select 1 from public.platform_events e where e.id=p_event and e.published);
$$;
revoke all on function public.save_event_placement(uuid,integer,integer),public.event_result_table(uuid) from public,anon,authenticated;
grant execute on function public.save_event_placement(uuid,integer,integer) to authenticated;
grant execute on function public.event_result_table(uuid) to anon,authenticated;
grant insert,update on public.platform_events to authenticated;
create policy event_admin_write on public.platform_events for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
grant update(skill_verified) on public.user_profiles to authenticated;
create policy admin_verify_profile on public.user_profiles for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create function public.register_event(p_event uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare e public.platform_events; reg public.event_registrations; filled integer; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if; perform private.platform_lock();
 select * into e from public.platform_events where id=p_event and published for update;
 if not found or e.status<>'registration' or e.registration_deadline<=now() then raise exception 'EVENT_CLOSED'; end if;
 if not exists(select 1 from public.user_profiles where user_id=auth.uid() and player_id is not null) then raise exception 'PROFILE_REQUIRED'; end if;
 if (select count(*) from public.event_courts ec join public.bookings b on b.id=ec.booking_id where ec.event_id=e.id and b.status='confirmed')<(case when e.kind='americano' then 2 else 1 end) then raise exception 'EVENT_COURTS_UNSECURED'; end if;
 select * into reg from public.event_registrations where event_id=e.id and user_id=auth.uid();
 if found and (reg.status='paid' or reg.status='reserved' and reg.lock_expires_at>now()) then return reg.id; end if;
 if exists(select 1 from public.payments where registration_id=reg.id and status in ('pending','paid','needs_attention')) then raise exception 'ADMIN_REVIEW_REQUIRED'; end if;
 select count(*) into filled from public.event_registrations where event_id=e.id and (status='paid' or status='reserved' and lock_expires_at>now());
 if filled>=e.capacity then raise exception 'EVENT_FULL'; end if;
 insert into public.event_registrations(event_id,user_id,status,amount,lock_expires_at) values(e.id,auth.uid(),case when e.entry_fee=0 then 'paid' else 'reserved' end,e.entry_fee,case when e.entry_fee>0 then least(now()+interval '10 minutes',e.registration_deadline) end)
 on conflict(event_id,user_id) do update set status=excluded.status,amount=excluded.amount,lock_expires_at=excluded.lock_expires_at returning id into reg.id;
 return reg.id;
end; $$;
create function public.event_roster(p_event uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('name',p.display_name,'paid',r.status='paid','player_id',p.player_id) order by r.created_at),'[]') from public.event_registrations r join public.user_profiles p on p.user_id=r.user_id
 where r.event_id=p_event and (r.status='paid' or r.status='reserved' and r.lock_expires_at>now()) and exists(select 1 from public.platform_events e where e.id=p_event and (e.published or e.organizer_id=auth.uid() or public.is_admin()));
$$;
create function public.secure_event_courts(p_event uuid,p_slots uuid[],p_reference text) returns void language plpgsql security definer set search_path='' as $$
declare e public.platform_events; s public.court_slots; bid uuid; cid uuid; begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if; perform private.platform_lock();
 select * into e from public.platform_events where id=p_event for update;
 if not found or e.status<>'registration' or cardinality(p_slots)<>2 or p_slots[1]=p_slots[2] or length(trim(p_reference))<2 then raise exception 'INVALID_REQUEST'; end if;
 if exists(select 1 from public.event_courts where event_id=e.id) then raise exception 'COURTS_ALREADY_SECURED'; end if;
 for s in select * from public.court_slots where id=any(p_slots) order by id for update loop
 select club_id into cid from public.courts where id=s.court_id;
 if cid<>e.club_id or s.starts_at>e.starts_at or s.ends_at<=e.starts_at or exists(select 1 from public.bookings where slot_id=s.id and status not in ('cancelled','expired')) then raise exception 'SLOT_UNAVAILABLE'; end if;
 insert into public.bookings(user_id,slot_id,kind,status,mode,court_price,platform_fee,cancellation_snapshot,club_reference,idempotency_key)
 values(auth.uid(),s.id,'event','confirmed','MANUAL_APPROVAL',s.court_price,0,e.cancellation_policy,p_reference,gen_random_uuid()) returning id into bid;
 insert into public.event_courts(event_id,slot_id,booking_id) values(e.id,s.id,bid);
 end loop;
 if (select count(*) from public.event_courts where event_id=e.id)<>2 or (select count(distinct slot_row.court_id) from public.event_courts ec join public.court_slots slot_row on slot_row.id=ec.slot_id where ec.event_id=e.id)<>2 then raise exception 'TWO_COURTS_REQUIRED'; end if;
end; $$;
create function public.activate_event(p_event uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare e public.platform_events; tid uuid; rid uuid; mid uuid; ids uuid[]; i integer; c integer; idx integer;
 schedule integer[][]:=array[[1,8,2,7],[3,4,5,6],[1,2,3,6],[5,4,7,8],[3,5,4,6],[1,7,8,2],[2,6,5,7],[4,8,3,1],[7,4,6,1],[5,8,3,2],[3,8,2,5],[1,4,6,7],[5,1,4,2],[8,6,7,3]];
begin
 perform private.platform_lock(); select * into e from public.platform_events where id=p_event for update;
 if not found or (not public.is_admin() and e.organizer_id is distinct from auth.uid()) then raise exception 'FORBIDDEN'; end if;
 if e.status='active' then return e.tournament_id; end if;
 if e.status<>'registration' then raise exception 'EVENT_CLOSED'; end if;
 if e.kind='americano' then
 if (select count(*) from public.event_registrations where event_id=e.id and status='paid')<>8 then raise exception 'EIGHT_PAID_PLAYERS_REQUIRED'; end if;
 if (select count(*) from public.event_courts ec join public.bookings b on b.id=ec.booking_id where ec.event_id=e.id and b.status='confirmed')<>2 then raise exception 'EVENT_COURTS_UNSECURED'; end if;
 select array_agg(p.player_id order by random()) into ids from public.event_registrations r join public.user_profiles p on p.user_id=r.user_id where r.event_id=e.id and r.status='paid';
 if cardinality(ids)<>8 or array_position(ids,null) is not null then raise exception 'PROFILE_REQUIRED'; end if;
 insert into public.tournaments(title,date,status) values(e.title,(e.starts_at at time zone 'Asia/Tehran')::date,'active') returning id into tid;
 for i in 1..8 loop
 insert into public.tournament_players(tournament_id,player_id,slot) values(tid,ids[i],chr(64+i));
 insert into public.tournament_results(tournament_id,player_id,rank) values(tid,ids[i],i);
 end loop;
 for i in 1..7 loop
 insert into public.tournament_rounds(tournament_id,round_number) values(tid,i) returning id into rid;
 for c in 1..2 loop
 idx:=(i-1)*2+c;
 insert into public.matches(tournament_id,round_id,court_number,team1_player1_id,team1_player2_id,team2_player1_id,team2_player2_id) values(tid,rid,c,ids[schedule[idx][1]],ids[schedule[idx][2]],ids[schedule[idx][3]],ids[schedule[idx][4]]) returning id into mid;
 insert into public.match_sets(match_id,set_number) select mid,generate_series(1,3);
 end loop; end loop;
 end if;
 update public.platform_events set status='active',tournament_id=tid where id=e.id;
 return tid;
end; $$;
create function public.change_event_state(p_event uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare e public.platform_events; p record; begin
 perform private.platform_lock(); select * into e from public.platform_events where id=p_event for update;
 if not found or (not public.is_admin() and e.organizer_id is distinct from auth.uid()) then raise exception 'FORBIDDEN'; end if;
 if p_status='cancelled' then
 if e.status='completed' then raise exception 'EVENT_CLOSED'; end if;
 for p in select pay.id from public.payments pay join public.event_registrations r on r.id=pay.registration_id where r.event_id=e.id and pay.status='paid' loop perform private.queue_refund(p.id,'لغو رویداد'); end loop;
 for p in select booking_id from public.event_courts where event_id=e.id loop perform private.cancel_inventory(p.booking_id,'لغو رویداد'); end loop;
 elsif p_status='completed' and e.status='active' then
 if e.tournament_id is not null then perform public.finish_tournament(e.tournament_id); end if;
 if e.kind='tournament' and not exists(select 1 from public.event_placements where event_id=e.id) then raise exception 'INVALID_RESULT'; end if;
 else raise exception 'INVALID_STATUS'; end if;
 update public.platform_events set status=p_status where id=e.id;
end; $$;

-- Extend the existing scoring authorization only to the linked event's verified organizer.
-- Keep the current win-based calculation intact; never re-rank historical tournaments.
do $$ declare definition text; begin
 select pg_get_functiondef('public.recalculate_tournament_standings(uuid)'::regprocedure) into definition;
 definition:=replace(definition,'if not public.is_admin() then','if not (public.is_admin() or exists(select 1 from public.platform_events where tournament_id=p_tournament_id and organizer_id=auth.uid())) then'); execute definition;
 select pg_get_functiondef('public.save_match_round_winners(uuid,integer,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'if not public.is_admin() then','if not (public.is_admin() or exists(select 1 from public.platform_events event_row join public.matches match_row on match_row.tournament_id=event_row.tournament_id where match_row.id=p_match_id and event_row.organizer_id=auth.uid())) then'); execute definition;
 select pg_get_functiondef('public.finish_tournament(uuid)'::regprocedure) into definition;
 definition:=replace(definition,'if not public.is_admin() then','if not (public.is_admin() or exists(select 1 from public.platform_events where tournament_id=p_tournament_id and organizer_id=auth.uid())) then'); execute definition;
end $$;
create function private.can_read_tournament(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.platform_events e where e.tournament_id=p_id and (e.published or e.organizer_id=auth.uid()));
$$;
grant execute on function private.can_read_tournament(uuid) to authenticated;
create policy event_read on public.tournaments for select to authenticated using(private.can_read_tournament(id));
create policy event_read on public.tournament_rounds for select to authenticated using(private.can_read_tournament(tournament_id));
create policy event_read on public.matches for select to authenticated using(private.can_read_tournament(tournament_id));
create policy event_read on public.match_sets for select to authenticated using(exists(select 1 from public.matches m where m.id=match_id and private.can_read_tournament(m.tournament_id)));
create policy event_read on public.tournament_results for select to authenticated using(private.can_read_tournament(tournament_id));

create function public.link_historical_player(p_user uuid,p_player uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if not exists(select 1 from public.players where id=p_player) then raise exception 'NOT_FOUND'; end if;
 update public.user_profiles set player_id=p_player where user_id=p_user;
 if not found then raise exception 'PROFILE_REQUIRED'; end if;
 insert into public.audit_log(actor_id,entity,entity_id,operation,after_data) values(auth.uid(),'user_profiles',p_user::text,'LINK_HISTORY',jsonb_build_object('player_id',p_player));
end; $$;
create function public.submit_match_result(p_match uuid,p_team1 uuid[],p_team2 uuid[],p_sets1 integer,p_sets2 integer,p_competitive boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare m public.open_matches; b public.bookings; starts timestamptz; rid uuid; users uuid[]; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if; perform private.platform_lock();
 select * into m from public.open_matches where id=p_match; select * into b from public.bookings where id=m.booking_id; select ends_at into starts from public.court_slots where id=b.slot_id;
 users:=p_team1||p_team2;
 if b.status not in ('confirmed','completed') or starts>now() or cardinality(p_team1)<>2 or cardinality(p_team2)<>2 or (select count(distinct x) from unnest(users) x)<>4 or not auth.uid()=any(users) then raise exception 'INVALID_RESULT'; end if;
 if (select count(*) from public.booking_participants where booking_id=b.id and status in ('paid','no_show') and user_id=any(users))<>4 then raise exception 'INVALID_PARTICIPANTS'; end if;
 insert into public.result_submissions(match_id,submitted_by,team1_users,team2_users,team1_sets,team2_sets,competitive) values(p_match,auth.uid(),p_team1,p_team2,p_sets1,p_sets2,p_competitive) returning id into rid;
 insert into public.result_confirmations(result_id,user_id,decision) values(rid,auth.uid(),'confirm'); return rid;
end; $$;
create function public.match_result_context(p_match uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',u.display_name) order by p.seat),'[]') from public.booking_participants p join public.user_profiles u on u.user_id=p.user_id join public.open_matches m on m.booking_id=p.booking_id
 where m.id=p_match and p.status in ('paid','no_show') and exists(select 1 from public.booking_participants me where me.booking_id=p.booking_id and me.user_id=auth.uid() and me.status in ('paid','no_show'));
$$;
revoke all on function public.match_result_context(uuid) from public,anon,authenticated;
grant execute on function public.match_result_context(uuid) to authenticated;
create function public.confirm_match_result(p_result uuid,p_decision text,p_reason text default '') returns void language plpgsql security definer set search_path='' as $$
declare r public.result_submissions; begin
 perform private.platform_lock(); select * into r from public.result_submissions where id=p_result for update;
 if r.status not in ('pending','disputed') or auth.uid() is null or not auth.uid()=any(r.team1_users||r.team2_users) or p_decision not in ('confirm','dispute') then raise exception 'FORBIDDEN'; end if;
 insert into public.result_confirmations(result_id,user_id,decision,reason) values(r.id,auth.uid(),p_decision,left(p_reason,1000)) on conflict(result_id,user_id) do update set decision=excluded.decision,reason=excluded.reason;
 if exists(select 1 from public.result_confirmations where result_id=r.id and decision='dispute') then update public.result_submissions set status='disputed',version=version+1 where id=r.id;
 elsif (select count(*) from public.result_confirmations where result_id=r.id and decision='confirm')=4 then update public.result_submissions set status='accepted',version=version+1 where id=r.id;
 end if;
end; $$;
create function public.resolve_match_result(p_result uuid,p_accept boolean,p_reason text,p_rating_changes jsonb default '[]') returns void language plpgsql security definer set search_path='' as $$
declare r public.result_submissions; change record; previous integer; begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if; perform private.platform_lock();
 select * into r from public.result_submissions where id=p_result for update; if not found or length(trim(p_reason))<3 then raise exception 'INVALID_REQUEST'; end if;
 if r.status='rejected' and p_accept then raise exception 'RESULT_LOCKED'; end if;
 if not p_accept and exists(select 1 from public.rating_history where result_id=r.id) then raise exception 'RATING_RESULT_LOCKED'; end if;
 if p_accept and r.competitive then
 if not exists(select 1 from public.result_confirmations where result_id=r.id and decision='confirm' and user_id=any(r.team1_users)) or not exists(select 1 from public.result_confirmations where result_id=r.id and decision='confirm' and user_id=any(r.team2_users)) then raise exception 'BOTH_TEAMS_MUST_CONFIRM'; end if;
 if (select count(*) from public.user_profiles where user_id=any(r.team1_users||r.team2_users) and skill_verified)<>4 then raise exception 'VERIFIED_PLAYERS_REQUIRED'; end if;
 for change in select * from jsonb_to_recordset(p_rating_changes) as x(user_id uuid,rating_after integer) loop
 if not change.user_id=any(r.team1_users||r.team2_users) or change.rating_after not between 0 and 10000 then raise exception 'INVALID_RATING'; end if;
 select rating_after into previous from public.rating_history where user_id=change.user_id order by created_at desc limit 1;
 insert into public.rating_history(user_id,result_id,rating_before,rating_after,reason,actor_id) values(change.user_id,r.id,coalesce(previous,1000),change.rating_after,p_reason,auth.uid()) on conflict(user_id,result_id) do nothing;
 end loop;
 elsif jsonb_array_length(p_rating_changes)>0 then raise exception 'FRIENDLY_RESULT_NO_RATING'; end if;
 update public.result_submissions set status=case when p_accept then 'accepted' else 'rejected' end,version=version+1 where id=r.id;
end; $$;
create policy participant_result on public.result_submissions for select to authenticated using((select auth.uid())=any(team1_users||team2_users));
create policy participant_confirmation on public.result_confirmations for select to authenticated using(exists(select 1 from public.result_submissions r where r.id=result_id and (select auth.uid())=any(r.team1_users||r.team2_users)));

create function public.run_platform_jobs() returns jsonb language plpgsql security definer set search_path='' as $$
declare b record; p record; cancelled integer:=0; expired integer:=0; begin
 perform private.platform_lock();
 update public.provider_attempts set status='queued' where status='running' and next_attempt_at<=now() and attempts<5;
 update public.provider_attempts set status='unknown',last_error='RETRY_LIMIT_REQUIRES_RECONCILIATION' where status='running' and next_attempt_at<=now() and attempts>=5;
 for b in select bk.id from public.bookings bk left join public.open_matches m on m.booking_id=bk.id where bk.status in ('pending_club','awaiting_payment','collecting','booking_in_progress','needs_attention') and
 ((bk.status='pending_club' and bk.request_expires_at<=now()) or (bk.hold_expires_at<=now()) or (bk.kind='private' and bk.payment_deadline<=now()) or (bk.kind='open' and (m.cutoff_at<=now() or (bk.payment_deadline<=now() and exists(select 1 from public.booking_participants bp where bp.booking_id=bk.id and bp.user_id=bk.user_id and bp.status<>'paid'))))) order by bk.id loop
 perform private.cancel_inventory(b.id,'مهلت رزرو یا تکمیل بازی تمام شد'); cancelled:=cancelled+1;
 end loop;
 for p in select bp.id,bp.user_id from public.booking_participants bp join public.bookings bk on bk.id=bp.booking_id where bp.status='reserved' and bp.lock_expires_at<=now() and bk.kind='open' loop
 update public.booking_participants set status='withdrawn',lock_expires_at=null where id=p.id; expired:=expired+1;
 perform private.notify(p.user_id,'مهلت جایگاه تمام شد','برای دریافت جایگاه جدید، ظرفیت بازی را دوباره بررسی کنید.','seat-expired:'||p.id);
 end loop;
 update public.event_registrations set status='withdrawn',lock_expires_at=null where status='reserved' and lock_expires_at<=now();
 for b in select id from public.platform_events where status='registration' and kind='americano' and registration_deadline<=now() and (select count(*) from public.event_registrations r where r.event_id=platform_events.id and r.status='paid')<8 loop
 update public.platform_events set status='cancelled' where id=b.id;
 for p in select pay.id from public.payments pay join public.event_registrations r on r.id=pay.registration_id where r.event_id=b.id and pay.status='paid' loop perform private.queue_refund(p.id,'رویداد در مهلت ثبت‌نام تکمیل نشد'); end loop;
 for p in select booking_id from public.event_courts where event_id=b.id loop perform private.cancel_inventory(p.booking_id,'رویداد تکمیل نشد'); end loop;
 end loop;
 -- Pending gateway attempts must still be verified/reconciled: never mark an unknown payment as paid or failed on a timer.
 update public.payments set status='failed' where status='created' and expires_at<=now() and authority is null;
 update public.bookings bk set status='completed',updated_at=now() from public.court_slots s where s.id=bk.slot_id and bk.status='confirmed' and s.ends_at<=now();
 return jsonb_build_object('cancelled',cancelled,'expired_seats',expired);
end; $$;
create function public.claim_provider_attempt() returns setof public.provider_attempts language plpgsql security definer set search_path='' as $$
begin
 return query update public.provider_attempts set status='running',attempts=attempts+1,next_attempt_at=now()+interval '5 minutes' where id in (
 select id from public.provider_attempts where status='queued' and next_attempt_at<=now() order by next_attempt_at for update skip locked limit 5) returning *;
end; $$;
create function public.apply_external_quote(p_booking uuid,p_quote_id text,p_price bigint,p_valid_until timestamptz,p_hold_reference text default null) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; deadline timestamptz; required integer; begin
 perform private.platform_lock(); select * into b from public.bookings where id=p_booking for update;
 if not found or b.mode<>'EXTERNAL_AUTOMATED' or b.status<>'pending_club' then raise exception 'INVALID_STATUS'; end if;
 if exists(select 1 from public.payments pay join public.booking_participants bp on bp.id=pay.participant_id where bp.booking_id=b.id) then raise exception 'PRICE_LOCKED'; end if;
 if p_price not between 0 and 1000000000000 or p_quote_id is null or p_valid_until<=now() then raise exception 'INVALID_QUOTE'; end if;
 deadline:=least(p_valid_until,now()+interval '60 minutes',coalesce((select cutoff_at from public.open_matches where booking_id=b.id),p_valid_until));
 if deadline<=now() then raise exception 'HOLD_EXPIRED'; end if;
 update public.bookings set court_price=p_price,external_quote_id=p_quote_id,external_hold_reference=p_hold_reference,hold_expires_at=p_valid_until,payment_deadline=deadline,status=case when kind='private' then 'awaiting_payment' else 'collecting' end,updated_at=now() where id=b.id;
 required:=case when b.kind='private' then 1 else 4 end;
 update public.booking_participants set court_share=p_price/required+case when seat=1 then p_price%required else 0 end,status='reserved',lock_expires_at=deadline where booking_id=b.id and status='interested';
 perform private.notify(b.user_id,'قیمت و وضعیت باشگاه بررسی شد','قیمت نهایی و مهلت پرداخت را دوباره ببینید. بدون مرجع رزرو خارجی، زمین قطعی نیست.','external-quote:'||b.id);
end; $$;
revoke all on function public.apply_external_quote(uuid,text,bigint,timestamptz,text) from public,anon,authenticated;
grant execute on function public.apply_external_quote(uuid,text,bigint,timestamptz,text) to service_role;
create function public.record_provider_result(p_attempt uuid,p_status text,p_reference text default null,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
declare a public.provider_attempts; b public.bookings; begin
 perform private.platform_lock(); select * into a from public.provider_attempts where id=p_attempt for update;
 if a.status in ('succeeded','failed') then return; end if; if p_status not in ('succeeded','failed','unknown') then raise exception 'INVALID_STATUS'; end if;
 select * into b from public.bookings where id=a.booking_id for update;
 update public.provider_attempts set status=p_status,last_error=left(p_error,1000) where id=a.id;
 if a.operation='confirm' then
 if p_status='succeeded' and p_reference is not null and b.status in ('booking_in_progress','needs_attention') then update public.bookings set status='confirmed',external_reference=p_reference,updated_at=now() where id=b.id;
 elsif p_status='succeeded' and p_reference is not null and b.status in ('cancelled','expired') then
 update public.bookings set external_reference=p_reference where id=b.id;
 insert into public.provider_attempts(booking_id,operation,idempotency_key) values(b.id,'cancel',b.id::text||':cancel') on conflict(idempotency_key) do nothing;
 elsif p_status='failed' then perform private.cancel_inventory(b.id,'رزرو خارجی انجام نشد');
 elsif p_status='unknown' then update public.bookings set status='needs_attention' where id=b.id;
 end if;
 elsif a.operation='quote_hold' and p_status='failed' then perform private.cancel_inventory(b.id,'سانس خارجی در دسترس نیست');
 end if;
end; $$;
create function public.retry_provider_attempt(p_attempt uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 update public.provider_attempts set status='queued',next_attempt_at=now() where id=p_attempt and status='unknown' and attempts<5;
 if not found then raise exception 'INVALID_STATUS'; end if;
end; $$;
revoke all on function public.retry_provider_attempt(uuid) from public,anon,authenticated;
grant execute on function public.retry_provider_attempt(uuid) to authenticated;
create function public.record_refund(p_refund uuid,p_reference text) returns void language plpgsql security definer set search_path='' as $$
declare r public.refunds; p public.payments; begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if; perform private.platform_lock();
 select * into r from public.refunds where id=p_refund for update; if not found or length(trim(p_reference))<3 then raise exception 'INVALID_REFERENCE'; end if;
 if r.status='completed' then return; end if;
 select * into p from public.payments where id=r.payment_id;
 update public.refunds set status='completed',provider_reference=p_reference,completed_at=now(),attempts=attempts+1 where id=r.id;
 update public.booking_participants set status='refunded' where id=p.participant_id and status='refund_pending'; update public.event_registrations set status='refunded' where id=p.registration_id and status='refund_pending';
 perform private.notify(p.user_id,'استرداد انجام شد','مرجع بانکی استرداد در سوابق شما ثبت شد.','refund-completed:'||r.id);
end; $$;

do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('register_event','event_roster','secure_event_courts','activate_event','change_event_state','link_historical_player','submit_match_result','confirm_match_result','resolve_match_result','run_platform_jobs','claim_provider_attempt','record_provider_result','record_refund') loop execute format('revoke all on function %s from public,anon,authenticated',f.signature); end loop;
end $$;
revoke all on all functions in schema private from public;
grant execute on function public.register_event(uuid),public.secure_event_courts(uuid,uuid[],text),public.activate_event(uuid),public.change_event_state(uuid,text),public.link_historical_player(uuid,uuid),public.submit_match_result(uuid,uuid[],uuid[],integer,integer,boolean),public.confirm_match_result(uuid,text,text),public.resolve_match_result(uuid,boolean,text,jsonb),public.record_refund(uuid,text) to authenticated;
grant execute on function public.event_roster(uuid) to anon,authenticated;
grant execute on function public.run_platform_jobs(),public.claim_provider_attempt(),public.record_provider_result(uuid,text,text,text) to service_role;
-- Storage is configured only when the Supabase Storage schema exists (not present in unit PostgreSQL).
do $$ begin
 if to_regclass('storage.buckets') is not null then
 insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('club-images','club-images',true,3145728,array['image/jpeg','image/png','image/webp']),('avatars','avatars',true,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
 execute 'create policy platform_club_images on storage.objects for all to authenticated using (bucket_id=''club-images'' and public.is_admin()) with check (bucket_id=''club-images'' and public.is_admin())';
 execute 'create policy platform_own_avatar on storage.objects for all to authenticated using (bucket_id=''avatars'' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id=''avatars'' and (storage.foldername(name))[1]=auth.uid()::text)';
 end if;
end $$;
commit;
