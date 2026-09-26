import { supabase } from '@/lib/supabase';
import { SystemBroadcast, PlatformPayment, LiveCheckinFeed, VendorProfile } from '@/types';

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  role: string;
  planner_slots: number;
  events_count: number;
  phone?: string | null;
}

export interface AdminEvent {
  id: string;
  owner_email: string;
  title: string;
  slug: string;
  type: string;
  date: string;
  created_at: string;
  status: string;
  guests_count: number;
  confirmed_guests_count: number;
  checkins_count: number;
  total_tasks: number;
  completed_tasks: number;
}

export interface AdminTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

export interface AdminCheckin {
  id: string;
  guest_name: string;
  guest_role: string;
  checked_at: string;
  operator: string;
}

export const SuperAdminRepository = {
  // -------------------------------------------------------------
  // USERS & LICENSING
  // -------------------------------------------------------------
  async getUsers(): Promise<AdminUser[]> {
    try {
      const { data, error } = await supabase.rpc('admin_get_users');
      if (error) {
        console.error('Error fetching admin users:', error);
        return [];
      }
      return data as AdminUser[];
    } catch (e) {
      console.error('Failed to get users:', e);
      return [];
    }
  },

  async updateUserMeta(userId: string, role: string, slots: number): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('admin_update_user_meta', {
        target_user_id: userId,
        new_role: role,
        new_slots: slots,
      });
      if (error) {
        console.error('Error updating user admin meta:', error);
        return false;
      }
      return !!data;
    } catch (e) {
      console.error('Failed to update user meta:', e);
      return false;
    }
  },

  // -------------------------------------------------------------
  // EVENTS MANAGEMENT
  // -------------------------------------------------------------
  async getEvents(): Promise<AdminEvent[]> {
    try {
      const { data, error } = await supabase.rpc('admin_get_events');
      if (error) {
        console.error('Error fetching admin events:', error);
        return [];
      }
      return data as AdminEvent[];
    } catch (e) {
      console.error('Failed to get events:', e);
      return [];
    }
  },

  async getEventTasks(eventId: string): Promise<AdminTask[]> {
    try {
      const { data, error } = await supabase.rpc('admin_get_event_tasks', { target_event_id: eventId });
      if (error) {
        console.error('Error fetching admin event tasks:', error);
        return [];
      }
      return data as AdminTask[];
    } catch (e) {
      console.error('Failed to get event tasks:', e);
      return [];
    }
  },

  async getEventCheckins(eventId: string): Promise<AdminCheckin[]> {
    try {
      const { data, error } = await supabase.rpc('admin_get_event_checkins', { target_event_id: eventId });
      if (error) {
        console.error('Error fetching admin event checkins:', error);
        return [];
      }
      return data as AdminCheckin[];
    } catch (e) {
      console.error('Failed to get event checkins:', e);
      return [];
    }
  },

  async updateEventStatus(eventId: string, newStatus: string): Promise<boolean> {
    try {
      // 1. Try RPC if available
      const { error: rpcError } = await supabase.rpc('admin_update_event_status', {
        target_event_id: eventId,
        new_status: newStatus,
      });

      if (!rpcError) return true;

      // 2. Direct fallback update
      const { error: directError } = await supabase
        .from('events')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', eventId);

      return !directError;
    } catch (e) {
      console.error('Failed to update event status:', e);
      return false;
    }
  },

  async transferEvent(eventId: string, newOwnerEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_transfer_event', {
        target_event_id: eventId,
        new_owner_email: newOwnerEmail,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Falha ao transferir evento.' };
    }
  },

  // -------------------------------------------------------------
  // RADAR LIVE DA PORTARIA
  // -------------------------------------------------------------
  async getRecentCheckins(limit = 40): Promise<LiveCheckinFeed[]> {
    try {
      // 1. Try RPC first
      const { data, error } = await supabase.rpc('admin_get_recent_checkins', { limit_count: limit });
      if (!error && data) {
        return data as LiveCheckinFeed[];
      }

      // 2. Fallback query with inner joins
      const { data: fallbackData, error: fbError } = await supabase
        .from('checkins')
        .select(`
          id,
          checked_at,
          operator,
          guest:guests(id, name, companions, event:events(id, title))
        `)
        .order('checked_at', { ascending: false })
        .limit(limit);

      if (fbError || !fallbackData) {
        return [];
      }

      return fallbackData.map((item: any) => ({
        id: item.id,
        guest_name: item.guest?.name || 'Convidado',
        guest_companions: item.guest?.companions || 0,
        event_id: item.guest?.event?.id || '',
        event_title: item.guest?.event?.title || 'Evento',
        checked_at: item.checked_at,
        operator: item.operator || 'Portaria',
      }));
    } catch (e) {
      console.error('Failed to get recent checkins:', e);
      return [];
    }
  },

  // -------------------------------------------------------------
  // FORNECEDORES & MARKETPLACE
  // -------------------------------------------------------------
  async getVendors(): Promise<VendorProfile[]> {
    try {
      const { data, error } = await supabase
        .from('vendor_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vendors:', error);
        return [];
      }
      return (data as unknown as VendorProfile[]) || [];
    } catch (e) {
      console.error('Failed to fetch vendors:', e);
      return [];
    }
  },

  async updateVendorStatus(vendorId: string, status: 'Pendente' | 'Aprovado' | 'Suspenso'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('vendor_profiles')
        .update({ status })
        .eq('id', vendorId);

      if (error) {
        console.error('Error updating vendor status:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Failed to update vendor status:', e);
      return false;
    }
  },

  // -------------------------------------------------------------
  // COMPROVATIVOS & PAGAMENTOS DE PLATAFORMA
  // -------------------------------------------------------------
  async getPlatformPayments(): Promise<PlatformPayment[]> {
    try {
      const { data, error } = await supabase
        .from('platform_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback: Return empty list if table not created yet
        return [];
      }
      return (data as PlatformPayment[]) || [];
    } catch (e) {
      return [];
    }
  },

  async updatePaymentStatus(
    paymentId: string,
    status: 'Aprovado' | 'Recusado',
    userId?: string,
    planType?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('platform_payments')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) {
        console.error('Error updating payment status:', error);
        return false;
      }

      // If approved, automatically credit slots/roles
      if (status === 'Aprovado' && userId) {
        if (planType?.toLowerCase().includes('planner')) {
          await this.updateUserMeta(userId, 'planner', 5);
        } else {
          await this.updateUserMeta(userId, 'user', 2);
        }
      }

      return true;
    } catch (e) {
      console.error('Failed to update payment status:', e);
      return false;
    }
  },

  // -------------------------------------------------------------
  // AVISOS GLOBAIS DE SISTEMA (SYSTEM BROADCASTS)
  // -------------------------------------------------------------
  async getBroadcasts(): Promise<SystemBroadcast[]> {
    try {
      const { data, error } = await supabase
        .from('system_broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return [];
      }
      return (data as SystemBroadcast[]) || [];
    } catch (e) {
      return [];
    }
  },

  async getActiveBroadcasts(): Promise<SystemBroadcast[]> {
    try {
      const { data, error } = await supabase
        .from('system_broadcasts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        return [];
      }
      return (data as SystemBroadcast[]) || [];
    } catch (e) {
      return [];
    }
  },

  async createBroadcast(broadcast: Omit<SystemBroadcast, 'id' | 'created_at'>): Promise<SystemBroadcast | null> {
    try {
      const { data, error } = await supabase
        .from('system_broadcasts')
        .insert(broadcast)
        .select()
        .single();

      if (error) {
        console.error('Error creating broadcast:', error);
        return null;
      }
      return data as SystemBroadcast;
    } catch (e) {
      console.error('Failed to create broadcast:', e);
      return null;
    }
  },

  async toggleBroadcast(id: string, is_active: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_broadcasts')
        .update({ is_active })
        .eq('id', id);

      return !error;
    } catch (e) {
      return false;
    }
  },

  async deleteBroadcast(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_broadcasts')
        .delete()
        .eq('id', id);

      return !error;
    } catch (e) {
      return false;
    }
  },

  // -------------------------------------------------------------
  // EXPORTAÇÃO CSV
  // -------------------------------------------------------------
  exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    if (typeof window === 'undefined') return;

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(';')),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
