import { jsPDF } from 'jspdf';
import { Guest, Event, EventSchedule, EventInfoBlock } from '@/types';

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
  schedules?: EventSchedule[],
  infoBlocks?: EventInfoBlock[]
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Pre-load background image if any
  let base64Bg: string | null = null;
  if (event.background_image) {
    base64Bg = await getBase64ImageFromUrl(event.background_image);
  }

  // Draw background image and overlays helper
  const applyPageDecoration = (titleText: string, subtitleText?: string) => {
    if (base64Bg) {
      // Draw background full page (A4: 210 x 297)
      doc.addImage(base64Bg, 'JPEG', 0, 0, 210, 297);
      
      // Semi-transparent clean white overlay card for contrast and readability
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 12, 186, 273, 4, 4, 'F');
    } else {
      // Fallback elegant borders
      doc.setDrawColor(183, 110, 121); // #B76E79
      doc.setLineWidth(1);
      doc.rect(10, 10, 190, 277);

      // Light background header
      doc.setFillColor(248, 237, 235); // #F8EDEB
      doc.rect(12, 12, 186, 32, 'F');
    }

    // Title & Header Text
    doc.setTextColor(183, 110, 121);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(titleText, 105, 24, { align: 'center' });

    if (subtitleText) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(subtitleText, 105, 32, { align: 'center' });
    }
  };

  let hasImagePage = false;

  // PAGE 1: Canva invitation if cover_image is uploaded
  if (event.cover_image) {
    const base64Image = await getBase64ImageFromUrl(event.cover_image);
    if (base64Image) {
      hasImagePage = true;
      doc.addImage(base64Image, 'JPEG', 10, 10, 190, 277);
    }
  }

  // PAGE 2: QR Pass (If Canva invitation was printed on page 1, add a new page)
  if (hasImagePage) {
    doc.addPage();
  }

  // Draw Page 2 decoration
  applyPageDecoration('MEU BODA', 'Folha Complementar de Acesso e RSVP');

  // Event details card (Clean white box with a border for high contrast)
  doc.setDrawColor(230, 230, 230);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(20, 50, 170, 48, 3, 3, 'FD');

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(event.title, 105, 60, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  const eventDate = new Date(event.date).toLocaleDateString('pt-PT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Data: ${eventDate}`, 105, 68, { align: 'center' });
  doc.text(`Local / Cerimónia: ${event.ceremony_location || 'A definir'}`, 105, 75, { align: 'center' });
  if (event.party_location) {
    doc.text(`Copo d'Água / Festa: ${event.party_location}`, 105, 82, { align: 'center' });
  }

  // Guest Specific Details (Bold card below the event details)
  doc.setDrawColor(183, 110, 121);
  doc.setFillColor(255, 245, 245);
  doc.roundedRect(20, 106, 170, 32, 3, 3, 'FD');

  doc.setTextColor(183, 110, 121);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Convidado: ${guest.name}`, 105, 115, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(`Lugar: ${tableName || 'Mesa pendente'}`, 105, 123, { align: 'center' });
  doc.text(`Acompanhantes autorizados: ${guest.companions || 0}`, 105, 130, { align: 'center' });

  // QR Code Pass Instructions
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(110, 110, 110);
  doc.text('Apresente este QR Code no check-in à entrada do evento:', 105, 148, { align: 'center' });

  // Embed QR Code inside a clean border box
  if (qrCodeDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(65, 154, 80, 80, 3, 3, 'FD');
    doc.addImage(qrCodeDataUrl, 'PNG', 67, 156, 76, 76);
  }

  // Footer Instructions
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(150, 150, 150);
  doc.text('Este documento é pessoal e indispensável para a entrada.', 105, 260, { align: 'center' });
  doc.text('Desenvolvido por Meu Boda - Gestão de Eventos.', 105, 266, { align: 'center' });

  // PAGE 3: Daily Timeline/Schedules if present
  if (schedules && schedules.length > 0) {
    doc.addPage();
    applyPageDecoration('AGENDA DO DIA', 'Cronograma de celebração e acontecimentos');

    // Draw vertical line for timeline
    doc.setDrawColor(216, 167, 177); // Accent: #D8A7B1
    doc.setLineWidth(0.5);
    doc.line(35, 55, 35, 245);

    schedules.forEach((sched, index) => {
      const y = 60 + index * 26;
      if (y > 245) return; // Prevent writing past bottom limit

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
    doc.setFontSize(8.5);
    doc.setTextColor(150, 150, 150);
    doc.text('Este documento é pessoal e indispensável para a entrada.', 105, 260, { align: 'center' });
    doc.text('Desenvolvido por Meu Boda - Gestão de Eventos.', 105, 266, { align: 'center' });
  }

  // PAGE 4: Manual do Convidado & Informações Importantes
  const hasDressCode = event.dress_code_style || event.dress_code_colors;
  const hasKids = event.kids_restriction_note;
  const hasInstagram = event.instagram_host_1 || event.instagram_host_2;
  const hasGifts = event.gift_suggestions;
  const hasBlocks = infoBlocks && infoBlocks.length > 0;

  if (hasDressCode || hasKids || hasInstagram || hasGifts || hasBlocks) {
    doc.addPage();
    applyPageDecoration('MANUAL DO CONVIDADO', 'Informações importantes sobre o evento');

    let currentY = 52;

    const drawSectionHeader = (title: string) => {
      doc.setDrawColor(216, 167, 177);
      doc.setLineWidth(0.3);
      doc.line(20, currentY, 190, currentY);
      
      currentY += 6;
      doc.setTextColor(183, 110, 121);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(title.toUpperCase(), 20, currentY);
      currentY += 6;
    };

    // 1. Dress Code
    if (hasDressCode) {
      drawSectionHeader('👗 Dress Code');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(60, 60, 60);
      
      if (event.dress_code_style) {
        doc.text(`Estilo sugerido: ${event.dress_code_style}`, 20, currentY);
        currentY += 5.5;
      }
      if (event.dress_code_colors) {
        doc.text(`Cores sugeridas: ${event.dress_code_colors}`, 20, currentY);
        currentY += 7;
      }
    }

    // 2. Kids Restriction Note
    if (hasKids) {
      drawSectionHeader('👶 Crianças');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(60, 60, 60);

      const splitText = doc.splitTextToSize(event.kids_restriction_note!, 170);
      doc.text(splitText, 20, currentY);
      currentY += splitText.length * 5.5 + 2;
    }

    // 3. Instagram Handles
    if (hasInstagram) {
      drawSectionHeader('📸 Partilhe Conosco');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(60, 60, 60);
      doc.text('Registe todos os momentos e marque-nos no Instagram:', 20, currentY);
      currentY += 6;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(183, 110, 121);
      const handles = [
        event.instagram_host_1 ? `@${event.instagram_host_1}` : '',
        event.instagram_host_2 ? `@${event.instagram_host_2}` : ''
      ].filter(Boolean).join('  /  ');
      
      doc.text(handles, 20, currentY);
      currentY += 8;
    }

    // 4. Gift Suggestions
    if (hasGifts) {
      drawSectionHeader('🎁 Sugestões de Presente');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(60, 60, 60);

      const giftLines = event.gift_suggestions!.split('\n').filter(Boolean);
      giftLines.forEach((line) => {
        doc.text(`• ${line.trim()}`, 24, currentY);
        currentY += 5.5;
      });
      currentY += 2;
    }

    // 5. Dynamic Info Blocks
    if (hasBlocks) {
      infoBlocks!.forEach((block) => {
        // Prevent printing over footer or page boundaries
        if (currentY > 230) {
          doc.addPage();
          applyPageDecoration('MANUAL DO CONVIDADO', 'Informações importantes sobre o evento');
          currentY = 52;
        }

        drawSectionHeader(block.title);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(60, 60, 60);

        const splitBlockText = doc.splitTextToSize(block.content, 170);
        doc.text(splitBlockText, 20, currentY);
        currentY += splitBlockText.length * 5.5 + 4;
      });
    }

    // Footer on page 4
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(150, 150, 150);
    doc.text('Este documento é pessoal e indispensável para a entrada.', 105, 260, { align: 'center' });
    doc.text('Desenvolvido por Meu Boda - Gestão de Eventos.', 105, 266, { align: 'center' });
  }

  return doc;
}
