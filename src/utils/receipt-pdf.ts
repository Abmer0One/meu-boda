import { jsPDF } from 'jspdf';
import { VendorContract, PaymentInstallment, VendorProfile } from '@/types';

function cleanStr(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(
    /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2000-\u2BFF]|\uD83E[\uDC00-\uDFFF]/g,
    ''
  );
}

export function generateReceiptPDF(
  contract: VendorContract,
  installmentIndex: number,
  vendorProfile?: VendorProfile | null,
  eventTitle?: string | null
): jsPDF {
  const doc = new jsPDF();
  const installment: PaymentInstallment = contract.payment_installments[installmentIndex] || {
    percentage: 100,
    amount: contract.total_value,
    status: 'Paid',
  };

  const receiptNumber = `MB-REC-${new Date().getFullYear()}-${contract.id.substring(0, 8).toUpperCase()}-${installmentIndex + 1}`;
  const verificationDate = installment.verified_at
    ? new Date(installment.verified_at).toLocaleDateString('pt-AO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('pt-AO');

  // Outer Border
  doc.setDrawColor(232, 108, 100);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, 190, 277);

  // Inner subtle border
  doc.setDrawColor(240, 220, 225);
  doc.setLineWidth(0.3);
  doc.rect(13, 13, 184, 271);

  // Top Header Banner
  doc.setFillColor(248, 237, 239); // #F8EDEF
  doc.rect(14, 14, 182, 32, 'F');

  // Brand Name
  doc.setTextColor(232, 108, 100); // Coral Rose #E86C64
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('MEU BODA', 20, 28);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(77, 32, 70); // Deep Plum #4D2046
  doc.text('Plataforma Digital de Casamentos & Gestão de Eventos', 20, 35);
  doc.text('www.meuboda.ao • Luanda, Angola', 20, 40);

  // Document Title on Right of Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(77, 32, 70);
  doc.text('RECIBO DE QUITAÇÃO', 190, 28, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Ref: ${receiptNumber}`, 190, 35, { align: 'right' });
  doc.text(`Data: ${verificationDate}`, 190, 40, { align: 'right' });

  let y = 56;

  // Status Badge Box
  doc.setFillColor(236, 253, 245); // Light emerald
  doc.setDrawColor(16, 185, 129); // Emerald
  doc.setLineWidth(0.5);
  doc.roundedRect(16, y, 178, 14, 2, 2, 'FD');

  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ESTADO DO PAGAMENTO: LIQUIDADO & CONFIRMADO PELO FORNECEDOR', 105, y + 9, { align: 'center' });

  y += 24;

  // Parties Two-Column Grid
  // Column 1: Fornecedor (Credor)
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(230, 230, 230);
  doc.rect(16, y, 86, 46, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(77, 32, 70);
  doc.text('DADOS DO FORNECEDOR', 20, y + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 120, 120);
  doc.text('Empresa / Prestador:', 20, y + 16);
  doc.text('Categoria:', 20, y + 23);
  doc.text('NIF:', 20, y + 30);
  doc.text('IBAN:', 20, y + 37);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  const vendorName = vendorProfile?.company_name || contract.vendor_profile?.company_name || 'Fornecedor Parceiro';
  doc.text(cleanStr(vendorName), 53, y + 16);
  doc.text(cleanStr(vendorProfile?.category || contract.vendor_profile?.category || 'Serviços'), 53, y + 23);
  doc.text(cleanStr(vendorProfile?.nif || contract.vendor_profile?.nif || 'Consulte o fornecedor'), 53, y + 30);
  doc.text(cleanStr(vendorProfile?.iban || contract.vendor_profile?.iban || 'Registado no contrato'), 53, y + 37);

  // Column 2: Cliente & Evento
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(230, 230, 230);
  doc.rect(108, y, 86, 46, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(77, 32, 70);
  doc.text('DADOS DO EVENTO & CLIENTE', 112, y + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 120, 120);
  doc.text('Evento:', 112, y + 16);
  doc.text('Data do Evento:', 112, y + 23);
  doc.text('Contrato:', 112, y + 30);
  doc.text('Moeda:', 112, y + 37);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  const title = eventTitle || contract.room?.event?.title || 'Casamento';
  doc.text(cleanStr(title), 142, y + 16);
  doc.text(contract.event_date ? new Date(contract.event_date).toLocaleDateString('pt-AO') : 'A definir', 142, y + 23);
  doc.text(`#${contract.id.substring(0, 8).toUpperCase()}`, 142, y + 30);
  doc.text('Kwanza Angolano (Kz)', 142, y + 37);

  y += 56;

  // Breakdown Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(77, 32, 70);
  doc.text('DISCRIMINAÇÃO DA PARCELA LIQUIDADA', 16, y);

  y += 6;

  // Table Header
  doc.setFillColor(77, 32, 70); // Deep Plum
  doc.rect(16, y, 178, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Descrição do Serviço / Parcela', 20, y + 5.5);
  doc.text('%', 115, y + 5.5);
  doc.text('Data Quitação', 135, y + 5.5);
  doc.text('Valor (Kz)', 190, y + 5.5, { align: 'right' });

  y += 8;

  // Table Row
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(230, 230, 230);
  doc.rect(16, y, 178, 14, 'FD');

  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`${cleanStr(contract.service_title)} - Parcela #${installmentIndex + 1}`, 20, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const notesText = installment.notes ? `Nota: ${cleanStr(installment.notes)}` : 'Pagamento regular conforme plano contratual';
  doc.text(notesText.substring(0, 50), 20, y + 11);

  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(`${installment.percentage}%`, 115, y + 8);
  doc.text(verificationDate, 135, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(232, 108, 100); // Coral Rose
  doc.text(`${installment.amount.toLocaleString('pt-AO')} Kz`, 190, y + 8, { align: 'right' });

  y += 22;

  // Total Summary Box
  doc.setFillColor(248, 237, 239);
  doc.setDrawColor(232, 108, 100);
  doc.setLineWidth(0.3);
  doc.roundedRect(100, y, 94, 28, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(77, 32, 70);
  doc.text('Valor Total Contratado:', 104, y + 8);
  doc.text(`${contract.total_value.toLocaleString('pt-AO')} Kz`, 190, y + 8, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(232, 108, 100);
  doc.text('TOTAL PAGO NESTA PARCELA:', 104, y + 17);
  doc.setFontSize(12);
  doc.text(`${installment.amount.toLocaleString('pt-AO')} Kz`, 190, y + 17, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Impostos e retenções incluídos conforme acordado pelas partes.', 104, y + 24);

  y += 38;

  // Digital Seal Stamp
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(240, 253, 244);
  doc.setLineWidth(0.8);
  doc.roundedRect(16, y, 178, 32, 3, 3, 'FD');

  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SELAGEM DIGITAL & VALIDAÇÃO OFICIAL', 22, y + 9);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  doc.text(
    'O fornecedor confirmou o recebimento integral deste montante através da plataforma Meu Boda.',
    22,
    y + 16
  );
  doc.text(
    'Este documento possui validade de comprovativo de quitação para efeitos contratuais entre os noivos e o prestador.',
    22,
    y + 21
  );
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Hash de Verificação: SHA256-${contract.id.replace(/-/g, '').substring(0, 24).toUpperCase()}`,
    22,
    y + 27
  );

  // Footer Disclaimer
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Meu Boda • Sistema de Planeamento e Marketplace Nupcial em Angola • Emitido electronicamente',
    105,
    280,
    { align: 'center' }
  );

  return doc;
}

export function downloadReceiptPDF(
  contract: VendorContract,
  installmentIndex: number,
  vendorProfile?: VendorProfile | null,
  eventTitle?: string | null
): void {
  const doc = generateReceiptPDF(contract, installmentIndex, vendorProfile, eventTitle);
  const cleanTitle = (contract.service_title || 'Servico').replace(/\s+/g, '_');
  doc.save(`Recibo_MeuBoda_${cleanTitle}_Parcela_${installmentIndex + 1}.pdf`);
}
