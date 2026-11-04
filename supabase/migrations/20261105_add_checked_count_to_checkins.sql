-- Add checked_count column to public.checkins to support partial entries per invitation
ALTER TABLE public.checkins 
ADD COLUMN IF NOT EXISTS checked_count INT DEFAULT 1;

COMMENT ON COLUMN public.checkins.checked_count IS 'Number of people admitted in this specific checkin event (supports partial arrivals)';
