-- pg_cron is provided by Supabase; test PostgreSQL without this extension skips scheduling.
do $$
begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
  execute 'create extension if not exists pg_cron with schema pg_catalog';
  perform cron.schedule('padel-expiry','* * * * *','select public.run_platform_jobs();');
 end if;
end $$;
