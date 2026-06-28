-- Grant privileges on public schema tables to Supabase API roles

-- 1. Events Table
grant select, insert, update, delete on public.events to authenticated;
grant select on public.events to anon;
grant all on public.events to service_role;

-- 2. Tables Table
grant select, insert, update, delete on public.tables to authenticated;
grant select on public.tables to anon;
grant all on public.tables to service_role;

-- 3. Guests Table
grant select, insert, update, delete on public.guests to authenticated;
grant select, update on public.guests to anon; -- for public RSVP route
grant all on public.guests to service_role;

-- 4. Check-ins Table
grant select, insert, update, delete on public.checkins to authenticated;
grant all on public.checkins to service_role;

-- 5. Tasks Table
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;

-- 6. Budgets Table
grant select, insert, update, delete on public.budgets to authenticated;
grant all on public.budgets to service_role;

-- 7. Vendors Table
grant select, insert, update, delete on public.vendors to authenticated;
grant all on public.vendors to service_role;

-- 8. Documents Table
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
