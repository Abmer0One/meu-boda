-- Migration to expand events table with multi-template fields and new event types
alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check check (type in ('casamento', 'aniversario', 'pedido', 'cha_panela', 'alambamento', 'palestra', 'festa_rua', 'outro'));

alter table public.events 
add column if not exists template_id text not null default 'default',
add column if not exists template_config jsonb not null default '{}'::jsonb;
