import { supabase } from '@/lib/supabase';
import { Vendor } from '@/types';

export const VendorRepository = {
  async getAll(eventId: string): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('event_id', eventId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching vendors:', error);
      return [];
    }
    return data as Vendor[];
  },

  async create(vendor: Omit<Vendor, 'id' | 'created_at'>): Promise<Vendor | null> {
    const { data, error } = await supabase
      .from('vendors')
      .insert(vendor)
      .select()
      .single();

    if (error) {
      console.error('Error creating vendor:', error);
      return null;
    }
    return data as Vendor;
  },

  async update(id: string, vendor: Partial<Omit<Vendor, 'id' | 'event_id' | 'created_at'>>): Promise<Vendor | null> {
    const { data, error } = await supabase
      .from('vendors')
      .update(vendor)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vendor:', error);
      return null;
    }
    return data as Vendor;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vendor:', error);
      return false;
    }
    return true;
  }
};
