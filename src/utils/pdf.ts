import { jsPDF } from 'jspdf';
import { Guest, Event, EventSchedule, EventInfoBlock } from '@/types';

// Helper to strip emojis and other unsupported multi-byte characters from PDF strings
function stripEmojis(text: string | null | undefined): string {
  if (!text) return '';
  // Regex to remove typical emojis, symbols, and pictographs
  return text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2000-\u2BFF]|\uD83E[\uDC00-\uDFFF]/g, '');
}

// Helper to parse image format from base64 string
function getImageFormat(base64: string): 'JPEG' | 'PNG' | 'UNKNOWN' {
  if (base64.startsWith('data:image/png') || base64.includes('image/png')) {
    return 'PNG';
  }
  if (base64.startsWith('data:image/jpeg') || base64.includes('image/jpeg') || base64.includes('image/jpg')) {
    return 'JPEG';
  }
  return 'UNKNOWN';
}

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
    let backgroundSuccess = false;
    
    if (base64Bg) {
      try {
        const format = getImageFormat(base64Bg);
        if (format !== 'UNKNOWN') {
          // Draw background full page (A4: 210 x 297)
          doc.addImage(base64Bg, format, 0, 0, 210, 297);
          
          // Semi-transparent clean white overlay card (90% opacity) for contrast and readability
          const gState = (doc as any).GState ? new (doc as any).GState({ opacity: 0.90 }) : null;
          if (gState) {
            doc.saveGraphicsState();
            doc.setGState(gState);
          }
          
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(12, 12, 186, 273, 4, 4, 'F');
          
          if (gState) {
            doc.restoreGraphicsState();
          }
          
          backgroundSuccess = true;
        }
      } catch (err) {
        console.error('Error drawing background image:', err);
      }
    }

    // Fallback card/borders if background drawing failed or was not set
    if (!backgroundSuccess) {
      doc.setDrawColor(183, 110, 121); // #B76E79
      doc.setLineWidth(1);
      doc.rect(10, 10, 190, 277);

      // Light background header
      doc.setFillColor(248, 237, 235); // #F8EDEB
      doc.rect(12, 12, 186, 32, 'F');
    }

    // Title & Header Text (times bold - elegant wedding font)
    doc.setTextColor(183, 110, 121);
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.text(stripEmojis(titleText), 105, 25, { align: 'center' });

    if (subtitleText) {
      doc.setFontSize(10.5);
      doc.setFont('times', 'italic');
      doc.setTextColor(110, 110, 110);
      doc.text(stripEmojis(subtitleText), 105, 33, { align: 'center' });
    }
  };

  let hasImagePage = false;

  // PAGE 1: Canva invitation if cover_image is uploaded (Full bleed)
  if (event.cover_image) {
    const base64Image = await getBase64ImageFromUrl(event.cover_image);
    if (base64Image) {
      try {
        const format = getImageFormat(base64Image);
        if (format !== 'UNKNOWN') {
          hasImagePage = true;
          doc.addImage(base64Image, format, 0, 0, 210, 297);
        }
      } catch (err) {
        console.error('Error drawing cover image on Page 1:', err);
      }
    }
  }

  // PAGE 2: QR Pass (If Canva invitation was printed on page 1, add a new page)
  if (hasImagePage) {
    doc.addPage();
  }

  // Draw Page 2 decoration
  applyPageDecoration('CONVITE EXCLUSIVO', 'Apresente o QR Code no check-in');

  // Elegant outer ticket card shape
  doc.setDrawColor(216, 167, 177); // Rose gold border
  doc.setFillColor(255, 250, 250); // Soft rose blush fill
  doc.setLineWidth(0.4);
  doc.roundedRect(20, 52, 170, 195, 4, 4, 'FD');

  doc.setTextColor(183, 110, 121);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PASSE DIGITAL INDIVIDUAL', 105, 62, { align: 'center' });

  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONVIDADO', 105, 74, { align: 'center' });

  doc.setTextColor(183, 110, 121);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(18);
  doc.text(stripEmojis(guest.name), 105, 82, { align: 'center' });

  // Ticket dotted cut line separator
  doc.setDrawColor(216, 167, 177); // Accent: #D8A7B1
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(25, 96, 185, 96);
  doc.setLineDashPattern([], 0); // Reset to solid

  // Columns: Seating and Companions
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('LUGAR / MESA', 35, 110);
  doc.text('ACOMPANHANTES', 125, 110);

  doc.setTextColor(50, 50, 50);
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.text(stripEmojis(tableName || 'Mesa pendente'), 35, 117);
  doc.text(String(guest.companions || 0), 125, 117);

  // Embed QR Code inside a clean border box
  if (qrCodeDataUrl) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(70, 135, 70, 70, 3, 3, 'FD');
      doc.addImage(qrCodeDataUrl, 'PNG', 72, 137, 66, 66);
    } catch (err) {
      console.error('Error drawing QR code image:', err);
    }
  }

  doc.setTextColor(100, 100, 100);
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.text('Indispensável para o check-in na portaria.', 105, 222, { align: 'center' });

  // Footer Instructions
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text('Este documento é de uso pessoal e intransmissível.', 105, 262, { align: 'center' });
  doc.text('Meu Boda - Gestão de Eventos.', 105, 267, { align: 'center' });

  // PAGE 3: Daily Timeline/Schedules if present
  if (schedules && schedules.length > 0) {
    doc.addPage();
    applyPageDecoration('AGENDA DO DIA', 'Cronograma de acontecimentos da celebração');

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

      // Time Text (times bolditalic)
      doc.setTextColor(183, 110, 121);
      doc.setFont('times', 'bolditalic');
      doc.setFontSize(13);
      doc.text(stripEmojis(sched.time), 43, y + 1.2);

      // Title/Activity Text (times bold)
      doc.setTextColor(50, 50, 50);
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.text(stripEmojis(sched.title), 65, y + 1.2);

      // Location Text (helvetica normal)
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Local: ${stripEmojis(sched.location)}`, 65, y + 6);
    });

    // Footer on page 3
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text('Este documento é de uso pessoal e intransmissível.', 105, 262, { align: 'center' });
    doc.text('Meu Boda - Gestão de Eventos.', 105, 267, { align: 'center' });
  }

  // PAGE 4: Manual do Convidado & Informações Importantes
  const hasDressCode = event.dress_code_style || event.dress_code_colors;
  const hasKids = event.kids_restriction_note;
  const hasInstagram = event.instagram_host_1 || event.instagram_host_2;
  const hasGifts = event.gift_suggestions;
  const hasBlocks = infoBlocks && infoBlocks.length > 0;

  if (hasDressCode || hasKids || hasInstagram || hasGifts || hasBlocks) {
    doc.addPage();
    applyPageDecoration('MANUAL DO CONVIDADO', 'Informações importantes para a festa');

    let currentY = 52;

    const drawSectionHeader = (title: string) => {
      doc.setDrawColor(216, 167, 177);
      doc.setLineWidth(0.3);
      doc.line(20, currentY, 190, currentY);
      
      currentY += 6;
      doc.setTextColor(183, 110, 121);
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.text(stripEmojis(title).toUpperCase(), 20, currentY);
      currentY += 6;
    };

    // 1. Dress Code
    if (hasDressCode) {
      drawSectionHeader('Dress Code');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(70, 70, 70);
      
      if (event.dress_code_style) {
        doc.text(`Estilo sugerido: ${stripEmojis(event.dress_code_style)}`, 20, currentY);
        currentY += 5.5;
      }
      if (event.dress_code_colors) {
        doc.text(`Cores sugeridas: ${stripEmojis(event.dress_code_colors)}`, 20, currentY);
        currentY += 7;
      }
    }

    // 2. Kids Restriction Note
    if (hasKids) {
      drawSectionHeader('Crianças');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(70, 70, 70);

      const splitText = doc.splitTextToSize(stripEmojis(event.kids_restriction_note!), 170);
      doc.text(splitText, 20, currentY);
      currentY += splitText.length * 5.5 + 2;
    }

    // 3. Instagram Handles
    if (hasInstagram) {
      drawSectionHeader('Partilhe Connosco');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(70, 70, 70);
      doc.text('Registe todos os momentos e marque-nos no Instagram:', 20, currentY);
      currentY += 6;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(183, 110, 121);
      const handles = [
        event.instagram_host_1 ? `@${event.instagram_host_1}` : '',
        event.instagram_host_2 ? `@${event.instagram_host_2}` : ''
      ].filter(Boolean).join('  /  ');
      
      doc.text(stripEmojis(handles), 20, currentY);
      currentY += 8;
    }

    // 4. Gift Suggestions
    if (hasGifts) {
      drawSectionHeader('Sugestões de Presente');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(70, 70, 70);

      const giftLines = event.gift_suggestions!.split('\n').filter(Boolean);
      giftLines.forEach((line) => {
        doc.text(`• ${stripEmojis(line.trim())}`, 24, currentY);
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
          applyPageDecoration('MANUAL DO CONVIDADO', 'Informações importantes para a festa');
          currentY = 52;
        }

        drawSectionHeader(block.title);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(70, 70, 70);

        const splitBlockText = doc.splitTextToSize(stripEmojis(block.content), 170);
        doc.text(splitBlockText, 20, currentY);
        currentY += splitBlockText.length * 5.5 + 4;
      });
    }

    // Footer on page 4
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text('Este documento é de uso pessoal e intransmissível.', 105, 262, { align: 'center' });
    doc.text('Meu Boda - Gestão de Eventos.', 105, 267, { align: 'center' });
  }

  return doc;
}
