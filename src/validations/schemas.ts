import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Introduza um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export const registerSchema = z.object({
  email: z.string().email('Introduza um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export const eventSchema = z.object({
  title: z.string().min(2, 'O título deve ter pelo menos 2 caracteres'),
  slug: z.string().min(2, 'O slug deve ter pelo menos 2 caracteres').regex(/^[a-z0-9-]+$/, 'Slug inválido (apenas letras minúsculas, números e hifens)'),
  type: z.enum(['casamento', 'aniversario', 'pedido', 'outro']).default('casamento'),
  date: z.string().min(1, 'A data é obrigatória'),
  ceremony_location: z.string().nullable().optional(),
  party_location: z.string().nullable().optional(),
  theme: z.string().nullable().optional(),
  cover_image: z.string().nullable().optional(),
  background_image: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  ceremony_time: z.string().nullable().optional(),
  ceremony_maps_url: z.string().nullable().optional(),
  party_time: z.string().nullable().optional(),
  party_maps_url: z.string().nullable().optional(),
  // Guest Manual & Important Info
  dress_code_style: z.string().nullable().optional(),
  dress_code_colors: z.string().nullable().optional(),
  gift_suggestions: z.string().nullable().optional(),
  kids_restriction_note: z.string().nullable().optional(),
  instagram_host_1: z.string().nullable().optional(),
  instagram_host_2: z.string().nullable().optional(),
  rsvp_deadline: z.string().nullable().optional(),
});

export const guestSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  phone: z.string().nullable().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')).nullable().optional(),
  family_group: z.string().nullable().optional(),
  companions: z.preprocess((val) => Number(val), z.number().min(0, 'Não pode ser negativo')),
  table_id: z.string().nullable().optional(),
  status: z.enum(['Pending', 'Confirmed', 'Declined']).default('Pending'),
  notes: z.string().nullable().optional(),
});

export const tableSchema = z.object({
  name: z.string().min(1, 'O nome da mesa é obrigatório'),
  capacity: z.preprocess((val) => Number(val), z.number().min(1, 'A capacidade deve ser de pelo menos 1')),
});

export const taskSchema = z.object({
  title: z.string().min(2, 'O título é obrigatório'),
  description: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(['Alta', 'Média', 'Baixa']).default('Média'),
  status: z.enum(['Pendente', 'Em Progresso', 'Concluído']).default('Pendente'),
});

export const budgetSchema = z.object({
  category: z.string().min(1, 'A categoria é obrigatória'),
  estimated_amount: z.preprocess((val) => Number(val), z.number().min(0, 'Valor não pode ser negativo')),
  paid_amount: z.preprocess((val) => Number(val), z.number().min(0, 'Valor não pode ser negativo')),
});

export const vendorSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório'),
  category: z.string().min(1, 'A categoria é obrigatória'),
  phone: z.string().nullable().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')).nullable().optional(),
  website: z.string().nullable().optional(),
  contract_value: z.preprocess((val) => Number(val), z.number().min(0, 'Valor não pode ser negativo')),
  status: z.enum(['Ativo', 'Pendente', 'Cancelado']).default('Pendente'),
});

export const documentSchema = z.object({
  title: z.string().min(2, 'O título é obrigatório'),
  file_url: z.string().url('Link inválido'),
  file_type: z.string().min(1, 'O tipo de ficheiro é obrigatório'),
});
