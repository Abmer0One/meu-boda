import { supabase } from '@/lib/supabase';
import { Task } from '@/types';

export const TaskRepository = {
  async getAll(eventId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('event_id', eventId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
    return data as Task[];
  },

  async create(task: Omit<Task, 'id' | 'created_at'>): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return null;
    }
    return data as Task;
  },

  async update(id: string, task: Partial<Omit<Task, 'id' | 'event_id' | 'created_at'>>): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .update(task)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return null;
    }
    return data as Task;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      return false;
    }
    return true;
  }
};
