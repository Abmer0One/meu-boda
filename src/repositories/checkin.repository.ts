import { supabase } from '@/lib/supabase';
import { CheckIn, Guest } from '@/types';

// In-flight mutex to avoid rapid concurrent check-in requests for the same guest
const inFlightCheckins = new Set<string>();

export const CHECKIN_NOTE_TAG_PREFIX = '[CHECKIN:';
export const CHECKIN_REVERTED_TAG_PREFIX = '[CHECKIN_REVERTED:';

export interface GuestCheckinStats {
  maxAllowed: number;
  totalEntered: number;
  remainingSlots: number;
  isFullyCheckedIn: boolean;
  isPartiallyCheckedIn: boolean;
  entries: CheckIn[];
}

/**
 * Extracts and cleans pax count encoded in operator text (fallback when checked_count column is not in SQL schema)
 */
export function extractPaxFromOperator(operator?: string | null): { cleanOperator: string; count: number } {
  if (!operator) return { cleanOperator: 'Portaria', count: 1 };
  const match = /\[(?:pax|count):(\d+)\]/i.exec(operator);
  if (match && match[1]) {
    const count = parseInt(match[1], 10) || 1;
    const clean = operator.replace(/\[(?:pax|count):\d+\]/gi, '').trim() || 'Portaria';
    return { cleanOperator: clean, count };
  }
  return { cleanOperator: operator.trim() || 'Portaria', count: 1 };
}

/**
 * Computes live admission statistics and slot availability for a guest based on current check-in records.
 */
export function getGuestCheckinStats(
  guest: { id: string; companions?: number | null; name?: string },
  checkins: CheckIn[]
): GuestCheckinStats {
  const maxAllowed = 1 + (Number(guest?.companions) || 0);
  const guestEntries = (checkins || []).filter((ci) => ci.guest_id === guest.id);
  const rawEntered = guestEntries.reduce((sum, ci) => sum + (Number(ci.checked_count) || 1), 0);
  const totalEntered = Math.min(maxAllowed, rawEntered);
  const remainingSlots = Math.max(0, maxAllowed - totalEntered);
  const isFullyCheckedIn = rawEntered >= maxAllowed;
  const isPartiallyCheckedIn = rawEntered > 0 && remainingSlots > 0;

  return {
    maxAllowed,
    totalEntered,
    remainingSlots,
    isFullyCheckedIn,
    isPartiallyCheckedIn,
    entries: guestEntries,
  };
}

/**
 * Extracts latest check-in metadata embedded in guest notes (fallback persistence)
 */
export function parseGuestCheckinNote(notes?: string | null): { operator: string; at: string; checked_count?: number } | null {
  if (!notes || notes.includes(CHECKIN_REVERTED_TAG_PREFIX) || !notes.includes(CHECKIN_NOTE_TAG_PREFIX)) {
    return null;
  }
  const all = parseAllGuestCheckinNotes(notes);
  if (all.length > 0) {
    const latest = all[all.length - 1];
    return {
      operator: latest.operator,
      at: latest.at,
      checked_count: latest.checked_count,
    };
  }
  return null;
}

/**
 * Parses all structured check-in tags embedded in guest notes (supporting multiple partial entries)
 */
export function parseAllGuestCheckinNotes(
  notes?: string | null
): Array<{ id?: string; operator: string; at: string; checked_count: number }> {
  if (!notes || notes.includes(CHECKIN_REVERTED_TAG_PREFIX) || !notes.includes(CHECKIN_NOTE_TAG_PREFIX)) {
    return [];
  }
  const results: Array<{ id?: string; operator: string; at: string; checked_count: number }> = [];
  try {
    const regex = /\[CHECKIN:(.*?)\]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(notes)) !== null) {
      if (match[1]) {
        try {
          const data = JSON.parse(match[1]);
          results.push({
            id: data.id,
            operator: data.operator || 'Portaria',
            at: data.at || new Date().toISOString(),
            checked_count: Number(data.checked_count) || 1,
          });
        } catch {}
      }
    }
  } catch (e) {
    console.warn('Error parsing all checkin notes metadata:', e);
  }
  return results;
}

