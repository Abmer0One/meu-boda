import { jsPDF } from 'jspdf';
import { Guest, Event, EventSchedule, EventInfoBlock } from '@/types';
import { generateQRCode } from '@/utils/qr';
import { parseEventInitials, getEventLabels } from '@/utils/eventHelpers';
import {
  resolveCanvaConfig,
  DEFAULT_CANVA_COVER,
  DEFAULT_CANVA_INFO,
  DEFAULT_LOC_COORDS,
  DEFAULT_ACCESS_COORDS,
} from '@/utils/canvaConfig';

/**
 * Converts a Blob to a base64 Data URL.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Falha ao converter blob para base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Safely loads any image URL and returns a base64 Data URL.
 * Bypasses mobile Safari / WebKit security restrictions and tainted canvas issues
 * by converting to local memory data URL before drawing.
 */
export async function getSafeImageDataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  // Resolve root-relative URLs
  const targetUrl =
    url.startsWith('/') && typeof window !== 'undefined'
      ? `${window.location.origin}${url}`
      : url;

  // 1. Try direct fetch as blob with CORS
  try {
    const res = await fetch(targetUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      return await blobToDataUrl(blob);
    }
  } catch (err) {
    // Direct fetch might fail due to mobile browser cross-origin policy
  }

  // 2. Try proxy endpoint if it's an external URL
  if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        return await blobToDataUrl(blob);
      }
    } catch (err) {
      console.warn('Proxy image fetch failed:', err);
    }
  }

  // 3. Fallback: load directly via HTMLImageElement with anonymous crossOrigin
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1120;
        canvas.height = img.naturalHeight || 792;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
          return;
        }
      } catch (e) {
        // Canvas tainted fallback
      }
      resolve(targetUrl);
    };
    img.onerror = () => resolve(targetUrl);
    img.src = targetUrl;
  });
}

/**
 * Loads a Data URL or image source into an HTMLImageElement.
 */
function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar imagem no canvas'));
    img.src = src;
  });
}

/**
 * Helper to draw a rounded rectangle on Canvas 2D
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth: number = 1
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Helper to wrap text into multiple lines
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Renders an elegant, high-resolution luxury Basic Template directly to Canvas 2D
 * used when an event has not uploaded custom Canva artwork.
 * Dimensions: 2240x1584 px (A4 Landscape 300 DPI)
 */
