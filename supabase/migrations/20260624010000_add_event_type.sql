-- Alter events table to add type column
alter table public.events 
add column if not exists type text not null default 'casamento' 
check (type in ('casamento', 'aniversario', 'pedido', 'outro'));
