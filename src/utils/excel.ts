import * as XLSX from 'xlsx';
import { Guest } from '@/types';

export interface ParsedExcelGuest {
  name: string;
  phone: string | null;
  email: string | null;
  family_group: string | null;
  companions: number;
  tableName: string | null;
  status: 'Pending' | 'Confirmed' | 'Declined';
  notes: string | null;
  rawRowIndex: number;
}

/**
 * Sanitizes phone numbers preserving zeros in the middle and end (e.g. 930541745, 948824600).
 * Cleans spaces, dashes, parentheses and standardizes international country codes.
 */
export function sanitizePhoneNumber(value: any): string | null {
  if (value === null || value === undefined) return null;
  let str = String(value).trim();
  if (!str) return null;

  // Handle scientific notation if any (e.g. 9.488246e+08)
  if (/^\d+\.?\d*e\+\d+$/i.test(str)) {
    try {
      str = Number(str).toFixed(0);
    } catch {}
  }

  // Remove trailing decimal if parsed as float (e.g. 930541745.0)
  str = str.replace(/\.0+$/, '');

  // Strip whitespaces, dashes, dots, slashes and parentheses
  let cleaned = str.replace(/[\s\-\/\.\(\)]/g, '');

  // Normalize international country codes (+244, 00244, 244)
  if (cleaned.startsWith('+244')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('00244')) {
    cleaned = cleaned.substring(5);
  } else if (cleaned.startsWith('244') && cleaned.length >= 12) {
    cleaned = cleaned.substring(3);
  }

  // Strip leading non-digits except +
  cleaned = cleaned.replace(/^[^\d+]+/, '');

  if (!cleaned) return null;

  return cleaned;
}

/**
 * Helper to match possible column headers regardless of accents, case or language.
 */
function getRowValue(row: Record<string, any>, possibleKeys: string[]): any {
  const rowKeys = Object.keys(row);
  for (const key of rowKeys) {
    const normalizedKey = key
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    for (const target of possibleKeys) {
      const normalizedTarget = target
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (normalizedKey === normalizedTarget) {
        return row[key];
      }
    }
  }
  return undefined;
}

/**
 * Parses an Excel or CSV file into structured guest records.
 */
export async function importGuestsFromExcel(file: File): Promise<ParsedExcelGuest[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  const guests: ParsedExcelGuest[] = [];

  rows.forEach((row, index) => {
    const rawName = getRowValue(row, ['Nome', 'nome', 'Name', 'name', 'Convidado', 'convidado', 'Pessoa']);
    const name = typeof rawName === 'string' ? rawName.trim() : rawName ? String(rawName).trim() : '';

    // Ignore completely empty rows or rows without name
    if (!name) return;

    const rawPhone = getRowValue(row, [
      'Telefone',
      'telefone',
      'Phone',
      'phone',
      'Contacto',
      'contacto',
      'Celular',
      'Telemóvel',
      'telemovel',
      'WhatsApp',
      'whatsapp',
      'Tel',
    ]);
    const phone = sanitizePhoneNumber(rawPhone);

    const rawEmail = getRowValue(row, ['Email', 'email', 'E-mail', 'e-mail']);
    const email = typeof rawEmail === 'string' && rawEmail.trim() ? rawEmail.trim() : null;

    const rawGroup = getRowValue(row, [
      'Grupo Familiar',
      'grupo familiar',
      'Grupo',
      'grupo',
      'family_group',
      'Family Group',
      'Categoria',
      'categoria',
    ]);
    const family_group = typeof rawGroup === 'string' && rawGroup.trim() ? rawGroup.trim() : null;

    const rawCompanions = getRowValue(row, [
      'Acompanhantes',
      'acompanhantes',
      'Companions',
      'companions',
      'Pax',
      'pax',
      'Acomp',
      'acomp',
      'Vagas',
      'vagas',
    ]);
    let companions = 0;
    if (rawCompanions !== undefined && rawCompanions !== '') {
      const parsedComp = parseInt(String(rawCompanions).trim(), 10);
      if (!isNaN(parsedComp) && parsedComp >= 0) {
        companions = parsedComp;
      }
    }

    const rawTable = getRowValue(row, ['Mesa', 'mesa', 'Table', 'table', 'Lugar', 'lugar']);
    const tableName = typeof rawTable === 'string' && rawTable.trim() ? rawTable.trim() : null;

    const rawStatus = getRowValue(row, ['Estado', 'estado', 'Status', 'status', 'RSVP', 'rsvp']);
    let status: 'Pending' | 'Confirmed' | 'Declined' = 'Pending';
    if (rawStatus) {
      const s = String(rawStatus).trim().toLowerCase();
      if (s === 'confirmado' || s === 'confirmed' || s === 'sim' || s === 'yes') {
        status = 'Confirmed';
      } else if (s === 'recusado' || s === 'recusada' || s === 'declined' || s === 'não' || s === 'nao' || s === 'no') {
        status = 'Declined';
      }
    }

    const rawNotes = getRowValue(row, ['Notas', 'notas', 'Notes', 'notes', 'Observações', 'observacoes', 'obs', 'Obs']);
    const notes = typeof rawNotes === 'string' && rawNotes.trim() ? rawNotes.trim() : null;

    guests.push({
      name,
      phone,
      email,
      family_group,
      companions,
      tableName,
      status,
      notes,
      rawRowIndex: index + 2, // 1-based index plus header row
    });
  });

  return guests;
}

