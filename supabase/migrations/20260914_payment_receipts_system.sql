-- ============================================================
-- PAYMENT RECEIPTS STORAGE & POLICIES
-- Run this in Supabase Dashboard SQL Editor for project mpxlurrvohvgiompueiw
-- ============================================================

-- 1. Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage Policies for receipts bucket
DROP POLICY IF EXISTS "Allow public read receipts" ON storage.objects;
CREATE POLICY "Allow public read receipts" ON storage.objects
    FOR SELECT USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Allow authenticated upload receipts" ON storage.objects;
CREATE POLICY "Allow authenticated upload receipts" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Allow authenticated update receipts" ON storage.objects;
CREATE POLICY "Allow authenticated update receipts" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Allow authenticated delete receipts" ON storage.objects;
CREATE POLICY "Allow authenticated delete receipts" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'receipts');
