-- ============================================================
-- VENDOR MARKETPLACE & FORNECEDORES TABLES (PRODUCTION RUN)
-- Run this in Supabase Dashboard SQL Editor for project mpxlurrvohvgiompueiw
-- ============================================================

-- 1. Create vendor_profiles table
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    nif TEXT,
    iban TEXT,
    logo_url TEXT,
    category TEXT NOT NULL DEFAULT 'Outro',
    description TEXT,
    daily_limit INTEGER NOT NULL DEFAULT 1,
    blocked_dates DATE[] DEFAULT '{}'::DATE[],
    status TEXT CHECK (status IN ('Pendente', 'Aprovado', 'Suspenso')) NOT NULL DEFAULT 'Aprovado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Create vendor_services (portfolio) table
CREATE TABLE IF NOT EXISTS public.vendor_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendor_profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    image_urls TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Create chat_rooms table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID REFERENCES public.vendor_profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_event_vendor UNIQUE(event_id, vendor_id)
);

-- 4. Create vendor_contracts table
CREATE TABLE IF NOT EXISTS public.vendor_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID REFERENCES public.vendor_profiles(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    service_title TEXT NOT NULL,
    total_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_installments JSONB DEFAULT '[]'::JSONB,
    pdf_url TEXT,
    status TEXT CHECK (status IN ('Pendente', 'Ativo', 'Recusado', 'Concluido')) NOT NULL DEFAULT 'Pendente',
    event_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    proposal_id UUID REFERENCES public.vendor_contracts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;

-- 7. Grant Permissions to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_profiles TO authenticated, service_role;
GRANT SELECT ON public.vendor_profiles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_services TO authenticated, service_role;
GRANT SELECT ON public.vendor_services TO anon;

GRANT ALL ON public.chat_rooms TO authenticated, service_role;
GRANT ALL ON public.chat_messages TO authenticated, service_role;
GRANT ALL ON public.vendor_contracts TO authenticated, service_role;

-- 8. Setup RLS Policies (Idempotent)

-- Vendor Profiles Policies
DROP POLICY IF EXISTS "Everyone can read vendor profiles" ON public.vendor_profiles;
CREATE POLICY "Everyone can read vendor profiles" ON public.vendor_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage own vendor profile" ON public.vendor_profiles;
CREATE POLICY "Owners can manage own vendor profile" ON public.vendor_profiles
    FOR ALL USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Vendor Services Policies
DROP POLICY IF EXISTS "Everyone can read vendor services" ON public.vendor_services;
CREATE POLICY "Everyone can read vendor services" ON public.vendor_services
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage own services" ON public.vendor_services;
CREATE POLICY "Owners can manage own services" ON public.vendor_services
    FOR ALL USING (auth.uid() = vendor_id)
    WITH CHECK (auth.uid() = vendor_id);

-- Chat Rooms Policies
DROP POLICY IF EXISTS "Users involved can access chat_rooms" ON public.chat_rooms;
CREATE POLICY "Users involved can access chat_rooms" ON public.chat_rooms
    FOR ALL USING (
        auth.uid() = vendor_id OR 
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = chat_rooms.event_id AND events.user_id = auth.uid()
        )
    );

-- Chat Messages Policies
DROP POLICY IF EXISTS "Users involved can access chat_messages" ON public.chat_messages;
CREATE POLICY "Users involved can access chat_messages" ON public.chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE chat_rooms.id = chat_messages.room_id AND (
                chat_rooms.vendor_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.events
                    WHERE events.id = chat_rooms.event_id AND events.user_id = auth.uid()
                )
            )
        )
    );

-- Vendor Contracts Policies
DROP POLICY IF EXISTS "Users involved can access vendor_contracts" ON public.vendor_contracts;
CREATE POLICY "Users involved can access vendor_contracts" ON public.vendor_contracts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE chat_rooms.id = vendor_contracts.room_id AND (
                chat_rooms.vendor_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.events
                    WHERE events.id = chat_rooms.event_id AND events.user_id = auth.uid()
                )
            )
        )
    );

-- 9. Trigger for automatic vendor profile initialization on user registration
CREATE OR REPLACE FUNCTION public.handle_new_vendor_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF (new.raw_user_meta_data->>'role' = 'vendor') THEN
    INSERT INTO public.vendor_profiles (id, company_name, category, status)
    VALUES (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', 'Minha Empresa de Serviços'),
      'Fotografia',
      'Aprovado'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_vendor ON auth.users;
CREATE TRIGGER on_auth_user_created_vendor
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_vendor_profile();
