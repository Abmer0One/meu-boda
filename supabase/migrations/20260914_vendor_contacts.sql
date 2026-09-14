-- ============================================================
-- ADD CONTACT COLUMNS (PHONE, EMAIL, WEBSITE) TO VENDOR PROFILES
-- AND SYNC EXISTING CONTRACTED VENDORS
-- Run this in Supabase Dashboard SQL Editor for project mpxlurrvohvgiompueiw
-- ============================================================

-- 1. Add phone, email, website columns to vendor_profiles
ALTER TABLE public.vendor_profiles 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

-- 2. Update existing vendor_profiles with auth user email and phone
UPDATE public.vendor_profiles vp
SET 
  email = COALESCE(vp.email, u.email),
  phone = COALESCE(vp.phone, u.raw_user_meta_data->>'phone')
FROM auth.users u
WHERE vp.id = u.id;

-- 3. Synchronize already contracted vendors in public.vendors table
UPDATE public.vendors v
SET 
  email = COALESCE(v.email, vp.email),
  phone = COALESCE(v.phone, vp.phone),
  website = COALESCE(v.website, vp.website)
FROM public.vendor_profiles vp
WHERE v.name = vp.company_name;

-- 4. Update the automatic vendor profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_vendor_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF (new.raw_user_meta_data->>'role' = 'vendor') THEN
    INSERT INTO public.vendor_profiles (id, company_name, category, status, email, phone)
    VALUES (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', 'Minha Empresa de Serviços'),
      'Fotografia',
      'Aprovado',
      new.email,
      new.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(public.vendor_profiles.email, EXCLUDED.email),
      phone = COALESCE(public.vendor_profiles.phone, EXCLUDED.phone);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
