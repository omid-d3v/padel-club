-- Read-only checks. Counts contain no customer PII or credentials.
BEGIN READ ONLY;
select current_setting('server_version') as postgres_version;
select count(*) as users from auth.users;
select count(*) as admins from public.admins;
select count(*) as profiles from public.user_profiles;
select count(*) as bookings from public.bookings;
select count(*) as payments from public.payments;
select count(*) as receipts from public.card_transfer_receipts;
select count(*) as objects_metadata from storage.objects;
select id,public,file_size_limit from storage.buckets order by id;
select version from _matchsho_deploy.migrations order by version;
DO $verify$ DECLARE item text; BEGIN
FOREACH item IN ARRAY ARRAY['admins','user_profiles','bookings','payments','payment_settings','card_transfer_receipts'] LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=item AND c.relrowsecurity) THEN RAISE EXCEPTION 'Missing RLS: %',item; END IF;
END LOOP;
IF has_function_privilege('anon','public.review_card_receipt(uuid,integer,boolean,text,text)','execute') THEN RAISE EXCEPTION 'Anonymous receipt review is unsafe'; END IF;
IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='payment-receipts' AND public) THEN RAISE EXCEPTION 'Receipt bucket must stay private'; END IF;
END $verify$;
select jobname,active,schedule from cron.job where jobname in ('padel-expiry','rallyyar-calendar-sync');
COMMIT;
