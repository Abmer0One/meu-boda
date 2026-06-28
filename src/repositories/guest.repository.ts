import { supabase } from '@/lib/supabase';
import { Guest } from '@/types';

export const GuestRepository = {
  async getAll(eventId: string): Promise<Guest[]> {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching guests:', error);
      return [];
    }
    return data as Guest[];
  },

  async getById(id: string): Promise<Guest | null> {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Guest;
  },

  async getByToken(token: string): Promise<Guest | null> {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('qr_token', token)
      .single();

    if (error) return null;
    return data as Guest;
  },

  async create(guest: Omit<Guest, 'id' | 'qr_token' | 'created_at'>): Promise<Guest | null> {
    const { data, error } = await supabase
      .from('guests')
      .insert(guest)
      .select()
      .single();

    if (error) {
      console.error('Error creating guest:', error);
      return null;
    }
    return data as Guest;
  },

  async createMany(guests: Omit<Guest, 'id' | 'qr_token' | 'created_at'>[]): Promise<Guest[]> {
    const { data, error } = await supabase
      .from('guests')
      .insert(guests)
      .select();

    if (error) {
      console.error('Error bulk inserting guests:', error);
      return [];
    }
    return data as Guest[];
  },

  async update(id: string, guest: Partial<Omit<Guest, 'id' | 'event_id' | 'qr_token' | 'created_at'>>): Promise<Guest | null> {
    const { data, error } = await supabase
      .from('guests')
      .update(guest)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating guest:', error);
      return null;
    }
    return data as Guest;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting guest:', error);
      return false;
    }
    return true;
  }
};
