begin;
-- One short transaction lock serializes platform inventory, seats and financial state.
-- External HTTP requests are ALWAYS outside these transactions.
create function private.platform_lock() returns void language sql set search_path='' as $$ select pg_advisory_xact_lock(721771); $$;
create function private.add_equipment(p_booking uuid,p_participant uuid,p_items jsonb,p_shared boolean) returns bigint language plpgsql security definer set search_path='' as $$
declare b public.bookings; s public.court_slots; club uuid; item record; e public.equipment; used integer; total bigint:=0;
begin
 select * into b from public.bookings where id=p_booking; select * into s from public.court_slots where id=b.slot_id;
 select club_id into club from public.courts where id=s.court_id;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>20 then raise exception 'INVALID_EQUIPMENT'; end if;
 if (select count(*) from jsonb_to_recordset(p_items) as x(id uuid,quantity integer))<>(select count(distinct x.id) from jsonb_to_recordset(p_items) as x(id uuid,quantity integer)) then raise exception 'INVALID_EQUIPMENT'; end if;
 for item in select * from jsonb_to_recordset(p_items) as x(id uuid,quantity integer) loop
 select * into e from public.equipment where id=item.id and club_id=club and active;
 if not found or item.quantity is null or item.quantity not between 1 and 20 then raise exception 'INVALID_EQUIPMENT'; end if;
 if (e.kind='shared')<>p_shared then continue; end if;
 select coalesce(sum(bi.quantity),0) into used from public.booking_items bi join public.bookings ob on ob.id=bi.booking_id join public.court_slots os on os.id=ob.slot_id
 left join public.booking_participants op on op.id=bi.participant_id
 where bi.equipment_id=e.id and ob.status not in ('cancelled','expired','completed') and (op.id is null or op.status in ('interested','reserved','paid','no_show')) and os.starts_at<s.ends_at and os.ends_at>s.starts_at;
 if used+item.quantity>e.stock then raise exception 'EQUIPMENT_UNAVAILABLE'; end if;
 insert into public.booking_items(booking_id,participant_id,equipment_id,quantity,unit_price) values(b.id,p_participant,e.id,item.quantity,e.price);
 total:=total+item.quantity*e.price;
 end loop; return total;
end; $$;
create function private.notify(p_user uuid,p_title text,p_body text,p_key text,p_href text default '/account') returns void language sql security definer set search_path='' as $$
 insert into public.notifications(user_id,title,body,dedupe_key,href) values(p_user,p_title,p_body,p_key,p_href) on conflict(dedupe_key) do nothing;
$$;
create function private.queue_refund(p_payment uuid,p_reason text,p_percent integer default 100) returns void language plpgsql security definer set search_path='' as $$
declare p public.payments; begin
 select * into p from public.payments where id=p_payment and status='paid'; if not found then return; end if;
 if p_percent not between 1 and 100 then return; end if;
 insert into public.refunds(payment_id,amount,reason) values(p.id,p.amount*p_percent/100,p_reason) on conflict(payment_id) do nothing;
 update public.booking_participants set status='refund_pending' where id=p.participant_id and status='paid' and not exists(select 1 from public.payments other where other.participant_id=p.participant_id and other.id<>p.id and other.status='paid' and not exists(select 1 from public.refunds rf where rf.payment_id=other.id));
 update public.event_registrations set status='refund_pending' where id=p.registration_id and status='paid' and not exists(select 1 from public.payments other where other.registration_id=p.registration_id and other.id<>p.id and other.status='paid' and not exists(select 1 from public.refunds rf where rf.payment_id=other.id));
 perform private.notify(p.user_id,'درخواست استرداد ثبت شد','استرداد پس از انجام و ثبت مرجع بانکی قطعی می‌شود.','refund:'||p.id);
