-- Migration: Super Admin helper functions and Security Definer RPCs
-- Allows users with role 'admin' in raw_app_meta_data to manage all events and users

-- 1. Helper to verify admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
         OR (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%admin%'
         OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'amota@example.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC to get list of users (Admin only)
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  role TEXT,
  planner_slots INT
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    u.created_at,
    COALESCE(u.raw_app_meta_data ->> 'role', 'user')::TEXT as role,
    COALESCE((u.raw_app_meta_data ->> 'planner_slots')::INT, 1) as planner_slots
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC to get list of all events (Admin only)
CREATE OR REPLACE FUNCTION public.admin_get_events()
RETURNS TABLE (
  id UUID,
  owner_email TEXT,
  title TEXT,
  slug TEXT,
  type TEXT,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    e.id,
    u.email::TEXT as owner_email,
    e.title,
    e.slug,
    COALESCE(e.type, 'casamento')::TEXT,
    e.date,
    e.created_at,
    CASE 
      WHEN e.date < now() - INTERVAL '48 hours' THEN 'Archived'::TEXT
      ELSE 'Active'::TEXT
    END as status
  FROM public.events e
  LEFT JOIN auth.users u ON u.id = e.user_id
  ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC to update user role and planner slots (Admin only)
CREATE OR REPLACE FUNCTION public.admin_update_user_meta(
  target_user_id UUID,
  new_role TEXT,
  new_slots INT
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required.';
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) 
    || jsonb_build_object('role', new_role, 'planner_slots', new_slots)
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
