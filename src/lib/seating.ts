import { CompanionSeating, Guest, Table } from '@/types';

export const COMPANION_SEATING_START_TAG = '[COMPANION_SEATING_START]';
export const COMPANION_SEATING_END_TAG = '[COMPANION_SEATING_END]';
export const COMPANION_SEATING_TAG_PREFIX = '[COMPANION_SEATING:';

const HONORIFIC_TITLES = new Set([
  'dr', 'dra', 'dr.', 'dra.', 'doutor', 'doutora',
  'eng', 'eng.', 'engenheiro', 'engenheira',
  'sr', 'sra', 'sr.', 'sra.', 'senhor', 'senhora',
  'pr', 'pr.', 'pastor', 'pastora',
  'prof', 'prof.', 'professor', 'professora',
  'padre', 'bispo', 'irmã', 'irma', 'irmão', 'irmao'
]);

/**
 * Extracts the primary first name from a full name, ignoring honorific titles.
 * Examples:
 *   "Maria Silva" -> "Maria"
 *   "Dra. Joana Magalhães" -> "Joana"
 *   "Pedro & Ana" -> "Pedro"
 */
export function extractFirstName(fullName: string): string {
  if (!fullName) return 'Convidado';
  const clean = fullName.trim().replace(/[&/\\+].*$/, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);

  for (const p of parts) {
    const lower = p.toLowerCase();
    if (!HONORIFIC_TITLES.has(lower) && p.length > 1) {
      // Capitalize first letter properly
      return p.charAt(0).toUpperCase() + p.slice(1);
    }
  }

  return parts[0] || 'Convidado';
}

/**
 * Generates the automatic intelligent companion name: "Acompanhante de {PrimeiroNome}"
 */
export function getDefaultCompanionName(
  titularName: string,
  companionIndex: number = 1,
  totalCompanions: number = 1
): string {
  const firstName = extractFirstName(titularName);
  if (totalCompanions <= 1) {
    return `Acompanhante de ${firstName}`;
  }
  return `Acompanhante ${companionIndex} de ${firstName}`;
}

/**
 * Parses structured companion seating metadata from guest notes.
 */
export function parseCompanionSeatingFromNotes(notes?: string | null): CompanionSeating[] | null {
  if (!notes || (!notes.includes(COMPANION_SEATING_START_TAG) && !notes.includes(COMPANION_SEATING_TAG_PREFIX))) {
    return null;
  }
  try {
    const regex = /\[COMPANION_SEATING_START\]([\s\S]*?)\[COMPANION_SEATING_END\]|\[COMPANION_SEATING:(.*?)\]/;
    const match = regex.exec(notes);
    const jsonStr = match ? (match[1] || match[2]) : null;
    if (jsonStr) {
      const data = JSON.parse(jsonStr.trim());
      if (Array.isArray(data.companions)) {
        return data.companions.map((c: any, idx: number) => ({
          index: Number(c.index) || idx + 1,
          name: typeof c.name === 'string' && c.name.trim() ? c.name.trim() : undefined,
          table_id: c.table_id || null,
        }));
      }
    }
  } catch (err) {
    console.warn('Erro ao ler COMPANION_SEATING das notas:', err);
  }
  return null;
}

/**
 * Attaches or updates structured companion seating metadata in guest notes.
 */
export function attachCompanionSeatingToNotes(
  existingNotes: string | null | undefined,
  seating: CompanionSeating[]
): string {
  const clean = (existingNotes || '')
    .replace(/\[COMPANION_SEATING_START\][\s\S]*?\[COMPANION_SEATING_END\]/g, '')
    .replace(/\[COMPANION_SEATING:.*?\]/g, '')
    .trim();

  const payload = JSON.stringify({
    companions: seating.map((c, idx) => ({
      index: c.index || idx + 1,
      name: c.name || undefined,
      table_id: c.table_id || null,
    })),
  });

  return clean
    ? `${clean}\n${COMPANION_SEATING_START_TAG}${payload}${COMPANION_SEATING_END_TAG}`
    : `${COMPANION_SEATING_START_TAG}${payload}${COMPANION_SEATING_END_TAG}`;
}