end; $$;
create function private.cancel_inventory(p_booking uuid,p_reason text,p_percent integer default 100) returns void language plpgsql security definer set search_path='' as $$
declare p record; begin
 update public.bookings set status='cancelled',updated_at=now() where id=p_booking and status not in ('cancelled','expired','completed');
 if not found then return; end if;
 for p in select pay.id,pay.user_id from public.payments pay join public.booking_participants bp on bp.id=pay.participant_id where bp.booking_id=p_booking and pay.status='paid' loop
 perform private.queue_refund(p.id,p_reason,p_percent);
 end loop;
 update public.booking_participants set status='withdrawn',lock_expires_at=null where booking_id=p_booking and status in ('reserved','interested');
 insert into public.provider_attempts(booking_id,operation,idempotency_key) select id,'cancel',id::text||':cancel' from public.bookings where id=p_booking and mode='EXTERNAL_AUTOMATED' and (external_reference is not null or external_hold_reference is not null) on conflict(idempotency_key) do nothing;
end; $$;

create function public.request_booking(p_slot uuid,p_kind text,p_key uuid,p_title text default '',p_description text default '',p_min_skill integer default null,p_max_skill integer default null,p_equipment jsonb default '[]') returns uuid language plpgsql security definer set search_path='' as $$
declare b public.bookings; s public.court_slots; c public.courts; cl public.clubs; profile public.user_profiles; pid uuid; shared bigint; personal bigint;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform private.platform_lock();
 select * into b from public.bookings where user_id=auth.uid() and idempotency_key=p_key; if found then return b.id; end if;
 select * into profile from public.user_profiles where user_id=auth.uid(); if not found then raise exception 'PROFILE_REQUIRED'; end if;
 if p_kind not in ('private','open') or p_key is null then raise exception 'INVALID_REQUEST'; end if;
 select * into s from public.court_slots where id=p_slot and published for update; if not found or s.starts_at<=now() then raise exception 'SLOT_UNAVAILABLE'; end if;
 select * into c from public.courts where id=s.court_id and active; select * into cl from public.clubs where id=c.club_id and published;
 if cl.id is null then raise exception 'SLOT_UNAVAILABLE'; end if;
 -- Automated providers need an explicit configured adapter, not a fabricated calendar.
 if cl.booking_mode='EXTERNAL_AUTOMATED' and cl.provider_key is null then raise exception 'PROVIDER_REQUIRES_LIVE_QUOTE'; end if;
 if exists(select 1 from public.bookings where slot_id=s.id and status not in ('cancelled','expired')) then raise exception 'SLOT_UNAVAILABLE'; end if;
 if p_kind='open' and (s.starts_at<=now()+make_interval(hours=>cl.completion_cutoff_hours) or length(trim(p_title)) not between 2 and 100 or length(p_description)>2000) then raise exception 'INVALID_MATCH'; end if;
 if p_kind='open' and ((p_min_skill is null)<>(p_max_skill is null) or p_min_skill>p_max_skill or p_min_skill<0 or p_max_skill>5 or profile.skill_level not between p_min_skill and p_max_skill) then raise exception 'SKILL_MISMATCH'; end if;
 insert into public.bookings(user_id,slot_id,kind,mode,court_price,platform_fee,cancellation_snapshot,idempotency_key,request_expires_at)
 values(auth.uid(),s.id,p_kind,cl.booking_mode,s.court_price,c.platform_fee,cl.cancellation_policy,p_key,least(now()+interval '24 hours',s.starts_at-case when p_kind='open' then make_interval(hours=>cl.completion_cutoff_hours) else interval '0 hours' end)) returning * into b;
 insert into public.booking_participants(booking_id,user_id,seat,court_share,fee,status)
 values(b.id,auth.uid(),1,case when p_kind='private' then b.court_price else b.court_price/4+b.court_price%4 end,b.platform_fee,'interested') returning id into pid;
 shared:=private.add_equipment(b.id,null,p_equipment,true); personal:=private.add_equipment(b.id,pid,p_equipment,false);
 update public.bookings set shared_price=shared where id=b.id;
 update public.booking_participants set personal_price=personal,shared_share=case when p_kind='private' then shared else shared/4+shared%4 end where id=pid;
 if p_kind='open' then insert into public.open_matches(booking_id,organizer_id,title,description,min_skill,max_skill,cutoff_at) values(b.id,auth.uid(),trim(p_title),p_description,p_min_skill,p_max_skill,s.starts_at-make_interval(hours=>cl.completion_cutoff_hours)); end if;
 if cl.booking_mode='EXTERNAL_AUTOMATED' then insert into public.provider_attempts(booking_id,operation,idempotency_key) values(b.id,'quote_hold',b.id::text||':quote_hold'); end if;
 perform private.notify(auth.uid(),'درخواست برای باشگاه ثبت شد','تا تأیید باشگاه، زمین قطعی نیست و پرداخت فعال نمی‌شود.','booking:'||b.id);
 return b.id;
