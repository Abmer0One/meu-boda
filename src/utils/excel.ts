import * as XLSX from 'xlsx';
import { Guest } from '@/types';

export function exportGuestsToExcel(guests: Guest[], filename = 'convidados.xlsx') {
  const data = guests.map((g) => ({
    Nome: g.name,
    Telefone: g.phone || '',
    Email: g.email || '',
    'Grupo Familiar': g.family_group || '',
    Acompanhantes: g.companions || 0,
    Estado: g.status === 'Confirmed' ? 'Confirmado' : g.status === 'Declined' ? 'Recusado' : 'Pendente',
    Notas: g.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Convidados');
  XLSX.writeFile(workbook, filename);
}

export function importGuestsFromExcel(file: File): Promise<Partial<Guest>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        const guests: Partial<Guest>[] = rows
          .map((row) => {
            const estadoVal = row['Estado'] || row['status'] || 'Pending';
            let status: 'Pending' | 'Confirmed' | 'Declined' = 'Pending';
            if (estadoVal === 'Confirmado' || estadoVal === 'Confirmed') {
              status = 'Confirmed';
            } else if (estadoVal === 'Recusado' || estadoVal === 'Declined' || estadoVal === 'Recusada') {
              status = 'Declined';
            }

            return {
              name: row['Nome'] || row['name'] || '',
              phone: row['Telefone'] || row['phone'] ? String(row['Telefone'] || row['phone']) : null,
              email: row['Email'] || row['email'] || null,
              family_group: row['Grupo Familiar'] || row['family_group'] || null,
              companions: Number(row['Acompanhantes'] || row['companions'] || 0),
              status,
              notes: row['Notas'] || row['notes'] || null,
            };
          })
          .filter((g) => g.name);

        resolve(guests);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}
