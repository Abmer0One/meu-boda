import { supabase } from '@/lib/supabase';
import { Event } from '@/types';

export const EventRepository = {
  async getById(id: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    try {
      const { data: canvaBlock } = await supabase
        .from('event_info_blocks')
        .select('content')
        .eq('event_id', id)
        .eq('title', '__canva_template_config__')
        .maybeSingle();

      if (canvaBlock?.content) {
        const parsed = JSON.parse(canvaBlock.content);
        data.template_config = {
          ...(data.template_config || {}),
          ...parsed,
        };
      }
    } catch (e) {
      // Non-fatal
    }

    return data as Event;
  },

  async getByUserId(userId: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error || !data) return [];

    try {
      const eventIds = data.map((e) => e.id);
      if (eventIds.length > 0) {
        const { data: canvaBlocks } = await supabase
          .from('event_info_blocks')
          .select('event_id, content')
          .in('event_id', eventIds)
          .eq('title', '__canva_template_config__');

        if (canvaBlocks && canvaBlocks.length > 0) {
          const configMap = new Map<string, any>();
          for (const b of canvaBlocks) {
            try {
              configMap.set(b.event_id, JSON.parse(b.content));
            } catch (err) {}
          }
          for (const ev of data) {
            if (configMap.has(ev.id)) {
              ev.template_config = {
                ...(ev.template_config || {}),
                ...configMap.get(ev.id),
              };
            }
          }
        }
      }
    } catch (e) {
      // Non-fatal
    }

    return data as Event[];
  },

  async getBySlug(slug: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;

    try {
      const { data: canvaBlock } = await supabase
        .from('event_info_blocks')
        .select('content')
        .eq('event_id', data.id)
        .eq('title', '__canva_template_config__')
        .maybeSingle();

      if (canvaBlock?.content) {
        const parsed = JSON.parse(canvaBlock.content);
        data.template_config = {
          ...(data.template_config || {}),
          ...parsed,
        };
      }
    } catch (e) {
      // Non-fatal
    }

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
      if (error.code === 'PGRST204' && (event.template_config !== undefined || event.template_id !== undefined)) {
        const { template_config, template_id, ...safePayload } = event as any;
        const retry = await supabase
          .from('events')
          .update({ ...safePayload, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (!retry.error && retry.data) {
          return {
            ...(retry.data as Event),
            template_config: event.template_config,
            template_id: event.template_id,
          };
        }
      }
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
