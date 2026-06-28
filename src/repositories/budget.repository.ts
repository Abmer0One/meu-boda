import { supabase } from '@/lib/supabase';
import { Budget } from '@/types';

export const BudgetRepository = {
  async getAll(eventId: string): Promise<Budget[]> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('event_id', eventId)
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching budgets:', error);
      return [];
    }
    return data as Budget[];
  },

  async upsert(budget: Omit<Budget, 'id' | 'created_at'>): Promise<Budget | null> {
    const { data, error } = await supabase
      .from('budgets')
      .upsert(budget, { onConflict: 'event_id,category' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting budget:', error);
      return null;
    }
    return data as Budget;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting budget:', error);
      return false;
    }
    return true;
  }
};
