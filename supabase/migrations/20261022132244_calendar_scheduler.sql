-- pg_cron wakes a reader once a minute; each connection's next_sync_at controls its own interval.
-- An independent Vault token authenticates the Edge Function (no public-key auth bypass).
create function public.calendar_worker_authorized(p_token text) returns boolean
language plpgsql security definer set search_path='' as $$
declare valid boolean; begin
 if to_regclass('vault.decrypted_secrets') is null then return false; end if;
 execute 'select exists(select 1 from vault.decrypted_secrets where name=''calendar_worker_token'' and decrypted_secret=$1)' into valid using p_token;
 return valid;
end $$;
create function private.dispatch_calendar_sync() returns bigint
language plpgsql security definer set search_path='' as $$
declare target text; token text; request_id bigint; begin
 if to_regclass('vault.decrypted_secrets') is null then return null; end if;
 execute 'select decrypted_secret from vault.decrypted_secrets where name=''calendar_worker_url'' limit 1' into target;
 execute 'select decrypted_secret from vault.decrypted_secrets where name=''calendar_worker_token'' limit 1' into token;
 if target is null or token is null or not exists(select 1 from public.calendar_connections where enabled and next_sync_at<=now() and (lease_until is null or lease_until<now())) then return null; end if;
 execute 'select net.http_post(url:=$1,headers:=$2,body:=''{}''::jsonb,timeout_milliseconds:=150000)' into request_id
 using target,jsonb_build_object('Content-Type','application/json','x-calendar-token',token);
 return request_id;
end $$;
create function public.calendar_scheduler_status() returns jsonb
language plpgsql security definer set search_path='' as $$
declare active boolean:=false; configured boolean:=false; begin
 if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if to_regclass('cron.job') is not null then execute 'select exists(select 1 from cron.job where jobname=''rallyyar-calendar-sync'' and active)' into active; end if;
 if to_regclass('vault.secrets') is not null then execute 'select count(distinct name)=2 from vault.secrets where name in (''calendar_worker_url'',''calendar_worker_token'')' into configured; end if;
 return jsonb_build_object('active',active,'configured',configured);
end $$;
revoke all on function public.calendar_worker_authorized(text),public.calendar_scheduler_status(),private.dispatch_calendar_sync() from public,anon,authenticated;
grant execute on function public.calendar_worker_authorized(text) to service_role;
grant execute on function public.calendar_scheduler_status() to authenticated;
do $$ begin
 if exists(select 1 from pg_available_extensions where name='pg_net') and to_regclass('cron.job') is not null and to_regclass('vault.secrets') is not null then
   execute 'create extension if not exists pg_net';
   if not exists(select 1 from vault.secrets where name='calendar_worker_token') then
     perform vault.create_secret(gen_random_uuid()::text||gen_random_uuid()::text,'calendar_worker_token');
   end if;
   perform cron.schedule('rallyyar-calendar-sync','* * * * *','select private.dispatch_calendar_sync()');
 end if;
end $$;
