import { supabase } from '@/lib/supabase';
import { Event } from '@/types';

export const EventRepository = {
  async getById(id: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Event;
  },

  async getByUserId(userId: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) return [];
    return data as Event[];
  },

  async getBySlug(slug: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) return null;
    return data as Event;
  },

  async create(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error.message, '| Details:', error.details, '| Hint:', error.hint, '| Code:', error.code);
      return null;
    }
    return data as Event;
  },

  async update(id: string, event: Partial<Omit<Event, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .update({ ...event, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      return null;
    }
    return data as Event;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      return false;
    }
    return true;
  }
};
