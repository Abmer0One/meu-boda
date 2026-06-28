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
