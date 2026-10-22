alter table public.courts add column sport text not null default 'padel' check(sport in ('padel','tennis','beach_tennis','squash','badminton','other'));
update public.courts set sport='tennis' where name in ('تنیس A','تنیس B');
update public.courts set sport='beach_tennis' where name in ('تنیس ساحلی 1','تنیس ساحلی 2');
create table public.discount_codes (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[A-Z0-9_-]{3,40}$'),
 kind text not null check(kind in ('percent','fixed')), value bigint not null check(value>0),
 max_uses integer not null check(max_uses between 1 and 100000), expires_at timestamptz not null, active boolean not null default true,
 check(kind<>'percent' or value<=100)
);
create table public.booking_benefits (
 id uuid primary key default gen_random_uuid(), participant_id uuid not null unique references public.booking_participants(id),
 user_id uuid not null references auth.users(id), code_id uuid references public.discount_codes(id),
 actor_id uuid not null references auth.users(id), reason text not null, original jsonb not null, discount bigint not null check(discount>=0), created_at timestamptz not null default now(),
 unique(user_id,code_id)
);
alter table public.discount_codes enable row level security;
alter table public.booking_benefits enable row level security;
revoke all on public.discount_codes,public.booking_benefits from anon,authenticated;
grant select,insert,update on public.discount_codes to authenticated;
grant select on public.booking_benefits to authenticated;
create policy admin_codes on public.discount_codes for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy read_benefits on public.booking_benefits for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()));
create trigger audit_platform_change after insert or update on public.discount_codes for each row execute function private.audit_change();
create trigger audit_platform_change after insert or update on public.booking_benefits for each row execute function private.audit_change();
create function public.apply_booking_benefit(p_participant uuid,p_code text default null,p_reason text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare bp public.booking_participants; b public.bookings; c public.discount_codes; existing uuid; total bigint; reduction bigint; remaining bigint; a bigint; d bigint; e bigint; f bigint; result uuid; admin_waiver boolean:=p_code is null;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 perform private.platform_lock();
 select * into bp from public.booking_participants where id=p_participant for update;
 if bp.id is null or (admin_waiver and not public.is_admin()) or (not admin_waiver and bp.user_id<>auth.uid()) then raise exception 'NOT_ALLOWED'; end if;
 select id into existing from public.booking_benefits where participant_id=bp.id;
 if found and (not admin_waiver or bp.status='paid') then return existing; end if;
 select * into b from public.bookings where id=bp.booking_id for update;
 if bp.status<>'reserved' or bp.lock_expires_at is null or bp.lock_expires_at<=now() or b.hold_expires_at is null or b.hold_expires_at<=now() or b.status not in ('awaiting_payment','collecting') or exists(select 1 from public.open_matches where booking_id=b.id and cutoff_at<=now()) then raise exception 'NOT_PAYABLE'; end if;
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
revoke all on function public.apply_booking_benefit(uuid,text,text) from public,anon,authenticated;
grant execute on function public.apply_booking_benefit(uuid,text,text) to authenticated;
create index benefits_code_usage on public.booking_benefits(code_id);
create index benefits_owner on public.booking_benefits(user_id);
