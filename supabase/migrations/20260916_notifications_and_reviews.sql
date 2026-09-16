-- ============================================================
-- NOTIFICATIONS, REVIEWS & VENDOR PROVINCES MIGRATION
-- Run this in Supabase SQL Editor for project mpxlurrvohvgiompueiw
-- ============================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- 'info', 'payment', 'proposal', 'chat', 'rsvp'
    link TEXT,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated, service_role;
GRANT SELECT ON public.notifications TO anon;

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Create vendor_reviews table
CREATE TABLE IF NOT EXISTS public.vendor_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendor_profiles(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    client_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.vendor_reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_reviews TO authenticated, service_role;
GRANT SELECT ON public.vendor_reviews TO anon;

DROP POLICY IF EXISTS "Anyone can read vendor reviews" ON public.vendor_reviews;
CREATE POLICY "Anyone can read vendor reviews" ON public.vendor_reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated clients can insert reviews" ON public.vendor_reviews;
CREATE POLICY "Authenticated clients can insert reviews" ON public.vendor_reviews
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can update own reviews" ON public.vendor_reviews;
CREATE POLICY "Clients can update own reviews" ON public.vendor_reviews
    FOR UPDATE TO authenticated USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can delete own reviews" ON public.vendor_reviews;
CREATE POLICY "Clients can delete own reviews" ON public.vendor_reviews
    FOR DELETE TO authenticated USING (auth.uid() = client_id);

-- 3. Add province column to vendor_profiles if not exists
ALTER TABLE public.vendor_profiles
ADD COLUMN IF NOT EXISTS province TEXT DEFAULT 'Luanda';

-- 4. Enable Supabase Realtime for notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
