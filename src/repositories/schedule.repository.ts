import { supabase } from '@/lib/supabase';
import { EventSchedule } from '@/types';

export const ScheduleRepository = {
  async getAll(eventId: string): Promise<EventSchedule[]> {
    const { data, error } = await supabase
      .from('event_schedules')
      .select('*')
      .eq('event_id', eventId)
      .order('time', { ascending: true });

    if (error) {
      console.error('Error fetching schedules:', error);
      return [];
    }
    return data as EventSchedule[];
  },

  async create(schedule: Omit<EventSchedule, 'id' | 'created_at'>): Promise<EventSchedule | null> {
    const { data, error } = await supabase
      .from('event_schedules')
      .insert(schedule)
      .select()
      .single();

    if (error) {
      console.error('Error creating schedule:', error);
      return null;
    }
    return data as EventSchedule;
  },

  async update(
    id: string,
    schedule: Partial<Omit<EventSchedule, 'id' | 'event_id' | 'created_at'>>
  ): Promise<EventSchedule | null> {
    const { data, error } = await supabase
      .from('event_schedules')
      .update(schedule)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule:', error);
      return null;
    }
    return data as EventSchedule;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('event_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting schedule:', error);
      return false;
    }
    return true;
  },
};
