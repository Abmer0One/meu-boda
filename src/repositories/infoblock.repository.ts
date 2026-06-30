import { supabase } from '@/lib/supabase';
import { EventInfoBlock } from '@/types';

export const InfoBlockRepository = {
  async getAll(eventId: string): Promise<EventInfoBlock[]> {
    const { data, error } = await supabase
      .from('event_info_blocks')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching info blocks:', error);
      return [];
    }
    return data as EventInfoBlock[];
  },

  async create(block: Omit<EventInfoBlock, 'id' | 'created_at'>): Promise<EventInfoBlock | null> {
    const { data, error } = await supabase
      .from('event_info_blocks')
      .insert(block)
      .select()
      .single();

    if (error) {
      console.error('Error creating info block:', error);
      return null;
    }
    return data as EventInfoBlock;
  },

  async update(
    id: string,
    block: Partial<Omit<EventInfoBlock, 'id' | 'event_id' | 'created_at'>>
  ): Promise<EventInfoBlock | null> {
    const { data, error } = await supabase
      .from('event_info_blocks')
      .update(block)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating info block:', error);
      return null;
    }
    return data as EventInfoBlock;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('event_info_blocks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting info block:', error);
      return false;
    }
    return true;
  },
};
