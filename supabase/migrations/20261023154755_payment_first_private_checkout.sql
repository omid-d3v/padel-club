begin;
-- Existing orders retain their original financial contract. Only new manual private
-- bookings collect payment before fulfillment. Never fabricate an external hold.
alter table public.bookings add column payment_first boolean not null default false;
alter table public.bookings drop constraint bookings_check;
alter table public.bookings add constraint bookings_payment_deadline_contract check (
 payment_deadline is null or (hold_expires_at is not null and payment_deadline<=hold_expires_at)
 or (payment_first and kind='private' and mode='MANUAL_APPROVAL' and hold_expires_at is null)
);
alter table public.bookings add constraint bookings_payment_first_contract check (not payment_first or (kind='private' and mode='MANUAL_APPROVAL'));
create or replace function public.request_booking(p_slot uuid,p_kind text,p_key uuid,p_title text default '',p_description text default '',p_min_skill integer default null,p_max_skill integer default null,p_equipment jsonb default '[]') returns uuid language plpgsql security definer set search_path='' as $$
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
 insert into public.bookings(user_id,slot_id,kind,mode,court_price,platform_fee,cancellation_snapshot,idempotency_key,request_expires_at,payment_first,status,payment_deadline)
 values(auth.uid(),s.id,p_kind,cl.booking_mode,s.court_price,c.platform_fee,cl.cancellation_policy,p_key,least(now()+interval '24 hours',s.starts_at-case when p_kind='open' then make_interval(hours=>cl.completion_cutoff_hours) else interval '0 hours' end),p_kind='private' and cl.booking_mode='MANUAL_APPROVAL',case when p_kind='private' and cl.booking_mode='MANUAL_APPROVAL' then 'awaiting_payment' else 'pending_club' end,case when p_kind='private' and cl.booking_mode='MANUAL_APPROVAL' then least(now()+interval '10 minutes',s.starts_at) end) returning * into b;
 insert into public.booking_participants(booking_id,user_id,seat,court_share,fee,status,lock_expires_at)
 values(b.id,auth.uid(),1,case when p_kind='private' then b.court_price else b.court_price/4+b.court_price%4 end,b.platform_fee,case when b.payment_first then 'reserved' else 'interested' end,b.payment_deadline) returning id into pid;
 shared:=private.add_equipment(b.id,null,p_equipment,true); personal:=private.add_equipment(b.id,pid,p_equipment,false);
 update public.bookings set shared_price=shared where id=b.id;
 update public.booking_participants set personal_price=personal,shared_share=case when p_kind='private' then shared else shared/4+shared%4 end where id=pid;
 if p_kind='open' then insert into public.open_matches(booking_id,organizer_id,title,description,min_skill,max_skill,cutoff_at) values(b.id,auth.uid(),trim(p_title),p_description,p_min_skill,p_max_skill,s.starts_at-make_interval(hours=>cl.completion_cutoff_hours)); end if;
 if cl.booking_mode='EXTERNAL_AUTOMATED' then insert into public.provider_attempts(booking_id,operation,idempotency_key) values(b.id,'quote_hold',b.id::text||':quote_hold'); end if;
 perform private.notify(auth.uid(),case when b.payment_first then 'رزرو آمادهٔ پرداخت است' else 'درخواست برای باشگاه ثبت شد' end,case when b.payment_first then 'پرداخت را در مهلت مشخص تکمیل کنید. پس از پرداخت، رزرو وارد مرحلهٔ تأیید نهایی می‌شود.' else 'تا تأیید باشگاه، زمین قطعی نیست و پرداخت فعال نمی‌شود.' end,'booking:'||b.id,'/account/bookings');
 return b.id;
end; $$;

