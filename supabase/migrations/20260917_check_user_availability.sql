-- ============================================================
-- CHECK USER AVAILABILITY (EMAIL & PHONE) RPC
-- Run this in Supabase SQL Editor for project mpxlurrvohvgiompueiw
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_user_availability(
  check_email TEXT DEFAULT NULL,
  check_phone TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  email_taken BOOLEAN := false;
  phone_taken BOOLEAN := false;
  clean_email TEXT;
  clean_phone TEXT;
BEGIN
  -- 1. Check email availability
  IF check_email IS NOT NULL AND length(trim(check_email)) > 3 THEN
    clean_email := lower(trim(check_email));
    
    -- Check in auth.users
    SELECT EXISTS (
      SELECT 1 FROM auth.users 
      WHERE lower(trim(email)) = clean_email
    ) INTO email_taken;

    -- Also check in vendor_profiles
    IF NOT email_taken THEN
      SELECT EXISTS (
        SELECT 1 FROM public.vendor_profiles 
        WHERE lower(trim(email)) = clean_email
      ) INTO email_taken;
    END IF;
  END IF;

  -- 2. Check phone availability
  IF check_phone IS NOT NULL AND length(trim(check_phone)) >= 9 THEN
    -- Extract digits only
    clean_phone := regexp_replace(check_phone, '[^0-9]', '', 'g');
    
    IF length(clean_phone) >= 9 THEN
      -- In Angola phone numbers are 9 digits (or international with prefix +244...)
      -- Compare using the last 9 digits
      SELECT EXISTS (
        SELECT 1 FROM auth.users
        WHERE (phone IS NOT NULL AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE '%' || right(clean_phone, 9))
           OR (raw_user_meta_data->>'phone' IS NOT NULL AND regexp_replace(raw_user_meta_data->>'phone', '[^0-9]', '', 'g') LIKE '%' || right(clean_phone, 9))
      ) INTO phone_taken;

      IF NOT phone_taken THEN
        SELECT EXISTS (
          SELECT 1 FROM public.vendor_profiles
          WHERE phone IS NOT NULL AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE '%' || right(clean_phone, 9)
        ) INTO phone_taken;
      END IF;
    END IF;
  END IF;

  RETURN json_build_object(
    'email_available', NOT email_taken,
    'phone_available', NOT phone_taken
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to anon (visitors registering on signup page) and authenticated
GRANT EXECUTE ON FUNCTION public.check_user_availability(TEXT, TEXT) TO anon, authenticated, service_role;
