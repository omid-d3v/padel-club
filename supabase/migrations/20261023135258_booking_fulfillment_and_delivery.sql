begin;
alter table public.bookings add column fulfillment_state text not null default 'review'
  check (fulfillment_state in ('review','reserve','awaiting_user','booked'));
update public.bookings set fulfillment_state='booked' where club_reference is not null or external_reference is not null;

create table public.booking_reschedules (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id),
 old_slot_id uuid not null references public.court_slots(id),
 new_slot_id uuid not null references public.court_slots(id),
 old_starts_at timestamptz not null, old_ends_at timestamptz not null,
 new_starts_at timestamptz not null, new_ends_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','accepted','rejected','completed','superseded')),
 prior_status text,
 note text not null check(length(note) between 2 and 500),
 expires_at timestamptz not null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), responded_at timestamptz,
 check(old_slot_id<>new_slot_id)
);
create unique index booking_one_replacement on public.booking_reschedules(booking_id) where status in ('pending','accepted');
alter table public.booking_reschedules enable row level security;
revoke all on public.booking_reschedules from public,anon,authenticated;
grant select on public.booking_reschedules to authenticated;
grant all on public.booking_reschedules to service_role;
create policy replacement_read on public.booking_reschedules for select to authenticated using (
 (select public.is_admin()) or exists(select 1 from public.bookings b where b.id=booking_id and b.user_id=(select auth.uid()))
 or exists(select 1 from public.booking_participants bp where bp.booking_id=booking_reschedules.booking_id and bp.user_id=(select auth.uid()))
);
create trigger audit_booking_replacement after insert or update or delete on public.booking_reschedules for each row execute function private.audit_change();

create function private.check_replacement(p_booking uuid,p_slot uuid) returns void
language plpgsql security definer set search_path='' as $$
declare b public.bookings; old_slot public.court_slots; target public.court_slots; begin
 select * into b from public.bookings where id=p_booking;
 select * into old_slot from public.court_slots where id=b.slot_id;
 select * into target from public.court_slots where id=p_slot and published for update;
 if target.id is null or target.id=old_slot.id or target.court_id<>old_slot.court_id
 or target.court_price<>b.court_price or target.ends_at-target.starts_at<>old_slot.ends_at-old_slot.starts_at
 or target.starts_at<=now()+interval '1 hour' or not private.calendar_slot_fresh(target.id)
 or not exists(select 1 from public.courts where id=target.court_id and active)
 or exists(select 1 from public.bookings other where other.slot_id=target.id and other.id<>b.id and other.status not in ('cancelled','expired'))
 then raise exception 'REPLACEMENT_UNAVAILABLE'; end if;
 if b.kind='open' and target.starts_at<=now()+make_interval(hours=>(select cl.completion_cutoff_hours from public.clubs cl join public.courts ct on ct.club_id=cl.id where ct.id=target.court_id)) then raise exception 'REPLACEMENT_UNAVAILABLE'; end if;
 if exists (
  select 1 from public.booking_items item join public.equipment eq on eq.id=item.equipment_id
  where item.booking_id=b.id and (not eq.active or eq.stock <
   (select coalesce(sum(own_item.quantity),0) from public.booking_items own_item where own_item.booking_id=b.id and own_item.equipment_id=eq.id)
   +(select coalesce(sum(other_item.quantity),0) from public.booking_items other_item join public.bookings ob on ob.id=other_item.booking_id join public.court_slots os on os.id=ob.slot_id
     left join public.booking_participants bp on bp.id=other_item.participant_id
     where other_item.equipment_id=eq.id and ob.id<>b.id and ob.status not in ('cancelled','expired','completed')
     and (bp.id is null or bp.status in ('interested','reserved','paid','no_show')) and os.starts_at<target.ends_at and os.ends_at>target.starts_at))
 ) then raise exception 'EQUIPMENT_UNAVAILABLE'; end if;
end $$;

