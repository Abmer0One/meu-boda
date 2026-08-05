import { jsPDF } from 'jspdf';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import { Guest, Event, EventSchedule, EventInfoBlock } from '@/types';
import DefaultTemplate from '@/components/templates/invitations/DefaultTemplate';

export async function generateGuestPDF(
  guest: Guest,
  event: Event,
  tableName: string,
  qrCodeDataUrl: string,
  schedules: EventSchedule[] = [],
  infoBlocks: EventInfoBlock[] = []
): Promise<jsPDF> {
  // 1. Create a container element
  const container = document.createElement('div');
  container.id = 'temp-pdf-capture-container';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '1120px'; // A4 landscape ratio width
  container.style.height = '792px'; // A4 landscape ratio height
  container.style.background = '#0c0c0e';
  container.style.boxSizing = 'border-box';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  // 2. Determine template properties
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
    schedules,
    infoBlocks,
    rsvpStatus: 'Confirmed' as const, // always show confirmed/access state on printable ticket
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
    isPrinting: true, // triggers landscape print layout
  };

  // 3. Render template
  const root = createRoot(container);
  
  await new Promise<void>((resolve) => {
    const element = React.createElement(DefaultTemplate, templateProps);
    root.render(element);
    
    // Give react time to mount and render
    setTimeout(resolve, 600);
  });

  // 4. Wait for all image tags to load completely
  const images = Array.from(container.getElementsByTagName('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  // 5. Generate high-res image using html-to-image
  // We use pixelRatio: 2 for high density printing
  const dataUrl = await toPng(container, {
    cacheBust: true,
    pixelRatio: 2,
    style: {
      transform: 'none',
      left: '0',
      top: '0',
    }
  });

  // 6. Clean up DOM
  root.unmount();
  document.body.removeChild(container);

  // 7. Calculate PDF dimensions
  // An A4 page is 297mm x 210mm in landscape mode.
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const imgWidth = 297;
  const imgHeight = 210;

  doc.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);

  return doc;
}
