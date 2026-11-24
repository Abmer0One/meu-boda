-- ============================================================
-- PLATFORM PAYMENTS & LICENSING MIGRATION
-- Project: mpxlurrvohvgiompueiw
-- ============================================================

-- 1. Create public.platform_payments table if not exists
CREATE TABLE IF NOT EXISTS public.platform_payments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    event_title TEXT,
    plan_type TEXT NOT NULL DEFAULT 'Licença Casamento B2C',
    amount NUMERIC(12,2) NOT NULL DEFAULT 45000.00,
    payment_method TEXT DEFAULT 'Transferência Bancária / Multicaixa Express',
    reference_code TEXT,
    receipt_url TEXT,
    status TEXT CHECK (status IN ('Pendente', 'Aprovado', 'Recusado')) NOT NULL DEFAULT 'Pendente',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT
);

-- Enable RLS
ALTER TABLE public.platform_payments ENABLE ROW LEVEL SECURITY;

-- Grant access to all platform roles
GRANT ALL ON public.platform_payments TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "Anyone can select platform_payments" ON public.platform_payments;
CREATE POLICY "Anyone can select platform_payments" ON public.platform_payments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert platform_payments" ON public.platform_payments;
CREATE POLICY "Anyone can insert platform_payments" ON public.platform_payments
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update platform_payments" ON public.platform_payments;
CREATE POLICY "Anyone can update platform_payments" ON public.platform_payments
    FOR UPDATE USING (true) WITH CHECK (true);

-- 2. Add template_config column to events if missing
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS template_config JSONB DEFAULT '{}'::jsonb;
