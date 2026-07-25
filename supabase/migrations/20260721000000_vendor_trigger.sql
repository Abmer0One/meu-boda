-- Create trigger to automatically initialize vendor profiles on signup
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

-- Drop trigger if exists to prevent duplicates
DROP TRIGGER IF EXISTS on_auth_user_created_vendor ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_vendor
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_vendor_profile();
