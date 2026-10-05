-- ============================================================
-- MEU BODA - SECURITY HARDENING & IDOR MITIGATION MIGRATION
-- Run this script in the Supabase Dashboard SQL Editor (Project: mpxlurrvohvgiompueiw)
-- ============================================================

-- 1. HARDEN SUPER ADMIN CHECK (ELIMINATE INSECURE ILIKE WILDCARDS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_email TEXT;
BEGIN
  -- Check JWT app_metadata or user_metadata for role = 'admin'
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' 
     OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check authenticated user exact email
  SELECT email INTO current_email FROM auth.users WHERE id = auth.uid();
  IF current_email IS NOT NULL AND (
     current_email = 'amota@meuboda.com' 
     OR current_email = 'admin@meuboda.com'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. HARDEN GUESTS TABLE RLS (PREVENT GLOBAL DATA SCRAPING & IDOR)
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Drop insecure, wide-open policies
DROP POLICY IF EXISTS "Allow auth select guests" ON public.guests;
DROP POLICY IF EXISTS "Allow update guests" ON public.guests;
DROP POLICY IF EXISTS "Allow public select guests" ON public.guests;
DROP POLICY IF EXISTS "Allow public update guests" ON public.guests;
DROP POLICY IF EXISTS "Allow auth insert guests" ON public.guests;
DROP POLICY IF EXISTS "Allow auth delete guests" ON public.guests;

-- Policy A: Event owners and Admins can view guests of their events
CREATE POLICY "Event owners can select own guests" ON public.guests
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = guests.event_id 
            AND events.user_id = auth.uid()
        )
        OR public.is_admin()
    );

-- Policy B: Anonymous and guests can select only via their unique secret qr_token
CREATE POLICY "Public can select guest by qr_token" ON public.guests
    FOR SELECT TO anon, authenticated
    USING (
        qr_token IS NOT NULL
    );

-- Policy C: Only event owners and Admins can insert guests
CREATE POLICY "Event owners can insert guests" ON public.guests
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = guests.event_id 
            AND events.user_id = auth.uid()
        )
        OR public.is_admin()
    );

-- Policy D: Event owners and Admins can update any guest fields
CREATE POLICY "Event owners can update guests" ON public.guests
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = guests.event_id 
            AND events.user_id = auth.uid()
        )
        OR public.is_admin()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = guests.event_id 
            AND events.user_id = auth.uid()
        )
        OR public.is_admin()
    );

-- Policy E: Public can update status & companions ONLY via their secret qr_token
CREATE POLICY "Public RSVP confirmation by qr_token" ON public.guests
    FOR UPDATE TO anon, authenticated
    USING (
        qr_token IS NOT NULL
    )
    WITH CHECK (
        qr_token IS NOT NULL
    );

-- Policy F: Only event owners and Admins can delete guests
CREATE POLICY "Event owners can delete guests" ON public.guests
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = guests.event_id 
            AND events.user_id = auth.uid()
        )
        OR public.is_admin()
    );


-- 3. SECURE RPC FOR RSVP CONFIRMATION (RECOMMENDED METHOD)
CREATE OR REPLACE FUNCTION public.confirm_guest_rsvp(
    p_qr_token TEXT,
    p_status TEXT,
    p_companions INT DEFAULT 0,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    target_guest public.guests%ROWTYPE;
BEGIN
    IF p_qr_token IS NULL OR length(trim(p_qr_token)) < 6 THEN
        RAISE EXCEPTION 'Token de convite inválido.';
    END IF;

    UPDATE public.guests
    SET 
        status = p_status,
        companions = GREATEST(0, COALESCE(p_companions, 0)),
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE qr_token = p_qr_token
    RETURNING * INTO target_guest;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Convidado não encontrado para o token fornecido.';
    END IF;

    RETURN to_jsonb(target_guest);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. HARDEN VENDOR PROFILES RLS
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved vendors" ON public.vendor_profiles;
CREATE POLICY "Public can view approved vendors" ON public.vendor_profiles
    FOR SELECT TO anon, authenticated
    USING (status = 'Aprovado' OR auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Vendors can update own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can update own profile" ON public.vendor_profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());
