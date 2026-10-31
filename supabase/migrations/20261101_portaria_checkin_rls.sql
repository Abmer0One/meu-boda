-- ============================================================
-- MEU BODA - PORTARIA CHECK-IN PERMISSIONS & RLS POLICIES
-- Run this script in the Supabase Dashboard SQL Editor (Project: mpxlurrvohvgiompueiw)
-- ============================================================

-- 1. Grant table privileges on public.checkins to anon role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO anon;

-- 2. Drop existing restrictive policies if necessary or augment them
DROP POLICY IF EXISTS "Allow anon select checkins" ON public.checkins;
DROP POLICY IF EXISTS "Allow anon insert checkins" ON public.checkins;
DROP POLICY IF EXISTS "Allow anon delete checkins" ON public.checkins;

-- 3. Policy: Allow anon to read check-ins
CREATE POLICY "Allow anon select checkins" ON public.checkins
    FOR SELECT TO anon
    USING (true);

-- 4. Policy: Allow anon to insert check-ins for valid guests
CREATE POLICY "Allow anon insert checkins" ON public.checkins
    FOR INSERT TO anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.guests
            WHERE guests.id = checkins.guest_id
        )
    );

-- 5. Policy: Allow anon to delete check-ins (for reverting mistakenly checked in guests)
CREATE POLICY "Allow anon delete checkins" ON public.checkins
    FOR DELETE TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.guests
            WHERE guests.id = checkins.guest_id
        )
    );
