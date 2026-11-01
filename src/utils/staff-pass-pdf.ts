import { jsPDF } from 'jspdf';
import { StaffPass } from '@/types';
import { generateQRCode } from '@/utils/qr';

interface CategoryStyle {
  bannerBg: [number, number, number];
  bannerText: [number, number, number];
  tagBg: [number, number, number];
  tagText: [number, number, number];
}

function getCategoryStyle(category: string, role: string): CategoryStyle {
  const combined = `${category} ${role}`.toLowerCase();

  if (combined.includes('seguran') || combined.includes('guarda') || combined.includes('prote')) {
    // Deep Navy / Slate
    return {
      bannerBg: [30, 41, 59],
      bannerText: [255, 255, 255],
      tagBg: [226, 232, 240],
      tagText: [15, 23, 42],
    };
  }

  if (combined.includes('bar') || combined.includes('cocktail') || combined.includes('bebida')) {
    // Luxury Burgundy / Rose
    return {
      bannerBg: [136, 19, 55],
      bannerText: [255, 255, 255],
      tagBg: [254, 205, 211],
      tagText: [136, 19, 55],
    };
  }

  if (combined.includes('cater') || combined.includes('buffet') || combined.includes('garç') || combined.includes('cozinha')) {
    // Amber / Warm Gold
    return {
      bannerBg: [180, 83, 9],
      bannerText: [255, 255, 255],
      tagBg: [254, 243, 199],
      tagText: [146, 64, 14],
    };
  }

  if (combined.includes('foto') || combined.includes('vídeo') || combined.includes('video') || combined.includes('câmar')) {
    // Royal Indigo
    return {
      bannerBg: [67, 56, 202],
      bannerText: [255, 255, 255],
      tagBg: [224, 231, 255],
      tagText: [49, 46, 129],
    };
  }

  if (combined.includes('som') || combined.includes('dj') || combined.includes('luz') || combined.includes('músic')) {
    // Deep Purple
    return {
      bannerBg: [109, 40, 217],
      bannerText: [255, 255, 255],
      tagBg: [237, 233, 254],
      tagText: [91, 33, 182],
    };
  }

  if (combined.includes('proto') || combined.includes('recep') || combined.includes('coord')) {
    // Emerald Green
    return {
      bannerBg: [4, 120, 87],
      bannerText: [255, 255, 255],
      tagBg: [209, 250, 229],
      tagText: [6, 95, 70],
    };
  }

  // Default Luxury Charcoal / Gold
  return {
    bannerBg: [39, 39, 42],
    bannerText: [255, 255, 255],
    tagBg: [244, 244, 245],
    tagText: [24, 24, 27],
  };
}

/**
 * Generates an A4 PDF sheet containing up to 4 passes per page ready for cutting and lanyard lamination
 */
