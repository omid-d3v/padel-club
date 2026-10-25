begin;
-- Keep the existing receipt ownership, bank verification and late-payment contracts.
-- Receipt review may extend the initial payment window, never a real club hold.
-- CREATE OR REPLACE preserves the existing function ACL.
create or replace function public.submit_card_receipt(p_payment uuid,p_path text) returns void
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
  deadline:=case when b.payment_first then least(p.created_at+interval '24 hours',(select starts_at from public.court_slots where id=b.slot_id),b.hold_expires_at) else p.expires_at end;
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
commit;