async function renderBasicInvitationCanvas(
  event: Event,
  guest: Guest,
  tableName: string,
  qrAccessDataUrl: string,
  qrLocationsDataUrl: string,
  pageType: 'single' | 'cover' | 'info',
  schedules: EventSchedule[] = []
): Promise<string> {
  const canvasWidth = 2240;
  const canvasHeight = 1584;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível obter o contexto 2D do canvas');

  // Fill warm ivory / luxury cream background
  ctx.fillStyle = '#FAF8F5';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Helper to draw double gold border and corner flourishes
  const drawLuxuryBorders = () => {
    // Outer border
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 4;
    ctx.strokeRect(50, 50, canvasWidth - 100, canvasHeight - 100);

    // Inner subtle thin border
    ctx.strokeStyle = '#E8D49E';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(66, 66, canvasWidth - 132, canvasHeight - 132);

    // Corner decorative accents (L-shaped gold brackets)
    const cornerSize = 44;
    const corners = [
      { x: 50, y: 50, dx: 1, dy: 1 },
      { x: canvasWidth - 50, y: 50, dx: -1, dy: 1 },
      { x: 50, y: canvasHeight - 50, dx: 1, dy: -1 },
      { x: canvasWidth - 50, y: canvasHeight - 50, dx: -1, dy: -1 },
    ];
    ctx.strokeStyle = '#C5A059';
    ctx.lineWidth = 2.5;
    for (const c of corners) {
      ctx.beginPath();
      ctx.moveTo(c.x + c.dx * cornerSize, c.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x, c.y + c.dy * cornerSize);
      ctx.stroke();

      // Little decorative diamond dot
      ctx.fillStyle = '#C5A059';
      ctx.beginPath();
      ctx.arc(c.x + c.dx * 10, c.y + c.dy * 10, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  drawLuxuryBorders();

  const initialsData = parseEventInitials(event.title, event.theme);
  const initials = initialsData.initials || 'MB';
  const eventLabels = getEventLabels(event);

  // Format date in Portuguese
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // ==========================================
  // MODE 1: SINGLE PAGE INVITATION (ALL IN ONE)
  // ==========================================
  if (pageType === 'single') {
    // 1. Monogram Seal at top center
    const monoY = 175;
    ctx.save();
    ctx.beginPath();
    ctx.arc(canvasWidth / 2, monoY, 62, 0, Math.PI * 2);
    ctx.fillStyle = '#FAF8F5';
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 50px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#B89742';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, canvasWidth / 2, monoY + 2);
    ctx.restore();

    // 2. Subtitle Tagline
    ctx.save();
    ctx.font = 'bold 22px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#8A7348';
    ctx.textAlign = 'center';
    ctx.fillText(eventLabels.invitation.toUpperCase(), canvasWidth / 2, 275);
    ctx.restore();

    // 3. Event Title
    ctx.save();
    ctx.font = 'bold 68px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#1A1A1A';
    ctx.textAlign = 'center';
    ctx.fillText(event.title, canvasWidth / 2, 345);
    ctx.restore();

    // 4. Invitation Sentence
    ctx.save();
    ctx.font = 'italic 26px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#6B5E51';
    ctx.textAlign = 'center';
    ctx.fillText('Convidam cordialmente para a celebração deste momento inesquecível', canvasWidth / 2, 405);
    ctx.restore();

    // 5. Guest Box (Personalized)
    const guestBoxY = 450;
    drawRoundedRect(ctx, 470, guestBoxY, 1300, 100, 16, '#F5EFE6', '#D4AF37', 1.5);

    ctx.save();
    ctx.font = 'bold 36px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#1C1C1E';
    ctx.textAlign = 'center';
    ctx.fillText(`Convidado de Honra: ${guest.name}`, canvasWidth / 2, guestBoxY + 44);

    const companionText = guest.companions > 0 ? ` • ${guest.companions + 1} Lugares Reservados` : '';
    const tableText = tableName ? `Mesa: ${tableName}` : '';
    const guestMeta = [tableText, companionText].filter(Boolean).join('');
    if (guestMeta) {
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#8A7348';
      ctx.fillText(guestMeta, canvasWidth / 2, guestBoxY + 76);
    }
    ctx.restore();

    // 6. Date & Venues
    ctx.save();
    ctx.font = 'bold 28px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#2D241E';
    ctx.textAlign = 'center';
    ctx.fillText(`📅 ${capitalizedDate}`, canvasWidth / 2, 595);

    ctx.font = '24px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#4A4036';
    let venueLine = '';
    if (event.ceremony_location) {
      venueLine += `Cerimónia: ${event.ceremony_location}${event.ceremony_time ? ' às ' + event.ceremony_time : ''}`;
    }
    if (event.party_location) {
      if (venueLine) venueLine += '  |  ';
      venueLine += `Copos-de-Água: ${event.party_location}${event.party_time ? ' às ' + event.party_time : ''}`;
    }
    if (venueLine) {
      ctx.fillText(venueLine, canvasWidth / 2, 638);
    }
    ctx.restore();

    // Separator line
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(400, 680);
    ctx.lineTo(canvasWidth - 400, 680);
    ctx.stroke();

    // 7. Side-by-side QR Code Cards
    const cardY = 720;
    const cardH = 720;
    const cardW = 860;

    // --- Left Card: Localizações & Mapa ---
    drawRoundedRect(ctx, 210, cardY, cardW, cardH, 20, '#FFFFFF', '#E8D49E', 2);
    ctx.save();
    ctx.font = 'bold 26px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#2D241E';
    ctx.textAlign = 'center';
    ctx.fillText('📍 LOCALIZAÇÃO & ITINERÁRIO', 210 + cardW / 2, cardY + 55);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#71717A';
    ctx.fillText('Aponte a câmara do telemóvel para abrir a rota no GPS', 210 + cardW / 2, cardY + 92);

    if (qrLocationsDataUrl) {
      try {
        const qrLocImg = await loadHtmlImage(qrLocationsDataUrl);
        const qrSize = 440;
        ctx.drawImage(qrLocImg, 210 + (cardW - qrSize) / 2, cardY + 125, qrSize, qrSize);
      } catch (e) {}
    }

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#8A7348';
    ctx.fillText('Mapa & Rota no Google Maps', 210 + cardW / 2, cardY + 630);
    ctx.restore();

    // --- Right Card: Acesso / Portaria ---
    drawRoundedRect(ctx, 1170, cardY, cardW, cardH, 20, '#FFFFFF', '#E8D49E', 2);
    ctx.save();
    ctx.font = 'bold 26px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#2D241E';
    ctx.textAlign = 'center';
    ctx.fillText('🎟️ PASSE DE ENTRADA / PORTARIA', 1170 + cardW / 2, cardY + 55);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#71717A';
    ctx.fillText('Apresente este código na entrada do evento para validação rápida', 1170 + cardW / 2, cardY + 92);

    if (qrAccessDataUrl) {
      try {
        const qrAccImg = await loadHtmlImage(qrAccessDataUrl);
        const qrSize = 440;
        ctx.drawImage(qrAccImg, 1170 + (cardW - qrSize) / 2, cardY + 125, qrSize, qrSize);
      } catch (e) {}
    }

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#8A7348';
    const shortCode = guest.qr_token ? guest.qr_token.slice(0, 10).toUpperCase() : 'MB-VIP';
    ctx.fillText(`Código: ${shortCode} • Check-in Individual`, 1170 + cardW / 2, cardY + 630);
    ctx.restore();

    // 8. Footer
    ctx.save();
    ctx.font = 'italic 18px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#A3907C';
    ctx.textAlign = 'center';
    ctx.fillText('Meu Boda • Confirmação de presença e detalhes do evento em meuboda.com', canvasWidth / 2, 1495);
    ctx.restore();
  }

  // ==========================================
  // MODE 2: DOUBLE PAGE - PAGE 1 (COVER)
  // ==========================================
  else if (pageType === 'cover') {
    // Grand Monogram Seal
    const monoY = 410;
    ctx.save();
    ctx.beginPath();
    ctx.arc(canvasWidth / 2, monoY, 130, 0, Math.PI * 2);
    ctx.fillStyle = '#FAF8F5';
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = 'bold 100px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#B89742';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, canvasWidth / 2, monoY + 4);
    ctx.restore();

    // Subtitle Tagline
    ctx.save();
    ctx.font = 'bold 30px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#8A7348';
    ctx.textAlign = 'center';
    ctx.fillText(eventLabels.invitation.toUpperCase(), canvasWidth / 2, 620);

    // Event Title
    ctx.font = 'bold 88px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#1A1A1A';
    ctx.fillText(event.title, canvasWidth / 2, 730);

    // Event Date
    ctx.font = 'bold 36px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#2D241E';
    ctx.fillText(capitalizedDate, canvasWidth / 2, 850);
    ctx.restore();

    // Decorative divider
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 2 - 250, 910);
    ctx.lineTo(canvasWidth / 2 + 250, 910);
    ctx.stroke();

    // Guest Badge at bottom
    const badgeY = 980;
    drawRoundedRect(ctx, 470, badgeY, 1300, 190, 24, '#F5EFE6', '#D4AF37', 2);

    ctx.save();
    ctx.font = 'italic 26px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#8A7348';
    ctx.textAlign = 'center';
    ctx.fillText('Especialmente preparado para', canvasWidth / 2, badgeY + 50);

    ctx.font = 'bold 50px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#1C1C1E';
    ctx.fillText(guest.name, canvasWidth / 2, badgeY + 112);

    const tableLine = tableName ? `Mesa: ${tableName}` : '';
    const companionLine = guest.companions > 0 ? ` • ${guest.companions + 1} Convidados` : '';
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#6B5E51';
    ctx.fillText(`${tableLine}${companionLine}`, canvasWidth / 2, badgeY + 155);
    ctx.restore();

    // Footer
    ctx.save();
    ctx.font = 'italic 20px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#A3907C';
    ctx.textAlign = 'center';
    ctx.fillText('Meu Boda • Celebração de Amor & União', canvasWidth / 2, 1490);
    ctx.restore();
  }

  // ==========================================
  // MODE 3: DOUBLE PAGE - PAGE 2 (INFO TRÍPTICO)
  // ==========================================
  else if (pageType === 'info') {
    // 2 vertical dividers dividing into 3 panels
    const col1X = 746;
    const col2X = 1493;

    ctx.strokeStyle = '#E8D49E';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(col1X, 100);
    ctx.lineTo(col1X, canvasHeight - 100);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(col2X, 100);
    ctx.lineTo(col2X, canvasHeight - 100);
    ctx.stroke();

    // --- PANEL 1: LOCALIZAÇÕES (Left) ---
    const p1Center = 398;
    ctx.save();
    ctx.font = 'bold 32px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#B89742';
    ctx.textAlign = 'center';
    ctx.fillText('LOCALIZAÇÕES', p1Center, 160);

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p1Center - 100, 190);
    ctx.lineTo(p1Center + 100, 190);
    ctx.stroke();

    // Ceremony
    ctx.font = 'bold 24px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#2D241E';
    ctx.fillText('Cerimónia Religiosa', p1Center, 245);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText(event.ceremony_location || 'Local da Cerimónia', p1Center, 285);
    if (event.ceremony_time) {
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#8A7348';
      ctx.fillText(`Horário: ${event.ceremony_time}`, p1Center, 318);
    }

    // Party
    ctx.font = 'bold 24px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#2D241E';
    ctx.fillText('Copos-de-Água & Festa', p1Center, 400);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText(event.party_location || 'Local da Recepção', p1Center, 440);
    if (event.party_time) {
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#8A7348';
      ctx.fillText(`Horário: ${event.party_time}`, p1Center, 473);
    }

    // QR Locations Card
    const qr1BoxY = 620;
    drawRoundedRect(ctx, p1Center - 250, qr1BoxY, 500, 680, 16, '#FFFFFF', '#E8D49E', 2);
    ctx.font = 'bold 22px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#2D241E';
    ctx.fillText('📍 CÓDIGO QR - MAPA', p1Center, qr1BoxY + 50);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#71717A';
    ctx.fillText('Aponte a câmara para abrir o GPS', p1Center, qr1BoxY + 84);

    if (qrLocationsDataUrl) {
      try {
        const qrLocImg = await loadHtmlImage(qrLocationsDataUrl);
        ctx.drawImage(qrLocImg, p1Center - 190, qr1BoxY + 115, 380, 380);
      } catch (e) {}
    }

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#8A7348';
    ctx.fillText('Itinerário & Rota no Telemóvel', p1Center, qr1BoxY + 580);
    ctx.restore();

    // --- PANEL 2: CELEBRAÇÃO & PROGRAMA (Center) ---
    const p2Center = 1120;
    ctx.save();
    ctx.font = 'bold 32px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#B89742';
    ctx.textAlign = 'center';
    ctx.fillText('CELEBRAÇÃO', p2Center, 160);

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p2Center - 100, 190);
    ctx.lineTo(p2Center + 100, 190);
    ctx.stroke();

    ctx.font = 'bold 28px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#1A1A1A';
    ctx.fillText(capitalizedDate, p2Center, 250);

    // Message
    const msg = event.description || 'A vossa presença tornará este momento inesquecível. Esperamos por si para celebrar o nosso amor e união.';
    ctx.font = 'italic 22px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#5A4E42';
    const lines = wrapText(ctx, msg, 580);
    let msgY = 320;
    for (const l of lines.slice(0, 5)) {
      ctx.fillText(l, p2Center, msgY);
      msgY += 34;
    }

    // Dress Code if set
    if (event.dress_code_style) {
      drawRoundedRect(ctx, p2Center - 260, 540, 520, 80, 12, '#F5EFE6', '#D4AF37', 1);
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#8A7348';
      ctx.fillText('👗 TRAJE RECOMENDADO', p2Center, 568);
      ctx.font = 'bold 22px Georgia, "Times New Roman", serif';
      ctx.fillStyle = '#1A1A1A';
      ctx.fillText(event.dress_code_style, p2Center, 600);
    }

    // Schedule summary
    if (schedules && schedules.length > 0) {
      ctx.font = 'bold 22px Georgia, "Times New Roman", serif';
      ctx.fillStyle = '#2D241E';
      ctx.fillText('PROGRAMA DO DIA', p2Center, 680);

      let schedY = 725;
      for (const s of schedules.slice(0, 5)) {
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#B89742';
        ctx.fillText(s.time, p2Center, schedY);
        ctx.font = '18px Georgia, "Times New Roman", serif';
        ctx.fillStyle = '#333333';
        ctx.fillText(s.title, p2Center, schedY + 24);
        schedY += 56;
      }
    } else {
      // Elegant floral quote
      ctx.font = 'italic 22px Georgia, "Times New Roman", serif';
      ctx.fillStyle = '#8A7348';
      ctx.fillText('"O amor não consiste em olhar um para o outro,', p2Center, 800);
      ctx.fillText('mas em olhar juntos na mesma direção."', p2Center, 835);
    }
    ctx.restore();

    // --- PANEL 3: PASSE DE ACESSO (Right) ---
    const p3Center = 1842;
    ctx.save();
    ctx.font = 'bold 32px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#B89742';
    ctx.textAlign = 'center';
    ctx.fillText('PASSE DE ENTRADA', p3Center, 160);

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p3Center - 100, 190);
    ctx.lineTo(p3Center + 100, 190);
    ctx.stroke();

    ctx.font = 'italic 20px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#8A7348';
    ctx.fillText('Convidado de Honra:', p3Center, 245);

    ctx.font = 'bold 34px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#1A1A1A';
    ctx.fillText(guest.name, p3Center, 290);

    drawRoundedRect(ctx, p3Center - 220, 340, 440, 65, 12, '#F5EFE6', '#D4AF37', 1);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#2D241E';
    ctx.fillText(tableName ? `Mesa: ${tableName}` : 'Mesa a Confirmar', p3Center, 380);

    // QR Access Card
    const qr2BoxY = 445;
    drawRoundedRect(ctx, p3Center - 250, qr2BoxY, 500, 855, 16, '#FFFFFF', '#E8D49E', 2);
    ctx.font = 'bold 22px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#2D241E';
    ctx.fillText('🎟️ CÓDIGO DE ENTRADA', p3Center, qr2BoxY + 50);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#71717A';
    ctx.fillText('Apresente na portaria para check-in', p3Center, qr2BoxY + 84);

    if (qrAccessDataUrl) {
      try {
        const qrAccImg = await loadHtmlImage(qrAccessDataUrl);
        ctx.drawImage(qrAccImg, p3Center - 190, qr2BoxY + 115, 380, 380);
      } catch (e) {}
    }

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#8A7348';
    const shortCode = guest.qr_token ? guest.qr_token.slice(0, 10).toUpperCase() : 'MB-VIP';
    ctx.fillText(`Passe: ${shortCode}`, p3Center, qr2BoxY + 580);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText('Código intransmissível e exclusivo', p3Center, qr2BoxY + 612);
    ctx.restore();
  }

  // Return high-quality JPEG
  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Renders a full invitation page directly to a high-resolution Canvas 2D
 * on top of a custom Canva template background image.
 */
