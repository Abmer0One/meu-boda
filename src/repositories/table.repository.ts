import { supabase } from '@/lib/supabase';
import { Table } from '@/types';

export const TableRepository = {
  async getAll(eventId: string): Promise<Table[]> {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('event_id', eventId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tables:', error);
      return [];
    }
    return data as Table[];
  },

  async create(table: Omit<Table, 'id' | 'created_at'>): Promise<Table | null> {
    const { data, error } = await supabase
      .from('tables')
      .insert(table)
      .select()
      .single();

    if (error) {
      console.error('Error creating table:', error);
      return null;
    }
    return data as Table;
  },

  async update(id: string, table: Partial<Omit<Table, 'id' | 'event_id' | 'created_at'>>): Promise<Table | null> {
    const { data, error } = await supabase
      .from('tables')
      .update(table)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating table:', error);
      return null;
    }
    return data as Table;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting table:', error);
      return false;
    }
    return true;
  }
};
