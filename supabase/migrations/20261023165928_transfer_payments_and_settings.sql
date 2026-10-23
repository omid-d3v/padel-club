begin;
create table public.payment_settings (
 id boolean primary key default true check(id), zarinpal_enabled boolean not null default true,
 card_enabled boolean not null default false, card_number text not null default '', card_holder text not null default '',
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id),
 check(not card_enabled or (card_number ~ '^[0-9]{16}$' and length(trim(card_holder)) between 2 and 100))
);
insert into public.payment_settings(id) values(true);
alter table public.payment_settings enable row level security;
revoke all on public.payment_settings from public,anon,authenticated;
grant select on public.payment_settings to authenticated;
grant all on public.payment_settings to service_role;
create policy payment_settings_read on public.payment_settings for select to authenticated using(true);
create trigger audit_payment_settings after update on public.payment_settings for each row execute function private.audit_change();
alter table public.payments drop constraint payments_provider_check;
alter table public.payments add constraint payments_provider_check check(provider in ('zarinpal','card_transfer'));

create table public.card_transfer_receipts (
 id uuid primary key default gen_random_uuid(), payment_id uuid not null unique references public.payments(id),
 user_id uuid not null references auth.users(id), card_number text not null, card_holder text not null,
 status text not null default 'draft' check(status in ('draft','pending','approved','rejected')),
 receipt_path text, revision integer not null default 0, rejection_reason text, bank_reference text,
 submitted_at timestamptz, reviewed_at timestamptz, reviewed_by uuid references auth.users(id),
 created_at timestamptz not null default now(), check(status='draft' or receipt_path is not null),
 check(status<>'rejected' or length(trim(rejection_reason)) between 3 and 500)
);
create index transfer_receipt_queue on public.card_transfer_receipts(status,submitted_at);
alter table public.card_transfer_receipts enable row level security;
revoke all on public.card_transfer_receipts from public,anon,authenticated;
grant select on public.card_transfer_receipts to authenticated;
grant all on public.card_transfer_receipts to service_role;
create policy own_transfer_receipt on public.card_transfer_receipts for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()));
create trigger audit_transfer_receipt after insert or update on public.card_transfer_receipts for each row execute function private.audit_change();