/**
 * Downloads the official Meu Boda Excel template for importing guests.
 */
export function downloadGuestTemplateExcel(filename = 'modelo_convidados_meuboda.xlsx') {
  const sampleData = [
    {
      'Nome': 'Carlos Fernandes',
      'Telefone': '930541745',
      'Acompanhantes': 1,
      'Grupo Familiar': 'Família do Noivo',
      'Mesa': 'Mesa 1',
      'Email': 'carlos.fernandes@exemplo.com',
      'Notas': 'Padrinho do noivo',
    },
    {
      'Nome': 'Dra. Luísa Gaspar',
      'Telefone': '948824600',
      'Acompanhantes': 0,
      'Grupo Familiar': 'Família da Noiva',
      'Mesa': '',
      'Email': 'luisa.gaspar@exemplo.com',
      'Notas': 'Vegetariana',
    },
    {
      'Nome': 'António Manuel da Costa',
      'Telefone': '923112233',
      'Acompanhantes': 2,
      'Grupo Familiar': 'Amigos',
      'Mesa': '',
      'Email': '',
      'Notas': 'Vem com 2 crianças',
    },
    {
      'Nome': 'Teresa dos Santos',
      'Telefone': '912334455',
      'Acompanhantes': 1,
      'Grupo Familiar': 'Colegas de Trabalho',
      'Mesa': 'Mesa 4',
      'Email': 'teresa@empresa.co.ao',
      'Notas': '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 28 }, // Nome
    { wch: 16 }, // Telefone
    { wch: 15 }, // Acompanhantes
    { wch: 22 }, // Grupo Familiar
    { wch: 14 }, // Mesa
    { wch: 28 }, // Email
    { wch: 25 }, // Notas
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Convidados');
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports current guests list to an Excel spreadsheet.
 */
export function exportGuestsToExcel(
  guests: Guest[],
  filename = 'convidados.xlsx',
  tables: { id: string; name: string }[] = []
) {
  const tableMap = new Map(tables.map((t) => [t.id, t.name]));

  const data = guests.map((g) => ({
    Nome: g.name,
    Telefone: g.phone || '',
    Acompanhantes: g.companions || 0,
    'Grupo Familiar': g.family_group || '',
    Mesa: g.table_id ? tableMap.get(g.table_id) || '' : '',
    Estado: g.status === 'Confirmed' ? 'Confirmado' : g.status === 'Declined' ? 'Recusado' : 'Pendente',
    Email: g.email || '',
    Notas: g.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 28 },
    { wch: 16 },
    { wch: 15 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 28 },
    { wch: 25 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Convidados');
  XLSX.writeFile(workbook, filename);
}