async function renderInvitationPage(
  bgUrl: string,
  fallbackBgUrl: string,
  qrOverlays: Array<{
    qrDataUrl: string;
    coords: { left: number; top: number; width: number; height: number };
  }>
): Promise<string> {
  const canvasWidth = 2240;
  const canvasHeight = 1584;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível obter o contexto 2D do canvas');

  // Fill default background with elegant cream
  ctx.fillStyle = '#FAF8F5';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 1. Draw Background Image
  let bgDrawn = false;
  const candidateUrls = [bgUrl, fallbackBgUrl].filter(Boolean);

  for (const url of candidateUrls) {
    try {
      const safeDataUrl = await getSafeImageDataUrl(url);
      if (safeDataUrl) {
        const bgImg = await loadHtmlImage(safeDataUrl);
        ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
        bgDrawn = true;
        break;
      }
    } catch (err) {
      console.warn('Candidato a imagem de fundo falhou:', url, err);
    }
  }

  // If no background could be drawn, draw a clean gold border
  if (!bgDrawn) {
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, canvasWidth - 40, canvasHeight - 40);
  }

  // 2. Draw QR Code overlays directly onto canvas
  for (const overlay of qrOverlays) {
    if (!overlay.qrDataUrl) continue;
    try {
      let left = Number(overlay.coords?.left);
      let top = Number(overlay.coords?.top);
      let width = Number(overlay.coords?.width);
      let height = Number(overlay.coords?.height);

      // Safe fallback if coordinates are undefined, NaN, or out of range
      if (isNaN(width) || width < 6 || width > 40) width = 14;
      if (isNaN(height) || height < 8 || height > 45) height = 18;
      if (isNaN(left)) left = 10;
      if (isNaN(top)) top = 76;

      // Clamp strictly to page bounds so QR code is ALWAYS visible
      left = Math.max(0, Math.min(left, 100 - width));
      top = Math.max(0, Math.min(top, 100 - height));

      const x = (left / 100) * canvasWidth;
      const y = (top / 100) * canvasHeight;
      const w = (width / 100) * canvasWidth;
      const h = (height / 100) * canvasHeight;

      // Draw crisp white background card with rounded corners and luxury gold border
      drawRoundedRect(ctx, x, y, w, h, 18, '#FFFFFF', '#D4AF37', 3);

      // Draw QR image with slight padding for optimal scanning
      const qrImg = await loadHtmlImage(overlay.qrDataUrl);
      const padX = w * 0.06;
      const padY = h * 0.06;
      ctx.drawImage(qrImg, x + padX, y + padY, w - padX * 2, h - padY * 2);
    } catch (err) {
      console.error('Falha ao desenhar QR Code sobre o canvas:', err);
    }
  }

  // Return high-quality JPEG
  return canvas.toDataURL('image/jpeg', 0.95);
}

