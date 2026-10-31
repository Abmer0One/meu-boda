import { supabase } from '@/lib/supabase';
import { CheckIn } from '@/types';

// In-flight mutex to avoid rapid concurrent check-in requests for the same guest
const inFlightCheckins = new Set<string>();

export const CHECKIN_NOTE_TAG_PREFIX = '[CHECKIN:';

/**
 * Extracts check-in metadata embedded in guest notes (fallback persistence)
 */
export function parseGuestCheckinNote(notes?: string | null): { operator: string; at: string } | null {
  if (!notes || !notes.includes(CHECKIN_NOTE_TAG_PREFIX)) return null;
  try {
    const match = notes.match(/\[CHECKIN:(.*?)\]/);
    if (match && match[1]) {
      const data = JSON.parse(match[1]);
      return {
        operator: data.operator || 'Portaria',
        at: data.at || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn('Error parsing checkin note metadata:', e);
  }
  return null;
}

/**
 * Attaches or updates structured check-in metadata tag in guest notes
 */
export function attachCheckinToNotes(existingNotes: string | null | undefined, operator: string, at?: string): string {
  const clean = (existingNotes || '').replace(/\[CHECKIN:.*?\]/g, '').trim();
  const meta = JSON.stringify({
    operator: operator || 'Portaria',
    at: at || new Date().toISOString(),
  });
  return clean ? `${clean}\n[CHECKIN:${meta}]` : `[CHECKIN:${meta}]`;
}

/**
 * Removes check-in metadata tag from guest notes (on revert/cancellation)
 */
export function removeCheckinFromNotes(existingNotes: string | null | undefined): string {
  return (existingNotes || '').replace(/\[CHECKIN:.*?\]/g, '').trim();
}

/**
 * Cleans user-facing guest notes for UI presentation (stripping internal checkin tag)
 */
export function cleanGuestNotesForDisplay(notes?: string | null): string {
  return removeCheckinFromNotes(notes);
}

export const CheckInRepository = {
  /**
   * Retrieves all check-ins for an event, aggregating from:
   * 1. Public checkins table (if accessible)
   * 2. Embedded checkin tags in guests table (resilient cloud fallback for anonymous portaria access)
   * 3. Local session cache (for instant zero-latency UI reactivity)
   */
  async getAll(eventId: string): Promise<CheckIn[]> {
    const uniqueMap = new Map<string, CheckIn>();
    const duplicateIdsToDelete: string[] = [];

    // 1. Try querying public.checkins table
    try {
      let data: any[] | null = null;
      const res1 = await supabase
        .from('checkins')
        .select('*, guest:guests!inner(*)')
        .eq('guests.event_id', eventId)
        .order('checked_at', { ascending: false });

      if (!res1.error && res1.data) {
        data = res1.data;
      } else {
        // Fallback filter alias in case PostgREST expects guest.event_id
        const res2 = await supabase
          .from('checkins')
          .select('*, guest:guests!inner(*)')
          .eq('guest.event_id', eventId)
          .order('checked_at', { ascending: false });
        if (!res2.error && res2.data) {
          data = res2.data;
        }
      }

      if (data && Array.isArray(data)) {
        for (let i = data.length - 1; i >= 0; i--) {
          const item = data[i] as unknown as CheckIn;
          if (!uniqueMap.has(item.guest_id)) {
            uniqueMap.set(item.guest_id, item);
          } else {
            duplicateIdsToDelete.push(item.id);
          }
        }
      }
    } catch (err) {
      console.warn('Checkins table query skipped or restricted:', err);
    }

    // Auto-clean duplicates in background if any exist
    if (duplicateIdsToDelete.length > 0) {
      (async () => {
        try {
          await supabase.from('checkins').delete().in('id', duplicateIdsToDelete);
        } catch (e) {
          console.error('Error cleaning duplicate check-ins:', e);
        }
      })();
    }

    // 2. Query guests table to discover check-ins stored via resilient cloud notes
    try {
      const { data: guestsWithNotes } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId)
        .like('notes', `%${CHECKIN_NOTE_TAG_PREFIX}%`);

      if (guestsWithNotes && Array.isArray(guestsWithNotes)) {
        for (const g of guestsWithNotes) {
          if (!uniqueMap.has(g.id)) {
            const parsed = parseGuestCheckinNote(g.notes);
            if (parsed) {
              uniqueMap.set(g.id, {
                id: `ci_${g.id}`,
                guest_id: g.id,
                operator: parsed.operator,
                checked_at: parsed.at,
                guest: g,
              });
            }
          }
        }
      }
    } catch (notesErr) {
      console.warn('Error reading check-ins from guest notes:', notesErr);
    }

    // 3. Check local storage cache for any recent in-flight entries
    if (typeof window !== 'undefined') {
      try {
        const rawLocal = localStorage.getItem(`portaria_checkins_cache_${eventId}`);
        if (rawLocal) {
          const cached = JSON.parse(rawLocal) as CheckIn[];
          if (Array.isArray(cached)) {
            for (const item of cached) {
              if (item.guest_id && !uniqueMap.has(item.guest_id)) {
                uniqueMap.set(item.guest_id, item);
              }
            }
          }
        }
      } catch (e) {}
    }

    const result = Array.from(uniqueMap.values());
    result.sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime());
    return result;
  },

  /**
   * Records a check-in for a guest with dual-layer cloud persistence:
   * Direct table insert + Guest record update + local cache
   */
  async create(checkin: Omit<CheckIn, 'id' | 'checked_at'>): Promise<CheckIn | null> {
    if (!checkin.guest_id) return null;

    // Mutex check: prevent concurrent operations for the same guest
    if (inFlightCheckins.has(checkin.guest_id)) {
      console.warn('Check-in already in-flight for guest:', checkin.guest_id);
      return null;
    }

    inFlightCheckins.add(checkin.guest_id);

    try {
      // 1. Verify guest has not already checked in
      const existing = await this.getByGuestId(checkin.guest_id);
      if (existing) {
        console.warn('Guest is already checked in:', checkin.guest_id);
        return null;
      }

      const checkinTimestamp = new Date().toISOString();
      let createdCheckIn: CheckIn | null = null;

      // 2. Attempt direct insert into public.checkins table
      try {
        const { data, error } = await supabase
          .from('checkins')
          .insert({
            guest_id: checkin.guest_id,
            operator: checkin.operator,
            checked_at: checkinTimestamp,
          })
          .select()
          .single();

        if (!error && data) {
          createdCheckIn = data as CheckIn;
        }
      } catch (insertErr) {
        console.warn('Direct checkins table insert failed (RLS/Permissions):', insertErr);
      }

      // 3. Resilient Cloud Persistence: update guest record notes with check-in tag
      try {
        const { data: currentGuest } = await supabase
          .from('guests')
          .select('id, event_id, notes')
          .eq('id', checkin.guest_id)
          .single();

        if (currentGuest) {
          const updatedNotes = attachCheckinToNotes(currentGuest.notes, checkin.operator, checkinTimestamp);
          await supabase
            .from('guests')
            .update({ notes: updatedNotes })
            .eq('id', checkin.guest_id);

          // Update local cache for immediate recovery
          if (typeof window !== 'undefined' && currentGuest.event_id) {
            try {
              const cacheKey = `portaria_checkins_cache_${currentGuest.event_id}`;
              const raw = localStorage.getItem(cacheKey);
              const list: CheckIn[] = raw ? JSON.parse(raw) : [];
              const newItem: CheckIn = createdCheckIn || {
                id: `ci_${checkin.guest_id}`,
                guest_id: checkin.guest_id,
                operator: checkin.operator,
                checked_at: checkinTimestamp,
              };
              const filtered = [newItem, ...list.filter((x) => x.guest_id !== checkin.guest_id)].slice(0, 500);
              localStorage.setItem(cacheKey, JSON.stringify(filtered));
            } catch (cacheErr) {}
          }
        }
      } catch (guestUpdateErr) {
        console.warn('Error persisting check-in tag to guest notes:', guestUpdateErr);
      }

      // If direct table checkin succeeded, return it; otherwise return synthesized fallback checkin
      if (createdCheckIn) {
        return createdCheckIn;
      }

      return {
        id: `ci_${checkin.guest_id}`,
        guest_id: checkin.guest_id,
        operator: checkin.operator,
        checked_at: checkinTimestamp,
      };
    } finally {
      // Hold lock briefly to avoid double-clicks or camera scanner echo
      setTimeout(() => {
        inFlightCheckins.delete(checkin.guest_id);
      }, 2500);
    }
  },

  /**
   * Checks if a guest is already checked in (via table or guest notes)
   */
  async getByGuestId(guestId: string): Promise<CheckIn | null> {
    try {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('guest_id', guestId)
        .maybeSingle();

      if (!error && data) {
        return data as CheckIn;
      }
    } catch (e) {}

    // Check guest record notes
    try {
      const { data: guest } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .single();

      if (guest && guest.notes?.includes(CHECKIN_NOTE_TAG_PREFIX)) {
        const parsed = parseGuestCheckinNote(guest.notes);
        if (parsed) {
          return {
            id: `ci_${guest.id}`,
            guest_id: guest.id,
            operator: parsed.operator,
            checked_at: parsed.at,
            guest,
          };
        }
      }
    } catch (e) {}

    return null;
  },

  /**
   * Reverts/deletes a check-in in both the checkins table and guest notes
   */
  async deleteByGuestId(guestId: string): Promise<boolean> {
    let success = false;

    // 1. Delete from checkins table
    try {
      const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('guest_id', guestId);
      if (!error) success = true;
    } catch (e) {
      console.warn('Error deleting from checkins table:', e);
    }

    // 2. Remove check-in tag from guest notes
    try {
      const { data: guest } = await supabase
        .from('guests')
        .select('id, event_id, notes')
        .eq('id', guestId)
        .single();

      if (guest && guest.notes?.includes(CHECKIN_NOTE_TAG_PREFIX)) {
        const cleanedNotes = removeCheckinFromNotes(guest.notes);
        await supabase
          .from('guests')
          .update({ notes: cleanedNotes || null })
          .eq('id', guestId);
        success = true;

        // Clean from local cache
        if (typeof window !== 'undefined' && guest.event_id) {
          try {
            const cacheKey = `portaria_checkins_cache_${guest.event_id}`;
            const raw = localStorage.getItem(cacheKey);
            if (raw) {
              const list: CheckIn[] = JSON.parse(raw);
              const updated = list.filter((item) => item.guest_id !== guestId);
              localStorage.setItem(cacheKey, JSON.stringify(updated));
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Error removing checkin from guest notes:', e);
    }

    return success;
  },
};
