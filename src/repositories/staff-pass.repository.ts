import { supabase } from '@/lib/supabase';
import { StaffPass, StaffCheckin } from '@/types';

export const STAFF_PASSES_BLOCK_TITLE = '__event_staff_passes__';
export const STAFF_CHECKINS_BLOCK_TITLE = '__event_staff_checkins__';

export const generateStaffPassToken = (): string => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = 'stf_';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export const StaffPassRepository = {
  /**
   * Retrieves all staff passes for an event
   */
  async getAll(eventId: string): Promise<StaffPass[]> {
    if (!eventId) return [];

    try {
      const { data, error } = await supabase
        .from('event_info_blocks')
        .select('*')
        .eq('event_id', eventId)
        .eq('title', STAFF_PASSES_BLOCK_TITLE)
        .maybeSingle();

      if (!error && data?.content) {
        const parsed = JSON.parse(data.content) as StaffPass[];
        if (Array.isArray(parsed)) {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`staff_passes_${eventId}`, data.content);
            } catch (e) {}
          }
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Erro ao ler passes de staff do Supabase:', err);
    }

    // LocalStorage fallback
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`staff_passes_${eventId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
    }

    return [];
  },

  /**
   * Saves the full list of staff passes for an event
   */
  async saveAll(eventId: string, passes: StaffPass[]): Promise<boolean> {
    if (!eventId) return false;

    const contentStr = JSON.stringify(passes);

    // Save locally first
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`staff_passes_${eventId}`, contentStr);
      } catch (e) {}
    }

    try {
      const { data: existing } = await supabase
        .from('event_info_blocks')
        .select('id')
        .eq('event_id', eventId)
        .eq('title', STAFF_PASSES_BLOCK_TITLE)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('event_info_blocks')
          .update({
            content: contentStr,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_info_blocks')
          .insert({
            event_id: eventId,
            title: STAFF_PASSES_BLOCK_TITLE,
            content: contentStr,
            sort_order: 9998,
          });
        if (error) throw error;
      }
      return true;
    } catch (err) {
      console.error('Erro ao guardar passes de staff no Supabase:', err);
      return true; // Still persisted locally
    }
  },

  /**
   * Creates a single staff pass
   */
  async create(pass: Omit<StaffPass, 'id' | 'qr_token' | 'created_at'>): Promise<StaffPass> {
    const current = await this.getAll(pass.event_id);
    const newPass: StaffPass = {
      ...pass,
      id: `pass_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      qr_token: generateStaffPassToken(),
      created_at: new Date().toISOString(),
    };

    const updated = [newPass, ...current];
    await this.saveAll(pass.event_id, updated);
    return newPass;
  },

  /**
   * Creates a batch of staff passes (e.g. for a catering or security team)
   */
  async createBatch(passes: Omit<StaffPass, 'id' | 'qr_token' | 'created_at'>[]): Promise<StaffPass[]> {
    if (passes.length === 0) return [];
    const eventId = passes[0].event_id;
    const current = await this.getAll(eventId);

    const now = Date.now();
    const newPasses: StaffPass[] = passes.map((p, idx) => ({
      ...p,
      id: `pass_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      qr_token: generateStaffPassToken(),
      created_at: new Date().toISOString(),
    }));

    const updated = [...newPasses, ...current];
    await this.saveAll(eventId, updated);
    return newPasses;
  },

  /**
   * Deletes a staff pass
   */
  async delete(passId: string, eventId: string): Promise<boolean> {
    const current = await this.getAll(eventId);
    const updated = current.filter((p) => p.id !== passId);
    return this.saveAll(eventId, updated);
  },

  /**
   * Finds a staff pass by token
   */
  async getByToken(token: string, eventId?: string): Promise<StaffPass | null> {
    const cleanToken = token.trim();
    if (!cleanToken) return null;

    if (eventId) {
      const list = await this.getAll(eventId);
      const match = list.find((p) => p.qr_token.toLowerCase() === cleanToken.toLowerCase());
      if (match) return match;
    }

    return null;
  },

  /**
   * Retrieves all staff check-in records for an event
   */
  async getCheckins(eventId: string): Promise<StaffCheckin[]> {
    if (!eventId) return [];

    try {
      const { data, error } = await supabase
        .from('event_info_blocks')
        .select('*')
        .eq('event_id', eventId)
        .eq('title', STAFF_CHECKINS_BLOCK_TITLE)
        .maybeSingle();

      if (!error && data?.content) {
        const parsed = JSON.parse(data.content) as StaffCheckin[];
        if (Array.isArray(parsed)) {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`staff_checkins_${eventId}`, data.content);
            } catch (e) {}
          }
          return parsed;
        }
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`staff_checkins_${eventId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
    }

    return [];
  },

  /**
   * Records a staff check-in
   */
  async performCheckin(
    pass: StaffPass,
    operator: string
  ): Promise<StaffCheckin | null> {
    const eventId = pass.event_id;
    const currentCheckins = await this.getCheckins(eventId);

    // Verify if already checked in today
    const existing = currentCheckins.find((c) => c.pass_id === pass.id);
    if (existing) {
      return null; // Already checked in
    }

    const checkinRecord: StaffCheckin = {
      id: `stf_ci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pass_id: pass.id,
      event_id: eventId,
      company_name: pass.company_name,
      role_title: pass.role_title,
      holder_name: pass.holder_name,
      operator: operator || 'Portaria',
      checked_at: new Date().toISOString(),
    };

    const updated = [checkinRecord, ...currentCheckins];
    const contentStr = JSON.stringify(updated);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`staff_checkins_${eventId}`, contentStr);
      } catch (e) {}
    }

    try {
      const { data: existingBlock } = await supabase
        .from('event_info_blocks')
        .select('id')
        .eq('event_id', eventId)
        .eq('title', STAFF_CHECKINS_BLOCK_TITLE)
        .maybeSingle();

      if (existingBlock?.id) {
        await supabase
          .from('event_info_blocks')
          .update({ content: contentStr })
          .eq('id', existingBlock.id);
      } else {
        await supabase
          .from('event_info_blocks')
          .insert({
            event_id: eventId,
            title: STAFF_CHECKINS_BLOCK_TITLE,
            content: contentStr,
            sort_order: 9997,
          });
      }
    } catch (e) {
      console.warn('Erro ao guardar staff checkin no Supabase:', e);
    }

    // Broadcast over Realtime channel
    try {
      const streamChannel = supabase.channel('portaria-live-stream');
      streamChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          streamChannel
            .send({
              type: 'broadcast',
              event: 'staff-checkin',
              payload: checkinRecord,
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
    } catch (e) {}

    return checkinRecord;
  },

  /**
   * Reverts a staff check-in
   */
  async revertCheckin(passId: string, eventId: string): Promise<boolean> {
    const current = await this.getCheckins(eventId);
    const updated = current.filter((c) => c.pass_id !== passId);
    const contentStr = JSON.stringify(updated);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`staff_checkins_${eventId}`, contentStr);
      } catch (e) {}
    }

    try {
      const { data: existingBlock } = await supabase
        .from('event_info_blocks')
        .select('id')
        .eq('event_id', eventId)
        .eq('title', STAFF_CHECKINS_BLOCK_TITLE)
        .maybeSingle();

      if (existingBlock?.id) {
        await supabase
          .from('event_info_blocks')
          .update({ content: contentStr })
          .eq('id', existingBlock.id);
      }
    } catch (e) {}

    return true;
  },
};
