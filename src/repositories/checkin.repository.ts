import { supabase } from '@/lib/supabase';
import { CheckIn } from '@/types';

// In-flight mutex to avoid rapid concurrent check-in requests for the same guest
const inFlightCheckins = new Set<string>();

export const CheckInRepository = {
  async getAll(eventId: string): Promise<CheckIn[]> {
    const { data, error } = await supabase
      .from('checkins')
      .select('*, guest:guests!inner(*)')
      .eq('guests.event_id', eventId)
      .order('checked_at', { ascending: false });

    if (error) {
      console.error('Error fetching check-ins:', error);
      return [];
    }

    const items = (data as unknown as CheckIn[]) || [];

    // Deduplicate in memory and track duplicate IDs for background cleanup
    const uniqueMap = new Map<string, CheckIn>();
    const duplicateIdsToDelete: string[] = [];

    // Iterate backwards (oldest to newest) to preserve the original entry timestamp
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (!uniqueMap.has(item.guest_id)) {
        uniqueMap.set(item.guest_id, item);
      } else {
        duplicateIdsToDelete.push(item.id);
      }
    }

    // Auto-clean duplicates in background if any exist
    if (duplicateIdsToDelete.length > 0) {
      (async () => {
        try {
          const { error: delErr } = await supabase
            .from('checkins')
            .delete()
            .in('id', duplicateIdsToDelete);
          if (delErr) {
            console.error('Failed to cleanup duplicate check-ins:', delErr);
          }
        } catch (e) {
          console.error('Error cleaning up duplicate check-ins:', e);
        }
      })();
    }

    // Return ordered array (most recent first)
    const result = Array.from(uniqueMap.values());
    result.sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime());
    return result;
  },

  async create(checkin: Omit<CheckIn, 'id' | 'checked_at'>): Promise<CheckIn | null> {
    if (!checkin.guest_id) return null;

    // Mutex check: prevent concurrent operations for the same guest
    if (inFlightCheckins.has(checkin.guest_id)) {
      console.warn('Check-in already in-flight for guest:', checkin.guest_id);
      return null;
    }

    inFlightCheckins.add(checkin.guest_id);

    try {
      // Check database to ensure guest has not already checked in
      const existing = await this.getByGuestId(checkin.guest_id);
      if (existing) {
        console.warn('Guest is already checked in:', checkin.guest_id);
        return null;
      }

      const { data, error } = await supabase
        .from('checkins')
        .insert(checkin)
        .select()
        .single();

      if (error) {
        console.error('Error recording check-in:', error);
        return null;
      }
      return data as CheckIn;
    } finally {
      // Hold lock briefly to avoid double-clicks or camera scanner echo
      setTimeout(() => {
        inFlightCheckins.delete(checkin.guest_id);
      }, 2500);
    }
  },

  async getByGuestId(guestId: string): Promise<CheckIn | null> {
    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('guest_id', guestId)
      .maybeSingle();

    if (error) return null;
    return data as CheckIn;
  },

  async deleteByGuestId(guestId: string): Promise<boolean> {
    const { error } = await supabase
      .from('checkins')
      .delete()
      .eq('guest_id', guestId);

    if (error) {
      console.error('Error deleting check-in:', error);
      return false;
    }
    return true;
  }
};
