-- Enable replication for guests table to support real-time updates
alter publication supabase_realtime add table public.guests;
