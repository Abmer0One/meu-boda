import { supabase } from '@/lib/supabase';
import { CheckIn } from '@/types';

// In-flight mutex to avoid rapid concurrent check-in requests for the same guest
const inFlightCheckins = new Set<string>();

export const CHECKIN_NOTE_TAG_PREFIX = '[CHECKIN:';
export const CHECKIN_REVERTED_TAG_PREFIX = '[CHECKIN_REVERTED:';

/**
 * Extracts check-in metadata embedded in guest notes (fallback persistence)
 */
export function parseGuestCheckinNote(notes?: string | null): { operator: string; at: string } | null {
  if (!notes || notes.includes(CHECKIN_REVERTED_TAG_PREFIX) || !notes.includes(CHECKIN_NOTE_TAG_PREFIX)) {
    return null;
  }
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
  const clean = (existingNotes || '')
    .replace(/\[CHECKIN:.*?\]/g, '')
    .replace(/\[CHECKIN_REVERTED:.*?\]/g, '')
    .trim();

  const meta = JSON.stringify({
    operator: operator || 'Portaria',
    at: at || new Date().toISOString(),
  });
  return clean ? `${clean}\n[CHECKIN:${meta}]` : `[CHECKIN:${meta}]`;
}

/**
 * Replaces any check-in tag with an explicit reversion tag in guest notes
 */
export function revertCheckinInNotes(existingNotes: string | null | undefined, at?: string): string {
  const clean = (existingNotes || '')
    .replace(/\[CHECKIN:.*?\]/g, '')
    .replace(/\[CHECKIN_REVERTED:.*?\]/g, '')
    .trim();

  const meta = JSON.stringify({
    at: at || new Date().toISOString(),
  });
  return clean ? `${clean}\n[CHECKIN_REVERTED:${meta}]` : `[CHECKIN_REVERTED:${meta}]`;
}

/**
 * Completely removes any check-in or reversion metadata tags from guest notes
 */
export function removeCheckinFromNotes(existingNotes: string | null | undefined): string {
  return (existingNotes || '')
    .replace(/\[CHECKIN:.*?\]/g, '')
    .replace(/\[CHECKIN_REVERTED:.*?\]/g, '')
    .trim();
}

/**
 * Cleans user-facing guest notes for UI presentation (stripping internal checkin/revert tags)
 */
export function cleanGuestNotesForDisplay(notes?: string | null): string {
  return removeCheckinFromNotes(notes);
}

/**
 * Cleans localStorage caches on the current device
 */
export function clearCheckinLocalCaches(guestId: string, eventId?: string) {
  if (typeof window === 'undefined') return;
  try {
    if (eventId) {
      const cacheKey = `portaria_checkins_cache_${eventId}`;
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const list: CheckIn[] = JSON.parse(raw);
        const updated = list.filter((item) => item.guest_id !== guestId);
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      }
    }
    const liveRaw = localStorage.getItem('meuboda_live_checkins_cache');
    if (liveRaw) {
      const liveList = JSON.parse(liveRaw);
      const updatedLive = liveList.filter(
        (item: any) => item.id !== `ci_${guestId}` && item.guest_id !== guestId
      );
      localStorage.setItem('meuboda_live_checkins_cache', JSON.stringify(updatedLive));
    }
  } catch (e) {}
}

/**
 * Broadcasts a new checkin event via Supabase Realtime channel
 */
export function broadcastCheckinNew(feedPayload: {
  id?: string;
  guest_id: string;
  guest_name?: string;
  guest_companions?: number;
  event_id?: string;
  event_title?: string;
  checked_at?: string;
  operator?: string;
}) {
  try {
    const streamChannel = supabase.channel('portaria-live-stream');
    streamChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        streamChannel
          .send({
            type: 'broadcast',
            event: 'new-checkin',
            payload: feedPayload,
          })
          .finally(() => {
            setTimeout(() => {
              try {
                supabase.removeChannel(streamChannel);
              } catch {}
            }, 800);
          });
      }
    });
  } catch (err) {
    console.warn('Realtime broadcast error (new-checkin):', err);
  }
}

/**
 * Broadcasts a deleted/reverted checkin event via Supabase Realtime channel
 */
export function broadcastCheckinDelete(guestId: string, eventId?: string) {
  try {
    const streamChannel = supabase.channel('portaria-live-stream');
    streamChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        streamChannel
          .send({
            type: 'broadcast',
            event: 'delete-checkin',
            payload: {
              id: `ci_${guestId}`,
              guest_id: guestId,
              event_id: eventId || '',
            },
          })
          .finally(() => {
            setTimeout(() => {
              try {
                supabase.removeChannel(streamChannel);
              } catch {}
            }, 800);
          });
      }
    });
  } catch (err) {
    console.warn('Realtime broadcast error (delete-checkin):', err);
  }
}

