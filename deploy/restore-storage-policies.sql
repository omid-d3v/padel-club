-- Cloud's filtered schema dump excludes storage, including application policies.
-- Run as the internal admin after restoring/baselining the app schema; policy
-- creation needs both Storage ownership rights and auth-schema name resolution.
-- Restore missing application policies only; retain existing/custom policies.
\set ON_ERROR_STOP on
BEGIN;
SELECT pg_advisory_xact_lock(819240, 2);
DO $restore$
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'Initialize Supabase Storage before restoring its policies';
  END IF;
  INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  VALUES
    ('club-images','club-images',true,3145728,ARRAY['image/jpeg','image/png','image/webp']),
    ('avatars','avatars',true,2097152,ARRAY['image/jpeg','image/png','image/webp']),
    ('payment-receipts','payment-receipts',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
  ON CONFLICT(id) DO NOTHING;
  IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='payment-receipts' AND public) THEN
    RAISE EXCEPTION 'Receipt bucket must stay private';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='platform_club_images') THEN
    CREATE POLICY platform_club_images ON storage.objects FOR ALL TO authenticated
      USING (bucket_id='club-images' AND public.is_admin())
      WITH CHECK (bucket_id='club-images' AND public.is_admin());
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='platform_own_avatar') THEN
    CREATE POLICY platform_own_avatar ON storage.objects FOR ALL TO authenticated
      USING (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text)
      WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='receipt_upload') THEN
    CREATE POLICY receipt_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
      bucket_id='payment-receipts' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
      AND EXISTS (
        SELECT 1 FROM public.card_transfer_receipts r JOIN public.payments p ON p.id=r.payment_id
        WHERE r.user_id=(SELECT auth.uid())
          AND r.payment_id::text=(storage.foldername(name))[2]
          AND r.status IN ('draft','rejected') AND p.provider='card_transfer'
          AND p.created_at>now()-INTERVAL '7 days'
      )
    );
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='receipt_read') THEN
    CREATE POLICY receipt_read ON storage.objects FOR SELECT TO authenticated USING (
      bucket_id='payment-receipts' AND EXISTS (
        SELECT 1 FROM public.card_transfer_receipts r WHERE r.receipt_path=name
          AND (r.user_id=(SELECT auth.uid()) OR (SELECT public.is_admin()))
      )
    );
  END IF;
END $restore$;
COMMIT;
