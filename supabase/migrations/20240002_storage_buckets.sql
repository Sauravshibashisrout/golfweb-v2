-- Migration: Create storage buckets
-- charity-media: public bucket for approved charity images
-- winner-proofs: private bucket for winner score screenshots

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('charity-media', 'charity-media', true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('winner-proofs', 'winner-proofs', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- charity-media: anyone can read published charity images
CREATE POLICY IF NOT EXISTS "Public read charity-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'charity-media');

-- charity-media: only admins can upload/delete
CREATE POLICY IF NOT EXISTS "Admin insert charity-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'charity-media'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY IF NOT EXISTS "Admin delete charity-media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'charity-media'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- winner-proofs: no direct browser access — all access via signed URLs from Edge Functions
-- (no SELECT policy = no public access; Edge Functions use service role)
