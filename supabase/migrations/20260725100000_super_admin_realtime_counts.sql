-- Drop old function
DROP FUNCTION IF EXISTS public.admin_get_events();

-- Recreate function with confirmed_guests_count
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
    (SELECT COUNT(*)::INT FROM public.guests g WHERE g.event_id = e.id) as guests_count,
    (SELECT COUNT(*)::INT FROM public.guests g WHERE g.event_id = e.id AND g.status = 'Confirmed') as confirmed_guests_count,
    (SELECT COUNT(*)::INT FROM public.checkins c JOIN public.guests g ON g.id = c.guest_id WHERE g.event_id = e.id) as checkins_count,
    (SELECT COUNT(*)::INT FROM public.tasks t WHERE t.event_id = e.id) as total_tasks,
    (SELECT COUNT(*)::INT FROM public.tasks t WHERE t.event_id = e.id AND t.status = 'Concluído') as completed_tasks
  FROM public.events e
  LEFT JOIN auth.users u ON u.id = e.user_id
  ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely add tables to supabase_realtime publication
DO $$
BEGIN
  -- check for events
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;

  -- check for tasks
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;

  -- check for checkins
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'checkins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.checkins;
  END IF;

  -- check for guests
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'guests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
  END IF;
END $$;
