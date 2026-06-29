-- 1. Create Events Table
create table if not exists public.events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    title text not null,
    slug text unique not null,
    description text,
    date timestamp with time zone not null,
    ceremony_location text,
    party_location text,
    theme text,
    cover_image text,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- 2. Create Tables Table
create table if not exists public.tables (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references public.events(id) on delete cascade not null,
    name text not null,
    capacity integer not null check (capacity > 0),
    created_at timestamp with time zone default now() not null
);

-- 3. Create Guests Table
create table if not exists public.guests (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references public.events(id) on delete cascade not null,
    name text not null,
    phone text,
    email text,
    family_group text,
    companions integer default 0 check (companions >= 0),
    table_id uuid references public.tables(id) on delete set null,
    status text not null check (status in ('Pending', 'Confirmed', 'Declined')) default 'Pending',
    qr_token text unique not null default encode(gen_random_bytes(16), 'hex'),
    invitation_sent boolean default false not null,
    notes text,
    created_at timestamp with time zone default now() not null
);

-- 4. Create Check-ins Table
create table if not exists public.checkins (
    id uuid primary key default gen_random_uuid(),
    guest_id uuid references public.guests(id) on delete cascade not null,
    checked_at timestamp with time zone default now() not null,
    operator text not null
);

-- 5. Create Tasks Table
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references public.events(id) on delete cascade not null,
    title text not null,
    description text,
    due_date timestamp with time zone,
    priority text check (priority in ('Alta', 'Média', 'Baixa')) not null default 'Média',
    status text check (status in ('Pendente', 'Em Progresso', 'Concluído')) not null default 'Pendente',
    created_at timestamp with time zone default now() not null
);

-- 6. Create Budgets Table
create table if not exists public.budgets (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references public.events(id) on delete cascade not null,
    category text not null,
    estimated_amount numeric(10,2) not null default 0.00,
    paid_amount numeric(10,2) not null default 0.00,
    created_at timestamp with time zone default now() not null,
    constraint unique_event_category unique(event_id, category)
);

-- 7. Create Vendors Table
create table if not exists public.vendors (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references public.events(id) on delete cascade not null,
    name text not null,
    category text not null,
    phone text,
    email text,
    website text,
    contract_value numeric(10,2) not null default 0.00,
    status text check (status in ('Ativo', 'Pendente', 'Cancelado')) not null default 'Pendente',
    created_at timestamp with time zone default now() not null
);

-- 8. Create Documents Table
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references public.events(id) on delete cascade not null,
    title text not null,
    file_url text not null,
    file_type text not null,
    created_at timestamp with time zone default now() not null
);

-- Enable RLS on all tables
alter table public.events enable row level security;
alter table public.tables enable row level security;
alter table public.guests enable row level security;
alter table public.checkins enable row level security;
alter table public.tasks enable row level security;
alter table public.budgets enable row level security;
alter table public.vendors enable row level security;
alter table public.documents enable row level security;

-- Establish RLS Policies
-- Events policies
create policy "Users can CRUD own events" on public.events
    for all using (auth.uid() = user_id);

create policy "Public can read event details" on public.events
    for select using (true);

-- Tables policies
create policy "Users can CRUD tables of own events" on public.tables
    for all using (
        exists (
            select 1 from public.events
            where events.id = tables.event_id and events.user_id = auth.uid()
        )
    );

create policy "Public can read tables" on public.tables
    for select using (true);

-- Guests policies
create policy "Users can CRUD guests of own events" on public.guests
    for all using (
        exists (
            select 1 from public.events
            where events.id = guests.event_id and events.user_id = auth.uid()
        )
    );

create policy "Public can select and update guests" on public.guests
    for all using (true) with check (true);

-- Checkins policies
create policy "Users can CRUD checkins of own events" on public.checkins
    for all using (
        exists (
            select 1 from public.guests
            join public.events on events.id = guests.event_id
            where guests.id = checkins.guest_id and events.user_id = auth.uid()
        )
    );

-- Tasks policies
create policy "Users can CRUD tasks of own events" on public.tasks
    for all using (
        exists (
            select 1 from public.events
            where events.id = tasks.event_id and events.user_id = auth.uid()
        )
    );

-- Budgets policies
create policy "Users can CRUD budgets of own events" on public.budgets
    for all using (
        exists (
            select 1 from public.events
            where events.id = budgets.event_id and events.user_id = auth.uid()
        )
    );