end; $$;
create function public.approve_booking(p_booking uuid,p_reference text,p_hold_until timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; s public.court_slots; deadline timestamptz; begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if; perform private.platform_lock();
 select * into b from public.bookings where id=p_booking for update; select * into s from public.court_slots where id=b.slot_id;
 if b.status<>'pending_club' or b.mode<>'MANUAL_APPROVAL' or b.request_expires_at<=now() then raise exception 'INVALID_STATUS'; end if;
 deadline:=least(now()+interval '60 minutes',p_hold_until,s.starts_at,coalesce((select cutoff_at from public.open_matches where booking_id=b.id),s.starts_at));
 if p_hold_until is null or deadline<=now() or length(trim(p_reference)) not between 2 and 200 then raise exception 'INVALID_HOLD'; end if;
 update public.bookings set status=case when kind='private' then 'awaiting_payment' else 'collecting' end,club_reference=trim(p_reference),hold_expires_at=p_hold_until,payment_deadline=deadline,updated_at=now() where id=b.id;
 update public.booking_participants set status='reserved',lock_expires_at=deadline where booking_id=b.id and status='interested';
 perform private.notify(b.user_id,'باشگاه سانس را نگه داشت','مهلت پرداخت حداکثر ۶۰ دقیقه و محدود به اعتبار نگه‌داشت باشگاه است.','hold:'||b.id);
end; $$;
create function public.join_open_match(p_match uuid,p_equipment jsonb default '[]') returns uuid language plpgsql security definer set search_path='' as $$
declare m public.open_matches; b public.bookings; profile public.user_profiles; pid uuid; free_seat integer; cost bigint;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if; perform private.platform_lock();
 select * into m from public.open_matches where id=p_match and published; if not found then raise exception 'NOT_FOUND'; end if;
 select * into b from public.bookings where id=m.booking_id for update;
 if m.cutoff_at<=now() or b.status not in ('pending_club','collecting') or b.request_expires_at<=now() and b.status='pending_club' then raise exception 'MATCH_CLOSED'; end if;
 if b.status='collecting' and (b.hold_expires_at is null or b.hold_expires_at<=now()) then raise exception 'HOLD_EXPIRED'; end if;
 select * into profile from public.user_profiles where user_id=auth.uid(); if not found then raise exception 'PROFILE_REQUIRED'; end if;
 if m.min_skill is not null and profile.skill_level not between m.min_skill and m.max_skill then raise exception 'SKILL_MISMATCH'; end if;
 select id into pid from public.booking_participants where booking_id=b.id and user_id=auth.uid() and status in ('reserved','paid','interested'); if found then return pid; end if;
 if exists(select 1 from public.payments pay join public.booking_participants bp on bp.id=pay.participant_id where bp.booking_id=b.id and bp.user_id=auth.uid() and pay.status in ('pending','paid','needs_attention')) then raise exception 'ADMIN_REVIEW_REQUIRED'; end if;
 select n into free_seat from generate_series(1,4) n where not exists(select 1 from public.booking_participants where booking_id=b.id and seat=n and status in ('interested','reserved','paid','no_show')) order by n limit 1;
 if free_seat is null then raise exception 'MATCH_FULL'; end if;
 insert into public.booking_participants(booking_id,user_id,seat,court_share,shared_share,fee,status,lock_expires_at)
 values(b.id,auth.uid(),free_seat,b.court_price/4+case when free_seat=1 then b.court_price%4 else 0 end,b.shared_price/4+case when free_seat=1 then b.shared_price%4 else 0 end,b.platform_fee,case when b.status='pending_club' then 'interested' else 'reserved' end,case when b.status='collecting' then least(now()+interval '10 minutes',b.hold_expires_at,m.cutoff_at) end)
 on conflict(booking_id,user_id) do update set seat=excluded.seat,status=excluded.status,lock_expires_at=excluded.lock_expires_at,court_share=excluded.court_share,shared_share=excluded.shared_share,fee=excluded.fee,personal_price=0 returning id into pid;
 delete from public.booking_items where participant_id=pid;
 cost:=private.add_equipment(b.id,pid,p_equipment,false); update public.booking_participants set personal_price=cost where id=pid;
 return pid;
end; $$;
create function public.discover_matches(p_id uuid default null,p_limit integer default 24,p_offset integer default 0,p_skill integer default null,p_city uuid default null,p_date date default null) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(row_to_json(q)),'[]') from (
 select m.*,cl.name club_name,cl.slug club_slug,ct.name city_name,c.name court_name,s.starts_at,s.ends_at,b.status,
 b.court_price/4+b.shared_price/4+b.platform_fee+case when b.court_price%4+b.shared_price%4>0 then b.court_price%4+b.shared_price%4 else 0 end price,b.hold_expires_at,
 (select count(*) from public.booking_participants p where p.booking_id=b.id and p.status in ('interested','reserved','paid','no_show')) participants,
 (select count(*) from public.booking_participants p where p.booking_id=b.id and p.status='paid') paid,
 (select coalesce(jsonb_agg(jsonb_build_object('name',u.display_name,'skill',u.skill_level,'verified',u.skill_verified,'seat',p.seat,'paid',p.status='paid') order by p.seat),'[]') from public.booking_participants p join public.user_profiles u on u.user_id=p.user_id where p.booking_id=b.id and p.status in ('interested','reserved','paid','no_show')) roster
 from public.open_matches m join public.bookings b on b.id=m.booking_id join public.court_slots s on s.id=b.slot_id join public.courts c on c.id=s.court_id join public.clubs cl on cl.id=c.club_id join public.cities ct on ct.id=cl.city_id
 where m.published and cl.published and (p_id is not null or (m.cutoff_at>now() and b.status in ('pending_club','collecting','confirmed'))) and (p_id is null or m.id=p_id)
 and (p_skill is null or m.min_skill is null or p_skill between m.min_skill and m.max_skill)
 and (p_city is null or cl.city_id=p_city) and (p_date is null or (s.starts_at at time zone 'Asia/Tehran')::date=p_date)
 order by s.starts_at limit least(greatest(p_limit,1),100) offset greatest(p_offset,0)
 ) q;
