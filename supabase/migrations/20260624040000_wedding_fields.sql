-- Alter events table to add ceremony and party details for weddings
alter table public.events
add column if not exists ceremony_time text,
add column if not exists ceremony_maps_url text,
add column if not exists party_time text,
add column if not exists party_maps_url text;
