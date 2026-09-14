import { jsPDF } from 'jspdf';
import { Guest, Event, EventSchedule, EventInfoBlock } from '@/types';
import { generateQRCode } from '@/utils/qr';
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
 * Renders a full invitation page directly to a high-resolution Canvas 2D.
 * Native HTML5 Canvas 2D is 100% supported across all mobile (iOS Safari, Android Chrome)
 * and desktop devices without any SVG foreignObject or DOM clipping bugs.
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
      const x = (overlay.coords.left / 100) * canvasWidth;
      const y = (overlay.coords.top / 100) * canvasHeight;
      const w = (overlay.coords.width / 100) * canvasWidth;
      const h = (overlay.coords.height / 100) * canvasHeight;

      // Draw crisp white background card
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, w, h);

      // Draw QR image with slight padding for optimal scanning
      const qrImg = await loadHtmlImage(overlay.qrDataUrl);
      const padding = Math.min(w, h) * 0.035;
      ctx.drawImage(qrImg, x + padding, y + padding, w - padding * 2, h - padding * 2);
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
  const canvaConfig = resolveCanvaConfig(event.id, event.template_config, infoBlocks, event.background_image);
  const isSinglePage = canvaConfig.pdf_mode === 'single_page';

  // Generate locations redirect QR code link
  const locationsLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/convite/${guest.qr_token}#mapas`;
  const locationsQrCodeUrl = await generateQRCode(locationsLink);

  const locCoords = canvaConfig.qr_locations_coords || DEFAULT_LOC_COORDS;
  const accessCoords = canvaConfig.qr_access_coords || DEFAULT_ACCESS_COORDS;

  const canvaCover = canvaConfig.canva_cover_url || DEFAULT_CANVA_COVER;
  const canvaInfo = canvaConfig.canva_info_url || DEFAULT_CANVA_INFO;

  // 1. Prepare Page 1 (Cover / Single Page) Overlays
  const page1Overlays: Array<{
    qrDataUrl: string;
    coords: { left: number; top: number; width: number; height: number };
  }> = [];

  if (isSinglePage) {
    if (locationsQrCodeUrl && canvaConfig.show_locations_qr !== false) {
      page1Overlays.push({ qrDataUrl: locationsQrCodeUrl, coords: locCoords });
    }
    if (qrCodeDataUrl && canvaConfig.show_access_qr !== false) {
      page1Overlays.push({ qrDataUrl: qrCodeDataUrl, coords: accessCoords });
    }
  }

  // Render Page 1
  const coverDataUrl = await renderInvitationPage(canvaCover, DEFAULT_CANVA_COVER, page1Overlays);

  // 2. Prepare Page 2 (Inside Info) Overlays (only in Double Page mode)
  let infoDataUrl: string | null = null;
  if (!isSinglePage) {
    const page2Overlays: Array<{
      qrDataUrl: string;
      coords: { left: number; top: number; width: number; height: number };
    }> = [];

    if (locationsQrCodeUrl) {
      page2Overlays.push({ qrDataUrl: locationsQrCodeUrl, coords: locCoords });
    }
    if (qrCodeDataUrl) {
      page2Overlays.push({ qrDataUrl: qrCodeDataUrl, coords: accessCoords });
    }

    infoDataUrl = await renderInvitationPage(canvaInfo, DEFAULT_CANVA_INFO, page2Overlays);
  }

  // 3. Assemble A4 landscape PDF
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
