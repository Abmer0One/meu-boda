import { supabase } from '@/lib/supabase';
import { Event, PortariaConfig, Guest, CheckIn } from '@/types';
import { EventRepository } from './event.repository';
import { GuestRepository } from './guest.repository';
import { CheckInRepository } from './checkin.repository';

export const PORTARIA_CONFIG_BLOCK_TITLE = '__portaria_config__';

export const generatePortariaPin = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generatePortariaToken = (): string => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = 'pt_';
  for (let i = 0; i < 10; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export const DEFAULT_PORTARIA_OPERATORS = [
  'Portão Principal',
  'Entrada VIP',
  'Protocolo 1',
  'Protocolo 2',
];

export const PortariaRepository = {
  /**
   * Get Portaria configuration for an event.
   * If none exists, creates a fresh default config with an initial PIN.
   */
  async getConfig(eventId: string): Promise<PortariaConfig> {
    try {
      const { data, error } = await supabase
        .from('event_info_blocks')
        .select('*')
        .eq('event_id', eventId)
        .eq('title', PORTARIA_CONFIG_BLOCK_TITLE)
        .maybeSingle();

      if (!error && data?.content) {
        const parsed = JSON.parse(data.content) as PortariaConfig;
        if (parsed && typeof parsed.enabled === 'boolean') {
          return {
            enabled: parsed.enabled,
            pin: parsed.pin || generatePortariaPin(),
            access_token: parsed.access_token || generatePortariaToken(),
            operators: parsed.operators && parsed.operators.length > 0 ? parsed.operators : DEFAULT_PORTARIA_OPERATORS,
            allow_manual_search: parsed.allow_manual_search ?? true,
            updated_at: parsed.updated_at || new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn('Erro ao ler config da portaria do Supabase:', err);
    }

    // Check localStorage fallback
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem(`portaria_config_${eventId}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed.enabled === 'boolean') {
            return parsed;
          }
        }
      } catch (e) {}
    }

    // Default new configuration
    const initialConfig: PortariaConfig = {
      enabled: true,
      pin: generatePortariaPin(),
      access_token: generatePortariaToken(),
      operators: DEFAULT_PORTARIA_OPERATORS,
      allow_manual_search: true,
      updated_at: new Date().toISOString(),
    };

    // Save initial config silently in background
    this.saveConfig(eventId, initialConfig).catch(() => {});

    return initialConfig;
  },

  /**
   * Save or update Portaria configuration in event_info_blocks and localStorage
   */
  async saveConfig(eventId: string, config: PortariaConfig): Promise<boolean> {
    const updatedConfig: PortariaConfig = {
      ...config,
      updated_at: new Date().toISOString(),
    };

    // Save locally first for instant reactivity
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`portaria_config_${eventId}`, JSON.stringify(updatedConfig));
      } catch (e) {}
    }

    try {
      const { data: existing } = await supabase
        .from('event_info_blocks')
        .select('id')
        .eq('event_id', eventId)
        .eq('title', PORTARIA_CONFIG_BLOCK_TITLE)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('event_info_blocks')
          .update({
            content: JSON.stringify(updatedConfig),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_info_blocks')
          .insert({
            event_id: eventId,
            title: PORTARIA_CONFIG_BLOCK_TITLE,
            content: JSON.stringify(updatedConfig),
            sort_order: 9999,
          });
        if (error) throw error;
      }
      return true;
    } catch (err) {
      console.error('Erro ao guardar portaria config no Supabase:', err);
      // Returns true if at least saved in localStorage
      return true;
    }
  },

  /**
   * Validate portaria access by event slug and PIN or Token
   */
  async validateAccess(
    slug: string,
    pinOrToken: string
  ): Promise<{
    valid: boolean;
    event?: Event;
    config?: PortariaConfig;
    error?: string;
  }> {
    const cleanSlug = slug.trim().toLowerCase();
    const cleanAuth = pinOrToken.trim();

    if (!cleanSlug || !cleanAuth) {
      return { valid: false, error: 'Identificador do evento e código de acesso são obrigatórios.' };
    }

    const event = await EventRepository.getBySlug(cleanSlug);
    if (!event) {
      return { valid: false, error: 'Evento não encontrado. Verifique o link fornecido.' };
    }

    const config = await this.getConfig(event.id);

    if (!config.enabled) {
      return {
        valid: false,
        error: 'O acesso à Portaria deste evento foi temporariamente desativado pelo organizador.',
      };
    }

    const isPinMatch = config.pin && config.pin === cleanAuth;
    const isTokenMatch = config.access_token && config.access_token === cleanAuth;

    if (!isPinMatch && !isTokenMatch) {
      return {
        valid: false,
        error: 'Código PIN ou link de acesso incorreto. Confirme com o organizador do evento.',
      };
    }

    return {
      valid: true,
      event,
      config,
    };
  },

  /**
   * Get all guests for the event
   */
  async getGuests(eventId: string): Promise<Guest[]> {
    return GuestRepository.getAll(eventId);
  },

  /**
   * Get all check-ins for the event
   */
  async getCheckins(eventId: string): Promise<CheckIn[]> {
    return CheckInRepository.getAll(eventId);
  },

  /**
   * Perform a check-in for a guest with the designated operator station
   */
  async performCheckin(guestId: string, operator: string): Promise<CheckIn | null> {
    return CheckInRepository.create({
      guest_id: guestId,
      operator: operator || 'Portaria',
    });
  },

  /**
   * Revert a check-in (in case of operator mistake)
   */
  async revertCheckin(guestId: string): Promise<boolean> {
    return CheckInRepository.deleteByGuestId(guestId);
  },
};
