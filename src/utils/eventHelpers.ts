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
export function parseEventInitials(title?: string | null, eventType?: string | null): EventInitialsResult {
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
    // If it's explicitly a wedding, traditional wedding, alambamento or engagement without conjunction (e.g. "Romeo Julieta")
    if (
      eventType === 'casamento' ||
      eventType === 'casamento_tradicional' ||
      eventType === 'alambamento' ||
      eventType === 'pedido' ||
      eventType === 'noivado'
    ) {
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

export interface EventLabels {
  title: string;
  invitation: string;
  details: string;
  theme: string;
  rsvpQuestion: string;
}

/**
 * Returns dynamic event labels for titles, invitations, and RSVPs based on event type/title.
 * For 'pedido' (Pedido de Casamento / Noivado), the description used on invitations is 'Noivado'
 * (e.g. 'Convite de Noivado').
 */
export function getEventLabels(eventOrType?: any): EventLabels {
  let type = '';
  let title = '';

  if (typeof eventOrType === 'string') {
    type = eventOrType.toLowerCase();
  } else if (eventOrType && typeof eventOrType === 'object') {
    type = (eventOrType.type || '').toLowerCase();
    title = (eventOrType.title || '').toLowerCase();
  }

  // Pedido de Casamento / Noivado -> Always use 'Noivado' on invitations
  if (
    type === 'pedido' ||
    type === 'noivado' ||
    type === 'pedido_casamento' ||
    type.includes('pedido') ||
    type.includes('noivado') ||
    title.includes('noivado') ||
    title.includes('pedido de casamento')
  ) {
    return {
      title: 'Noivado',
      invitation: 'Convite de Noivado',
      details: 'Detalhes do Noivado',
      theme: 'Tema do Noivado',
      rsvpQuestion: 'comparecer ao nosso noivado',
    };
  }

  if (type === 'aniversario' || title.includes('aniversário') || title.includes('aniversario')) {
    return {
      title: 'Aniversário',
      invitation: 'Convite de Aniversário',
      details: 'Detalhes do Aniversário',
      theme: 'Tema do Aniversário',
      rsvpQuestion: 'comparecer ao nosso aniversário',
    };
  }

  if (
    type === 'casamento_tradicional' ||
    type === 'alambamento' ||
    type.includes('tradicional') ||
    title.includes('alambamento') ||
    title.includes('casamento tradicional')
  ) {
    return {
      title: 'Casamento Tradicional',
      invitation: 'Convite de Casamento Tradicional',
      details: 'Detalhes do Casamento Tradicional',
      theme: 'Tema do Casamento Tradicional',
      rsvpQuestion: 'comparecer ao nosso casamento tradicional',
    };
  }

  if (type === 'cha_panela' || title.includes('chá de panela') || title.includes('cha de panela')) {
    return {
      title: 'Chá de Panela',
      invitation: 'Convite de Chá de Panela',
      details: 'Detalhes do Chá de Panela',
      theme: 'Tema do Chá de Panela',
      rsvpQuestion: 'comparecer ao nosso chá de panela',
    };
  }

  if (type === 'casamento' || title.includes('casamento') || !type) {
    return {
      title: 'Casamento',
      invitation: 'Convite de Casamento',
      details: 'Detalhes do Casamento',
      theme: 'Tema do Casamento',
      rsvpQuestion: 'comparecer ao nosso casamento',
    };
  }

  return {
    title: 'Evento',
    invitation: 'Convite do Evento',
    details: 'Detalhes do Evento',
    theme: 'Tema do Evento',
    rsvpQuestion: 'comparecer ao nosso evento',
  };
}
