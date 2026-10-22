-- Run only AFTER installing all expansion migrations and enabling pg_cron
-- in the existing Supabase project's Extensions settings.
-- This schedules SQL expiry only. The HTTP worker is configured separately.
do $$
declare job record;
begin
  for job in select jobid from cron.job where jobname='padel-expiry' loop
    perform cron.unschedule(job.jobid);
  end loop;
  perform cron.schedule('padel-expiry','* * * * *','select public.run_platform_jobs();');
end $$;
