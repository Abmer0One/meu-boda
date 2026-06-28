'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { GuestRepository } from '@/repositories/guest.repository';
import { TableRepository } from '@/repositories/table.repository';
import { BudgetRepository } from '@/repositories/budget.repository';
import { VendorRepository } from '@/repositories/vendor.repository';
import { CheckInRepository } from '@/repositories/checkin.repository';
import { Guest, Table, Budget, Vendor, CheckIn } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  Users,
  DollarSign,
  Briefcase,
  QrCode,
  Calendar,
} from 'lucide-react';

export default function RelatoriosPage() {
  const { currentEvent } = useEvent();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState<string | null>(null);

  const loadData = async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      const [g, t, b, v, ci] = await Promise.all([
        GuestRepository.getAll(currentEvent.id),
        TableRepository.getAll(currentEvent.id),
        BudgetRepository.getAll(currentEvent.id),
        VendorRepository.getAll(currentEvent.id),
        CheckInRepository.getAll(currentEvent.id),
      ]);
      setGuests(g);
      setTables(t);
      setBudgets(b);
      setVendors(v);
      setCheckins(ci);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent]);

  const getTableName = (tableId: string | null) => {
    if (!tableId) return 'Sem Mesa';
    const foundTable = tables.find((t) => t.id === tableId);
    return foundTable ? foundTable.name : 'Mesa eliminada';
  };

  // EXCEL EXPORTS
  const exportGuestsExcel = () => {
    const data = guests.map((g) => ({
      Nome: g.name,
      Contacto: g.phone || '',
      Email: g.email || '',
      Grupo: g.family_group || '',
      Acompanhantes: g.companions,
      Mesa: getTableName(g.table_id),
      RSVP: g.status === 'Confirmed' ? 'Confirmado' : g.status === 'Declined' ? 'Recusado' : 'Pendente',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Convidados');
    XLSX.writeFile(workbook, `relatorio_convidados_${currentEvent?.slug}.xlsx`);
  };

  const exportBudgetExcel = () => {
    const data = budgets.map((b) => ({
      Categoria: b.category,
      Estimativa: Number(b.estimated_amount),
      Pago: Number(b.paid_amount),
      Restante: Number(b.estimated_amount) - Number(b.paid_amount),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orçamento');
    XLSX.writeFile(workbook, `relatorio_financeiro_${currentEvent?.slug}.xlsx`);
  };

  const exportVendorsExcel = () => {
    const data = vendors.map((v) => ({
      Fornecedor: v.name,
      Categoria: v.category,
      Telefone: v.phone || '',
      Email: v.email || '',
      Contrato: Number(v.contract_value),
      Estado: v.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fornecedores');
    XLSX.writeFile(workbook, `relatorio_fornecedores_${currentEvent?.slug}.xlsx`);
  };

  // PDF EXPORTS
  const generatePDFReport = async (title: string, headers: string[], rows: string[][], filename: string) => {
    if (!currentEvent) return;
    setGeneratingType(filename);
    try {
      const doc = new jsPDF();
      doc.setDrawColor(183, 110, 121);
      doc.setLineWidth(0.5);
      doc.rect(8, 8, 194, 281);

      // Header Banner
      doc.setFillColor(248, 237, 235);
      doc.rect(9, 9, 192, 25, 'F');

      doc.setTextColor(183, 110, 121);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('MEU BODA', 15, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(`Casamento: ${currentEvent.title} | Relatório Técnico`, 15, 27);

      // Report Title
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 15, 45);

      // Draw Simple Table
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);

      let yPos = 55;
      const colWidth = 180 / headers.length;

      // Draw table headers
      headers.forEach((header, index) => {
        doc.text(header, 15 + index * colWidth, yPos);
      });
      doc.line(15, yPos + 2, 195, yPos + 2);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);

      rows.forEach((row) => {
        if (yPos > 260) {
          doc.addPage();
          doc.rect(8, 8, 194, 281);
          yPos = 20; // reset yPos on new page
        }
        row.forEach((cell, index) => {
          doc.text(cell || '', 15 + index * colWidth, yPos);
        });
        yPos += 7;
      });

      doc.save(filename);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingType(null);
    }
  };

  const exportGuestsPDF = () => {
    const headers = ['Nome', 'Acomp.', 'Mesa', 'Estado RSVP'];
    const rows = guests.map((g) => [
      g.name,
      g.companions.toString(),
      getTableName(g.table_id),
      g.status === 'Confirmed' ? 'Confirmado' : g.status === 'Declined' ? 'Recusado' : 'Pendente',
    ]);
    generatePDFReport('Relatório de RSVP e Convidados', headers, rows, `relatorio_convidados_${currentEvent?.slug}.pdf`);
  };

  const exportBudgetPDF = () => {
    const headers = ['Categoria', 'Estimado (Kz)', 'Pago (Kz)', 'Restante (Kz)'];
    const rows = budgets.map((b) => [
      b.category,
      Number(b.estimated_amount).toFixed(2),
      Number(b.paid_amount).toFixed(2),
      (Number(b.estimated_amount) - Number(b.paid_amount)).toFixed(2),
    ]);
    generatePDFReport('Relatório de Orçamento e Contas', headers, rows, `relatorio_financeiro_${currentEvent?.slug}.pdf`);
  };

  const exportVendorsPDF = () => {
    const headers = ['Fornecedor', 'Categoria', 'Valor Contrato (Kz)', 'Estado'];
    const rows = vendors.map((v) => [
      v.name,
      v.category,
      Number(v.contract_value).toFixed(2),
      v.status,
    ]);
    generatePDFReport('Relatório de Fornecedores e Contratos', headers, rows, `relatorio_fornecedores_${currentEvent?.slug}.pdf`);
  };

  if (!currentEvent) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <p className="text-foreground/50 text-sm">Selecione um casamento para ver relatórios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Relatórios e Exportação
        </h1>
        <p className="text-sm text-foreground/60">
          Gere arquivos PDF para impressão ou folhas Excel completas para enviar ao buffet ou decoradores.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Guests Report Card */}
        <Card className="bg-card-bg border border-border-custom flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">Convidados & RSVP</CardTitle>
              <p className="text-xs text-foreground/50 mt-0.5">Lista nominal, grupos e mesas</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 mt-4">
            <Button
              className="w-full justify-center"
              variant="outline"
              leftIcon={generatingType?.endsWith('.xlsx') ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              onClick={exportGuestsExcel}
              disabled={generatingType !== null}
            >
              Exportar para Excel
            </Button>
            <Button
              className="w-full justify-center"
              variant="outline"
              leftIcon={generatingType?.endsWith('.pdf') ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              onClick={exportGuestsPDF}
              disabled={generatingType !== null}
            >
              Descarregar PDF
            </Button>
          </CardContent>
        </Card>

        {/* Budget Report Card */}
        <Card className="bg-card-bg border border-border-custom flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="rounded-xl bg-success/10 p-3 text-success shrink-0">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">Orçamento & Contabilidade</CardTitle>
              <p className="text-xs text-foreground/50 mt-0.5">Gastos orçados, pagos e saldos</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 mt-4">
            <Button
              className="w-full justify-center"
              variant="outline"
              leftIcon={generatingType?.endsWith('.xlsx') ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              onClick={exportBudgetExcel}
              disabled={generatingType !== null}
            >
              Exportar para Excel
            </Button>
            <Button
              className="w-full justify-center"
              variant="outline"
              leftIcon={generatingType?.endsWith('.pdf') ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              onClick={exportBudgetPDF}
              disabled={generatingType !== null}
            >
              Descarregar PDF
            </Button>
          </CardContent>
        </Card>

        {/* Vendors Report Card */}
        <Card className="bg-card-bg border border-border-custom flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="rounded-xl bg-accent/15 p-3 text-accent shrink-0">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">Fornecedores & Contratos</CardTitle>
              <p className="text-xs text-foreground/50 mt-0.5">Telefones, sites e valores devidos</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 mt-4">
            <Button
              className="w-full justify-center"
              variant="outline"
              leftIcon={generatingType?.endsWith('.xlsx') ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              onClick={exportVendorsExcel}
              disabled={generatingType !== null}
            >
              Exportar para Excel
            </Button>
            <Button
              className="w-full justify-center"
              variant="outline"
              leftIcon={generatingType?.endsWith('.pdf') ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              onClick={exportVendorsPDF}
              disabled={generatingType !== null}
            >
              Descarregar PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