export const CheckInRepository = {
  /**
   * Retrieves all check-ins for an event from the authoritative database:
   * 1. Public checkins table (if accessible)
   * 2. Embedded checkin tags in guests table (resilient cloud fallback)
   * Excludes any guests explicitly marked as reverted ([CHECKIN_REVERTED]).
   * Synchronizes the authoritative list to localStorage (never resurrects stale deleted items).
   */
  async getAll(eventId: string): Promise<CheckIn[]> {
    const uniqueMap = new Map<string, CheckIn>();
    const duplicateIdsToDelete: string[] = [];
    const orphansToDeleteFromTable: string[] = [];

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

    // 2. Query guests table to discover check-ins and explicit reversions
    try {
      const { data: guestsWithNotes } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId);

      if (guestsWithNotes && Array.isArray(guestsWithNotes)) {
        for (const g of guestsWithNotes) {
          const notes = g.notes || '';

          // If guest has been marked as reverted, remove from check-ins map immediately
          if (notes.includes(CHECKIN_REVERTED_TAG_PREFIX)) {
            if (uniqueMap.has(g.id)) {
              uniqueMap.delete(g.id);
              orphansToDeleteFromTable.push(g.id);
            }
          } else if (notes.includes(CHECKIN_NOTE_TAG_PREFIX)) {
            // Guest has active check-in tag
            if (!uniqueMap.has(g.id)) {
              const parsed = parseGuestCheckinNote(notes);
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
      }
    } catch (notesErr) {
      console.warn('Error reading check-ins from guest notes:', notesErr);
    }

    // Background cleanup of duplicate checkins or orphaned table rows
    if (duplicateIdsToDelete.length > 0) {
      (async () => {
        try {
          await supabase.from('checkins').delete().in('id', duplicateIdsToDelete);
        } catch (e) {}
      })();
    }
    if (orphansToDeleteFromTable.length > 0) {
      (async () => {
        try {
          await supabase.from('checkins').delete().in('guest_id', orphansToDeleteFromTable);
        } catch (e) {}
      })();
    }

    const result = Array.from(uniqueMap.values());
    result.sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime());

    // Synchronize authoritative results to localStorage cache so stale records are overwritten
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`portaria_checkins_cache_${eventId}`, JSON.stringify(result));
      } catch (e) {}
    }

    return result;
  },

  /**
   * Records a check-in for a guest with dual-layer cloud persistence:
   * Direct table insert + Guest record update + local cache + Realtime broadcast
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
      let eventId = '';
      try {
        const { data: currentGuest } = await supabase
          .from('guests')
          .select('id, event_id, notes')
          .eq('id', checkin.guest_id)
          .single();

        if (currentGuest) {
          eventId = currentGuest.event_id;
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

      const finalCheckin: CheckIn = createdCheckIn || {
        id: `ci_${checkin.guest_id}`,
        guest_id: checkin.guest_id,
        operator: checkin.operator,
        checked_at: checkinTimestamp,
      };

      // 4. Broadcast via Realtime channel
      broadcastCheckinNew({
        id: finalCheckin.id,
        guest_id: checkin.guest_id,
        event_id: eventId,
        checked_at: checkinTimestamp,
        operator: checkin.operator,
      });

      return finalCheckin;
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
    // 1. Check guest record notes first to respect explicit reversions
    try {
      const { data: guest } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .single();

      if (guest) {
        if (guest.notes?.includes(CHECKIN_REVERTED_TAG_PREFIX)) {
          return null; // Explicitly reverted!
        }
        if (guest.notes?.includes(CHECKIN_NOTE_TAG_PREFIX)) {
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
      }
    } catch (e) {}

    // 2. Check direct checkins table
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

    return null;
  },

  /**
   * Reverts/deletes a check-in across:
   * 1. Public checkins table
   * 2. Guest notes (applies [CHECKIN_REVERTED] to guarantee suppression in anon access)
   * 3. Local storage caches (inconditionally cleaned)
   * 4. Realtime broadcast to all connected devices/tabs
   */
  async deleteByGuestId(guestId: string, eventId?: string): Promise<boolean> {
    let success = false;
    let resolvedEventId = eventId || '';

    // 1. Delete from checkins table (succeeds if authenticated admin or permitted)
    try {
      const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('guest_id', guestId);
      if (!error) success = true;
    } catch (e) {
      console.warn('Error deleting from checkins table:', e);
    }

    // 2. Update guest record notes with reversion marker
    try {
      const { data: guest } = await supabase
        .from('guests')
        .select('id, event_id, notes')
        .eq('id', guestId)
        .single();

      if (guest) {
        if (!resolvedEventId && guest.event_id) {
          resolvedEventId = guest.event_id;
        }

        const updatedNotes = revertCheckinInNotes(guest.notes);
        const { error: updateErr } = await supabase
          .from('guests')
          .update({ notes: updatedNotes })
          .eq('id', guestId);

        if (!updateErr) {
          success = true;
        }
      }
    } catch (e) {
      console.warn('Error applying reversion marker to guest notes:', e);
    }

    // 3. Inconditionally clean local caches on the current device
    clearCheckinLocalCaches(guestId, resolvedEventId);

    // 4. Broadcast deletion to all other devices/clients via Supabase Realtime
    broadcastCheckinDelete(guestId, resolvedEventId);

    return success;
  },
};