-- Vendors policies
create policy "Users can CRUD vendors of own events" on public.vendors
    for all using (
        exists (
            select 1 from public.events
            where events.id = vendors.event_id and events.user_id = auth.uid()
        )
    );

-- Documents policies
create policy "Users can CRUD documents of own events" on public.documents
    for all using (
        exists (
            select 1 from public.events
            where events.id = documents.event_id and events.user_id = auth.uid()
        )
    );

-- Configure Storage Buckets
insert into storage.buckets (id, name, public) 
values ('invitations', 'invitations', true) 
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public) 
values ('documents', 'documents', false) 
on conflict (id) do update set public = false;

-- Storage Policies
drop policy if exists "Allow public read access to invitations bucket" on storage.objects;
drop policy if exists "Allow auth users full access to invitations bucket" on storage.objects;
drop policy if exists "Allow auth users full access to documents bucket" on storage.objects;

create policy "Allow public read access to invitations bucket" on storage.objects
    for select using (bucket_id = 'invitations');

create policy "Allow auth users full access to invitations bucket" on storage.objects
    for all using (bucket_id = 'invitations' and auth.role() = 'authenticated');

create policy "Allow auth users full access to documents bucket" on storage.objects
    for all using (bucket_id = 'documents' and auth.role() = 'authenticated');
-- Alter events table to add type column
alter table public.events 
add column if not exists type text not null default 'casamento' 
check (type in ('casamento', 'aniversario', 'pedido', 'outro'));
-- Drop old all-in-one policies
drop policy if exists "Users can CRUD own events" on public.events;
drop policy if exists "Users can CRUD tables of own events" on public.tables;
drop policy if exists "Users can CRUD guests of own events" on public.guests;
drop policy if exists "Users can CRUD checkins of own events" on public.checkins;
drop policy if exists "Users can CRUD tasks of own events" on public.tasks;
drop policy if exists "Users can CRUD budgets of own events" on public.budgets;
drop policy if exists "Users can CRUD vendors of own events" on public.vendors;
drop policy if exists "Users can CRUD documents of own events" on public.documents;

-- Re-establish Events policies
create policy "Allow auth select own events" on public.events
    for select to authenticated using (auth.uid() = user_id);

create policy "Allow auth insert own events" on public.events
    for insert to authenticated with check (auth.uid() = user_id);

create policy "Allow auth update own events" on public.events
    for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Allow auth delete own events" on public.events
    for delete to authenticated using (auth.uid() = user_id);

