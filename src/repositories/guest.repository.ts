import { supabase } from '@/lib/supabase';
import { Guest, CompanionSeating } from '@/types';
import {
  parseCompanionSeatingFromNotes,
  attachCompanionSeatingToNotes,
  removeCompanionSeatingFromNotes,
} from '@/lib/seating';

function enrichGuestSeating(g: Guest | null): Guest | null {
  if (!g) return null;
  return {
    ...g,
    companion_seating: parseCompanionSeatingFromNotes(g.notes),
  };
}

export const GuestRepository = {
  async getAll(eventId: string): Promise<Guest[]> {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching guests:', error);
      return [];
    }
    return (data as Guest[]).map((g) => enrichGuestSeating(g)!);
  },

  async getById(id: string): Promise<Guest | null> {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return enrichGuestSeating(data as Guest);
  },

  async getByToken(token: string): Promise<Guest | null> {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('qr_token', token)
      .single();

    if (error) return null;
    return enrichGuestSeating(data as Guest);
  },

  async create(guest: Omit<Guest, 'id' | 'qr_token' | 'created_at'>): Promise<Guest | null> {
    const { data, error } = await supabase
      .from('guests')
      .insert(guest)
      .select()
      .single();

    if (error) {
      console.error('Error creating guest:', error);
      return null;
    }
    return enrichGuestSeating(data as Guest);
  },

  async createMany(guests: Omit<Guest, 'id' | 'qr_token' | 'created_at'>[]): Promise<Guest[]> {
    const { data, error } = await supabase
      .from('guests')
      .insert(guests)
      .select();

    if (error) {
      console.error('Error bulk inserting guests:', error);
      return [];
    }
    return (data as Guest[]).map((g) => enrichGuestSeating(g)!);
  },

  async update(id: string, guest: Partial<Omit<Guest, 'id' | 'event_id' | 'qr_token' | 'created_at'>>): Promise<Guest | null> {
    let payload = { ...guest };

    // If companion_seating was explicitly updated, synchronize notes tag
    if (guest.companion_seating !== undefined) {
      const current = await this.getById(id);
      const baseNotes = guest.notes !== undefined ? guest.notes : current?.notes;
      payload.notes = guest.companion_seating && guest.companion_seating.length > 0
        ? attachCompanionSeatingToNotes(baseNotes, guest.companion_seating)
        : removeCompanionSeatingFromNotes(baseNotes);
      delete payload.companion_seating;
    }

    const { data, error } = await supabase
      .from('guests')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating guest:', error);
      return null;
    }
    return enrichGuestSeating(data as Guest);
  },

  async updateCompanionSeating(guestId: string, seating: CompanionSeating[] | null): Promise<Guest | null> {
    const current = await this.getById(guestId);
    if (!current) return null;

    const updatedNotes = seating && seating.length > 0
      ? attachCompanionSeatingToNotes(current.notes, seating)
      : removeCompanionSeatingFromNotes(current.notes);

    return this.update(guestId, { notes: updatedNotes });
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting guest:', error);
      return false;
    }
    return true;
  }
};
