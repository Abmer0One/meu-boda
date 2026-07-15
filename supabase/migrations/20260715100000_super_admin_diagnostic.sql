-- Migration: Add diagnostic information (event count, guest counts, progress tasks, checkin logs) to Super Admin functions

DROP FUNCTION IF EXISTS public.admin_get_users();
DROP FUNCTION IF EXISTS public.admin_get_events();

-- 1. Update admin_get_users to include events_count
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  role TEXT,
  planner_slots INT,
  events_count INT
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
    COALESCE((u.raw_app_meta_data ->> 'planner_slots')::INT, 1) as planner_slots,
    (SELECT COUNT(*)::INT FROM public.events e WHERE e.user_id = u.id) as events_count
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update admin_get_events to include counts of guests, checkins, and tasks
CREATE OR REPLACE FUNCTION public.admin_get_events()
RETURNS TABLE (
  id UUID,
  owner_email TEXT,
  title TEXT,
  slug TEXT,
  type TEXT,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  status TEXT,
  guests_count INT,
  checkins_count INT,
  total_tasks INT,
  completed_tasks INT
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
    END as status,
    (SELECT COUNT(*)::INT FROM public.guests g WHERE g.event_id = e.id) as guests_count,
    (SELECT COUNT(*)::INT FROM public.checkins c JOIN public.guests g ON g.id = c.guest_id WHERE g.event_id = e.id) as checkins_count,
    (SELECT COUNT(*)::INT FROM public.tasks t WHERE t.event_id = e.id) as total_tasks,
    (SELECT COUNT(*)::INT FROM public.tasks t WHERE t.event_id = e.id AND t.status = 'Concluído') as completed_tasks
  FROM public.events e
  LEFT JOIN auth.users u ON u.id = e.user_id
  ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. New function: Get specific event tasks list (Admin only)
CREATE OR REPLACE FUNCTION public.admin_get_event_tasks(target_event_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  status TEXT,
  priority TEXT,
  due_date TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.status::TEXT,
    t.priority::TEXT,
    t.due_date
  FROM public.tasks t
  WHERE t.event_id = target_event_id
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. New function: Get specific event checkin list with guest names (Admin only)
CREATE OR REPLACE FUNCTION public.admin_get_event_checkins(target_event_id UUID)
RETURNS TABLE (
  id UUID,
  guest_name TEXT,
  guest_role TEXT,
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
    COALESCE(g.role, 'Convidado')::TEXT as guest_role,
    c.checked_at,
    c.operator::TEXT
  FROM public.checkins c
  JOIN public.guests g ON g.id = c.guest_id
  WHERE g.event_id = target_event_id
  ORDER BY c.checked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
