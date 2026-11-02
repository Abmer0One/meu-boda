import { jsPDF } from 'jspdf';
import { StaffPass } from '@/types';
import { generateQRCode } from '@/utils/qr';

export interface CategoryStyle {
  bannerBg: [number, number, number];
  bannerText: [number, number, number];
  hex: string;
}

export function getCategoryStyle(category: string = '', role: string = ''): CategoryStyle {
  const combined = `${category} ${role}`.toLowerCase();

  if (combined.includes('seguran') || combined.includes('guarda') || combined.includes('prote')) {
    // Deep Midnight Slate / Navy
    return {
      bannerBg: [15, 23, 42],
      bannerText: [255, 255, 255],
      hex: '#0F172A',
    };
  }

  if (combined.includes('bar') || combined.includes('cocktail') || combined.includes('bebida')) {
    // Luxury Burgundy / Crimson
    return {
      bannerBg: [136, 19, 55],
      bannerText: [255, 255, 255],
      hex: '#881337',
    };
  }

  if (combined.includes('cater') || combined.includes('buffet') || combined.includes('garç') || combined.includes('cozinha')) {
    // Warm Amber / Rich Gold
    return {
      bannerBg: [180, 83, 9],
      bannerText: [255, 255, 255],
      hex: '#B45309',
    };
  }

  if (combined.includes('foto') || combined.includes('vídeo') || combined.includes('video') || combined.includes('câmar')) {
    // Royal Indigo
    return {
      bannerBg: [67, 56, 202],
      bannerText: [255, 255, 255],
      hex: '#4338CA',
    };
  }

  if (combined.includes('som') || combined.includes('dj') || combined.includes('luz') || combined.includes('músic') || combined.includes('anima')) {
    // Deep Electric Violet
    return {
      bannerBg: [109, 40, 217],
      bannerText: [255, 255, 255],
      hex: '#6D28D9',
    };
  }

  if (combined.includes('proto') || combined.includes('recep') || combined.includes('coord') || combined.includes('hostess')) {
    // Emerald Green
    return {
      bannerBg: [4, 120, 87],
      bannerText: [255, 255, 255],
      hex: '#047857',
    };
  }

  // Default Navy Blue (like reference 2c.jpeg)
  return {
    bannerBg: [30, 41, 59],
    bannerText: [255, 255, 255],
    hex: '#1E293B',
  };
}

let cachedLogoDataUrl: string | null = null;

export async function getLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  if (typeof window === 'undefined') return null;

  try {
    const res = await fetch('/logo_meu_boda.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoDataUrl = reader.result as string;
        resolve(cachedLogoDataUrl);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Erro ao carregar imagem de logo do Meu Boda:', e);
    return null;
  }
}

/**
 * Generates an A4 PDF sheet containing up to 4 passes per page
 * inspired by the authentic vertical lanyard badges with Meu Boda branding
 */
