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
