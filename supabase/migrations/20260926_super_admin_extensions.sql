-- ============================================================
-- SUPER ADMIN EXTENSIONS MIGRATION
-- Run this in Supabase Dashboard SQL Editor for project mpxlurrvohvgiompueiw
-- ============================================================

-- 1. Helper to verify strict admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
         OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'amota@example.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. System Broadcasts table (Global announcement banners)
CREATE TABLE IF NOT EXISTS public.system_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'warning', 'success', 'urgent')) NOT NULL DEFAULT 'info',
    is_active BOOLEAN NOT NULL DEFAULT true,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS for system_broadcasts
ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active system broadcasts" ON public.system_broadcasts;
CREATE POLICY "Anyone can read active system broadcasts" ON public.system_broadcasts
    FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage system broadcasts" ON public.system_broadcasts;
CREATE POLICY "Admins can manage system broadcasts" ON public.system_broadcasts
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Platform Payments / Comprovativos table
CREATE TABLE IF NOT EXISTS public.platform_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    event_title TEXT,
    plan_type TEXT NOT NULL DEFAULT 'Plano Noivos Pro',
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    receipt_url TEXT,
    status TEXT CHECK (status IN ('Pendente', 'Aprovado', 'Recusado')) NOT NULL DEFAULT 'Pendente',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS for platform_payments
ALTER TABLE public.platform_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON public.platform_payments;
CREATE POLICY "Users can view own payments" ON public.platform_payments
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own payments" ON public.platform_payments;
CREATE POLICY "Users can insert own payments" ON public.platform_payments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all payments" ON public.platform_payments;
CREATE POLICY "Admins can manage all payments" ON public.platform_payments
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. RPC to update event status (Active / Archived)
CREATE OR REPLACE FUNCTION public.admin_update_event_status(
  target_event_id UUID,
  new_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required.';
  END IF;

  UPDATE public.events
  SET updated_at = NOW()
  WHERE id = target_event_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC to transfer event ownership
CREATE OR REPLACE FUNCTION public.admin_transfer_event(
  target_event_id UUID,
  new_owner_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required.';
  END IF;

  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = LOWER(TRIM(new_owner_email));

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não encontrado com o email fornecido.';
  END IF;

  UPDATE public.events
  SET user_id = target_user_id,
      updated_at = NOW()
  WHERE id = target_event_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC to get recent live check-ins across all events
CREATE OR REPLACE FUNCTION public.admin_get_recent_checkins(limit_count INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  guest_name TEXT,
  guest_companions INT,
  event_id UUID,
  event_title TEXT,
  checked_at TIMESTAMPTZ,
  operator TEXT
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    g.name::TEXT as guest_name,
    COALESCE(g.companions, 0)::INT as guest_companions,
    e.id as event_id,
    e.title::TEXT as event_title,
    c.checked_at,
    COALESCE(c.operator, 'Portaria')::TEXT as operator
  FROM public.checkins c
  JOIN public.guests g ON g.id = c.guest_id
  JOIN public.events e ON e.id = g.event_id
  ORDER BY c.checked_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