create function public.save_payment_settings(p_zarinpal boolean,p_card boolean,p_number text,p_holder text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if p_zarinpal is null or p_card is null or p_number is null or p_holder is null or length(p_number)>16 or length(trim(p_holder))>100
 or (p_card and (p_number !~ '^[0-9]{16}$' or length(trim(p_holder))<2)) then raise exception 'INVALID_CARD'; end if;
 perform private.platform_lock();
 update public.payment_settings set zarinpal_enabled=p_zarinpal,card_enabled=p_card,card_number=p_number,card_holder=trim(p_holder),updated_at=now(),updated_by=auth.uid() where id;
end $$;





-- Uploads are immutable, private, tied to an owned draft/rejected payment. No UPDATE/DELETE policy.
do $$ begin if to_regclass('storage.buckets') is not null then
 insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('payment-receipts','payment-receipts',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
 execute $policy$create policy receipt_upload on storage.objects for insert to authenticated with check (
 bucket_id='payment-receipts' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.card_transfer_receipts r join public.payments p on p.id=r.payment_id where r.user_id=(select auth.uid()) and r.payment_id::text=(storage.foldername(name))[2] and r.status in ('draft','rejected') and p.provider='card_transfer' and p.created_at>now()-interval '7 days'))$policy$;
 execute $policy$create policy receipt_read on storage.objects for select to authenticated using (
 bucket_id='payment-receipts' and exists(select 1 from public.card_transfer_receipts r where r.receipt_path=name and (r.user_id=(select auth.uid()) or (select public.is_admin()))))$policy$;
 end if; end $$;

create function public.submit_card_receipt(p_payment uuid,p_path text) returns void
language plpgsql security definer set search_path='' as $$
declare p public.payments; r public.card_transfer_receipts; b public.bookings; er public.event_registrations; deadline timestamptz; uploaded boolean; recipient record; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform private.platform_lock();
 select * into p from public.payments where id=p_payment for update;
 select * into r from public.card_transfer_receipts where payment_id=p.id for update;
 if p.id is null or p.user_id is distinct from auth.uid() or p.provider<>'card_transfer' or r.id is null then raise exception 'FORBIDDEN'; end if;
 if r.status='pending' and r.receipt_path=p_path then return; end if;
 if r.status not in ('draft','rejected') or p.status not in ('created','failed') or p.created_at<=now()-interval '7 days' then raise exception 'PAYMENT_CONFLICT'; end if;
 if p_path is null or p_path !~ ('^'||auth.uid()::text||'/'||p.id::text||'/[0-9a-f-]+[.](jpg|png|webp)$') then raise exception 'INVALID_RECEIPT'; end if;
 if to_regclass('storage.objects') is not null then
  execute 'select exists(select 1 from storage.objects where bucket_id=''payment-receipts'' and name=$1)' into uploaded using p_path;
  if not uploaded then raise exception 'INVALID_RECEIPT'; end if;
 end if;
 if p.participant_id is not null then
  select bk.* into b from public.bookings bk join public.booking_participants bp on bp.booking_id=bk.id where bp.id=p.participant_id;
  deadline:=p.expires_at;
  if b.status in ('awaiting_payment','collecting') and p.expires_at>now() and exists(select 1 from public.booking_participants where id=p.participant_id and status='reserved' and lock_expires_at>now()) then
  deadline:=case when b.payment_first then least(p.created_at+interval '24 hours',(select starts_at from public.court_slots where id=b.slot_id)) else p.expires_at end;
  update public.bookings set payment_deadline=case when payment_first then deadline else payment_deadline end,request_expires_at=case when payment_first then deadline else request_expires_at end where id=b.id;
  update public.booking_participants set lock_expires_at=deadline where id=p.participant_id and status='reserved';
  end if;
 else
  select * into er from public.event_registrations where id=p.registration_id;
  deadline:=p.expires_at;
 end if;
 if exists(select 1 from public.payments other where other.id<>p.id and (other.participant_id=p.participant_id or other.registration_id=p.registration_id) and other.status in ('created','pending','paid','needs_attention')) then raise exception 'PAYMENT_CONFLICT'; end if;
 update public.payments set status='pending',expires_at=deadline where id=p.id;
 update public.card_transfer_receipts set receipt_path=p_path,status='pending',revision=revision+1,submitted_at=now(),reviewed_at=null,reviewed_by=null,rejection_reason=null where id=r.id;
 perform private.notify(p.user_id,'رسید واریز ثبت شد','رسید شما در انتظار بررسی است؛ دوباره واریز نکنید. تأیید پرداخت و تأیید نهایی رزرو جداگانه اطلاع‌رسانی می‌شوند.','receipt:'||r.id||':'||(r.revision+1),'/account/payments/'||p.id);
 for recipient in select user_id from public.admins loop
  perform private.notify(recipient.user_id,'رسید کارت‌به‌کارت جدید','رسید واریز برای بررسی و تطبیق با گردش حساب ثبت شد.','admin:receipt:'||r.id||':'||(r.revision+1)||':'||recipient.user_id,'/admin/operations?tab=receipts');
 end loop;
end $$;

create or replace function private.prepare_checkout(p_participant uuid,p_registration uuid,p_provider text) returns uuid language plpgsql security definer set search_path='' as $$
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
 if p.provider=p_provider then return p.id; end if;
 if p.status<>'created' or p.authority is not null or exists(select 1 from public.card_transfer_receipts where payment_id=p.id and status in ('pending','approved')) then raise exception 'PAYMENT_CONFLICT'; end if;
 update public.payments set status='failed' where id=p.id;
 end if;
 insert into public.payments(user_id,participant_id,registration_id,amount,request_key,expires_at,provider) values(auth.uid(),p_participant,p_registration,amount,gen_random_uuid(),deadline,p_provider) returning id into p.id;
 return p.id;
end; $$;
create or replace function private.apply_verified_payment(p_payment uuid,p_reference text,p_amount bigint) returns void language plpgsql security definer set search_path='' as $$
declare p public.payments; bp public.booking_participants; b public.bookings; er public.event_registrations; ev public.platform_events; valid boolean:=false; active_attempt boolean;
begin
 perform private.platform_lock(); select * into p from public.payments where id=p_payment for update;
 if not found or p.amount<>p_amount or (p.provider='zarinpal' and p.authority is null) or length(trim(p_reference))<1 then raise exception 'PAYMENT_MISMATCH'; end if;
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

create function public.start_payment(p_participant uuid default null,p_registration uuid default null,p_provider text default 'zarinpal') returns uuid
language plpgsql security definer set search_path='' as $$
declare settings public.payment_settings; pid uuid; begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform private.platform_lock(); select * into settings from public.payment_settings where id;
 if p_provider is null or p_provider not in ('zarinpal','card_transfer') or (p_provider='zarinpal' and not settings.zarinpal_enabled) or (p_provider='card_transfer' and not settings.card_enabled) then raise exception 'PAYMENT_METHOD_DISABLED'; end if;
 pid:=private.prepare_checkout(p_participant,p_registration,p_provider);
 if p_provider='card_transfer' then
 insert into public.card_transfer_receipts(payment_id,user_id,card_number,card_holder)
 values(pid,auth.uid(),settings.card_number,settings.card_holder) on conflict(payment_id) do nothing;
 end if;
 return pid;
end $$;
create or replace function public.start_checkout(p_participant uuid default null,p_registration uuid default null) returns uuid
language sql security definer set search_path='' as $$ select public.start_payment(p_participant,p_registration,'zarinpal'); $$;

create or replace function public.settle_payment(p_payment uuid,p_reference text,p_amount bigint) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not exists(select 1 from public.payments where id=p_payment and provider='zarinpal') then raise exception 'PAYMENT_METHOD_MISMATCH'; end if;
 perform private.apply_verified_payment(p_payment,p_reference,p_amount);
end $$;

create function public.review_card_receipt(p_receipt uuid,p_revision integer,p_accept boolean,p_reason text default '',p_bank_reference text default '') returns void
language plpgsql security definer set search_path='' as $$
declare r public.card_transfer_receipts; p public.payments; begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 perform private.platform_lock(); select * into r from public.card_transfer_receipts where id=p_receipt for update;
 select * into p from public.payments where id=r.payment_id for update;
 if r.id is null or p.provider<>'card_transfer' then raise exception 'INVALID_RECEIPT'; end if;
 if r.status='approved' and p_accept and r.revision=p_revision and r.bank_reference=trim(p_bank_reference) then return; end if;
 if p_accept is null or r.status<>'pending' or r.revision is distinct from p_revision or p.status<>'pending' then raise exception 'STALE_RECEIPT'; end if;
 if p_accept then
  if p_bank_reference is null or length(trim(p_bank_reference)) not between 3 and 100 then raise exception 'BANK_REFERENCE_REQUIRED'; end if;
  perform private.apply_verified_payment(p.id,'card:'||trim(p_bank_reference),p.amount);
  update public.card_transfer_receipts set status='approved',bank_reference=trim(p_bank_reference),reviewed_at=now(),reviewed_by=auth.uid() where id=r.id;
  perform private.notify(p.user_id,'واریز شما تأیید شد',case when (select status from public.payments where id=p.id)='paid' then 'پرداخت کارت‌به‌کارت تأیید شد. وضعیت تأیید نهایی رزرو را در حساب دنبال کنید.' else 'واریز تأیید شد، اما رزرو دیگر معتبر نبود؛ درخواست استرداد وجه ثبت شد.' end,'receipt-approved:'||r.id||':'||r.revision,'/account/payments/'||p.id);
 else
  if p_reason is null or length(trim(p_reason)) not between 3 and 500 then raise exception 'REASON_REQUIRED'; end if;
  update public.payments set status='failed' where id=p.id;
  update public.card_transfer_receipts set status='rejected',rejection_reason=trim(p_reason),reviewed_at=now(),reviewed_by=auth.uid() where id=r.id;
  perform private.notify(p.user_id,'رسید نیازمند اصلاح است',trim(p_reason)||'؛ اگر وجه از حسابتان کسر شده، دوباره واریز نکنید و رسید را اصلاح کنید.','receipt-rejected:'||r.id||':'||r.revision,'/account/payments/'||p.id);
 end if;
end $$;

-- A gateway worker must never claim an off-line receipt as an on-line request.
create or replace function public.claim_payment_request(p_payment uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.payments set status='needs_attention' where id=p_payment and provider='zarinpal' and status='created' and authority is null and expires_at>now();
 return found;
end $$;
create or replace function public.attach_payment_authority(p_payment uuid,p_authority text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.platform_lock();
 update public.payments set authority=p_authority,status='pending' where id=p_payment and provider='zarinpal' and status in ('created','needs_attention') and authority is null;
 if not found and not exists(select 1 from public.payments where id=p_payment and provider='zarinpal' and authority=p_authority) then raise exception 'PAYMENT_CONFLICT'; end if;
end $$;
revoke all on function private.prepare_checkout(uuid,uuid,text),private.apply_verified_payment(uuid,text,bigint) from public,anon,authenticated,service_role;
revoke all on function public.start_payment(uuid,uuid,text),public.save_payment_settings(boolean,boolean,text,text),public.submit_card_receipt(uuid,text),public.review_card_receipt(uuid,integer,boolean,text,text) from public,anon,authenticated;
grant execute on function public.start_payment(uuid,uuid,text),public.save_payment_settings(boolean,boolean,text,text),public.submit_card_receipt(uuid,text),public.review_card_receipt(uuid,integer,boolean,text,text) to authenticated;
commit;