export async function generateStaffPassesPDF(
  passes: StaffPass[],
  eventTitle: string,
  eventDate?: string
): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Grid configuration: 2 columns x 2 rows = 4 passes per A4 page
  const cardW = 88;
  const cardH = 133;

  const positions = [
    { x: 11, y: 11 },
    { x: 111, y: 11 },
    { x: 11, y: 153 },
    { x: 111, y: 153 },
  ];

  const logoDataUrl = await getLogoDataUrl();

  for (let i = 0; i < passes.length; i++) {
    const posInPage = i % 4;

    if (i > 0 && posInPage === 0) {
      doc.addPage();
    }

    const { x, y } = positions[posInPage];
    const pass = passes[i];
    const style = getCategoryStyle(pass.category, pass.role_title);
    const displayName = pass.holder_name?.trim() || pass.role_title;

    // 1. Card Background & Subtle Border
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardW, cardH, 5, 5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, cardW, cardH, 5, 5, 'D');

    // 2. Lanyard Slot Punch Cutout Guide at Top (matching 2c.jpeg / 1c.jpeg)
    const slotW = 15;
    const slotH = 3.6;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(x + (cardW - slotW) / 2, y + 5, slotW, slotH, 1.8, 1.8, 'FD');

    // 3. Circular Emblem with Meu Boda Logo
    const logoSize = 12;
    const logoX = x + (cardW - logoSize) / 2;
    const logoY = y + 10.5;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, 'FD');

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
    } else {
      // Fallback elegant monogram
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      doc.text('MB', x + cardW / 2, logoY + 8, { align: 'center' });
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(71, 85, 105);
    doc.text('MEU BODA', x + cardW / 2, logoY + logoSize + 3.8, { align: 'center' });

    // 4. Person Name (Large, Bold, Modern like 2c.jpeg "Your Name")
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(displayName, x + cardW / 2, y + 36, { align: 'center', maxWidth: cardW - 8 });

    // 5. Profession / Role & Company (Clean uppercase like 2c.jpeg "YOUR PROFESSION")
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const roleComp = `${pass.role_title} • ${pass.company_name}`.toUpperCase();
    doc.text(roleComp, x + cardW / 2, y + 41, { align: 'center', maxWidth: cardW - 8 });

    // Event title & date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    const eventSubtitle = (eventTitle || 'O Nosso Casamento').toUpperCase();
    doc.text(eventSubtitle, x + cardW / 2, y + 45.5, { align: 'center', maxWidth: cardW - 8 });

    // 6. QR Code in Center (Large, Sharp, High Scanning Contrast)
    const qrPayload = JSON.stringify({
      token: pass.qr_token,
      staffPassId: pass.id,
      eventId: pass.event_id,
      role: pass.role_title,
      company: pass.company_name,
      holder: displayName,
    });

    const qrDataUrl = await generateQRCode(qrPayload, {
      width: 320,
      margin: 1,
    });

    const qrSize = 39;
    const qrX = x + (cardW - qrSize) / 2;
    const qrY = y + 49;

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.roundedRect(qrX - 1.5, qrY - 1.5, qrSize + 3, qrSize + 3, 2, 2, 'D');

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    }

    // Monospace Token ID
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`ID: ${pass.qr_token.toUpperCase()}`, x + cardW / 2, qrY + qrSize + 4.5, { align: 'center' });

    // 7. Bottom Sector Banner (Solid colored block with giant bold STAFF like 2c.jpeg)
    const bannerH = 30;
    const bannerY = y + cardH - bannerH;
    doc.setFillColor(style.bannerBg[0], style.bannerBg[1], style.bannerBg[2]);
    doc.roundedRect(x, bannerY, cardW, bannerH, 5, 5, 'F');
    doc.rect(x, bannerY, cardW, 5, 'F'); // Square off top corners of the bottom banner

    // Giant Bold STAFF
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(21);
    doc.setTextColor(255, 255, 255);
    doc.text('STAFF', x + cardW / 2, bannerY + 13.5, { align: 'center' });

    // Sector & Access Zone
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(226, 232, 240);
    const accessZone = pass.access_level || 'Acesso Autorizado';
    const sectorZoneText = `${pass.category} • ${accessZone}`.toUpperCase();
    doc.text(sectorZoneText, x + cardW / 2, bannerY + 20, { align: 'center', maxWidth: cardW - 6 });

    // Brand subtext
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(203, 213, 225);
    const dateFooter = eventDate ? ` • ${eventDate}` : '';
    doc.text(`Meu Boda • Controlo Oficial de Portaria${dateFooter}`, x + cardW / 2, bannerY + 25.5, { align: 'center' });

    // 8. Corner Cutting Tick Marks (cross marks at corners)
    doc.setDrawColor(180, 180, 185);
    doc.setLineWidth(0.2);
    // top-left
    doc.line(x - 2, y, x + 2, y);
    doc.line(x, y - 2, x, y + 2);
    // top-right
    doc.line(x + cardW - 2, y, x + cardW + 2, y);
    doc.line(x + cardW, y - 2, x + cardW, y + 2);
    // bottom-left
    doc.line(x - 2, y + cardH, x + 2, y + cardH);
    doc.line(x, y + cardH - 2, x, y + cardH + 2);
    // bottom-right
    doc.line(x + cardW - 2, y + cardH, x + cardW + 2, y + cardH);
    doc.line(x + cardW, y + cardH - 2, x + cardW, y + cardH + 2);
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
 * styled like authentic lanyard badges with Meu Boda logo
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
  const displayName = pass.holder_name?.trim() || pass.role_title;

  // 1. Soft neutral background canvas
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // 2. White Card Container with rounded corners
  const cardX = 30;
  const cardY = 30;
  const cardW = width - 60;
  const cardH = height - 60;
  const cardRadius = 36;

  // Drop shadow for the card
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 15;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
  ctx.fill();
  ctx.restore();

  // Subtle border around card
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
  ctx.stroke();

  // 3. Lanyard slot punch pill cutout at top center
  const slotW = 140;
  const slotH = 34;
  const slotX = (width - slotW) / 2;
  const slotY = 65;
  ctx.fillStyle = '#F1F5F9';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(slotX, slotY, slotW, slotH, slotH / 2);
  ctx.fill();
  ctx.stroke();

  // 4. Circular Logo Emblem
  const emblemCenterX = width / 2;
  const emblemCenterY = 175;
  const emblemRadius = 55;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(emblemCenterX, emblemCenterY, emblemRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Load and draw logo
  const logoDataUrl = await getLogoDataUrl();
  if (logoDataUrl) {
    const logoImg = new Image();
    await new Promise<void>((resolve) => {
      logoImg.onload = () => {
        const logoSize = 85;
        ctx.drawImage(
          logoImg,
          emblemCenterX - logoSize / 2,
          emblemCenterY - logoSize / 2,
          logoSize,
          logoSize
        );
        resolve();
      };
      logoImg.onerror = () => resolve();
      logoImg.src = logoDataUrl;
    });
  }

  // MEU BODA text
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MEU BODA', width / 2, emblemCenterY + emblemRadius + 28);

  // 5. Person Name (Large, Bold, Modern like 2c.jpeg)
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(displayName, width / 2, 335);

  // 6. Profession & Company (Clean uppercase subtitle)
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 24px sans-serif';
  const roleCompanyText = `${pass.role_title} • ${pass.company_name}`.toUpperCase();
  ctx.fillText(roleCompanyText, width / 2, 375);

  // Event Title
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 20px sans-serif';
  const eventSubtitle = (eventTitle || 'O Nosso Casamento').toUpperCase();
  ctx.fillText(eventSubtitle, width / 2, 412);

  // 7. QR Code in Center
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
    margin: 1,
  });

  if (qrDataUrl) {
    const qrImg = new Image();
    await new Promise<void>((resolve) => {
      qrImg.onload = () => {
        const qrSize = 360;
        const qrX = (width - qrSize) / 2;
        const qrY = 445;

        // Subtle frame around QR
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 16);
        ctx.fill();
        ctx.stroke();

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        resolve();
      };
      qrImg.src = qrDataUrl;
    });
  }

  // Token ID under QR code
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`ID: ${pass.qr_token.toUpperCase()}`, width / 2, 850);

  // 8. Bottom Sector Banner (Solid colored block with giant bold STAFF like 2c.jpeg)
  const bannerH = 250;
  const bannerY = cardY + cardH - bannerH;

  ctx.save();
  // Clip to card's rounded bottom
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
  ctx.clip();

  ctx.fillStyle = style.hex;
  ctx.fillRect(cardX, bannerY, cardW, bannerH);

  // Giant bold white STAFF
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 68px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('STAFF', width / 2, bannerY + 105);

  // Sector & Access Zone
  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 22px sans-serif';
  const accessZone = pass.access_level || 'Acesso Autorizado';
  const sectorZoneText = `${pass.category} • ${accessZone}`.toUpperCase();
  ctx.fillText(sectorZoneText, width / 2, bannerY + 155);

  // Footer text
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '18px sans-serif';
  const dateFooter = eventDate ? ` • ${eventDate}` : '';
  ctx.fillText(`Meu Boda • Controlo Oficial de Portaria${dateFooter}`, width / 2, bannerY + 200);

  ctx.restore();

  // Trigger download
  const cleanName = (pass.holder_name || pass.role_title).toLowerCase().replace(/\s+/g, '-');
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `cracha-digital-${cleanName}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  return true;
}
