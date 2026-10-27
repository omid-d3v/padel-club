begin;

-- Keep privileged implementations outside the exposed schema. Each mutation
-- authenticates the caller, checks ownership and shares the inventory lock.
create function private.event_ready(p_event uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.platform_events e where e.id=p_event
 and (e.published or e.organizer_id=auth.uid() or public.is_admin()) and public.is_club_available(e.club_id)
 and (select count(*) from public.event_courts ec join public.bookings b on b.id=ec.booking_id
 where ec.event_id=e.id and b.status='confirmed') >= case when e.kind='americano' then 2 else 1 end);
$$;
create function public.event_ready(p_event uuid) returns boolean language sql stable security invoker set search_path='' as $$ select private.event_ready(p_event); $$;
revoke all on function private.event_ready(uuid),public.event_ready(uuid) from public;
grant usage on schema private to anon;
grant execute on function private.event_ready(uuid),public.event_ready(uuid) to anon,authenticated;

create function private.quote_booking_discount(p_slot uuid,p_kind text,p_equipment jsonb,p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.court_slots; ct public.courts; coupon public.discount_codes; item record; e public.equipment;
 shared bigint:=0; personal bigint:=0; total bigint; reduction bigint;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 if p_kind is null or p_kind not in ('private','open') or p_equipment is null or jsonb_typeof(p_equipment)<>'array' or jsonb_array_length(p_equipment)>20 then raise exception 'INVALID_REQUEST'; end if;
 select * into s from public.court_slots where id=p_slot and published and starts_at>now();
 select * into ct from public.courts where id=s.court_id and active;
 if ct.id is null or not public.is_club_available(ct.club_id) then raise exception 'SLOT_UNAVAILABLE'; end if;
 if (select count(*) from jsonb_to_recordset(p_equipment) as x(id uuid,quantity integer)) <> (select count(distinct id) from jsonb_to_recordset(p_equipment) as x(id uuid,quantity integer)) then raise exception 'INVALID_EQUIPMENT'; end if;
 for item in select * from jsonb_to_recordset(p_equipment) as x(id uuid,quantity integer) loop
  select * into e from public.equipment where id=item.id and club_id=ct.club_id and active;
  if not found or item.quantity is null or item.quantity not between 1 and 20 or item.quantity>e.stock then raise exception 'EQUIPMENT_UNAVAILABLE'; end if;
  if e.kind='shared' then shared:=shared+e.price*item.quantity; else personal:=personal+e.price*item.quantity; end if;
 end loop;
 total:=case when p_kind='open' then s.court_price/4+s.court_price%4+shared/4+shared%4 else s.court_price+shared end+personal+ct.platform_fee;
 select * into coupon from public.discount_codes dc where dc.code=upper(trim(p_code)) and active and expires_at>now();
 if coupon.id is null or (select count(*) from public.booking_benefits where code_id=coupon.id)>=coupon.max_uses or exists(select 1 from public.booking_benefits where code_id=coupon.id and user_id=auth.uid()) then raise exception 'INVALID_DISCOUNT'; end if;
 reduction:=least(total,case when coupon.kind='percent' then total*coupon.value/100 else coupon.value end);
 if reduction<=0 then raise exception 'INVALID_DISCOUNT'; end if;
 return jsonb_build_object('original',total,'discount',reduction,'total',total-reduction);
end $$;
create function public.quote_booking_discount(p_slot uuid,p_kind text,p_equipment jsonb,p_code text) returns jsonb
language sql security invoker set search_path='' as $$ select private.quote_booking_discount(p_slot,p_kind,p_equipment,p_code); $$;
revoke all on function private.quote_booking_discount(uuid,text,jsonb,text),public.quote_booking_discount(uuid,text,jsonb,text) from public,anon;
grant execute on function private.quote_booking_discount(uuid,text,jsonb,text),public.quote_booking_discount(uuid,text,jsonb,text) to authenticated;

-- Apply a benefit and validate the displayed total in the SAME transaction as
-- booking creation. Invalid/expired coupons leave no booking or payment behind.
create function public.request_booking_checkout(p_slot uuid,p_kind text,p_key uuid,p_title text default '',p_description text default '',p_min_skill integer default null,p_max_skill integer default null,p_equipment jsonb default '[]',p_code text default '',p_expected_total bigint default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare bid uuid; seat public.booking_participants; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 bid:=public.request_booking(p_slot,p_kind,p_key,p_title,p_description,p_min_skill,p_max_skill,p_equipment);
 select * into seat from public.booking_participants where booking_id=bid and user_id=auth.uid();
 if trim(coalesce(p_code,''))<>'' then
  if p_kind<>'private' or p_expected_total is null then raise exception 'DISCOUNT_CHANGED'; end if;
  perform public.apply_booking_benefit(seat.id,p_code);
  select * into seat from public.booking_participants where id=seat.id;
  if seat.court_share+seat.shared_share+seat.personal_price+seat.fee<>p_expected_total then raise exception 'DISCOUNT_CHANGED'; end if;
 end if;
 return bid;
end $$;
revoke all on function public.request_booking_checkout(uuid,text,uuid,text,text,integer,integer,jsonb,text,bigint) from public,anon;
grant execute on function public.request_booking_checkout(uuid,text,uuid,text,text,integer,integer,jsonb,text,bigint) to authenticated;

create function private.booking_cancellation_quote(p_booking uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b public.bookings; starts timestamptz; percent integer; paid bigint; refund bigint; allowed boolean;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 select * into b from public.bookings where id=p_booking;
 if not found or (b.user_id<>auth.uid() and not public.is_admin()) then raise exception 'FORBIDDEN'; end if;
 select starts_at into starts from public.court_slots where id=b.slot_id;
 allowed:=b.status not in ('completed','cancelled','expired') and (b.kind<>'open' or public.is_admin() or not exists(select 1 from public.booking_participants where booking_id=b.id and status='paid' and user_id<>auth.uid()));
 allowed:=allowed and not exists(select 1 from public.refunds rf join public.payments pay on pay.id=rf.payment_id join public.booking_participants bp on bp.id=pay.participant_id where bp.booking_id=b.id);
 percent:=case when (b.payment_first and b.fulfillment_state<>'booked') or public.is_admin() or b.status in ('pending_club','awaiting_payment','collecting') or starts-now()>=make_interval(hours=>coalesce((b.cancellation_snapshot->>'full_refund_hours')::integer,24)) then 100 else coalesce((b.cancellation_snapshot->>'late_refund_percent')::integer,0) end;
 select coalesce(sum(p.amount),0),coalesce(sum(p.amount*percent/100),0) into paid,refund from public.payments p join public.booking_participants bp on bp.id=p.participant_id where bp.booking_id=b.id and p.status='paid';
 return jsonb_build_object('paid',paid,'refund',refund,'allowed',allowed);
end $$;
create function public.booking_cancellation_quote(p_booking uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select private.booking_cancellation_quote(p_booking); $$;
create function private.cancel_booking_quoted(p_booking uuid,p_reason text,p_refund bigint) returns void language plpgsql security definer set search_path='' as $$
declare quote jsonb; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform private.platform_lock();
 quote:=private.booking_cancellation_quote(p_booking);
 if not (quote->>'allowed')::boolean then raise exception 'ADMIN_REVIEW_REQUIRED'; end if;
 if p_refund is null or p_refund<>(quote->>'refund')::bigint then raise exception 'REFUND_CHANGED'; end if;
 perform public.cancel_booking(p_booking,p_reason);
end $$;
create function public.cancel_booking_quoted(p_booking uuid,p_reason text,p_refund bigint) returns void language sql security invoker set search_path='' as $$ select private.cancel_booking_quoted(p_booking,p_reason,p_refund); $$;
revoke all on function private.booking_cancellation_quote(uuid),public.booking_cancellation_quote(uuid),private.cancel_booking_quoted(uuid,text,bigint),public.cancel_booking_quoted(uuid,text,bigint) from public,anon;
grant execute on function private.booking_cancellation_quote(uuid),public.booking_cancellation_quote(uuid),private.cancel_booking_quoted(uuid,text,bigint),public.cancel_booking_quoted(uuid,text,bigint) to authenticated;

create function private.withdraw_event(p_event uuid,p_refund bigint) returns void language plpgsql security definer set search_path='' as $$
declare e public.platform_events; r public.event_registrations; pay record; percent integer; refund bigint; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform private.platform_lock(); select * into e from public.platform_events where id=p_event for update;
 select * into r from public.event_registrations where event_id=p_event and user_id=auth.uid() for update;
 if r.id is null then raise exception 'FORBIDDEN'; end if;
 if r.status in ('withdrawn','refund_pending','refunded') then return; end if;
 if e.status<>'registration' or e.registration_deadline<=now() then raise exception 'ADMIN_REVIEW_REQUIRED'; end if;
 percent:=case when e.starts_at-now()>=make_interval(hours=>coalesce((e.cancellation_policy->>'full_refund_hours')::integer,24)) then 100 else coalesce((e.cancellation_policy->>'late_refund_percent')::integer,0) end;
 select coalesce(sum(amount*percent/100),0) into refund from public.payments where registration_id=r.id and status='paid';
 if p_refund is null or refund<>p_refund then raise exception 'REFUND_CHANGED'; end if;
 for pay in select id from public.payments where registration_id=r.id and status='paid' loop perform private.queue_refund(pay.id,'انصراف از رویداد',percent); end loop;
 update public.event_registrations set status=case when status='refund_pending' then status else 'withdrawn' end,lock_expires_at=null where id=r.id;
 perform private.notify(auth.uid(),'انصراف از رویداد ثبت شد','وضعیت ثبت‌نام و بازگشت وجه را در حساب ببینید.','event-withdraw:'||r.id,'/account/events');
end $$;
create function public.withdraw_event(p_event uuid,p_refund bigint) returns void language sql security invoker set search_path='' as $$ select private.withdraw_event(p_event,p_refund); $$;
revoke all on function private.withdraw_event(uuid,bigint),public.withdraw_event(uuid,bigint) from public,anon;
grant execute on function private.withdraw_event(uuid,bigint),public.withdraw_event(uuid,bigint) to authenticated;

create table public.support_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 request_key uuid not null, booking_id uuid references public.bookings(id), payment_id uuid references public.payments(id), event_id uuid references public.platform_events(id),
 subject text not null check(length(subject) between 3 and 120), body text not null check(length(body) between 10 and 3000),
 status text not null default 'open' check(status in ('open','answered')),
 reply text, replied_by uuid references auth.users(id), created_at timestamptz not null default now(), replied_at timestamptz,
 unique(user_id,request_key)
);
alter table public.support_requests enable row level security;
revoke all on public.support_requests from public,anon,authenticated;
grant select on public.support_requests to authenticated;
create policy support_read on public.support_requests for select to authenticated using((select auth.uid())=user_id or (select public.is_admin()));
create index support_owner_created on public.support_requests(user_id,created_at desc);
create index support_open_created on public.support_requests(status,created_at);
create trigger audit_support after insert or update on public.support_requests for each row execute function private.audit_change();
create function private.create_support_request(p_key uuid,p_subject text,p_body text,p_booking uuid default null,p_payment uuid default null,p_event uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; recipient record; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform private.platform_lock();
 select id into result from public.support_requests where user_id=auth.uid() and request_key=p_key; if found then return result; end if;
 if p_key is null or p_subject is null or p_body is null or length(trim(p_subject)) not between 3 and 120 or length(trim(p_body)) not between 10 and 3000 then raise exception 'INVALID_REQUEST'; end if;
 if p_booking is not null and not exists(select 1 from public.bookings b where b.id=p_booking and (b.user_id=auth.uid() or exists(select 1 from public.booking_participants bp where bp.booking_id=b.id and bp.user_id=auth.uid()))) then raise exception 'FORBIDDEN'; end if;
 if p_payment is not null and not exists(select 1 from public.payments where id=p_payment and user_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
 if p_event is not null and not exists(select 1 from public.event_registrations where event_id=p_event and user_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
 if (select count(*) from public.support_requests where user_id=auth.uid() and created_at>now()-interval '1 hour')>=5 then raise exception 'SUPPORT_RATE_LIMIT'; end if;
 insert into public.support_requests(user_id,request_key,subject,body,booking_id,payment_id,event_id) values(auth.uid(),p_key,trim(p_subject),trim(p_body),p_booking,p_payment,p_event) returning id into result;
 for recipient in select user_id from public.admins loop perform private.notify(recipient.user_id,'درخواست پیگیری جدید',left(trim(p_subject),120),'support:'||result||':'||recipient.user_id,'/admin/support?record='||result); end loop;
 return result;
end $$;
create function public.create_support_request(p_key uuid,p_subject text,p_body text,p_booking uuid default null,p_payment uuid default null,p_event uuid default null) returns uuid language sql security invoker set search_path='' as $$ select private.create_support_request(p_key,p_subject,p_body,p_booking,p_payment,p_event); $$;
create function private.answer_support_request(p_request uuid,p_reply text) returns void language plpgsql security definer set search_path='' as $$
declare r public.support_requests; begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if p_reply is null or length(trim(p_reply)) not between 3 and 3000 then raise exception 'REASON_REQUIRED'; end if;
 update public.support_requests set reply=trim(p_reply),status='answered',replied_by=auth.uid(),replied_at=now() where id=p_request returning * into r;
 if r.id is null then raise exception 'NOT_FOUND'; end if;
 perform private.notify(r.user_id,'پاسخ پیگیری شما ثبت شد',r.subject,'support-answer:'||r.id||':'||r.replied_at,'/account/support#request-'||r.id);
end $$;
create function public.answer_support_request(p_request uuid,p_reply text) returns void language sql security invoker set search_path='' as $$ select private.answer_support_request(p_request,p_reply); $$;
revoke all on function private.create_support_request(uuid,text,text,uuid,uuid,uuid),public.create_support_request(uuid,text,text,uuid,uuid,uuid),private.answer_support_request(uuid,text),public.answer_support_request(uuid,text) from public,anon;
grant execute on function private.create_support_request(uuid,text,text,uuid,uuid,uuid),public.create_support_request(uuid,text,text,uuid,uuid,uuid),private.answer_support_request(uuid,text),public.answer_support_request(uuid,text) to authenticated;

grant update(read_at) on public.notifications to authenticated;
create policy notification_read_update on public.notifications for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);

create function private.set_slot_visibility(p_slot uuid,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 perform private.platform_lock();
 if p_enabled and not exists(select 1 from public.court_slots s join public.courts c on c.id=s.court_id where s.id=p_slot and c.active and public.is_club_available(c.club_id)) then raise exception 'CLUB_UNAVAILABLE'; end if;
 if exists(select 1 from public.bookings where slot_id=p_slot and status not in ('cancelled','expired','completed')) then raise exception 'SLOT_HAS_BOOKINGS'; end if;
 update public.court_slots set published=p_enabled where id=p_slot;
 if not found then raise exception 'NOT_FOUND'; end if;
end $$;
create function public.set_slot_visibility(p_slot uuid,p_enabled boolean) returns void language sql security invoker set search_path='' as $$ select private.set_slot_visibility(p_slot,p_enabled); $$;
revoke all on function private.set_slot_visibility(uuid,boolean),public.set_slot_visibility(uuid,boolean) from public,anon;
grant execute on function private.set_slot_visibility(uuid,boolean),public.set_slot_visibility(uuid,boolean) to authenticated;

create function private.operations_summary() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 return jsonb_build_object(
 'pending',(select count(*) from public.bookings where status='pending_club'),
 'queue',(select count(*) from public.bookings where mode='MANUAL_APPROVAL' and (not payment_first or status in ('booking_in_progress','needs_attention')) and fulfillment_state<>'booked' and status not in ('cancelled','expired','completed')),
 'expiring',(select count(*) from public.bookings where hold_expires_at>now() and hold_expires_at<now()+interval '1 hour' and status in ('collecting','awaiting_payment')),
 'refunds',(select count(*) from public.refunds where status<>'completed'),
 'attention',(select count(*) from public.payments where status='needs_attention'),
 'receipts',(select count(*) from public.card_transfer_receipts where status='pending'),
 'support',(select count(*) from public.support_requests where status='open')
 );
end $$;
create function public.operations_summary() returns jsonb language sql stable security invoker set search_path='' as $$ select private.operations_summary(); $$;
revoke all on function private.operations_summary(),public.operations_summary() from public,anon;
grant execute on function private.operations_summary(),public.operations_summary() to authenticated;
-- A start action must remain valid when called directly, not only via the UI.
create function private.event_start_preflight() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='active' and old.status<>'active' then
  if not private.event_ready(new.id) then raise exception 'EVENT_COURTS_UNSECURED'; end if;
  if new.kind='tournament' and (select count(*) from public.event_registrations where event_id=new.id and status='paid')<4 then raise exception 'FOUR_PAID_PLAYERS_REQUIRED'; end if;
 end if;
 return new;
end $$;
revoke all on function private.event_start_preflight() from public,anon,authenticated;
create trigger event_start_preflight before update of status on public.platform_events for each row execute function private.event_start_preflight();
commit;
