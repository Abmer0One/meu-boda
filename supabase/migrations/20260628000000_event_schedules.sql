-- Create event_schedules table
create table if not exists public.event_schedules (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references public.events(id) on delete cascade not null,
    time text not null,
    title text not null,
    location text not null,
    created_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.event_schedules enable row level security;

-- Drop existing policies if any
drop policy if exists "Allow auth CRUD schedules of own events" on public.event_schedules;
drop policy if exists "Allow public select schedules" on public.event_schedules;

-- Create policies
create policy "Allow auth CRUD schedules of own events" on public.event_schedules
    for all to authenticated using (
        exists (select 1 from public.events where events.id = event_schedules.event_id and events.user_id = auth.uid())
    );

create policy "Allow public select schedules" on public.event_schedules
    for select using (true);

-- Grant privileges
grant select on public.event_schedules to anon;
grant select, insert, update, delete on public.event_schedules to authenticated;
grant select, insert, update, delete on public.event_schedules to service_role;