/**
 * Removes companion seating metadata tag from notes (re-joins titular and companions).
 */
export function removeCompanionSeatingFromNotes(existingNotes: string | null | undefined): string {
  return (existingNotes || '')
    .replace(/\[COMPANION_SEATING_START\][\s\S]*?\[COMPANION_SEATING_END\]/g, '')
    .replace(/\[COMPANION_SEATING:.*?\]/g, '')
    .trim();
}

/**
 * Strips all internal tags ([CHECKIN:...], [CHECKIN_REVERTED:...], [COMPANION_SEATING:...])
 * for user-facing notes display.
 */
export function cleanNotesFromAllInternalTags(notes?: string | null | undefined): string {
  return (notes || '')
    .replace(/\[CHECKIN:.*?\]/g, '')
    .replace(/\[CHECKIN_REVERTED:.*?\]/g, '')
    .replace(/\[COMPANION_SEATING_START\][\s\S]*?\[COMPANION_SEATING_END\]/g, '')
    .replace(/\[COMPANION_SEATING:.*?\]/g, '')
    .trim();
}

/**
 * Checks if a guest has their companions assigned to separate tables.
 */
export function isGuestSeatingSeparated(guest: {
  companions?: number;
  companion_seating?: CompanionSeating[] | null;
  notes?: string | null;
}): boolean {
  if (!guest.companions || guest.companions <= 0) return false;
  if (guest.companion_seating && guest.companion_seating.length > 0) return true;
  return Boolean(
    guest.notes &&
      (guest.notes.includes(COMPANION_SEATING_START_TAG) ||
        guest.notes.includes(COMPANION_SEATING_TAG_PREFIX))
  );
}

export interface SeatingUnit {
  key: string; // Unique identifier for drag-and-drop or seat assignment (e.g. "g_123_main", "g_123_comp_1")
  guestId: string;
  isCompanion: boolean;
  companionIndex?: number;
  displayName: string;
  titularName: string;
  tableId: string | null;
  tableName?: string;
  status: string;
}

/**
 * Resolves all individual seating units for a guest (titular + companions).
 * If separated: returns titular + each companion independently.
 * If joined (together): returns 1 unit representing the titular, plus companion seats that share titular table.
 */
export function getGuestSeatingUnits(guest: Guest, tables: Table[] = []): SeatingUnit[] {
  const tableMap = new Map<string, string>(tables.map((t) => [t.id, t.name]));
  const companionsCount = guest.companions || 0;
  const seatingMeta = guest.companion_seating || parseCompanionSeatingFromNotes(guest.notes);
  const isSeparated = Boolean(companionsCount > 0 && seatingMeta && seatingMeta.length > 0);

  const units: SeatingUnit[] = [];

  // 1. Titular unit
  units.push({
    key: `${guest.id}_main`,
    guestId: guest.id,
    isCompanion: false,
    displayName: guest.name,
    titularName: guest.name,
    tableId: guest.table_id || null,
    tableName: guest.table_id ? tableMap.get(guest.table_id) : undefined,
    status: guest.status,
  });

  // 2. Companion units
  for (let c = 1; c <= companionsCount; c++) {
    const meta = seatingMeta?.find((s) => s.index === c);
    const customOrAutoName = meta?.name || getDefaultCompanionName(guest.name, c, companionsCount);
    const companionTableId = isSeparated
      ? (meta?.table_id || null)
      : (guest.table_id || null);

    units.push({
      key: `${guest.id}_comp_${c}`,
      guestId: guest.id,
      isCompanion: true,
      companionIndex: c,
      displayName: customOrAutoName,
      titularName: guest.name,
      tableId: companionTableId,
      tableName: companionTableId ? tableMap.get(companionTableId) : undefined,
      status: guest.status,
    });
  }

  return units;
}