create or replace function public.approve_booking(p_booking uuid,p_reference text,p_hold_until timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; s public.court_slots; deadline timestamptz; begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if; perform private.platform_lock();
 select * into b from public.bookings where id=p_booking for update; select * into s from public.court_slots where id=b.slot_id;
 if (b.status<>'pending_club' and not (b.payment_first and b.status='awaiting_payment')) or b.mode<>'MANUAL_APPROVAL' or b.request_expires_at<=now() then raise exception 'INVALID_STATUS'; end if;
 deadline:=least(now()+interval '60 minutes',p_hold_until,s.starts_at,coalesce((select cutoff_at from public.open_matches where booking_id=b.id),s.starts_at));
 if p_hold_until is null or deadline<=now() or length(trim(p_reference)) not between 2 and 200 then raise exception 'INVALID_HOLD'; end if;
 update public.bookings set status=case when kind='private' then 'awaiting_payment' else 'collecting' end,club_reference=trim(p_reference),hold_expires_at=p_hold_until,payment_deadline=deadline,updated_at=now() where id=b.id;
 update public.booking_participants set status='reserved',lock_expires_at=deadline where booking_id=b.id and status='interested';
 perform private.notify(b.user_id,'باشگاه سانس را نگه داشت','مهلت پرداخت حداکثر ۶۰ دقیقه و محدود به اعتبار نگه‌داشت باشگاه است.','hold:'||b.id);
end; $$;

create or replace function public.start_checkout(p_participant uuid default null,p_registration uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare bp public.booking_participants; b public.bookings; er public.event_registrations; ev public.platform_events; p public.payments; amount bigint; deadline timestamptz;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if; perform private.platform_lock();
 if (p_participant is null)=(p_registration is null) then raise exception 'INVALID_REQUEST'; end if;
 if p_participant is not null then
 select * into bp from public.booking_participants where id=p_participant and user_id=auth.uid();
 select * into b from public.bookings where id=bp.booking_id for update;
 if bp.status<>'reserved' or b.status not in ('awaiting_payment','collecting') then raise exception 'NOT_PAYABLE'; end if;
 deadline:=least(bp.lock_expires_at,case when b.payment_first then b.payment_deadline else b.hold_expires_at end,coalesce((select cutoff_at from public.open_matches where booking_id=b.id),b.payment_deadline));
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

create or replace function public.settle_payment(p_payment uuid,p_reference text,p_amount bigint) returns void language plpgsql security definer set search_path='' as $$
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
 valid:=active_attempt and p.amount=bp.court_share+bp.shared_share+bp.personal_price+bp.fee and bp.status='reserved' and bp.lock_expires_at>now() and b.status in ('awaiting_payment','collecting') and (b.hold_expires_at>now() or (b.payment_first and b.payment_deadline>now() and private.calendar_slot_fresh(b.slot_id))) and p.expires_at>now() and not exists(select 1 from public.open_matches where booking_id=b.id and cutoff_at<=now());
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

create or replace function private.finalize_paid_booking(p_booking uuid) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; required integer; paid integer; begin
 select * into b from public.bookings where id=p_booking for update;
 if b.status in ('confirmed','completed','booking_in_progress') then return; end if;
 required:=case when b.kind='private' then 1 else 4 end;
 select count(*) into paid from public.booking_participants where booking_id=b.id and status='paid'; if paid<required then return; end if;
 if b.payment_first and b.club_reference is null then
 update public.bookings set status='booking_in_progress',fulfillment_state='reserve',payment_deadline=null,hold_expires_at=null,updated_at=now() where id=b.id;
 perform private.notify(b.user_id,'پرداخت موفق؛ در انتظار تأیید نهایی','پرداخت شما تأیید شد. نتیجهٔ نهایی رزرو از طریق اعلان اطلاع‌رسانی می‌شود.','paid-awaiting:'||b.id,'/account/bookings');
 perform private.notify(a.user_id,'رزرو خصوصی پرداخت شد','پرداخت تکمیل شد؛ سانس را رزرو و مرجع نهایی را در صف اقدام ثبت کنید.','admin:paid-booking:'||b.id||':'||a.user_id,'/admin/operations?tab=queue') from public.admins a;
 return;
 end if;
 if b.mode='MANUAL_APPROVAL' and b.club_reference is not null and b.hold_expires_at>now() then
 update public.bookings set status='confirmed',fulfillment_state='booked',updated_at=now() where id=b.id;
 perform private.notify(b.user_id,'رزرو قطعی شد','تأیید باشگاه و پرداخت‌های لازم ثبت شده‌اند.','confirmed:'||b.id);
 else
 update public.bookings set status='booking_in_progress',updated_at=now() where id=b.id;
 insert into public.provider_attempts(booking_id,operation,idempotency_key) values(b.id,'confirm',b.id::text||':confirm') on conflict(idempotency_key) do nothing;
 end if;
end; $$;

create or replace function public.propose_booking_slot(p_booking uuid,p_slot uuid,p_note text) returns uuid
language plpgsql security definer set search_path='' as $$
declare b public.bookings; proposal uuid; recipient record; target public.court_slots; previous public.booking_reschedules; begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 perform private.platform_lock();
 select * into b from public.bookings where id=p_booking for update;
 if b.status='needs_attention' then
  select * into previous from public.booking_reschedules where booking_id=b.id and status='accepted' for update;
  if not found then raise exception 'INVALID_STATUS'; end if;
  update public.booking_reschedules set status='superseded' where id=previous.id;
  update public.bookings set status=previous.prior_status where id=b.id;
  b.status:=previous.prior_status;
 end if;
 if (b.status='booking_in_progress' and not b.payment_first) or b.id is null or b.mode<>'MANUAL_APPROVAL' or b.status not in ('pending_club','awaiting_payment','collecting','confirmed','booking_in_progress') or length(trim(p_note)) not between 2 and 500
 or exists(select 1 from public.booking_reschedules where booking_id=b.id and status='accepted')
 then raise exception 'INVALID_STATUS'; end if;
 perform private.check_replacement(b.id,p_slot);
 select * into target from public.court_slots where id=p_slot;
 update public.booking_reschedules set status='superseded' where booking_id=b.id and status='pending';
 insert into public.booking_reschedules(booking_id,old_slot_id,new_slot_id,old_starts_at,old_ends_at,new_starts_at,new_ends_at,note,expires_at,created_by)
 select b.id,b.slot_id,p_slot,s.starts_at,s.ends_at,target.starts_at,target.ends_at,trim(p_note),least(now()+interval '24 hours',target.starts_at-interval '1 hour'),auth.uid() from public.court_slots s where s.id=b.slot_id returning id into proposal;
 update public.bookings set fulfillment_state='awaiting_user',request_expires_at=case when status='pending_club' or payment_first then least(now()+interval '24 hours',target.starts_at-interval '1 hour') else request_expires_at end,updated_at=now() where id=b.id;
 for recipient in select distinct user_id from public.booking_participants where booking_id=b.id and status in ('interested','reserved','paid') loop
 perform private.notify(recipient.user_id,'پیشنهاد تغییر زمان بازی','سانس جایگزین با همان مبلغ پیشنهاد شده است. زمان جدید را در پیگیری رزرو ببینید؛ ثبت‌کنندهٔ رزرو باید آن را تأیید کند.','reschedule:'||proposal||':'||recipient.user_id,'/account/bookings');
 end loop;
 return proposal;
end $$;

create or replace function public.reply_booking_slot(p_proposal uuid,p_accept boolean) returns void
language plpgsql security definer set search_path='' as $$
declare proposal public.booking_reschedules; b public.bookings; administrator record; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform private.platform_lock();
 select * into proposal from public.booking_reschedules where id=p_proposal for update;
 select * into b from public.bookings where id=proposal.booking_id for update;
 if b.user_id is distinct from auth.uid() then raise exception 'FORBIDDEN'; end if;
 if proposal.status<>'pending' or proposal.expires_at<=now() or b.status not in ('pending_club','awaiting_payment','collecting','confirmed','booking_in_progress') then raise exception 'PROPOSAL_EXPIRED'; end if;
 if p_accept then
  perform private.check_replacement(b.id,proposal.new_slot_id);
  if exists(select 1 from public.payments pay join public.booking_participants bp on bp.id=pay.participant_id where bp.booking_id=b.id and pay.status in ('created','pending','needs_attention')) then raise exception 'PAYMENT_CONFLICT'; end if;
 end if;
 update public.booking_reschedules set status=case when p_accept then 'accepted' else 'rejected' end,prior_status=b.status,responded_at=now() where id=proposal.id;
 update public.bookings set fulfillment_state=case when p_accept then 'reserve' else 'review' end,status=case when p_accept then 'needs_attention' else status end,
 hold_expires_at=case when p_accept then null else hold_expires_at end,payment_deadline=case when p_accept then null else payment_deadline end,updated_at=now() where id=b.id;
 if p_accept then
  update public.booking_participants set lock_expires_at=null where booking_id=b.id and status='reserved';
  update public.open_matches set cutoff_at=(select s.starts_at-make_interval(hours=>cl.completion_cutoff_hours) from public.court_slots s join public.courts ct on ct.id=s.court_id join public.clubs cl on cl.id=ct.club_id where s.id=proposal.new_slot_id) where booking_id=b.id;
 end if;
 for administrator in select user_id from public.admins loop
 perform private.notify(administrator.user_id,case when p_accept then 'سانس جایگزین تأیید شد' else 'سانس جایگزین رد شد' end,'نتیجهٔ پاسخ کاربر در صف اقدام رزرو ثبت شد.','reschedule-reply:'||proposal.id||':'||administrator.user_id,'/admin/operations?tab=queue');
 end loop;
end $$;

create or replace function public.fulfill_booking(p_booking uuid,p_reference text,p_hold_until timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare b public.bookings; proposal public.booking_reschedules; target public.court_slots; recipient record; begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 perform private.platform_lock();
 select * into b from public.bookings where id=p_booking for update;
 if b.id is null or b.mode<>'MANUAL_APPROVAL' or b.fulfillment_state<>'reserve' or b.status in ('cancelled','expired','completed')
 or length(trim(p_reference)) not between 2 and 200 or p_hold_until is null or p_hold_until<=now() then raise exception 'INVALID_HOLD'; end if;
 select * into proposal from public.booking_reschedules where booking_id=b.id and status='accepted' for update;
 if found then
  perform private.check_replacement(b.id,proposal.new_slot_id);
  select * into target from public.court_slots where id=proposal.new_slot_id;
  update public.bookings set slot_id=target.id,status=proposal.prior_status,club_reference=trim(p_reference),hold_expires_at=p_hold_until,updated_at=now() where id=b.id;
  update public.open_matches set cutoff_at=target.starts_at-make_interval(hours=>(select cl.completion_cutoff_hours from public.clubs cl join public.courts ct on ct.club_id=cl.id where ct.id=target.court_id)) where booking_id=b.id;
  update public.booking_reschedules set status='completed' where id=proposal.id;
 end if;
 select * into b from public.bookings where id=p_booking;
 if b.status in ('pending_club','awaiting_payment','collecting') then
  update public.bookings set status='pending_club',request_expires_at=greatest(request_expires_at,now()+interval '1 minute') where id=b.id;
  perform public.approve_booking(b.id,p_reference,p_hold_until);
  update public.booking_participants bp set lock_expires_at=(select bk.payment_deadline from public.bookings bk where bk.id=b.id) where bp.booking_id=b.id and bp.status='reserved';
  perform private.finalize_paid_booking(b.id);
 elsif b.payment_first and b.status='booking_in_progress' and exists(select 1 from public.booking_participants where booking_id=b.id and status='paid') then
  if (select starts_at from public.court_slots where id=b.slot_id)<=now() then raise exception 'SLOT_UNAVAILABLE'; end if;
  update public.bookings set status='confirmed',fulfillment_state='booked',club_reference=trim(p_reference),hold_expires_at=p_hold_until,updated_at=now() where id=b.id;
  perform private.notify(b.user_id,'رزرو قطعی شد','زمان و زمین رزرو شما تأیید شد. جزئیات را در حساب خود ببینید.','confirmed:'||b.id,'/account/bookings');
 elsif b.status='confirmed' then
  update public.bookings set club_reference=trim(p_reference),hold_expires_at=p_hold_until where id=b.id;
 else raise exception 'INVALID_STATUS'; end if;
 update public.bookings set fulfillment_state='booked',updated_at=now() where id=b.id;
 for recipient in select distinct user_id from public.booking_participants where booking_id=b.id and status in ('interested','reserved','paid') loop
 perform private.notify(recipient.user_id,'تأیید نهایی رزرو ثبت شد','زمان نهایی و وضعیت پرداخت را در پیگیری رزرو بررسی کنید.','fulfilled:'||b.id||':'||coalesce(proposal.id::text,'original')||':'||recipient.user_id,'/account/bookings');
 end loop;
end $$;

create or replace function public.cancel_booking(p_booking uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; starts timestamptz; percent integer; begin
 perform private.platform_lock(); select * into b from public.bookings where id=p_booking for update;
 if not found or (b.user_id is distinct from auth.uid() and not public.is_admin()) then raise exception 'FORBIDDEN'; end if;
 if b.status in ('completed','cancelled','expired') then return; end if;
 if b.kind='open' and not public.is_admin() and exists(select 1 from public.booking_participants where booking_id=b.id and status='paid' and user_id<>auth.uid()) then raise exception 'ADMIN_REVIEW_REQUIRED'; end if;
 select starts_at into starts from public.court_slots where id=b.slot_id;
 percent:=case when (b.payment_first and b.fulfillment_state<>'booked') or public.is_admin() or b.status in ('pending_club','awaiting_payment','collecting') or starts-now()>=make_interval(hours=>coalesce((b.cancellation_snapshot->>'full_refund_hours')::integer,24)) then 100 else coalesce((b.cancellation_snapshot->>'late_refund_percent')::integer,0) end;
 if percent not between 0 and 100 then raise exception 'INVALID_POLICY'; end if;
 perform private.cancel_inventory(b.id,coalesce(nullif(trim(p_reason),''),'لغو رزرو'),percent);
end; $$;

create or replace function public.run_platform_jobs() returns jsonb language plpgsql security definer set search_path='' as $$
declare b record; p record; cancelled integer:=0; expired integer:=0; begin
 perform private.platform_lock();
 update public.provider_attempts set status='queued' where status='running' and next_attempt_at<=now() and attempts<5;
 update public.provider_attempts set status='unknown',last_error='RETRY_LIMIT_REQUIRES_RECONCILIATION' where status='running' and next_attempt_at<=now() and attempts>=5;
 for b in select bk.id from public.bookings bk left join public.open_matches m on m.booking_id=bk.id where bk.status in ('pending_club','awaiting_payment','collecting','booking_in_progress','needs_attention') and
 ((bk.payment_first and bk.fulfillment_state<>'booked' and bk.request_expires_at<=now()) or (bk.status='pending_club' and bk.request_expires_at<=now()) or (bk.hold_expires_at<=now()) or (bk.kind='private' and bk.payment_deadline<=now()) or (bk.kind='open' and (m.cutoff_at<=now() or (bk.payment_deadline<=now() and exists(select 1 from public.booking_participants bp where bp.booking_id=bk.id and bp.user_id=bk.user_id and bp.status<>'paid'))))) order by bk.id loop
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

create or replace function public.apply_booking_benefit(p_participant uuid,p_code text default null,p_reason text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare bp public.booking_participants; b public.bookings; c public.discount_codes; existing uuid; total bigint; reduction bigint; remaining bigint; a bigint; d bigint; e bigint; f bigint; result uuid; admin_waiver boolean:=p_code is null;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform private.platform_lock();
 select * into bp from public.booking_participants where id=p_participant for update;
 if bp.id is null or (admin_waiver and not public.is_admin()) or (not admin_waiver and bp.user_id<>auth.uid()) then raise exception 'NOT_ALLOWED'; end if;
 select id into existing from public.booking_benefits where participant_id=bp.id;
 if found and (not admin_waiver or bp.status='paid') then return existing; end if;
 select * into b from public.bookings where id=bp.booking_id for update;
 if bp.status<>'reserved' or bp.lock_expires_at is null or bp.lock_expires_at<=now() or (not b.payment_first and (b.hold_expires_at is null or b.hold_expires_at<=now())) or b.status not in ('awaiting_payment','collecting') or exists(select 1 from public.open_matches where booking_id=b.id and cutoff_at<=now()) then raise exception 'NOT_PAYABLE'; end if;
 if exists(select 1 from public.payments where participant_id=bp.id and status in ('created','pending','paid','needs_attention')) then raise exception 'PAYMENT_CONFLICT'; end if;
 total:=bp.court_share+bp.shared_share+bp.personal_price+bp.fee;
 if admin_waiver then
 if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'REASON_REQUIRED'; end if;
 reduction:=total;
 else
 select * into c from public.discount_codes where code=upper(trim(p_code)) and active and expires_at>now() for update;
 if c.id is null or (select count(*) from public.booking_benefits where code_id=c.id)>=c.max_uses or exists(select 1 from public.booking_benefits where code_id=c.id and user_id=bp.user_id) then raise exception 'INVALID_DISCOUNT'; end if;
 reduction:=least(total,case when c.kind='percent' then (total*c.value)/100 else c.value end);
 end if;
 if reduction<=0 and not admin_waiver then raise exception 'INVALID_DISCOUNT'; end if;
 insert into public.booking_benefits(participant_id,user_id,code_id,actor_id,reason,original,discount) values(bp.id,bp.user_id,c.id,auth.uid(),case when admin_waiver then trim(p_reason) else 'کد تخفیف: '||c.code end,to_jsonb(bp),reduction)
 on conflict(participant_id) do update set discount=public.booking_benefits.discount+excluded.discount, reason=public.booking_benefits.reason||'؛ معافیت ادمین: '||excluded.reason, actor_id=excluded.actor_id
 returning id into result;
 remaining:=reduction;
 a:=greatest(0,bp.court_share-remaining); remaining:=greatest(0,remaining-bp.court_share);
 d:=greatest(0,bp.shared_share-remaining); remaining:=greatest(0,remaining-bp.shared_share);
 e:=greatest(0,bp.personal_price-remaining); remaining:=greatest(0,remaining-bp.personal_price);
 f:=greatest(0,bp.fee-remaining);
 update public.booking_participants set court_share=a,shared_share=d,personal_price=e,fee=f,status=case when reduction=total then 'paid' else status end,lock_expires_at=case when reduction=total then null else lock_expires_at end where id=bp.id;
 -- No bank payment or bank reference is manufactured for waived balances.
 if reduction=total then perform private.finalize_paid_booking(b.id); end if;
 return result;
end $$;

create or replace function private.booking_operations_notice() returns trigger
language plpgsql security definer set search_path='' as $$ declare recipient record; begin
 if TG_OP='INSERT' then
  if new.payment_first then return new; end if;
  for recipient in select user_id from public.admins loop
   perform private.notify(recipient.user_id,'درخواست رزرو جدید','درخواست جدید زمین یا بازی برای بررسی در صف اقدام مدیر قرار گرفت.','admin:new-booking:'||new.id||':'||recipient.user_id,'/admin/operations?tab=queue');
  end loop;
 elsif new.status='confirmed' and old.status is distinct from new.status and new.fulfillment_state='booked' then
  for recipient in select distinct user_id from public.booking_participants where booking_id=new.id and user_id<>new.user_id and status='paid' loop
   perform private.notify(recipient.user_id,'رزرو بازی قطعی شد','زمین و پرداخت‌های لازم تأیید شدند؛ جزئیات را در حساب ببینید.','confirmed-seat:'||new.id||':'||new.slot_id||':'||recipient.user_id,'/account/bookings');
  end loop;
 end if;
 return new;
end $$;
-- CREATE OR REPLACE preserves existing explicit execution grants.
commit;