create function public.review_booking(p_booking uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 perform private.platform_lock();
 update public.bookings set fulfillment_state='reserve',updated_at=now() where id=p_booking and mode='MANUAL_APPROVAL' and fulfillment_state='review' and status not in ('cancelled','expired','completed');
 if not found then raise exception 'INVALID_STATUS'; end if;
end $$;

create function public.propose_booking_slot(p_booking uuid,p_slot uuid,p_note text) returns uuid
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
 if b.id is null or b.mode<>'MANUAL_APPROVAL' or b.status not in ('pending_club','awaiting_payment','collecting','confirmed') or length(trim(p_note)) not between 2 and 500
 or exists(select 1 from public.booking_reschedules where booking_id=b.id and status='accepted')
 then raise exception 'INVALID_STATUS'; end if;
 perform private.check_replacement(b.id,p_slot);
 select * into target from public.court_slots where id=p_slot;
 update public.booking_reschedules set status='superseded' where booking_id=b.id and status='pending';
 insert into public.booking_reschedules(booking_id,old_slot_id,new_slot_id,old_starts_at,old_ends_at,new_starts_at,new_ends_at,note,expires_at,created_by)
 select b.id,b.slot_id,p_slot,s.starts_at,s.ends_at,target.starts_at,target.ends_at,trim(p_note),least(now()+interval '24 hours',target.starts_at-interval '1 hour'),auth.uid() from public.court_slots s where s.id=b.slot_id returning id into proposal;
 update public.bookings set fulfillment_state='awaiting_user',request_expires_at=case when status='pending_club' then least(now()+interval '24 hours',target.starts_at-interval '1 hour') else request_expires_at end,updated_at=now() where id=b.id;
 for recipient in select distinct user_id from public.booking_participants where booking_id=b.id and status in ('interested','reserved','paid') loop
 perform private.notify(recipient.user_id,'پیشنهاد تغییر زمان بازی','سانس جایگزین با همان مبلغ پیشنهاد شده است. زمان جدید را در پیگیری رزرو ببینید؛ ثبت‌کنندهٔ رزرو باید آن را تأیید کند.','reschedule:'||proposal||':'||recipient.user_id,'/account/bookings');
 end loop;
 return proposal;
end $$;

create function public.reply_booking_slot(p_proposal uuid,p_accept boolean) returns void
language plpgsql security definer set search_path='' as $$
declare proposal public.booking_reschedules; b public.bookings; administrator record; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform private.platform_lock();
 select * into proposal from public.booking_reschedules where id=p_proposal for update;
 select * into b from public.bookings where id=proposal.booking_id for update;
 if b.user_id is distinct from auth.uid() then raise exception 'FORBIDDEN'; end if;
 if proposal.status<>'pending' or proposal.expires_at<=now() or b.status not in ('pending_club','awaiting_payment','collecting','confirmed') then raise exception 'PROPOSAL_EXPIRED'; end if;
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

create function public.fulfill_booking(p_booking uuid,p_reference text,p_hold_until timestamptz) returns void
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
 elsif b.status='confirmed' then
  update public.bookings set club_reference=trim(p_reference),hold_expires_at=p_hold_until where id=b.id;
 else raise exception 'INVALID_STATUS'; end if;
 update public.bookings set fulfillment_state='booked',updated_at=now() where id=b.id;
 for recipient in select distinct user_id from public.booking_participants where booking_id=b.id and status in ('interested','reserved','paid') loop
 perform private.notify(recipient.user_id,'رزرو زمین توسط مدیر ثبت شد','زمان نهایی و وضعیت پرداخت را در پیگیری رزرو بررسی کنید.','fulfilled:'||b.id||':'||coalesce(proposal.id::text,'original')||':'||recipient.user_id,'/account/bookings');
 end loop;
end $$;

create function public.expire_booking_proposals() returns integer
language plpgsql security definer set search_path='' as $$ declare proposal record; affected integer:=0; begin
 perform private.platform_lock();
 update public.bookings b set fulfillment_state='review' where fulfillment_state='awaiting_user'
 and exists(select 1 from public.booking_reschedules p where p.booking_id=b.id and p.status='pending' and p.expires_at<=now());
 for proposal in select p.id,p.booking_id,b.user_id from public.booking_reschedules p join public.bookings b on b.id=p.booking_id
 where p.status='accepted' and p.new_starts_at<=now() and b.status='needs_attention' loop
  perform private.cancel_inventory(proposal.booking_id,'رزرو سانس جایگزین در مهلت مقرر انجام نشد');
  update public.booking_reschedules set status='superseded' where id=proposal.id;
  perform private.notify(proposal.user_id,'مهلت رزرو سانس جایگزین تمام شد','رزرو انجام نشد و درخواست استرداد پرداخت‌های معتبر ثبت شد.','replacement-expired:'||proposal.id,'/account/bookings');
  affected:=affected+1;
 end loop;
 return affected;
end $$;

create table public.push_devices (
 device_id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 token text not null unique check(length(token) between 20 and 4096), updated_at timestamptz not null default now()
);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from public,anon,authenticated;
grant all on public.push_devices to service_role;
create function public.register_push_device(p_device uuid,p_token text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 if length(p_token) not between 20 and 4096 then raise exception 'INVALID_TOKEN'; end if;
 delete from public.push_devices where token=p_token and user_id=auth.uid() and device_id<>p_device;
 insert into public.push_devices(device_id,user_id,token) values(p_device,auth.uid(),p_token)
 on conflict(device_id) do update set user_id=excluded.user_id,token=excluded.token,updated_at=now();
end $$;
create function public.revoke_push_device(p_device uuid) returns void
language sql security definer set search_path='' as $$ delete from public.push_devices where device_id=p_device and user_id=auth.uid(); $$;

create table public.notification_deliveries (
 id bigint generated always as identity primary key,
 notification_id uuid not null references public.notifications(id) on delete cascade,
 channel text not null check(channel in ('sms','push')),
 status text not null default 'pending' check(status in ('pending','processing','sent','failed','skipped')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 lease_token uuid, lease_until timestamptz, provider_reference text, last_error text,
 created_at timestamptz not null default now(), sent_at timestamptz,
 unique(notification_id,channel)
);
create index delivery_due on public.notification_deliveries(next_attempt_at) where status in ('pending','processing');
alter table public.notification_deliveries enable row level security;
revoke all on public.notification_deliveries from public,anon,authenticated;
grant all on public.notification_deliveries to service_role;
grant select on public.notification_deliveries to authenticated;
create policy delivery_admin_read on public.notification_deliveries for select to authenticated using((select public.is_admin()));
grant usage,select on sequence public.notification_deliveries_id_seq to service_role;

create function private.enqueue_notice_delivery() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 insert into public.notification_deliveries(notification_id,channel) values(new.id,'sms'),(new.id,'push') on conflict do nothing;
 return new;
end $$;
create trigger enqueue_notice_delivery after insert on public.notifications for each row execute function private.enqueue_notice_delivery();

create function private.booking_operations_notice() returns trigger
language plpgsql security definer set search_path='' as $$ declare recipient record; begin
 if TG_OP='INSERT' then
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
create trigger booking_operations_notice after insert or update of status on public.bookings for each row execute function private.booking_operations_notice();
create function private.match_join_notice() returns trigger
language plpgsql security definer set search_path='' as $$ declare recipient record; begin
 if exists(select 1 from public.bookings where id=new.booking_id and kind='open') then
  for recipient in select distinct user_id from public.booking_participants where booking_id=new.booking_id and user_id<>new.user_id and status in ('interested','reserved','paid') loop
   perform private.notify(recipient.user_id,'بازیکن جدید به بازی پیوست','ترکیب بازیکنان بازی شما تغییر کرد؛ جزئیات را در حساب ببینید.','joined:'||new.id||':'||recipient.user_id,'/account/bookings');
  end loop;
 end if;
 return new;
end $$;
create trigger match_join_notice after insert on public.booking_participants for each row execute function private.match_join_notice();

create function public.claim_notification_deliveries(p_channels text[]) returns jsonb
language plpgsql security definer set search_path='' as $$ declare result jsonb; begin
 update public.notification_deliveries set status='failed',last_error='LEASE_EXHAUSTED',lease_until=null,lease_token=null where status='processing' and attempts>=5 and lease_until<now();
 with due as (
 select d.id from public.notification_deliveries d where d.channel=any(p_channels) and d.attempts<5 and d.next_attempt_at<=now()
 and (d.status='pending' or (d.status='processing' and d.lease_until<now())) order by d.id limit 1 for update skip locked
 ), claimed as (
 update public.notification_deliveries d set status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes'
 from due where d.id=due.id returning d.*
 ) select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('user_id',n.user_id,'title',n.title,'body',n.body,'href',n.href,'dedupe_key',n.dedupe_key)),'[]') into result from claimed c join public.notifications n on n.id=c.notification_id;
 return result;
end $$;
create function public.finish_notification_delivery(p_id bigint,p_lease uuid,p_status text,p_reference text default null,p_error text default null) returns void
language plpgsql security definer set search_path='' as $$ begin
 if p_status not in ('sent','failed','skipped') then raise exception 'INVALID_STATUS'; end if;
 update public.notification_deliveries set status=case when p_status='failed' and attempts<5 then 'pending' else p_status end,
 next_attempt_at=now()+make_interval(mins=>least(60,power(2,attempts)::integer)),provider_reference=left(p_reference,200),last_error=left(p_error,100),
 sent_at=case when p_status='sent' then now() else null end,lease_until=null,lease_token=null
 where id=p_id and lease_token=p_lease and status='processing';
end $$;

do $$ declare f record; begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in ('review_booking','propose_booking_slot','reply_booking_slot','fulfill_booking','register_push_device','revoke_push_device','claim_notification_deliveries','finish_notification_delivery','expire_booking_proposals') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end $$;
grant execute on function public.review_booking(uuid),public.propose_booking_slot(uuid,uuid,text),public.reply_booking_slot(uuid,boolean),public.fulfill_booking(uuid,text,timestamptz),public.register_push_device(uuid,text),public.revoke_push_device(uuid) to authenticated;
grant execute on function public.claim_notification_deliveries(text[]),public.finish_notification_delivery(bigint,uuid,text,text,text) to service_role;
grant execute on function public.expire_booking_proposals() to service_role;
revoke all on function private.check_replacement(uuid,uuid),private.enqueue_notice_delivery(),private.booking_operations_notice(),private.match_join_notice() from public,anon,authenticated;
do $$ begin
 if to_regclass('cron.job') is not null then
  perform cron.schedule('padel-expiry','* * * * *','select public.expire_booking_proposals(); select public.run_platform_jobs();');
 end if;
end $$;
commit;