/**
 * Attaches or appends structured check-in metadata tag in guest notes
 */
export function attachCheckinToNotes(
  existingNotes: string | null | undefined,
  operator: string,
  at?: string,
  checked_count: number = 1,
  checkinId?: string
): string {
  // Strip any reversion marker
  const clean = (existingNotes || '')
    .replace(/\[CHECKIN_REVERTED:.*?\]/g, '')
    .trim();

  const meta = JSON.stringify({
    id: checkinId || `ci_${Date.now()}`,
    operator: operator || 'Portaria',
    at: at || new Date().toISOString(),
    checked_count: Number(checked_count) || 1,
  });

  return clean ? `${clean}\n[CHECKIN:${meta}]` : `[CHECKIN:${meta}]`;
}

/**
 * Replaces or removes check-in tags in guest notes upon reversion
 */
export function revertCheckinInNotes(
  existingNotes: string | null | undefined,
  at?: string,
  checkinId?: string
): string {
  if (!existingNotes) {
    const meta = JSON.stringify({ at: at || new Date().toISOString() });
    return `[CHECKIN_REVERTED:${meta}]`;
  }

  // If reverting a specific check-in entry
  if (checkinId) {
    let hasRemaining = false;
    const updated = existingNotes.replace(/\[CHECKIN:(.*?)\]/g, (match, p1) => {
      try {
        const data = JSON.parse(p1);
        if (data.id === checkinId) {
          return ''; // remove this specific entry
        }
        hasRemaining = true;
        return match;
      } catch {
        return match;
      }
    }).trim();

    if (hasRemaining) {
      return updated;
    }
  }

  // If no check-in entries remain or blanket reversion requested:
  const clean = existingNotes
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
    .replace(/\[COMPANION_SEATING_START\][\s\S]*?\[COMPANION_SEATING_END\]/g, '')
    .replace(/\[COMPANION_SEATING:.*?\]/g, '')
    .trim();
}

/**
 * Cleans user-facing guest notes for UI presentation (stripping internal checkin/revert/seating tags)
 */
export function cleanGuestNotesForDisplay(notes?: string | null): string {
  return removeCheckinFromNotes(notes);
}

/**
 * Cleans localStorage caches on the current device
 */