$$;
create function public.start_checkout(p_participant uuid default null,p_registration uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare bp public.booking_participants; b public.bookings; er public.event_registrations; ev public.platform_events; p public.payments; amount bigint; deadline timestamptz;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if; perform private.platform_lock();
 if (p_participant is null)=(p_registration is null) then raise exception 'INVALID_REQUEST'; end if;
 if p_participant is not null then
 select * into bp from public.booking_participants where id=p_participant and user_id=auth.uid();
 select * into b from public.bookings where id=bp.booking_id for update;
 if bp.status<>'reserved' or b.status not in ('awaiting_payment','collecting') then raise exception 'NOT_PAYABLE'; end if;
 deadline:=least(bp.lock_expires_at,b.hold_expires_at,coalesce((select cutoff_at from public.open_matches where booking_id=b.id),b.payment_deadline));
 amount:=bp.court_share+bp.shared_share+bp.personal_price+bp.fee;
 else
 select * into er from public.event_registrations where id=p_registration and user_id=auth.uid(); select * into ev from public.platform_events where id=er.event_id;
 if er.status<>'reserved' or ev.status<>'registration' then raise exception 'NOT_PAYABLE'; end if;
 deadline:=least(er.lock_expires_at,ev.registration_deadline); amount:=er.amount;
 end if;
 if amount is null or amount<=0 or deadline is null or deadline<=now() then raise exception 'PAYMENT_EXPIRED'; end if;
 select * into p from public.payments where (participant_id=p_participant or registration_id=p_registration) and status in ('created','pending','needs_attention') and reference is null;
 if found then
 if p.amount<>amount or p.expires_at<=now() or p.status='paid' then raise exception 'PAYMENT_CONFLICT'; end if;
 return p.id;
 end if;
 insert into public.payments(user_id,participant_id,registration_id,amount,request_key,expires_at) values(auth.uid(),p_participant,p_registration,amount,gen_random_uuid(),deadline) returning id into p.id;
 return p.id;
end; $$;
create function public.attach_payment_authority(p_payment uuid,p_authority text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.platform_lock();
 update public.payments set authority=p_authority,status='pending' where id=p_payment and status in ('created','needs_attention') and authority is null;
 if not found and not exists(select 1 from public.payments where id=p_payment and authority=p_authority) then raise exception 'PAYMENT_CONFLICT'; end if;
end; $$;
create function public.claim_payment_request(p_payment uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.payments set status='needs_attention' where id=p_payment and status='created' and authority is null and expires_at>now();
 return found;
end; $$;
revoke all on function public.claim_payment_request(uuid) from public,anon,authenticated;
grant execute on function public.claim_payment_request(uuid) to service_role;
create function private.finalize_paid_booking(p_booking uuid) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; required integer; paid integer; begin
 select * into b from public.bookings where id=p_booking for update;
 if b.status in ('confirmed','completed','booking_in_progress') then return; end if;
 required:=case when b.kind='private' then 1 else 4 end;
 select count(*) into paid from public.booking_participants where booking_id=b.id and status='paid'; if paid<required then return; end if;
 if b.mode='MANUAL_APPROVAL' and b.club_reference is not null and b.hold_expires_at>now() then
 update public.bookings set status='confirmed',updated_at=now() where id=b.id;
 perform private.notify(b.user_id,'رزرو قطعی شد','تأیید باشگاه و پرداخت‌های لازم ثبت شده‌اند.','confirmed:'||b.id);
 else
 update public.bookings set status='booking_in_progress',updated_at=now() where id=b.id;
 insert into public.provider_attempts(booking_id,operation,idempotency_key) values(b.id,'confirm',b.id::text||':confirm') on conflict(idempotency_key) do nothing;
 end if;
end; $$;
create function public.settle_payment(p_payment uuid,p_reference text,p_amount bigint) returns void language plpgsql security definer set search_path='' as $$
declare p public.payments; bp public.booking_participants; b public.bookings; er public.event_registrations; ev public.platform_events; valid boolean:=false; active_attempt boolean;
begin
 perform private.platform_lock(); select * into p from public.payments where id=p_payment for update;
 if not found or p.amount<>p_amount or p.authority is null or length(trim(p_reference))<1 then raise exception 'PAYMENT_MISMATCH'; end if;
 if p.status='paid' then if p.reference<>p_reference then raise exception 'PAYMENT_MISMATCH'; end if; return; end if;
 if p.status='needs_attention' and p.reference=p_reference then return; end if;
 active_attempt:=p.status in ('pending','needs_attention');
 update public.payments set status='paid',reference=p_reference,verified_at=now() where id=p.id;
 if p.participant_id is not null then
 select * into bp from public.booking_participants where id=p.participant_id; select * into b from public.bookings where id=bp.booking_id for update;
 valid:=active_attempt and p.amount=bp.court_share+bp.shared_share+bp.personal_price+bp.fee and bp.status='reserved' and bp.lock_expires_at>now() and b.status in ('awaiting_payment','collecting') and b.hold_expires_at>now() and p.expires_at>now() and not exists(select 1 from public.open_matches where booking_id=b.id and cutoff_at<=now());
 if valid then update public.booking_participants set status='paid',lock_expires_at=null where id=bp.id; perform private.finalize_paid_booking(b.id); end if;
 else
 select * into er from public.event_registrations where id=p.registration_id; select * into ev from public.platform_events where id=er.event_id for update;
 valid:=active_attempt and p.amount=er.amount and er.status='reserved' and er.lock_expires_at>now() and ev.registration_deadline>now() and ev.status='registration' and p.expires_at>now();
 if valid then update public.event_registrations set status='paid',lock_expires_at=null where id=er.id; end if;
 end if;
 if not valid then
 perform private.queue_refund(p.id,'پرداخت پس از انقضای مهلت یا از دست رفتن جایگاه');
 update public.payments set status='needs_attention' where id=p.id;
 end if;
end; $$;
create function public.fail_payment(p_payment uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform private.platform_lock(); update public.payments set status='failed' where id=p_payment and status in ('created','pending'); end; $$;
create function public.cancel_booking(p_booking uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; starts timestamptz; percent integer; begin
 perform private.platform_lock(); select * into b from public.bookings where id=p_booking for update;
 if not found or (b.user_id is distinct from auth.uid() and not public.is_admin()) then raise exception 'FORBIDDEN'; end if;
 if b.status in ('completed','cancelled','expired') then return; end if;
 if b.kind='open' and not public.is_admin() and exists(select 1 from public.booking_participants where booking_id=b.id and status='paid' and user_id<>auth.uid()) then raise exception 'ADMIN_REVIEW_REQUIRED'; end if;
 select starts_at into starts from public.court_slots where id=b.slot_id;
 percent:=case when public.is_admin() or b.status in ('pending_club','awaiting_payment','collecting') or starts-now()>=make_interval(hours=>coalesce((b.cancellation_snapshot->>'full_refund_hours')::integer,24)) then 100 else coalesce((b.cancellation_snapshot->>'late_refund_percent')::integer,0) end;
 if percent not between 0 and 100 then raise exception 'INVALID_POLICY'; end if;
 perform private.cancel_inventory(b.id,coalesce(nullif(trim(p_reason),''),'لغو رزرو'),percent);
end; $$;
create function public.withdraw_match(p_match uuid) returns void language plpgsql security definer set search_path='' as $$
declare m public.open_matches; b public.bookings; p public.booking_participants; pay record; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if; perform private.platform_lock();
 select * into m from public.open_matches where id=p_match; select * into b from public.bookings where id=m.booking_id for update;
 select * into p from public.booking_participants where booking_id=b.id and user_id=auth.uid();
 if not found then raise exception 'NOT_FOUND'; end if;
 if b.status='confirmed' or m.cutoff_at<=now() or p.user_id=b.user_id then raise exception 'ADMIN_REVIEW_REQUIRED'; end if;
 for pay in select id from public.payments where participant_id=p.id and status='paid' loop perform private.queue_refund(pay.id,'انصراف پیش از مهلت تکمیل بازی'); end loop;
 update public.booking_participants set status=case when status='refund_pending' then status else 'withdrawn' end,lock_expires_at=null where id=p.id;
end; $$;
create function public.mark_notifications_read() returns void language sql security definer set search_path='' as $$ update public.notifications set read_at=now() where user_id=auth.uid() and read_at is null; $$;

-- Explicit execution matrix. Only a trusted server may assert financial/provider outcomes.
revoke all on all functions in schema private from public;
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('request_booking','approve_booking','join_open_match','discover_matches','start_checkout','attach_payment_authority','settle_payment','fail_payment','cancel_booking','withdraw_match','mark_notifications_read') loop execute format('revoke all on function %s from public,anon,authenticated',f.signature); end loop;
end $$;
grant execute on function public.request_booking(uuid,text,uuid,text,text,integer,integer,jsonb),public.approve_booking(uuid,text,timestamptz),public.join_open_match(uuid,jsonb),public.start_checkout(uuid,uuid),public.cancel_booking(uuid,text),public.withdraw_match(uuid),public.mark_notifications_read() to authenticated;
grant execute on function public.discover_matches(uuid,integer,integer,integer,uuid,date) to anon,authenticated;
-- service_role exists in Supabase; local tests create the same role.
grant execute on function public.attach_payment_authority(uuid,text),public.settle_payment(uuid,text,bigint),public.fail_payment(uuid) to service_role;
grant usage on schema public to service_role;
grant select on public.payments,public.bookings,public.booking_participants,public.court_slots,public.courts,public.clubs,public.provider_attempts,public.event_registrations,public.platform_events,public.refunds to service_role;
commit;
