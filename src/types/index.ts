export interface Event {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  type: 'casamento' | 'aniversario' | 'pedido' | 'outro';
  description: string | null;
  date: string;
  ceremony_location: string | null;
  party_location: string | null;
  theme: string | null;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  ceremony_time?: string | null;
  ceremony_maps_url?: string | null;
  party_time?: string | null;
  party_maps_url?: string | null;
  // Guest Manual & Important Info
  dress_code_style?: string | null;
  dress_code_colors?: string | null;
  gift_suggestions?: string | null;
  gift_iban?: string | null;
  gift_iban_holder?: string | null;
  kids_restriction_note?: string | null;
  instagram_host_1?: string | null;
  instagram_host_2?: string | null;
  rsvp_deadline?: string | null;
}


export interface Table {
  id: string;
  event_id: string;
  name: string;
  capacity: number;
  created_at: string;
  // Computed / UI field
  guest_count?: number;
}

export interface Guest {
  id: string;
  event_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  family_group: string | null;
  companions: number;
  table_id: string | null;
  status: 'Pending' | 'Confirmed' | 'Declined';
  qr_token: string;
  invitation_sent: boolean;
  notes: string | null;
  created_at: string;
}

export interface CheckIn {
  id: string;
  guest_id: string;
  checked_at: string;
  operator: string;
  guest?: Guest; // joined relation
}

export interface Task {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'Alta' | 'Média' | 'Baixa';
  status: 'Pendente' | 'Em Progresso' | 'Concluído';
  created_at: string;
}

export interface Budget {
  id: string;
  event_id: string;
  category: string;
  estimated_amount: number;
  paid_amount: number;
  created_at: string;
}

export interface Vendor {
  id: string;
  event_id: string;
  name: string;
  category: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  contract_value: number;
  status: 'Ativo' | 'Pendente' | 'Cancelado';
  created_at: string;
}

export interface Document {
  id: string;
  event_id: string;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export interface DashboardStats {
  daysRemaining: number;
  totalGuests: number;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
  invitationsSent: number;
  invitationsPending: number;
  totalBudgetSpent: number;
  totalEstimatedBudget: number;
  remainingBudget: number;
  pendingTasksCount: number;
  upcomingPaymentsCount: number;
}

export interface EventSchedule {
  id: string;
  event_id: string;
  time: string;
  title: string;
  location: string;
  created_at: string;
}