export async function generateStaffPassesPDF(
  passes: StaffPass[],
  eventTitle: string,
  eventDate?: string
): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;

  // Grid configuration: 2 columns x 2 rows = 4 passes per A4 page
  const cardWidth = 92;
  const cardHeight = 132;
  const marginX = 9;
  const marginY = 12;
  const gapX = 8;
  const gapY = 9;

  for (let i = 0; i < passes.length; i++) {
    const pageIndex = Math.floor(i / 4);
    const posInPage = i % 4;

    if (i > 0 && posInPage === 0) {
      doc.addPage();
    }

    const col = posInPage % 2;
    const row = Math.floor(posInPage / 2);

    const x = marginX + col * (cardWidth + gapX);
    const y = marginY + row * (cardHeight + gapY);

    const pass = passes[i];
    const style = getCategoryStyle(pass.category, pass.role_title);

    // 1. Draw outer cutting marks / border
    doc.setDrawColor(210, 210, 215);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, cardWidth, cardHeight, 3.5, 3.5);

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x + 0.2, y + 0.2, cardWidth - 0.4, cardHeight - 0.4, 3.5, 3.5, 'F');

    // 2. Top Header Banner
    doc.setFillColor(...style.bannerBg);
    doc.roundedRect(x, y, cardWidth, 24, 3.5, 3.5, 'F');
    // Square off the bottom corners of the banner
    doc.rect(x, y + 16, cardWidth, 8, 'F');

    // Header Text: Event Title
    doc.setTextColor(...style.bannerText);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const titleText = (eventTitle || 'O Nosso Casamento').toUpperCase();
    doc.text(titleText, x + cardWidth / 2, y + 8.5, { align: 'center', maxWidth: cardWidth - 8 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(230, 230, 230);
    doc.text('CREDENCIAL OFICIAL DE STAFF / SERVIÇO', x + cardWidth / 2, y + 14, { align: 'center' });

    if (eventDate) {
      doc.setFontSize(6);
      doc.text(eventDate, x + cardWidth / 2, y + 18.5, { align: 'center' });
    }

    // 3. Role Badge Pill
    const pillY = y + 27;
    doc.setFillColor(...style.tagBg);
    doc.roundedRect(x + 6, pillY, cardWidth - 12, 10, 2, 2, 'F');

    doc.setTextColor(...style.tagText);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(pass.role_title.toUpperCase(), x + cardWidth / 2, pillY + 7, { align: 'center' });

    // 4. Holder Name (or Team / Generic identifier)
    const nameY = y + 43;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    doc.setFontSize(11.5);
    const displayName = pass.holder_name?.trim() || 'Equipa de Serviço';
    doc.text(displayName, x + cardWidth / 2, nameY, { align: 'center', maxWidth: cardWidth - 10 });

    // Company Name / Vendor
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(`Empresa: ${pass.company_name}`, x + cardWidth / 2, nameY + 5.5, { align: 'center', maxWidth: cardWidth - 10 });

    // 5. QR Code in Center
    const qrPayload = JSON.stringify({
      token: pass.qr_token,
      staffPassId: pass.id,
      eventId: pass.event_id,
      role: pass.role_title,
      company: pass.company_name,
      holder: displayName,
    });

    const qrDataUrl = await generateQRCode(qrPayload, {
      width: 250,
      margin: 1,
    });

    const qrSize = 38;
    const qrX = x + (cardWidth - qrSize) / 2;
    const qrY = y + 54;

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    }

    // Border around QR code
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.3);
    doc.rect(qrX - 1.5, qrY - 1.5, qrSize + 3, qrSize + 3);

    // 6. Access Zone & Instructions
    const accessY = y + 99;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x + 6, accessY, cardWidth - 12, 14, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x + 6, accessY, cardWidth - 12, 14, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    const accessZone = pass.access_level || 'Zona de Serviço • Acesso Técnico';
    doc.text(`ZONA PERMITIDA: ${accessZone.toUpperCase()}`, x + cardWidth / 2, accessY + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Apresente este passe no leitor da portaria à entrada.', x + cardWidth / 2, accessY + 10, { align: 'center' });

    // 7. Footer Bar
    const footerY = y + 116;
    doc.setDrawColor(241, 245, 249);
    doc.line(x + 6, footerY, x + cardWidth - 6, footerY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`ID: ${pass.qr_token.toUpperCase()}`, x + cardWidth / 2, footerY + 5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(161, 161, 170);
    doc.text('Meu Boda • Controlo de Acesso & Segurança', x + cardWidth / 2, footerY + 9, { align: 'center' });

    // Scissor Cut guides
    doc.setDrawColor(180, 180, 185);
    doc.setLineWidth(0.2);
    // Top-left cross mark
    doc.line(x - 2, y, x + 2, y);
    doc.line(x, y - 2, x, y + 2);
    // Bottom-right cross mark
    doc.line(x + cardWidth - 2, y + cardHeight, x + cardWidth + 2, y + cardHeight);
    doc.line(x + cardWidth, y + cardHeight - 2, x + cardWidth, y + cardHeight + 2);
  }

  return doc;
}

/**
 * Downloads all passes in a ready-to-print A4 PDF
 */
export async function downloadStaffPassesPDF(
  passes: StaffPass[],
  eventTitle: string,
  eventDate?: string,
  filename = 'crachas-staff-meuboda.pdf'
): Promise<void> {
  const doc = await generateStaffPassesPDF(passes, eventTitle, eventDate);
  doc.save(filename);
}

/**
 * Downloads a single staff pass in PDF
 */