-- Re-establish Tables policies
create policy "Allow auth select tables" on public.tables
    for select to authenticated using (
        exists (select 1 from public.events where events.id = tables.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth insert tables" on public.tables
    for insert to authenticated with check (
        exists (select 1 from public.events where events.id = tables.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth update tables" on public.tables
    for update to authenticated using (
        exists (select 1 from public.events where events.id = tables.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth delete tables" on public.tables
    for delete to authenticated using (
        exists (select 1 from public.events where events.id = tables.event_id and events.user_id = auth.uid())
    );

-- Re-establish Guests policies
create policy "Allow auth select guests" on public.guests
    for select using (true); -- Public select permitted for RSVP tokens

create policy "Allow auth insert guests" on public.guests
    for insert to authenticated with check (
        exists (select 1 from public.events where events.id = guests.event_id and events.user_id = auth.uid())
    );

create policy "Allow update guests" on public.guests
    for update using (true); -- Public update permitted for RSVP confirmations

create policy "Allow auth delete guests" on public.guests
    for delete to authenticated using (
        exists (select 1 from public.events where events.id = guests.event_id and events.user_id = auth.uid())
    );

-- Re-establish Check-ins policies
create policy "Allow auth select checkins" on public.checkins
    for select to authenticated using (
        exists (
            select 1 from public.guests
            join public.events on events.id = guests.event_id
            where guests.id = checkins.guest_id and events.user_id = auth.uid()
        )
    );

create policy "Allow auth insert checkins" on public.checkins
    for insert to authenticated with check (
        exists (
            select 1 from public.guests
            join public.events on events.id = guests.event_id
            where guests.id = checkins.guest_id and events.user_id = auth.uid()
        )
    );

create policy "Allow auth delete checkins" on public.checkins
    for delete to authenticated using (
        exists (
            select 1 from public.guests
            join public.events on events.id = guests.event_id
            where guests.id = checkins.guest_id and events.user_id = auth.uid()
        )
    );

-- Re-establish Tasks policies
create policy "Allow auth select tasks" on public.tasks
    for select to authenticated using (
        exists (select 1 from public.events where events.id = tasks.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth insert tasks" on public.tasks
    for insert to authenticated with check (
        exists (select 1 from public.events where events.id = tasks.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth update tasks" on public.tasks
    for update to authenticated using (
        exists (select 1 from public.events where events.id = tasks.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth delete tasks" on public.tasks
    for delete to authenticated using (
        exists (select 1 from public.events where events.id = tasks.event_id and events.user_id = auth.uid())
    );

-- Re-establish Budgets policies
create policy "Allow auth select budgets" on public.budgets
    for select to authenticated using (
        exists (select 1 from public.events where events.id = budgets.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth insert budgets" on public.budgets
    for insert to authenticated with check (
        exists (select 1 from public.events where events.id = budgets.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth update budgets" on public.budgets
    for update to authenticated using (
        exists (select 1 from public.events where events.id = budgets.event_id and events.user_id = auth.uid())
    );

-- Re-establish Vendors policies
create policy "Allow auth select vendors" on public.vendors
    for select to authenticated using (
        exists (select 1 from public.events where events.id = vendors.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth insert vendors" on public.vendors
    for insert to authenticated with check (
        exists (select 1 from public.events where events.id = vendors.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth update vendors" on public.vendors
    for update to authenticated using (
        exists (select 1 from public.events where events.id = vendors.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth delete vendors" on public.vendors
    for delete to authenticated using (
        exists (select 1 from public.events where events.id = vendors.event_id and events.user_id = auth.uid())
    );

-- Re-establish Documents policies
create policy "Allow auth select docs" on public.documents
    for select to authenticated using (
        exists (select 1 from public.events where events.id = documents.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth insert docs" on public.documents
    for insert to authenticated with check (
        exists (select 1 from public.events where events.id = documents.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth delete docs" on public.documents
    for delete to authenticated using (
        exists (select 1 from public.events where events.id = documents.event_id and events.user_id = auth.uid())
    );
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
-- Alter events table to add ceremony and party details for weddings
alter table public.events
add column if not exists ceremony_time text,
add column if not exists ceremony_maps_url text,
add column if not exists party_time text,
add column if not exists party_maps_url text;
-- Create event_media table
create table if not exists public.event_media (
    id uuid primary key default uuid_generate_v4(),
    event_id uuid references public.events(id) on delete cascade not null,
    guest_name text not null,
    media_url text not null,
    media_type text check (media_type in ('image', 'video')) not null default 'image',
    caption text,
    status text check (status in ('pending', 'approved', 'rejected')) not null default 'approved',
    created_at timestamp with time zone default now() not null
);

-- Enable RLS on event_media
alter table public.event_media enable row level security;

-- Drop existing policies if any
drop policy if exists "Allow public to insert event media" on public.event_media;
drop policy if exists "Allow public to read approved event media" on public.event_media;
drop policy if exists "Allow owners full access to event media" on public.event_media;

-- Create policies for event_media
create policy "Allow public to insert event media" on public.event_media
    for insert with check (true);

create policy "Allow public to read approved event media" on public.event_media
    for select using (status = 'approved');

create policy "Allow owners full access to event media" on public.event_media
    for all using (exists (
        select 1 from public.events
        where events.id = event_media.event_id and events.user_id = auth.uid()
    ));

-- Grant permissions to database roles
grant select, insert on public.event_media to anon;
grant select, insert, update, delete on public.event_media to authenticated;
grant select, insert, update, delete on public.event_media to service_role;

-- Configure Storage Bucket for Event Galleries
insert into storage.buckets (id, name, public) 
values ('event-galleries', 'event-galleries', true)
on conflict (id) do update set public = true;

-- Drop existing storage policies if any
drop policy if exists "Allow public read access to event-galleries bucket" on storage.objects;
drop policy if exists "Allow public to upload to event-galleries bucket" on storage.objects;
drop policy if exists "Allow auth users full access to event-galleries bucket" on storage.objects;

-- Storage Policies for event-galleries
create policy "Allow public read access to event-galleries bucket" on storage.objects
    for select using (bucket_id = 'event-galleries');

create policy "Allow public to upload to event-galleries bucket" on storage.objects
    for insert with check (bucket_id = 'event-galleries');

create policy "Allow auth users full access to event-galleries bucket" on storage.objects
    for all using (bucket_id = 'event-galleries' and auth.role() = 'authenticated');
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
