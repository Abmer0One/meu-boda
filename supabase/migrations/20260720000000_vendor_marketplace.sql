-- Migration: Vendor Marketplace and Communication tables
-- Enable RLS and setup CRUD permissions for clients and vendors

-- 1. Create vendor_profiles table
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    nif TEXT,
    iban TEXT,
    logo_url TEXT,
    category TEXT NOT NULL,
    description TEXT,
    daily_limit INTEGER NOT NULL DEFAULT 1,
    blocked_dates DATE[] DEFAULT '{}'::DATE[],
    status TEXT CHECK (status IN ('Pendente', 'Aprovado', 'Suspenso')) NOT NULL DEFAULT 'Pendente',
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;

-- 6. Setup RLS Policies

-- Vendor Profiles: everyone can view, owners can manage
CREATE POLICY "Everyone can read vendor profiles" ON public.vendor_profiles
    FOR SELECT USING (true);

CREATE POLICY "Owners can manage own vendor profile" ON public.vendor_profiles
    FOR ALL USING (auth.uid() = id);

-- Vendor Services: everyone can view, owners can manage
CREATE POLICY "Everyone can read vendor services" ON public.vendor_services
    FOR SELECT USING (true);

CREATE POLICY "Owners can manage own services" ON public.vendor_services
    FOR ALL USING (auth.uid() = vendor_id);

-- Chat Rooms: only involved users can select/insert/update/delete
CREATE POLICY "Users involved can access chat_rooms" ON public.chat_rooms
    FOR ALL USING (
        auth.uid() = vendor_id OR 
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = chat_rooms.event_id AND events.user_id = auth.uid()
        )
    );

-- Chat Messages: only users involved in the room can access
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

-- Vendor Contracts: only users involved in the room can access
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