export async function generateGuestPDF(
  guest: Guest,
  event: Event,
  tableName: string,
  qrCodeDataUrl: string,
  schedules: EventSchedule[] = [],
  infoBlocks: EventInfoBlock[] = []
): Promise<jsPDF> {
  const canvaConfig = resolveCanvaConfig(event.id, event.template_config, infoBlocks, null, event);
  const isSinglePage = canvaConfig.pdf_mode === 'single_page';

  // Generate locations redirect QR code link
  const guestToken = guest.qr_token || guest.id || 'convidado';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const locationsLink = `${origin}/convite/${guestToken}#mapas`;
  let locationsQrCodeUrl = '';
  try {
    locationsQrCodeUrl = await generateQRCode(locationsLink);
  } catch (e) {
    console.error('Erro ao gerar QR Code de Localizações:', e);
  }

  // Ensure access QR code exists
  let finalAccessQr = qrCodeDataUrl;
  if (!finalAccessQr) {
    try {
      const qrData = {
        eventId: event.id,
        guestId: guest.id,
        name: guest.name,
        table: tableName,
        companions: (guest.companions || 0).toString(),
        event: event.title,
        date: event.date ? event.date.split('T')[0] : '',
        token: guestToken,
      };
      finalAccessQr = await generateQRCode(qrData);
    } catch (e) {
      console.error('Erro ao gerar QR Code de Acesso:', e);
    }
  }

  const locCoords = canvaConfig.qr_locations_coords || DEFAULT_LOC_COORDS;
  const accessCoords = canvaConfig.qr_access_coords || DEFAULT_ACCESS_COORDS;

  const isCustomMode = canvaConfig.template_source === 'custom' && !canvaConfig.is_basic_template;
  const hasCustomCover = isCustomMode && Boolean(canvaConfig.canva_cover_url);
  const hasCustomInfo = isCustomMode && Boolean(canvaConfig.canva_info_url);

  let coverDataUrl: string;
  let infoDataUrl: string | null = null;

  // 1. Render Page 1 (Cover or Single Page)
  if (hasCustomCover) {
    const page1Overlays: Array<{
      qrDataUrl: string;
      coords: { left: number; top: number; width: number; height: number };
    }> = [];

    if (isSinglePage) {
      if (locationsQrCodeUrl && canvaConfig.show_locations_qr !== false) {
        page1Overlays.push({ qrDataUrl: locationsQrCodeUrl, coords: locCoords });
      }
      if (finalAccessQr && canvaConfig.show_access_qr !== false) {
        page1Overlays.push({ qrDataUrl: finalAccessQr, coords: accessCoords });
      }
    }

    coverDataUrl = await renderInvitationPage(canvaConfig.canva_cover_url!, DEFAULT_CANVA_COVER, page1Overlays);
  } else {
    // Dynamic Basic Template for events without custom Canva uploads
    coverDataUrl = await renderBasicInvitationCanvas(
      event,
      guest,
      tableName,
      finalAccessQr,
      locationsQrCodeUrl,
      isSinglePage ? 'single' : 'cover',
      schedules
    );
  }

  // 2. Render Page 2 (Inside Info) (only in Double Page mode)
  if (!isSinglePage) {
    if (hasCustomInfo) {
      const page2Overlays: Array<{
        qrDataUrl: string;
        coords: { left: number; top: number; width: number; height: number };
      }> = [];

      if (locationsQrCodeUrl) {
        page2Overlays.push({ qrDataUrl: locationsQrCodeUrl, coords: locCoords });
      }
      if (finalAccessQr) {
        page2Overlays.push({ qrDataUrl: finalAccessQr, coords: accessCoords });
      }

      infoDataUrl = await renderInvitationPage(canvaConfig.canva_info_url!, DEFAULT_CANVA_INFO, page2Overlays);
    } else {
      // Dynamic Basic Template Info Page for events without custom Canva uploads
      infoDataUrl = await renderBasicInvitationCanvas(
        event,
        guest,
        tableName,
        finalAccessQr,
        locationsQrCodeUrl,
        'info',
        schedules
      );
    }
  }

  // 3. Assemble A4 landscape PDF (297 x 210 mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const imgWidth = 297;
  const imgHeight = 210;

  // Add cover page (Page 1)
  doc.addImage(coverDataUrl, 'JPEG', 0, 0, imgWidth, imgHeight);

  // Add inside info page (Page 2) if double page mode
  if (!isSinglePage && infoDataUrl) {
    doc.addPage();
    doc.addImage(infoDataUrl, 'JPEG', 0, 0, imgWidth, imgHeight);
  }

  return doc;
}
