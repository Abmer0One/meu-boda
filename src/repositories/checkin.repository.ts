import { supabase } from '@/lib/supabase';
import { CheckIn } from '@/types';

export const CheckInRepository = {
  async getAll(eventId: string): Promise<CheckIn[]> {
    const { data, error } = await supabase
      .from('checkins')
      .select('*, guest:guests!inner(*)')
      .eq('guests.event_id', eventId)
      .order('checked_at', { ascending: false });

    if (error) {
      console.error('Error fetching check-ins:', error);
      return [];
    }
    return data as unknown as CheckIn[];
  },

  async create(checkin: Omit<CheckIn, 'id' | 'checked_at'>): Promise<CheckIn | null> {
    const { data, error } = await supabase
      .from('checkins')
      .insert(checkin)
      .select()
      .single();

    if (error) {
      console.error('Error recording check-in:', error);
      return null;
    }
    return data as CheckIn;
  },

  async getByGuestId(guestId: string): Promise<CheckIn | null> {
    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('guest_id', guestId)
      .maybeSingle();

    if (error) return null;
    return data as CheckIn;
  },

  async deleteByGuestId(guestId: string): Promise<boolean> {
    const { error } = await supabase
      .from('checkins')
      .delete()
      .eq('guest_id', guestId);

    if (error) {
      console.error('Error deleting check-in:', error);
      return false;
    }
    return true;
  }
};
