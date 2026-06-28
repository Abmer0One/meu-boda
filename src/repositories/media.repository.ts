import { supabase } from '@/lib/supabase';

export interface EventMedia {
  id: string;
  event_id: string;
  guest_name: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export const MediaRepository = {
  async getAll(eventId: string): Promise<EventMedia[]> {
    const { data, error } = await supabase
      .from('event_media')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching event media:', error);
      return [];
    }
    return data as EventMedia[];
  },

  async getApproved(eventId: string): Promise<EventMedia[]> {
    const { data, error } = await supabase
      .from('event_media')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching approved event media:', error);
      return [];
    }
    return data as EventMedia[];
  },

  async create(media: Omit<EventMedia, 'id' | 'created_at'>): Promise<EventMedia | null> {
    const { data, error } = await supabase
      .from('event_media')
      .insert(media)
      .select()
      .single();

    if (error) {
      console.error('Error creating event media:', error);
      return null;
    }
    return data as EventMedia;
  },

  async update(id: string, media: Partial<Omit<EventMedia, 'id' | 'event_id' | 'created_at'>>): Promise<EventMedia | null> {
    const { data, error } = await supabase
      .from('event_media')
      .update(media)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event media:', error);
      return null;
    }
    return data as EventMedia;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('event_media')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event media:', error);
      return false;
    }
    return true;
  },

  async uploadFile(eventId: string, file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      // Upload file to the 'event-galleries' bucket
      const { data, error } = await supabase.storage
        .from('event-galleries')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-galleries')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading file to storage:', err);
      return null;
    }
  },

  async deleteFile(mediaUrl: string): Promise<boolean> {
    try {
      // Extract file path from public URL
      // E.g., http://.../storage/v1/object/public/event-galleries/eventId/filename.ext
      const parts = mediaUrl.split('/event-galleries/');
      if (parts.length < 2) return false;
      const filePath = parts[1];

      const { error } = await supabase.storage
        .from('event-galleries')
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting file from storage:', err);
      return false;
    }
  }
};
