import { supabase } from '@/lib/supabase';
import { Document } from '@/types';

export const DocumentRepository = {
  async getAll(eventId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('event_id', eventId)
      .order('title', { ascending: true });

    if (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
    return data as Document[];
  },

  async create(document: Omit<Document, 'id' | 'created_at'>): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .insert(document)
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      return null;
    }
    return data as Document;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting document:', error);
      return false;
    }
    return true;
  }
};
