import { supabase } from '@/lib/supabase';

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  role: string;
  planner_slots: number;
  events_count: number;
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
  async getUsers(): Promise<AdminUser[]> {
    const { data, error } = await supabase.rpc('admin_get_users');
    if (error) {
      console.error('Error fetching admin users:', error);
      return [];
    }
    return data as AdminUser[];
  },

  async getEvents(): Promise<AdminEvent[]> {
    const { data, error } = await supabase.rpc('admin_get_events');
    if (error) {
      console.error('Error fetching admin events:', error);
      return [];
    }
    return data as AdminEvent[];
  },

  async getEventTasks(eventId: string): Promise<AdminTask[]> {
    const { data, error } = await supabase.rpc('admin_get_event_tasks', { target_event_id: eventId });
    if (error) {
      console.error('Error fetching admin event tasks:', error);
      return [];
    }
    return data as AdminTask[];
  },

  async getEventCheckins(eventId: string): Promise<AdminCheckin[]> {
    const { data, error } = await supabase.rpc('admin_get_event_checkins', { target_event_id: eventId });
    if (error) {
      console.error('Error fetching admin event checkins:', error);
      return [];
    }
    return data as AdminCheckin[];
  },

  async updateUserMeta(userId: string, role: string, slots: number): Promise<boolean> {
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
  },
};
