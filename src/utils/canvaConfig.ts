import { supabase } from '@/lib/supabase';
import { EventInfoBlock } from '@/types';

export interface QrCoordinates {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CanvaTemplateConfig {
  canva_cover_url?: string | null;
  canva_info_url?: string | null;
  qr_locations_coords?: QrCoordinates;
  qr_access_coords?: QrCoordinates;
  [key: string]: any;
}

export const DEFAULT_LOC_COORDS: QrCoordinates = {
  left: 8.76,
  top: 69.56,
  width: 11.85,
  height: 16.76,
};

export const DEFAULT_ACCESS_COORDS: QrCoordinates = {
  left: 80.99,
  top: 54.14,
  width: 13.10,
  height: 18.52,
};

export const DEFAULT_CANVA_COVER = '/templates/canva/page_1.png';
export const DEFAULT_CANVA_INFO = '/templates/canva/page_2_clean.png';
export const CANVA_CONFIG_BLOCK_TITLE = '__canva_template_config__';

/**
 * Resolves the Canva template configuration using all available sources:
 * 1. Event template_config field
 * 2. Event info blocks (__canva_template_config__)
 * 3. Browser localStorage
 * 4. Event background_image (as fallback for info image)
 */
export function resolveCanvaConfig(
  eventId?: string | null,
  templateConfig?: Record<string, any> | null,
  infoBlocks?: EventInfoBlock[] | null,
  backgroundImage?: string | null
): CanvaTemplateConfig {
  let resolved: CanvaTemplateConfig = {
    canva_cover_url: null,
    canva_info_url: null,
    qr_locations_coords: { ...DEFAULT_LOC_COORDS },
    qr_access_coords: { ...DEFAULT_ACCESS_COORDS },
  };

  // 1. From template_config if present
  if (templateConfig) {
    if (templateConfig.canva_cover_url) resolved.canva_cover_url = templateConfig.canva_cover_url;
    if (templateConfig.canva_info_url) resolved.canva_info_url = templateConfig.canva_info_url;
    if (templateConfig.qr_locations_coords) resolved.qr_locations_coords = { ...templateConfig.qr_locations_coords };
    if (templateConfig.qr_access_coords) resolved.qr_access_coords = { ...templateConfig.qr_access_coords };
  }

  // 2. From info blocks if present
  if (infoBlocks && infoBlocks.length > 0) {
    const configBlock = infoBlocks.find((b) => b.title === CANVA_CONFIG_BLOCK_TITLE);
    if (configBlock?.content) {
      try {
        const parsed = JSON.parse(configBlock.content);
        if (!resolved.canva_cover_url && parsed.canva_cover_url) resolved.canva_cover_url = parsed.canva_cover_url;
        if (!resolved.canva_info_url && parsed.canva_info_url) resolved.canva_info_url = parsed.canva_info_url;
        if (parsed.qr_locations_coords) resolved.qr_locations_coords = { ...parsed.qr_locations_coords };
        if (parsed.qr_access_coords) resolved.qr_access_coords = { ...parsed.qr_access_coords };
      } catch (err) {
        console.error('Error parsing info_block canva config:', err);
      }
    }
  }

  // 3. From localStorage if in browser
  if (typeof window !== 'undefined' && eventId) {
    try {
      const stored = localStorage.getItem(`canva_template_${eventId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!resolved.canva_cover_url && parsed.canva_cover_url) resolved.canva_cover_url = parsed.canva_cover_url;
        if (!resolved.canva_info_url && parsed.canva_info_url) resolved.canva_info_url = parsed.canva_info_url;
        if (parsed.qr_locations_coords) resolved.qr_locations_coords = { ...parsed.qr_locations_coords };
        if (parsed.qr_access_coords) resolved.qr_access_coords = { ...parsed.qr_access_coords };
      }
    } catch (err) {
      console.error('Error reading localStorage canva config:', err);
    }
  }

  // 4. Background image fallback for info image
  if (!resolved.canva_info_url && backgroundImage) {
    resolved.canva_info_url = backgroundImage;
  }

  return resolved;
}

/**
 * Persists Canva template configuration to:
 * 1. localStorage (for instant offline & same-browser loading)
 * 2. event_info_blocks table (guaranteed persistent DB storage across all devices/guests)
 * 3. events table template_config & background_image (if column exists)
 */
export async function persistCanvaConfig(
  eventId: string,
  config: CanvaTemplateConfig
): Promise<boolean> {
  if (!eventId) return false;

  const jsonString = JSON.stringify(config);

  // 1. Save to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`canva_template_${eventId}`, jsonString);
    } catch (err) {
      console.warn('Could not save to localStorage:', err);
    }
  }

  // 2. Save to event_info_blocks table
  try {
    const { data: existing } = await supabase
      .from('event_info_blocks')
      .select('id')
      .eq('event_id', eventId)
      .eq('title', CANVA_CONFIG_BLOCK_TITLE)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('event_info_blocks')
        .update({
          content: jsonString,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('event_info_blocks').insert({
        event_id: eventId,
        title: CANVA_CONFIG_BLOCK_TITLE,
        content: jsonString,
        sort_order: 9999,
      });
    }
  } catch (err) {
    console.error('Error saving to event_info_blocks:', err);
  }

  // 3. Try saving to events table (with fallback for missing template_config column)
  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (config.canva_info_url) {
      updatePayload.background_image = config.canva_info_url;
    }
    updatePayload.template_config = config;

    const { error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', eventId);

    if (error && error.code === 'PGRST204') {
      // Column template_config does not exist in schema cache; save without it
      const { template_config, ...safePayload } = updatePayload;
      await supabase
        .from('events')
        .update(safePayload)
        .eq('id', eventId);
    }
  } catch (err) {
    console.warn('Notice: events table update had non-fatal error:', err);
  }

  return true;
}
