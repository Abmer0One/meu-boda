-- Migration: Expand events_type_check constraint to include 'casamento_tradicional' and 'noivado'
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_type_check CHECK (type IN (
  'casamento',
  'casamento_tradicional',
  'alambamento',
  'noivado',
  'pedido',
  'aniversario',
  'cha_panela',
  'palestra',
  'festa_rua',
  'outro'
));