export function clearCheckinLocalCaches(guestId: string, eventId?: string, checkinId?: string) {
  if (typeof window === 'undefined') return;
  try {
    if (eventId) {
      const cacheKey = `portaria_checkins_cache_${eventId}`;
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const list: CheckIn[] = JSON.parse(raw);
        const updated = list.filter((item) => {
          if (checkinId && item.id === checkinId) return false;
          if (!checkinId && item.guest_id === guestId) return false;
          return true;
        });
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      }
    }
    const liveRaw = localStorage.getItem('meuboda_live_checkins_cache');
    if (liveRaw) {
      const liveList = JSON.parse(liveRaw);
      const updatedLive = liveList.filter((item: any) => {
        if (checkinId && item.id === checkinId) return false;
        if (!checkinId && (item.id === `ci_${guestId}` || item.guest_id === guestId)) return false;
        return true;
      });
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
  checked_count?: number;
  remaining_slots?: number;
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
export function broadcastCheckinDelete(guestId: string, eventId?: string, checkinId?: string) {
  try {
    const streamChannel = supabase.channel('portaria-live-stream');
    streamChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        streamChannel
          .send({
            type: 'broadcast',
            event: 'delete-checkin',
            payload: {
              id: checkinId || `ci_${guestId}`,
              guest_id: guestId,
              event_id: eventId || '',
              all: !checkinId,
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
   * Preserves multiple partial check-in entries per guest so counts sum accurately.
   * Excludes any guests explicitly marked as reverted ([CHECKIN_REVERTED]).
   * Synchronizes the authoritative list to localStorage.
   */
  async getAll(eventId: string): Promise<CheckIn[]> {
    const itemsMap = new Map<string, CheckIn>();
    const guestsWithCheckinsInTable = new Set<string>();

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
        for (const item of data) {
          const ci = item as unknown as CheckIn;
          const { cleanOperator, count: paxCount } = extractPaxFromOperator(ci.operator);
          const initialCount = Number((ci as any).checked_count) || paxCount || 1;
          itemsMap.set(ci.id, {
            ...ci,
            operator: cleanOperator,
            checked_count: initialCount,
          });
          guestsWithCheckinsInTable.add(ci.guest_id);
        }
      }
    } catch (err) {
      console.warn('Checkins table query skipped or restricted:', err);
    }

    // 2. Query guests table to discover check-ins, enrich checked_count, and explicit reversions
    try {
      const { data: guestsWithNotes } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId);

      if (guestsWithNotes && Array.isArray(guestsWithNotes)) {
        for (const g of guestsWithNotes) {
          const notes = g.notes || '';

          // If guest has been explicitly marked as reverted, purge from checkins
          if (notes.includes(CHECKIN_REVERTED_TAG_PREFIX)) {
            for (const [id, ci] of itemsMap.entries()) {
              if (ci.guest_id === g.id) {
                itemsMap.delete(id);
              }
            }
          } else if (notes.includes(CHECKIN_NOTE_TAG_PREFIX)) {
            const parsedEntries = parseAllGuestCheckinNotes(notes);

            // Enrich existing table checkin items with authoritative checked_count from notes
            for (const entry of parsedEntries) {
              if (entry.id && itemsMap.has(entry.id)) {
                const existing = itemsMap.get(entry.id)!;
                if (!existing.checked_count || existing.checked_count < entry.checked_count) {
                  existing.checked_count = entry.checked_count;
                }
              }
            }

            // Verify total entered count for this guest from itemsMap vs notes
            const guestTableItems = Array.from(itemsMap.values()).filter((x) => x.guest_id === g.id);
            const notesTotal = parsedEntries.reduce((sum, e) => sum + (Number(e.checked_count) || 1), 0);
            const tableTotal = guestTableItems.reduce((sum, x) => sum + (Number(x.checked_count) || 1), 0);

            if (guestTableItems.length === 0) {
              // Table had no entries for this guest (e.g. anon RLS), load all from notes
              parsedEntries.forEach((entry, idx) => {
                const entryId = entry.id || `ci_${g.id}_${idx}`;
                if (!itemsMap.has(entryId)) {
                  itemsMap.set(entryId, {
                    id: entryId,
                    guest_id: g.id,
                    operator: entry.operator,
                    checked_at: entry.at,
                    checked_count: entry.checked_count,
                    guest: g,
                  });
                }
              });
            } else if (notesTotal > tableTotal) {
              // The database table rows lacked checked_count column or didn't store all entries.
              // Boost the latest table entry so the total entered matches notesTotal!
              guestTableItems[0].checked_count = (guestTableItems[0].checked_count || 1) + (notesTotal - tableTotal);
            }
          }
        }
      }
    } catch (notesErr) {
      console.warn('Error reading check-ins from guest notes:', notesErr);
    }

    const result = Array.from(itemsMap.values());
    result.sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime());

    // Synchronize authoritative results to localStorage cache
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`portaria_checkins_cache_${eventId}`, JSON.stringify(result));
      } catch (e) {}
    }

    return result;
  },

  /**
   * Retrieves all check-in records for a specific guest
   */
  async getAllByGuestId(guestId: string): Promise<CheckIn[]> {
    const list: CheckIn[] = [];

    // 1. Direct checkins table
    try {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('guest_id', guestId)
        .order('checked_at', { ascending: true });

      if (!error && data && Array.isArray(data)) {
        for (const row of data) {
          const { cleanOperator, count: paxCount } = extractPaxFromOperator(row.operator);
          const initialCount = Number((row as any).checked_count) || paxCount || 1;
          list.push({
            ...(row as CheckIn),
            operator: cleanOperator,
            checked_count: initialCount,
          });
        }
      }
    } catch (e) {}

    // 2. Authoritative check in guest notes to enrich or fallback
    try {
      const { data: guest } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .single();

      if (guest && !guest.notes?.includes(CHECKIN_REVERTED_TAG_PREFIX)) {
        const parsed = parseAllGuestCheckinNotes(guest.notes);

        if (list.length === 0) {
          parsed.forEach((p, idx) => {
            list.push({
              id: p.id || `ci_${guest.id}_${idx}`,
              guest_id: guest.id,
              operator: p.operator,
              checked_at: p.at,
              checked_count: p.checked_count,
              guest,
            });
          });
        } else {
          // Enrich existing list items with checked_count from notes
          for (const p of parsed) {
            const existing = list.find((ci) => ci.id === p.id);
            if (existing) {
              if (!existing.checked_count || existing.checked_count < p.checked_count) {
                existing.checked_count = p.checked_count;
              }
            }
          }
          const listTotal = list.reduce((s, ci) => s + (Number(ci.checked_count) || 1), 0);
          const notesTotal = parsed.reduce((s, p) => s + (Number(p.checked_count) || 1), 0);
          if (notesTotal > listTotal && list.length > 0) {
            list[list.length - 1].checked_count = (list[list.length - 1].checked_count || 1) + (notesTotal - listTotal);
          }
        }
      }
    } catch (e) {}

    return list;
  },

  /**
   * Checks if a guest has any active check-in (returns the latest one, or null)
   */
  async getByGuestId(guestId: string): Promise<CheckIn | null> {
    const all = await this.getAllByGuestId(guestId);
    return all.length > 0 ? all[all.length - 1] : null;
  },

  /**
   * Records a check-in (full or partial) for a guest with dual-layer cloud persistence:
   * Direct table insert + Guest record update + local cache + Realtime broadcast
   */
  async create(checkin: {
    guest_id: string;
    operator: string;
    checked_count?: number;
  }): Promise<CheckIn | null> {
    if (!checkin.guest_id) return null;

    // Mutex check: prevent concurrent operations for the same guest
    if (inFlightCheckins.has(checkin.guest_id)) {
      console.warn('Check-in already in-flight for guest:', checkin.guest_id);
      return null;
    }

    inFlightCheckins.add(checkin.guest_id);

    try {
      // 1. Fetch guest record and existing check-ins to verify available slots
      let guestCompanions = 0;
      let eventId = '';
      let guestNotes = '';
      let guestName = '';

      try {
        const { data: currentGuest } = await supabase
          .from('guests')
          .select('id, name, event_id, notes, companions')
          .eq('id', checkin.guest_id)
          .single();

        if (currentGuest) {
          guestCompanions = Number(currentGuest.companions) || 0;
          eventId = currentGuest.event_id || '';
          guestNotes = currentGuest.notes || '';
          guestName = currentGuest.name || '';
        }
      } catch (e) {
        console.warn('Error fetching guest for checkin validation:', e);
      }

      const existingEntries = await this.getAllByGuestId(checkin.guest_id);
      const totalAlreadyEntered = existingEntries.reduce(
        (sum, ci) => sum + (Number(ci.checked_count) || 1),
        0
      );
      const maxAllowed = 1 + guestCompanions;
      const remainingSlots = Math.max(0, maxAllowed - totalAlreadyEntered);

      if (remainingSlots <= 0) {
        console.warn('Guest invitation is already fully checked in:', checkin.guest_id);
        return null;
      }

      const countToEnter = Math.min(Number(checkin.checked_count) || 1, remainingSlots);
      if (countToEnter <= 0) return null;

      const checkinTimestamp = new Date().toISOString();
      let createdCheckIn: CheckIn | null = null;
      const paxTag = countToEnter > 1 ? ` [pax:${countToEnter}]` : '';
      const operatorToSave = `${checkin.operator || 'Portaria'}${paxTag}`;

      // 2. Attempt direct insert into public.checkins table
      try {
        // First try with checked_count
        const { data, error } = await supabase
          .from('checkins')
          .insert({
            guest_id: checkin.guest_id,
            operator: operatorToSave,
            checked_at: checkinTimestamp,
            checked_count: countToEnter,
          })
          .select()
          .single();

        if (!error && data) {
          createdCheckIn = {
            ...(data as CheckIn),
            operator: checkin.operator || 'Portaria',
            checked_count: countToEnter,
          };
        } else if (error) {
          // If column checked_count does not exist in schema, retry without it (pax count is preserved in operator and notes)
          console.warn('Direct checkin with checked_count failed, falling back:', error.message);
          const fallbackRes = await supabase
            .from('checkins')
            .insert({
              guest_id: checkin.guest_id,
              operator: operatorToSave,
              checked_at: checkinTimestamp,
            })
            .select()
            .single();

          if (!fallbackRes.error && fallbackRes.data) {
            createdCheckIn = {
              ...(fallbackRes.data as CheckIn),
              operator: checkin.operator || 'Portaria',
              checked_count: countToEnter,
            };
          }
        }
      } catch (insertErr) {
        console.warn('Direct checkins table insert failed (RLS/Permissions):', insertErr);
      }

      const assignedId = createdCheckIn?.id || `ci_${checkin.guest_id}_${Date.now()}`;

      // 3. Resilient Cloud Persistence: update guest record notes with check-in tag
      try {
        if (checkin.guest_id) {
          const updatedNotes = attachCheckinToNotes(
            guestNotes,
            checkin.operator,
            checkinTimestamp,
            countToEnter,
            assignedId
          );
          await supabase
            .from('guests')
            .update({ notes: updatedNotes })
            .eq('id', checkin.guest_id);
        }
      } catch (guestUpdateErr) {
        console.warn('Error persisting check-in tag to guest notes:', guestUpdateErr);
      }

      const finalCheckin: CheckIn = createdCheckIn || {
        id: assignedId,
        guest_id: checkin.guest_id,
        operator: checkin.operator,
        checked_at: checkinTimestamp,
        checked_count: countToEnter,
      };

      // 4. Update local storage cache
      if (typeof window !== 'undefined' && eventId) {
        try {
          const cacheKey = `portaria_checkins_cache_${eventId}`;
          const raw = localStorage.getItem(cacheKey);
          const list: CheckIn[] = raw ? JSON.parse(raw) : [];
          const filtered = [finalCheckin, ...list.filter((x) => x.id !== finalCheckin.id)].slice(0, 500);
          localStorage.setItem(cacheKey, JSON.stringify(filtered));
        } catch (cacheErr) {}
      }

      // 5. Broadcast via Realtime channel
      broadcastCheckinNew({
        id: finalCheckin.id,
        guest_id: checkin.guest_id,
        guest_name: guestName,
        guest_companions: guestCompanions,
        event_id: eventId,
        checked_at: checkinTimestamp,
        operator: checkin.operator,
        checked_count: countToEnter,
        remaining_slots: Math.max(0, maxAllowed - (totalAlreadyEntered + countToEnter)),
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
   * Reverts a specific check-in record
   */
  async deleteCheckin(checkinId: string, guestId: string, eventId?: string): Promise<boolean> {
    let success = false;
    let resolvedEventId = eventId || '';

    // 1. Delete from checkins table
    try {
      const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('id', checkinId);
      if (!error) success = true;
    } catch (e) {
      console.warn('Error deleting specific checkin from table:', e);
    }

    // 2. Update guest notes
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

        const updatedNotes = revertCheckinInNotes(guest.notes, undefined, checkinId);
        const { error: updateErr } = await supabase
          .from('guests')
          .update({ notes: updatedNotes })
          .eq('id', guestId);

        if (!updateErr) success = true;
      }
    } catch (e) {
      console.warn('Error updating guest notes for checkin reversion:', e);
    }

    // 3. Clean local caches
    clearCheckinLocalCaches(guestId, resolvedEventId, checkinId);

    // 4. Broadcast deletion to all stations
    broadcastCheckinDelete(guestId, resolvedEventId, checkinId);

    return success;
  },

  /**
   * Reverts all check-ins for a guest
   */
  async deleteByGuestId(guestId: string, eventId?: string): Promise<boolean> {
    let success = false;
    let resolvedEventId = eventId || '';

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