export async function downloadSingleStaffPassPDF(
  pass: StaffPass,
  eventTitle: string,
  eventDate?: string
): Promise<void> {
  const cleanName = (pass.holder_name || pass.role_title).toLowerCase().replace(/\s+/g, '-');
  await downloadStaffPassesPDF([pass], eventTitle, eventDate, `cracha-${cleanName}.pdf`);
}

/**
 * Generates and downloads a high-resolution digital pass PNG for WhatsApp sharing
 */
export async function downloadStaffPassDigitalCardPNG(
  pass: StaffPass,
  eventTitle: string,
  eventDate?: string
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const canvas = document.createElement('canvas');
  const width = 800;
  const height = 1200;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const style = getCategoryStyle(pass.category, pass.role_title);
  const bannerColor = `rgb(${style.bannerBg.join(',')})`;
  const tagBgColor = `rgb(${style.tagBg.join(',')})`;
  const tagTextColor = `rgb(${style.tagText.join(',')})`;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer Border & rounded card
  ctx.strokeStyle = '#E4E4E7';
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Top Banner
  ctx.fillStyle = bannerColor;
  ctx.fillRect(16, 16, width - 32, 220);

  // Event Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText((eventTitle || 'O NOSSO CASAMENTO').toUpperCase(), width / 2, 90);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('CREDENCIAL OFICIAL DE STAFF / SERVIÇO', width / 2, 140);

  if (eventDate) {
    ctx.font = '18px sans-serif';
    ctx.fillText(eventDate, width / 2, 180);
  }

  // Role Pill
  ctx.fillStyle = tagBgColor;
  ctx.beginPath();
  const pillY = 270;
  const pillH = 80;
  const pillW = width - 120;
  const pillX = 60;
  ctx.roundRect(pillX, pillY, pillW, pillH, 20);
  ctx.fill();

  ctx.fillStyle = tagTextColor;
  ctx.font = '900 40px sans-serif';
  ctx.fillText(pass.role_title.toUpperCase(), width / 2, pillY + 54);

  // Holder Name
  ctx.fillStyle = '#18181B';
  ctx.font = 'bold 44px sans-serif';
  const displayName = pass.holder_name?.trim() || 'Equipa de Serviço';
  ctx.fillText(displayName, width / 2, 420);

  // Company Name
  ctx.fillStyle = '#71717A';
  ctx.font = '600 28px sans-serif';
  ctx.fillText(`Empresa: ${pass.company_name}`, width / 2, 470);

  // QR Code
  const qrPayload = JSON.stringify({
    token: pass.qr_token,
    staffPassId: pass.id,
    eventId: pass.event_id,
    role: pass.role_title,
    company: pass.company_name,
    holder: displayName,
  });

  const qrDataUrl = await generateQRCode(qrPayload, {
    width: 400,
    margin: 2,
  });

  if (qrDataUrl) {
    const qrImg = new Image();
    await new Promise<void>((resolve) => {
      qrImg.onload = () => {
        const qrSize = 360;
        const qrX = (width - qrSize) / 2;
        const qrY = 530;

        ctx.strokeStyle = '#D4D4D8';
        ctx.lineWidth = 4;
        ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        resolve();
      };
      qrImg.src = qrDataUrl;
    });
  }

  // Access Zone
  const zoneY = 940;
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(60, zoneY, width - 120, 110, 16);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 22px sans-serif';
  const accessZone = pass.access_level || 'Zona de Serviço • Acesso Técnico';
  ctx.fillText(`ZONA PERMITIDA: ${accessZone.toUpperCase()}`, width / 2, zoneY + 45);

  ctx.fillStyle = '#64748B';
  ctx.font = '18px sans-serif';
  ctx.fillText('Apresente este código no leitor da portaria à entrada.', width / 2, zoneY + 80);

  // Footer
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`ID: ${pass.qr_token.toUpperCase()}`, width / 2, 1110);

  ctx.fillStyle = '#A1A1AA';
  ctx.font = '16px sans-serif';
  ctx.fillText('Meu Boda • Tecnologia para Eventos de Luxo', width / 2, 1145);

  // Trigger download
  const cleanName = (pass.holder_name || pass.role_title).toLowerCase().replace(/\s+/g, '-');
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `passe-digital-${cleanName}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  return true;
}
