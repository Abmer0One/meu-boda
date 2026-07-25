-- Drop old function
DROP FUNCTION IF EXISTS public.admin_get_events();

-- Recreate function to sum companions (1 + companions) for counts
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
  confirmed_guests_count INT,
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
    COALESCE((SELECT SUM(1 + COALESCE(g.companions, 0))::INT FROM public.guests g WHERE g.event_id = e.id), 0) as guests_count,
    COALESCE((SELECT SUM(1 + COALESCE(g.companions, 0))::INT FROM public.guests g WHERE g.event_id = e.id AND g.status = 'Confirmed'), 0) as confirmed_guests_count,
    COALESCE((SELECT SUM(1 + COALESCE(g.companions, 0))::INT FROM public.checkins c JOIN public.guests g ON g.id = c.guest_id WHERE g.event_id = e.id), 0) as checkins_count,
    (SELECT COUNT(*)::INT FROM public.tasks t WHERE t.event_id = e.id) as total_tasks,
    (SELECT COUNT(*)::INT FROM public.tasks t WHERE t.event_id = e.id AND t.status = 'Concluído') as completed_tasks
  FROM public.events e
  LEFT JOIN auth.users u ON u.id = e.user_id
  ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
