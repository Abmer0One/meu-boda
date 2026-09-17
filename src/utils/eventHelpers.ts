/**
 * Utilities for event title parsing, initials generation, and host extraction.
 */

export interface EventInitialsResult {
  initials: string;
  names: string;
  firstName: string;
  secondName: string;
  isCouple: boolean;
}

const EVENT_PREFIXES: RegExp[] = [
  /^(?:O\s+)?Casamento\s+(?:de|do|da|dos|d')\s+/i,
  /^(?:O\s+)?Aniversário\s+(?:de|do|da|dos|d')\s+/i,
  /^(?:O\s+)?Pedido\s+(?:de\s+casamento\s+de|de|do|da|dos)\s+/i,
  /^(?:O\s+)?Chá\s+(?:de\s+panela|de\s+beb[êe]|de\s+casa\s+nova)\s+(?:de|do|da|d')\s+/i,
  /^(?:O\s+)?Alambamento\s+(?:de|do|da|dos|d')\s+/i,
  /^(?:A\s+)?Festa\s+(?:de|do|da|dos|d')\s*(?:\d+\s*(?:anos?|º|ª)?\s*(?:de|do|da|dos|d')\s*)?/i,
  /^(?:O\s+)?Workshop\s+(?:de|do|da|d')\s+/i,
  /^(?:A\s+)?Palestra\s+(?:de|do|da|d')\s+/i,
  /^(?:O\s+)?Batizado\s+(?:de|do|da|dos|d')\s+/i,
  /^(?:As\s+)?Bodas\s+(?:de\s+[^\-]+-\s*|(?:de|do|da|d')\s*)/i,
  /^\d+\s*(?:anos?|º|ª)?\s+(?:de|do|da|dos|d')\s+/i,
];

/**
 * Robustly parses event initials and host names from event title.
 * Prevents regex split bugs where letters inside words (e.g. 'e' in 'Marinela' or 'and' in 'André')
 * were falsely treated as conjunction separators.
 */
export function parseEventInitials(title?: string | null, eventType?: string): EventInitialsResult {
  if (!title || typeof title !== 'string' || !title.trim()) {
    return {
      initials: 'MB',
      names: 'Meu Boda',
      firstName: '',
      secondName: '',
      isCouple: false,
    };
  }

  let clean = title.trim();

  // 1. Remove standard category prefixes (e.g. "Casamento de...", "Aniversário da...")
  for (const prefix of EVENT_PREFIXES) {
    clean = clean.replace(prefix, '').trim();
  }

  // 2. Remove trailing/inline age markers like "18 anos", "30 anos"
  const cleanedNames = clean
    .replace(/\b\d+\s*(?:anos?|º|ª)?\b/gi, '')
    .trim();

  // 3. Split on explicit couple conjunctions with surrounding whitespace or word boundaries
  // Matches: " e ", " & ", " and ", " y ", " + ", " / ", " - "
  // Crucially does NOT match 'e' or 'and' inside names like André, Eduardo, Helena, Vanessa, Marinela
  const coupleSeparator = /(?:\s+(?:e|y|and)\s+|\s*[\/\\&+\-]\s*)/i;
  const parts = cleanedNames.split(coupleSeparator).map((s) => s.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const p1 = parts[0].replace(/^[^\p{L}\p{N}]+/u, '');
    const p2 = parts[1].replace(/^[^\p{L}\p{N}]+/u, '');
    const init1 = p1.charAt(0).toUpperCase();
    const init2 = p2.charAt(0).toUpperCase();
    return {
      initials: `${init1} & ${init2}`,
      names: clean,
      firstName: parts[0],
      secondName: parts[1],
      isCouple: true,
    };
  }

  // 4. Single entity or title with multiple words
  const words = cleanedNames.split(/\s+/).filter((w) => /^[\p{L}]/u.test(w));
  
  if (words.length >= 2) {
    // If it's explicitly a wedding, alambamento or engagement without conjunction (e.g. "Romeo Julieta")
    if (eventType === 'casamento' || eventType === 'alambamento' || eventType === 'pedido') {
      return {
        initials: `${words[0].charAt(0).toUpperCase()} & ${words[1].charAt(0).toUpperCase()}`,
        names: clean,
        firstName: words[0],
        secondName: words[1],
        isCouple: true,
      };
    }

    // For single celebrant with multiple names (e.g. "Carlos Alberto"), standard monogram is First + Last
    return {
      initials: `${words[0].charAt(0).toUpperCase()} & ${words[1].charAt(0).toUpperCase()}`,
      names: clean,
      firstName: words[0],
      secondName: words[1],
      isCouple: false,
    };
  }

  if (words.length === 1) {
    // Single name like "Vivalda"
    return {
      initials: words[0].charAt(0).toUpperCase(),
      names: clean,
      firstName: words[0],
      secondName: '',
      isCouple: false,
    };
  }

  return {
    initials: clean.charAt(0).toUpperCase() || 'MB',
    names: clean,
    firstName: clean,
    secondName: '',
    isCouple: false,
  };
}
