import { jsPDF } from 'jspdf';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import { Guest, Event, EventSchedule, EventInfoBlock } from '@/types';
import DefaultTemplate from '@/components/templates/invitations/DefaultTemplate';

import { generateQRCode } from '@/utils/qr';

export async function generateGuestPDF(
  guest: Guest,
  event: Event,
  tableName: string,
  qrCodeDataUrl: string,
  schedules: EventSchedule[] = [],
  infoBlocks: EventInfoBlock[] = []
): Promise<jsPDF> {
  // Generate locations redirect QR code link
  const locationsLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/convite/${guest.qr_token}#mapas`;
  const locationsQrCodeUrl = await generateQRCode(locationsLink);

  const eventLabels = {
    title: event.type === 'casamento' ? 'Casamento' : event.type === 'aniversario' ? 'Aniversário' : event.type === 'pedido' ? 'Pedido de Casamento' : 'Evento',
    invitation: 'Convite Especial',
    details: 'Detalhes do Evento',
    theme: 'Tema',
    rsvpQuestion: 'Confirma a sua presença?',
  };

  const templateProps = {
    guest,
    event,
    table: tableName !== 'Sem Mesa' ? { name: tableName, id: '', event_id: '', capacity: 0, created_at: '' } : null,
    qrCodeUrl: qrCodeDataUrl,
    locationsQrCodeUrl,
    schedules,
    infoBlocks,
    rsvpStatus: 'Confirmed' as const,
    saving: false,
    downloading: false,
    eventLabels,
    notes: guest.notes || '',
    setNotes: () => {},
    handleRSVPSubmit: () => {},
    handleDownloadInvite: () => {},
    getGoogleMapsLink: (locationName: string | null | undefined, mapsUrlOrCoords: string | null | undefined) => {
      if (mapsUrlOrCoords && (mapsUrlOrCoords.startsWith('http://') || mapsUrlOrCoords.startsWith('https://'))) {
        return mapsUrlOrCoords;
      }
      const query = mapsUrlOrCoords || locationName;
      if (!query) return null;
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    },
    forceOpen: true,
    isPrinting: true,
  };

  // 1. Render and capture Page 1: COVER
  const container = document.createElement('div');
  container.id = 'temp-pdf-capture-container';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1120px';
  container.style.height = '792px';
  container.style.background = '#0c0c0e';
  container.style.boxSizing = 'border-box';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  const root1 = createRoot(container);
  await new Promise<void>((resolve) => {
    const element = React.createElement(DefaultTemplate, { ...templateProps, renderPage: 'cover' });
    root1.render(element);
    setTimeout(resolve, 600);
  });

  // Wait for images to load on Page 1
  const images1 = Array.from(container.getElementsByTagName('img'));
  await Promise.all(
    images1.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  const coverDataUrl = await toPng(container, {
    cacheBust: true,
    pixelRatio: 2,
    style: {
      transform: 'none',
      left: '0',
      top: '0',
    }
  });

  root1.unmount();
  container.innerHTML = ''; // clear content

  // 2. Render and capture Page 2: INFO
  const root2 = createRoot(container);
  await new Promise<void>((resolve) => {
    const element = React.createElement(DefaultTemplate, { ...templateProps, renderPage: 'info' });
    root2.render(element);
    setTimeout(resolve, 600);
  });

  // Wait for images to load on Page 2
  const images2 = Array.from(container.getElementsByTagName('img'));
  await Promise.all(
    images2.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  const infoDataUrl = await toPng(container, {
    cacheBust: true,
    pixelRatio: 2,
    style: {
      transform: 'none',
      left: '0',
      top: '0',
    }
  });

  root2.unmount();
  document.body.removeChild(container);

  // 3. Assemble A4 landscape PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const imgWidth = 297;
  const imgHeight = 210;

  // Add cover page
  doc.addImage(coverDataUrl, 'PNG', 0, 0, imgWidth, imgHeight);

  // Add inside info page
  doc.addPage();
  doc.addImage(infoDataUrl, 'PNG', 0, 0, imgWidth, imgHeight);

  return doc;
}
