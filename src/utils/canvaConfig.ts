import { supabase } from '@/lib/supabase';
import { EventInfoBlock } from '@/types';

export interface QrCoordinates {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CanvaTemplateConfig {
  template_source?: 'basic' | 'custom';
  canva_cover_url?: string | null;
  canva_info_url?: string | null;
  pdf_mode?: 'double_page' | 'single_page';
  pdf_orientation?: 'portrait' | 'landscape';
  show_locations_qr?: boolean;
  show_access_qr?: boolean;
  qr_locations_coords?: QrCoordinates;
  qr_access_coords?: QrCoordinates;
  is_basic_template?: boolean;
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

export const DEFAULT_PORTRAIT_LOC_COORDS: QrCoordinates = {
  left: 10,
  top: 79,
  width: 22,
  height: 15.5,
};

export const DEFAULT_PORTRAIT_ACCESS_COORDS: QrCoordinates = {
  left: 68,
  top: 79,
  width: 22,
  height: 15.5,
};

export const DEFAULT_CANVA_COVER = '/templates/canva/page_1.png';
export const DEFAULT_CANVA_INFO = '/templates/canva/page_2_clean.png';
export const CANVA_CONFIG_BLOCK_TITLE = '__canva_template_config__';

/**
 * Known event IDs and slugs strictly belonging to Marinela & Abiúd
 */
export const MARINELA_ABIUD_EVENT_IDS = [
  '51399983-26a7-449f-be50-5b3516e97440',
  'e46d32ba-7b42-47e7-b377-559b9ab6efd6',
  'c960286d-956c-4da2-8ecf-79dc981ecd88',
];

/**
 * Checks if a given event is Marinela & Abiúd's event.
 * The custom Canva artwork in /templates/canva/ is exclusive to this couple.
 */
export function isMarinelaAbiudEvent(
  eventOrId?: any,
  slug?: string | null,
  title?: string | null
): boolean {
  if (!eventOrId && !slug && !title) return false;

  let id = '';
  let s = slug || '';
  let t = title || '';

  if (typeof eventOrId === 'string') {
    id = eventOrId;
  } else if (typeof eventOrId === 'object' && eventOrId !== null) {
    id = eventOrId.id || '';
    s = eventOrId.slug || s;
    t = eventOrId.title || t;
  }

  if (MARINELA_ABIUD_EVENT_IDS.includes(id)) return true;

  const sLower = (s || '').toLowerCase();
  const tLower = (t || '').toLowerCase();

  if (sLower === 'marinela-abiud' || sLower === 'marinela-abiud-casamento' || sLower === 'nosso-casamento') {
    return true;
  }
  if (sLower.includes('marinela') && (sLower.includes('abiud') || sLower.includes('abiúd'))) {
    return true;
  }
  if (tLower.includes('marinela') && (tLower.includes('abiud') || tLower.includes('abiúd'))) {
    return true;
  }

  return false;
}

/**
 * Identifies if a URL is Marinela & Abiúd's hardcoded Canva artwork files
 */
export function isDefaultMarinelaArtwork(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('/templates/canva/page_1.png') ||
    url.includes('/templates/canva/page_2.png') ||
    url.includes('/templates/canva/page_2_clean.png')
  );
}

/**
 * Ensures that a given URL is a genuine Canva invitation template artwork
 * and not a decorative user photo (such as fundo_... or capa_...).
 * If the event is NOT Marinela & Abiúd, it also rejects Marinela's default artwork.
 */
export function isCleanCanvaUrl(url?: string | null, isMarinela: boolean = false): boolean {
  if (!url || typeof url !== 'string') return false;
  // If the file path contains fundo_ or capa_ (which are user photos), reject it
  if (url.includes('/fundo_') || url.includes('/capa_')) {
    return false;
  }
  // If not Marinela & Abiúd, reject Marinela's default artwork
  if (!isMarinela && isDefaultMarinelaArtwork(url)) {
    return false;
  }
  return true;
}

/**
 * Resolves the Canva template configuration using all available sources:
 * 1. Event template_config field
 * 2. Event info blocks (__canva_template_config__)
 * 3. Browser localStorage
 * 4. Default fallback: Marinela & Abiúd get their official templates;
 *    all other events without uploaded artwork get null (using the Basic Template with QR codes).
 */
export function resolveCanvaConfig(
  eventId?: string | any | null,
  templateConfig?: Record<string, any> | null,
  infoBlocks?: EventInfoBlock[] | null,
  _backgroundImage?: string | null,
  eventObject?: any
): CanvaTemplateConfig {
  const actualEvent = eventObject || (typeof eventId === 'object' ? eventId : null);
  const actualEventId = typeof eventId === 'string' ? eventId : actualEvent?.id || null;
  const isMarinela = isMarinelaAbiudEvent(actualEvent || actualEventId);

  let resolved: CanvaTemplateConfig = {
    template_source: undefined,
    canva_cover_url: null,
    canva_info_url: null,
    pdf_mode: 'double_page',
    pdf_orientation: 'landscape',
    show_locations_qr: true,
    show_access_qr: true,
    qr_locations_coords: { ...DEFAULT_LOC_COORDS },
    qr_access_coords: { ...DEFAULT_ACCESS_COORDS },
    is_basic_template: false,
  };

  // 1. From template_config if present
  if (templateConfig) {
    if (templateConfig.template_source) resolved.template_source = templateConfig.template_source;
    if (isCleanCanvaUrl(templateConfig.canva_cover_url, isMarinela)) {
      resolved.canva_cover_url = templateConfig.canva_cover_url;
    }
    if (isCleanCanvaUrl(templateConfig.canva_info_url, isMarinela)) {
      resolved.canva_info_url = templateConfig.canva_info_url;
    }
    if (templateConfig.pdf_mode) resolved.pdf_mode = templateConfig.pdf_mode;
    if (templateConfig.pdf_orientation) resolved.pdf_orientation = templateConfig.pdf_orientation;
    if (templateConfig.show_locations_qr !== undefined) resolved.show_locations_qr = templateConfig.show_locations_qr;
    if (templateConfig.show_access_qr !== undefined) resolved.show_access_qr = templateConfig.show_access_qr;
    if (templateConfig.qr_locations_coords) resolved.qr_locations_coords = { ...templateConfig.qr_locations_coords };
    if (templateConfig.qr_access_coords) resolved.qr_access_coords = { ...templateConfig.qr_access_coords };
  }

  // 2. From info blocks if present (database persistent config)
  if (infoBlocks && infoBlocks.length > 0) {
    const configBlock = infoBlocks.find((b) => b.title === CANVA_CONFIG_BLOCK_TITLE);
    if (configBlock?.content) {
      try {
        const parsed = JSON.parse(configBlock.content);
        if (parsed.template_source) resolved.template_source = parsed.template_source;
        if (isCleanCanvaUrl(parsed.canva_cover_url, isMarinela)) {
          resolved.canva_cover_url = parsed.canva_cover_url;
        }
        if (isCleanCanvaUrl(parsed.canva_info_url, isMarinela)) {
          resolved.canva_info_url = parsed.canva_info_url;
        }
        if (parsed.pdf_mode) resolved.pdf_mode = parsed.pdf_mode;
        if (parsed.pdf_orientation) resolved.pdf_orientation = parsed.pdf_orientation;
        if (parsed.show_locations_qr !== undefined) resolved.show_locations_qr = parsed.show_locations_qr;
        if (parsed.show_access_qr !== undefined) resolved.show_access_qr = parsed.show_access_qr;
        if (parsed.qr_locations_coords) resolved.qr_locations_coords = { ...parsed.qr_locations_coords };
        if (parsed.qr_access_coords) resolved.qr_access_coords = { ...parsed.qr_access_coords };
      } catch (err) {
        console.error('Error parsing info_block canva config:', err);
      }
    }
  }

  // 3. From localStorage if in browser
  if (typeof window !== 'undefined' && actualEventId) {
    try {
      const stored = localStorage.getItem(`canva_template_${actualEventId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.template_source && !resolved.template_source) resolved.template_source = parsed.template_source;
        if (!resolved.canva_cover_url && isCleanCanvaUrl(parsed.canva_cover_url, isMarinela)) {
          resolved.canva_cover_url = parsed.canva_cover_url;
        }
        if (!resolved.canva_info_url && isCleanCanvaUrl(parsed.canva_info_url, isMarinela)) {
          resolved.canva_info_url = parsed.canva_info_url;
        }
        if (parsed.pdf_mode) resolved.pdf_mode = parsed.pdf_mode;
        if (parsed.pdf_orientation) resolved.pdf_orientation = parsed.pdf_orientation;
        if (parsed.show_locations_qr !== undefined) resolved.show_locations_qr = parsed.show_locations_qr;
        if (parsed.show_access_qr !== undefined) resolved.show_access_qr = parsed.show_access_qr;
        if (parsed.qr_locations_coords) resolved.qr_locations_coords = { ...parsed.qr_locations_coords };
        if (parsed.qr_access_coords) resolved.qr_access_coords = { ...parsed.qr_access_coords };
      }
    } catch (err) {
      console.error('Error reading localStorage canva config:', err);
    }
  }

  // 4. Default fallbacks:
  // ONLY Marinela & Abiúd fallback to the official /templates/canva/ artwork.
  if (isMarinela) {
    resolved.canva_cover_url = resolved.canva_cover_url || DEFAULT_CANVA_COVER;
    resolved.canva_info_url = resolved.canva_info_url || DEFAULT_CANVA_INFO;
    resolved.template_source = resolved.template_source || 'custom';
    resolved.is_basic_template = resolved.template_source === 'basic';
  } else {
    // If user explicitly chose basic or custom
    if (resolved.template_source === 'basic') {
      resolved.is_basic_template = true;
    } else if (resolved.template_source === 'custom') {
      resolved.is_basic_template = !resolved.canva_cover_url && !resolved.canva_info_url;
    } else {
      // Auto-detect: if uploaded artwork exists, it's custom; otherwise basic
      const hasUpload = Boolean(resolved.canva_cover_url || resolved.canva_info_url);
      resolved.template_source = hasUpload ? 'custom' : 'basic';
      resolved.is_basic_template = !hasUpload;
    }
  }

  return resolved;
}

/**
 * Persists Canva template configuration to:
 * 1. localStorage (for instant offline & same-browser loading)
 * 2. event_info_blocks table (guaranteed persistent DB storage across all devices/guests)
 * 3. events table template_config (if column exists)
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
      // Do NOT pass updated_at: event_info_blocks does not have an updated_at column
      const { error: updateErr } = await supabase
        .from('event_info_blocks')
        .update({
          content: jsonString,
        })
        .eq('id', existing.id);

      if (updateErr) {
        console.error('Error updating event_info_blocks canva config:', updateErr);
      }
    } else {
      const { error: insertErr } = await supabase.from('event_info_blocks').insert({
        event_id: eventId,
        title: CANVA_CONFIG_BLOCK_TITLE,
        content: jsonString,
        sort_order: 9999,
      });

      if (insertErr) {
        console.error('Error inserting event_info_blocks canva config:', insertErr);
      }
    }
  } catch (err) {
    console.error('Error saving to event_info_blocks:', err);
  }

  // 3. Try saving to events table (with fallback for missing template_config column)
  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      template_config: config,
    };

    const { error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', eventId);

    if (error && error.code === 'PGRST204') {
      // Column template_config does not exist in schema cache; harmless
    }
  } catch (err) {
    console.warn('Notice: events table update had non-fatal error:', err);
  }

  return true;
}
