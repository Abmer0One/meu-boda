import { jsPDF } from 'jspdf';
import { Guest, Event, EventSchedule } from '@/types';

// Helper to convert an image URL to base64 safely via fetch
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    const res = await fetch(proxyUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('CORS or network error fetching image for PDF:', err);
    return null;
  }
}

export async function generateGuestPDF(
  guest: Guest,
  event: Event,
  tableName: string,
  qrCodeDataUrl: string,
  schedules?: EventSchedule[]
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let hasImagePage = false;

  // If there is an uploaded Canva invitation, load and draw it on Page 1
  if (event.cover_image) {
    const base64Image = await getBase64ImageFromUrl(event.cover_image);
    if (base64Image) {
      hasImagePage = true;
      // Draw Canva Invitation taking up full Page 1 (with 10mm margins)
      // A4 page width = 210, height = 297
      doc.addImage(base64Image, 'JPEG', 10, 10, 190, 277);
    }
  }

  // If we drew the image on page 1, add a new page for the QR Pass
  if (hasImagePage) {
    doc.addPage();
  }

  // A4 size: 210 x 297 mm
  // Draw elegant primary border (#B76E79)
  doc.setDrawColor(183, 110, 121);
  doc.setLineWidth(1);
  doc.rect(10, 10, 190, 277);

  // Soft secondary color background header (#F8EDEB)
  doc.setFillColor(248, 237, 235);
  doc.rect(12, 12, 186, 40, 'F');

  // Header Title
  doc.setTextColor(183, 110, 121);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('MEU BODA', 105, 28, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Folha Complementar de Acesso e RSVP', 105, 38, { align: 'center' });

  // Event Title & Details
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(event.title, 105, 75, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const eventDate = new Date(event.date).toLocaleDateString('pt-PT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Data: ${eventDate}`, 105, 85, { align: 'center' });
  doc.text(`Local / Cerimónia: ${event.ceremony_location || 'A definir'}`, 105, 93, { align: 'center' });
  if (event.party_location) {
    doc.text(`Copo d'Água / Festa: ${event.party_location}`, 105, 100, { align: 'center' });
  }

  // Divider line
  doc.setDrawColor(216, 167, 177); // Accent: #D8A7B1
  doc.line(40, 108, 170, 108);

  // Guest Specific Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`Convidado: ${guest.name}`, 105, 122, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`Lugar: ${tableName || 'Mesa pendente'}`, 105, 131, { align: 'center' });
  doc.text(`Acompanhantes autorizados: ${guest.companions || 0}`, 105, 138, { align: 'center' });

  // QR Code Instructions
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text('Apresente este QR Code no check-in à entrada do evento:', 105, 154, { align: 'center' });

  // Embed QR Code
  if (qrCodeDataUrl) {
    doc.addImage(qrCodeDataUrl, 'PNG', 65, 162, 80, 80);
  }

  // Footer Instructions
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('Este documento é pessoal e indispensável para a entrada.', 105, 260, { align: 'center' });
  doc.text('Desenvolvido por Meu Boda - Gestão de Eventos.', 105, 266, { align: 'center' });

  // Add Page for Daily Timeline/Schedules if present
  if (schedules && schedules.length > 0) {
    doc.addPage();

    // Draw elegant primary border (#B76E79)
    doc.setDrawColor(183, 110, 121);
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);

    // Soft header
    doc.setFillColor(248, 237, 235);
    doc.rect(12, 12, 186, 30, 'F');

    doc.setTextColor(183, 110, 121);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('AGENDA DO DIA', 105, 24, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Cronograma de celebração e eventos', 105, 34, { align: 'center' });

    // Draw vertical line for timeline
    doc.setDrawColor(216, 167, 177); // Accent: #D8A7B1
    doc.setLineWidth(0.5);
    doc.line(35, 55, 35, 245);

    schedules.forEach((sched, index) => {
      const y = 60 + index * 26;
      if (y > 245) return; // Prevent writing past the page bottom limit

      // Draw dot
      doc.setFillColor(183, 110, 121);
      doc.circle(35, y, 2.2, 'F');

      // Time Text
      doc.setTextColor(183, 110, 121);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(sched.time, 43, y + 1.2);

      // Title/Activity Text
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(sched.title, 62, y + 1.2);

      // Location Text
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.text(`Local: ${sched.location}`, 62, y + 6);
    });

    // Footer on page 3
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Este documento é pessoal e indispensável para a entrada.', 105, 260, { align: 'center' });
    doc.text('Desenvolvido por Meu Boda - Gestão de Eventos.', 105, 266, { align: 'center' });
  }

  return doc;
}
