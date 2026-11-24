'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Clock,
  MailOpen,
  Map,
} from 'lucide-react';
import { Guest, Event, Table, EventSchedule, EventInfoBlock } from '@/types';
import { resolveCanvaConfig, DEFAULT_CANVA_COVER, DEFAULT_CANVA_INFO } from '@/utils/canvaConfig';
import { parseEventInitials } from '@/utils/eventHelpers';

export interface TemplateProps {
  guest: Guest;
  event: Event;
  table: Table | null;
  qrCodeUrl: string;
  locationsQrCodeUrl?: string;
  schedules: EventSchedule[];
  infoBlocks: EventInfoBlock[];
  rsvpStatus: 'Pending' | 'Confirmed' | 'Declined';
  saving: boolean;
  downloading: boolean;
  eventLabels: {
    title: string;
    invitation: string;
    details: string;
    theme: string;
    rsvpQuestion: string;
  };
  notes: string;
  setNotes: (val: string) => void;
  handleRSVPSubmit: (status: 'Confirmed' | 'Declined') => void;
  handleDownloadInvite: () => void;
  getGoogleMapsLink: (locationName: string | null | undefined, mapsUrlOrCoords: string | null | undefined) => string | null;
  children?: React.ReactNode;
  forceOpen?: boolean;
  isPrinting?: boolean;
  renderPage?: 'cover' | 'info';
  theme?: 'dark' | 'light';
}

export default function DefaultTemplate({
  guest,
  event,
  table,
  qrCodeUrl,
  locationsQrCodeUrl,
  schedules,
  infoBlocks,
  rsvpStatus,
  saving,
  downloading,
  eventLabels,
  notes,
  setNotes,
  handleRSVPSubmit,
  handleDownloadInvite,
  getGoogleMapsLink,
  children,
  forceOpen,
  isPrinting = false,
  renderPage = 'info',
  theme = 'dark',
}: TemplateProps) {
  const [isOpen, setIsOpen] = useState(forceOpen ?? false);
  const [showMapsModal, setShowMapsModal] = useState(false);
  
  const isConfirmed = rsvpStatus === 'Confirmed';
  const isDeclined = rsvpStatus === 'Declined';
  const isLight = theme === 'light';

  // Modal map trigger for public invitation scan
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#mapas') {
      setShowMapsModal(true);
      setIsOpen(true);
    }
  }, []);

  // Dynamic host initials and names parsing with robust word-boundary detection
  const hosts = parseEventInitials(event.title, event.type);

  // Dynamic Intro and Ending Phrases
  const getPhrases = () => {
    switch (event.type) {
      case 'casamento':
        return {
          intro: 'Com a bênção de Deus e de nossas famílias, convidamo-vos para partilhar connosco este dia.',
          outro: 'A vossa presença tornará o nosso dia ainda mais inesquecível e feliz.',
        };
      case 'casamento_tradicional':
        return {
          intro: 'Em união com as nossas tradições e as nossas famílias, convidamo-vos para o nosso Casamento Tradicional.',
          outro: 'Vem testemunhar o início do nosso compromisso e celebrar o amor familiar.',
        };
      case 'alambamento':
        return {
          intro: 'Em união com as nossas tradições e as nossas famílias, convidamo-vos para o nosso Alambamento.',
          outro: 'Vem testemunhar o início do nosso compromisso e celebrar o amor familiar.',
        };
      case 'noivado':
      case 'pedido':
        return {
          intro: 'Com imensa alegria nos nossos corações, convidamo-vos para celebrar o nosso Noivado.',
          outro: 'A vossa presença tornará este momento do nosso sim ainda mais especial e inesquecível.',
        };
      case 'aniversario':
        return {
          intro: 'A vida é uma dádiva e celebrá-la ao lado de pessoas queridas é a maior das alegrias.',
          outro: 'Espero por si para partilhar abraços, sorrisos e brindes a este novo ciclo.',
        };
      case 'cha_panela':
        return {
          intro: 'O meu casamento está a chegar! Vem divertir-te comigo e celebrar no meu Chá de Panela.',
          outro: 'A tua presença e energia positiva são os meus maiores presentes.',
        };
      case 'palestra':
      case 'outro':
      default:
        return {
          intro: 'Temos o enorme prazer de convidar-vos para participar no nosso evento especial.',
          outro: 'A vossa presença é fundamental para o sucesso e enriquecimento do nosso encontro.',
        };
    }
  };

  const phrases = getPhrases();

  // Formatted date string with full weekday in Portuguese
  const getFormattedDate = () => {
    try {
      const d = new Date(event.date);
      const weekdayStr = d.toLocaleDateString('pt-PT', { weekday: 'long' });
      const day = d.getDate().toString().padStart(2, '0');
      const monthRaw = d.toLocaleDateString('pt-PT', { month: 'long' });
      const monthCapitalized = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
      const monthShort = d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '').toUpperCase();
      const year = d.getFullYear().toString();
      const dayMonthYear = d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
      
      // Capitalize weekday
      const weekdayCapitalized = weekdayStr.charAt(0).toUpperCase() + weekdayStr.slice(1);
      
      const timeStr = event.party_time || d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      const timeDisplay = timeStr.endsWith(':00') ? timeStr.replace(':00', 'h') : `${timeStr}h`;

      return {
        weekday: weekdayCapitalized,
        date: dayMonthYear,
        full: `${weekdayCapitalized}, ${dayMonthYear}`,
        monthDayYear: `${monthShort} | ${day} | ${year}`,
        weekdayAtTime: `${weekdayCapitalized} às ${timeDisplay}`,
        time: timeStr,
      };
    } catch (e) {
      return {
        weekday: 'Sexta Feira',
        date: '06 de Novembro de 2026',
        full: 'Sexta-feira, 06 de Novembro de 2026',
        monthDayYear: 'NOV | 06 | 2026',
        weekdayAtTime: 'Sexta Feira às 22h',
        time: '22:00',
      };
    }
  };

  const dateDetails = getFormattedDate();

  /* =========================================================================
     PDF PRINT MODE LAYOUTS (Landscape A4: 1120x792)
     ========================================================================= */
  if (isPrinting) {
    const canvaConfig = resolveCanvaConfig(event.id, event.template_config, infoBlocks, null, event);
    const hasCustomCover = !canvaConfig.is_basic_template && Boolean(canvaConfig.canva_cover_url);
    const hasCustomInfo = !canvaConfig.is_basic_template && Boolean(canvaConfig.canva_info_url);
    const isSinglePage = canvaConfig.pdf_mode === 'single_page';

    const locCoords = canvaConfig.qr_locations_coords || {
      left: 8.76,
      top: 69.56,
      width: 11.85,
      height: 16.76,
    };

    const accessCoords = canvaConfig.qr_access_coords || {
      left: 80.99,
      top: 54.14,
      width: 13.10,
      height: 18.52,
    };

    const guestNameCoords = canvaConfig.guest_name_coords || {
      left: 15,
      top: 65,
      width: 70,
      height: 6,
    };
    const showGuestName = Boolean(canvaConfig.show_guest_name) && Boolean(guest?.name);
    const guestNamePage = canvaConfig.guest_name_page || 'page_1';
    const guestNameAlign = canvaConfig.guest_name_align || 'center';
    const guestNameColor = canvaConfig.guest_name_color || '#1A1A1A';
    const guestNameFontSize = canvaConfig.guest_name_font_size || 24;
    const guestNameFontFamily = canvaConfig.guest_name_font_family === 'sans' ? 'sans-serif' : 'serif';
    const guestNameFontWeight = canvaConfig.guest_name_font_weight || 'bold';

    const initialsData = parseEventInitials(event.title, event.theme);
    const initials = initialsData.initials || 'MB';

    // -----------------------------------------------------------------
    // PAGE 1: COVER (or SINGLE PAGE INVITATION)
    // -----------------------------------------------------------------
    if (renderPage === 'cover' || isSinglePage) {
      if (hasCustomCover) {
        return (
          <div className="w-[1120px] h-[792px] bg-[#FAF8F1] p-0 relative overflow-hidden select-none box-border flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={canvaConfig.canva_cover_url!} 
              alt="Convite Oficial Canva" 
              crossOrigin="anonymous"
              className="w-full h-full object-cover select-none pointer-events-none absolute inset-0 z-0"
            />

            {/* Sobreposição do Nome do Convidado */}
            {showGuestName && (isSinglePage || guestNamePage === 'page_1') && (
              <div 
                className="absolute z-10 flex items-center overflow-hidden pointer-events-none"
                style={{
                  left: `${guestNameCoords.left}%`,
                  top: `${guestNameCoords.top}%`,
                  width: `${guestNameCoords.width}%`,
                  height: `${guestNameCoords.height}%`,
                  justifyContent: guestNameAlign === 'left' ? 'flex-start' : guestNameAlign === 'right' ? 'flex-end' : 'center',
                }}
              >
                <span
                  style={{
                    fontSize: `${guestNameFontSize}px`,
                    color: guestNameColor,
                    fontFamily: guestNameFontFamily,
                    fontWeight: guestNameFontWeight,
                    textAlign: guestNameAlign,
                  }}
                  className="truncate w-full leading-tight"
                >
                  {guest.name}
                </span>
              </div>
            )}

            {/* Em modo Página Única, sobrepõe os códigos QR diretamente na Frente */}
            {isSinglePage && (
              <>
                {/* 1. Código QR Real de Localizações */}
                {locationsQrCodeUrl && canvaConfig.show_locations_qr !== false && (
                  <div 
                    className="absolute z-10 flex items-center justify-center bg-white shadow-sm overflow-hidden"
                    style={{
                      left: `${locCoords.left}%`,
                      top: `${locCoords.top}%`,
                      width: `${locCoords.width}%`,
                      height: `${locCoords.height}%`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={locationsQrCodeUrl} 
                      alt="Código de Localizações Real" 
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain p-0.5"
                    />
                  </div>
                )}

                {/* 2. Código QR Real de Acesso / Portaria */}
                {qrCodeUrl && canvaConfig.show_access_qr !== false && (
                  <div 
                    className="absolute z-10 flex items-center justify-center bg-white shadow-sm overflow-hidden"
                    style={{
                      left: `${accessCoords.left}%`,
                      top: `${accessCoords.top}%`,
                      width: `${accessCoords.width}%`,
                      height: `${accessCoords.height}%`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={qrCodeUrl} 
                      alt="Código de Acesso Real" 
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain p-0.5"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      // Dynamic Basic Template for events without custom Canva uploads
      if (isSinglePage) {
        return (
          <div className="w-[1120px] h-[792px] bg-[#FAF8F5] p-6 relative overflow-hidden select-none box-border flex flex-col justify-between font-serif text-[#1c1c1e] border-[3px] border-[#D4AF37]">
            {/* Inner Border */}
            <div className="absolute inset-2 border border-[#E8D49E] pointer-events-none" />

            {/* Header Section: Monogram, Tagline, Title */}
            <div className="text-center pt-2 relative z-10 space-y-1">
              <div className="w-14 h-14 rounded-full border-2 border-[#D4AF37] mx-auto flex items-center justify-center text-[#B89742] text-xl font-bold bg-[#FAF8F5]">
                {initials}
              </div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#8A7348] font-semibold">{eventLabels?.invitation || 'Convite Especial'}</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">{event.title}</h1>
              <p className="text-xs italic text-[#6B5E51]">Convidam cordialmente para a celebração deste momento inesquecível</p>
            </div>

            {/* Guest Banner */}
            <div className="mx-auto bg-[#F5EFE6] border border-[#D4AF37]/60 rounded-xl px-8 py-2 text-center max-w-xl relative z-10">
              <p className="text-base font-bold text-[#1C1C1E]">Convidado de Honra: {guest.name}</p>
              <p className="text-[11px] text-[#8A7348]">
                {table ? `Mesa: ${table.name}` : ''}
                {guest.companions > 0 ? ` • ${guest.companions + 1} Lugares Reservados` : ''}
              </p>
            </div>

            {/* Event Details */}
            <div className="text-center relative z-10 space-y-0.5 text-xs text-[#4A4036]">
              <p className="font-bold text-sm text-[#2D241E]">📅 {dateDetails.full}</p>
              <p>
                {event.ceremony_location && `Cerimónia: ${event.ceremony_location}${event.ceremony_time ? ' às ' + event.ceremony_time : ''}`}
                {event.party_location && `  |  Copos-de-Água: ${event.party_location}${event.party_time ? ' às ' + event.party_time : ''}`}
              </p>
            </div>

            {/* Two QR Code Cards */}
            <div className="grid grid-cols-2 gap-6 max-w-3xl mx-auto w-full relative z-10 pb-2">
              {/* QR Localizações */}
              <div className="bg-white rounded-xl border border-[#E8D49E] p-3 flex flex-col items-center justify-center text-center shadow-sm">
                <p className="text-xs font-bold text-[#2D241E]">📍 LOCALIZAÇÃO & ITINERÁRIO</p>
                <p className="text-[10px] text-[#71717A] mb-1.5">Aponte a câmara do telemóvel para abrir no GPS</p>
                {locationsQrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={locationsQrCodeUrl} alt="QR Localização" className="w-40 h-40 object-contain" />
                ) : (
                  <div className="w-40 h-40 bg-zinc-100 flex items-center justify-center text-xs text-zinc-400">QR Mapa</div>
                )}
                <span className="text-[10px] font-semibold text-[#8A7348] mt-1">Rota no Google Maps</span>
              </div>

              {/* QR Acesso */}
              <div className="bg-white rounded-xl border border-[#E8D49E] p-3 flex flex-col items-center justify-center text-center shadow-sm">
                <p className="text-xs font-bold text-[#2D241E]">🎟️ PASSE DE ENTRADA / PORTARIA</p>
                <p className="text-[10px] text-[#71717A] mb-1.5">Apresente este código na entrada para check-in</p>
                {qrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCodeUrl} alt="QR Acesso" className="w-40 h-40 object-contain" />
                ) : (
                  <div className="w-40 h-40 bg-zinc-100 flex items-center justify-center text-xs text-zinc-400">QR Acesso</div>
                )}
                <span className="text-[10px] font-semibold text-[#8A7348] mt-1">Check-in Individual</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-[#A3907C] italic relative z-10 pb-1">
              Meu Boda • Confirmação de presença e detalhes em meuboda.com
            </div>
          </div>
        );
      } else {
        // Double Page - Cover Card
        return (
          <div className="w-[1120px] h-[792px] bg-[#FAF8F5] p-12 relative overflow-hidden select-none box-border flex flex-col justify-between items-center text-center font-serif text-[#1c1c1e] border-[3px] border-[#D4AF37]">
            <div className="absolute inset-3 border border-[#E8D49E] pointer-events-none" />

            <div className="my-auto space-y-4 relative z-10 max-w-2xl">
              <div className="w-24 h-24 rounded-full border-4 border-[#D4AF37] mx-auto flex items-center justify-center text-[#B89742] text-3xl font-bold bg-[#FAF8F5]">
                {initials}
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#8A7348] font-semibold">{eventLabels?.invitation || 'Convite Especial'}</p>
              <h1 className="text-5xl font-bold tracking-tight text-[#1A1A1A]">{event.title}</h1>
              <p className="text-lg text-[#2D241E] font-medium">{dateDetails.full}</p>
            </div>

            <div className="bg-[#F5EFE6] border border-[#D4AF37]/60 rounded-2xl px-12 py-4 text-center max-w-xl relative z-10 w-full mb-6">
              <p className="text-xs italic text-[#8A7348]">Especialmente preparado para</p>
              <p className="text-2xl font-bold text-[#1C1C1E] mt-0.5">{guest.name}</p>
              <p className="text-xs text-[#6B5E51] mt-0.5">
                {table ? `Mesa: ${table.name}` : ''}
                {guest.companions > 0 ? ` • ${guest.companions + 1} Convidados` : ''}
              </p>
            </div>

            <div className="text-[11px] text-[#A3907C] italic relative z-10">
              Meu Boda • Celebração de Amor & União
            </div>
          </div>
        );
      }
    } else {
      // -----------------------------------------------------------------
      // PAGE 2: INFO (Inside Sheet / Tríptico)
      // -----------------------------------------------------------------
      if (hasCustomInfo) {
        return (
          <div className="w-[1120px] h-[792px] bg-[#FAF8F1] p-0 relative overflow-hidden select-none box-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={canvaConfig.canva_info_url!} 
              alt="Verso do Convite Oficial Canva" 
              crossOrigin="anonymous"
              className="w-full h-full object-cover select-none pointer-events-none absolute inset-0 z-0"
            />

            {/* Sobreposição do Nome do Convidado no Verso */}
            {showGuestName && guestNamePage === 'page_2' && (
              <div 
                className="absolute z-10 flex items-center overflow-hidden pointer-events-none"
                style={{
                  left: `${guestNameCoords.left}%`,
                  top: `${guestNameCoords.top}%`,
                  width: `${guestNameCoords.width}%`,
                  height: `${guestNameCoords.height}%`,
                  justifyContent: guestNameAlign === 'left' ? 'flex-start' : guestNameAlign === 'right' ? 'flex-end' : 'center',
                }}
              >
                <span
                  style={{
                    fontSize: `${guestNameFontSize}px`,
                    color: guestNameColor,
                    fontFamily: guestNameFontFamily,
                    fontWeight: guestNameFontWeight,
                    textAlign: guestNameAlign,
                  }}
                  className="truncate w-full leading-tight"
                >
                  {guest.name}
                </span>
              </div>
            )}

            {/* 1. Código QR Real de Localizações */}
            {locationsQrCodeUrl && (
              <div 
                className="absolute z-10 flex items-center justify-center bg-white"
                style={{
                  left: `${locCoords.left}%`,
                  top: `${locCoords.top}%`,
                  width: `${locCoords.width}%`,
                  height: `${locCoords.height}%`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={locationsQrCodeUrl} 
                  alt="Código de Localizações Real" 
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
            )}

            {/* 2. Código QR Real de Acesso / Portaria */}
            {qrCodeUrl && (
              <div 
                className="absolute z-10 flex items-center justify-center bg-white"
                style={{
                  left: `${accessCoords.left}%`,
                  top: `${accessCoords.top}%`,
                  width: `${accessCoords.width}%`,
                  height: `${accessCoords.height}%`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={qrCodeUrl} 
                  alt="Código de Acesso Real" 
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
            )}
          </div>
        );
      }

      // Dynamic Basic Template Inside Page (Tríptico: Localizações, Programa, Passe de Entrada)
      return (
        <div className="w-[1120px] h-[792px] bg-[#FAF8F5] p-6 relative overflow-hidden select-none box-border font-serif text-[#1c1c1e] border-[3px] border-[#D4AF37] flex">
          <div className="absolute inset-2 border border-[#E8D49E] pointer-events-none" />

          {/* Panel 1: Localizações (Left) */}
          <div className="flex-1 border-r border-[#E8D49E] p-4 flex flex-col justify-between items-center text-center relative z-10">
            <div>
              <h3 className="text-base font-bold text-[#B89742] uppercase tracking-wider">Localizações</h3>
              <div className="w-12 h-0.5 bg-[#D4AF37] mx-auto my-2" />
              
              <div className="space-y-3 mt-4 text-xs text-left w-full px-2">
                <div>
                  <p className="font-bold text-[#2D241E]">
                    {event.type === 'aniversario' ? 'Local da Celebração' : 'Cerimónia'}
                  </p>
                  <p className="text-zinc-600">{event.ceremony_location || event.party_location || 'Local a anunciar'}</p>
                  {(event.ceremony_time || event.party_time) && (
                    <p className="text-[#8A7348] font-medium">Horário: {event.ceremony_time || event.party_time}</p>
                  )}
                </div>
                {event.party_location && event.ceremony_location && (
                  <div>
                    <p className="font-bold text-[#2D241E]">
                      {event.type === 'aniversario' ? 'Festa / Convívio' : 'Copos-de-Água & Festa'}
                    </p>
                    <p className="text-zinc-600">{event.party_location}</p>
                    {event.party_time && <p className="text-[#8A7348] font-medium">Horário: {event.party_time}</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E8D49E] p-3 flex flex-col items-center w-full max-w-[260px] shadow-sm">
              <p className="text-[11px] font-bold text-[#2D241E]">📍 MAPA & ITINERÁRIO</p>
              <p className="text-[9px] text-zinc-500 mb-1">Aponte a câmara para abrir o GPS</p>
              {locationsQrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={locationsQrCodeUrl} alt="QR Localização" className="w-36 h-36 object-contain" />
              ) : (
                <div className="w-36 h-36 bg-zinc-100 flex items-center justify-center text-xs text-zinc-400">QR Mapa</div>
              )}
              <span className="text-[9px] font-semibold text-[#8A7348] mt-1">Rota Google Maps</span>
            </div>
          </div>

          {/* Panel 2: Celebração & Programa (Center) */}
          <div className="flex-1 border-r border-[#E8D49E] p-4 flex flex-col justify-between items-center text-center relative z-10">
            <div>
              <h3 className="text-base font-bold text-[#B89742] uppercase tracking-wider">Celebração</h3>
              <div className="w-12 h-0.5 bg-[#D4AF37] mx-auto my-2" />
              <p className="text-xs font-bold text-[#1A1A1A] mt-2">{dateDetails.full}</p>

              <p className="text-xs italic text-[#5A4E42] mt-3 leading-relaxed px-2">
                {event.description || 'A vossa presença tornará este momento inesquecível. Esperamos por si para celebrar o nosso amor e união.'}
              </p>

              {event.dress_code_style && (
                <div className="mt-4 bg-[#F5EFE6] border border-[#D4AF37]/50 rounded-lg p-2 max-w-[240px] mx-auto">
                  <p className="text-[9px] font-bold uppercase text-[#8A7348]">Traje Recomendado</p>
                  <p className="text-xs font-bold text-[#1A1A1A]">{event.dress_code_style}</p>
                </div>
              )}
            </div>

            <div className="text-[10px] text-[#8A7348] italic px-2">
              &quot;O amor é a ponte que une os corações em qualquer jornada.&quot;
            </div>
          </div>

          {/* Panel 3: Passe de Entrada (Right) */}
          <div className="flex-1 p-4 flex flex-col justify-between items-center text-center relative z-10">
            <div>
              <h3 className="text-base font-bold text-[#B89742] uppercase tracking-wider">Passe de Entrada</h3>
              <div className="w-12 h-0.5 bg-[#D4AF37] mx-auto my-2" />
              
              <div className="mt-3">
                <p className="text-[10px] italic text-[#8A7348]">Convidado de Honra:</p>
                <p className="text-sm font-bold text-[#1A1A1A]">{guest.name}</p>
                <p className="text-xs font-semibold text-[#2D241E] mt-0.5">
                  {table ? `Mesa: ${table.name}` : 'Mesa a Confirmar'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E8D49E] p-3 flex flex-col items-center w-full max-w-[260px] shadow-sm">
              <p className="text-[11px] font-bold text-[#2D241E]">🎟️ CÓDIGO DE ACESSO</p>
              <p className="text-[9px] text-zinc-500 mb-1">Apresente na portaria para check-in</p>
              {qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrCodeUrl} alt="QR Acesso" className="w-36 h-36 object-contain" />
              ) : (
                <div className="w-36 h-36 bg-zinc-100 flex items-center justify-center text-xs text-zinc-400">QR Acesso</div>
              )}
              <span className="text-[9px] font-semibold text-[#8A7348] mt-1">Check-in Individual</span>
            </div>
          </div>
        </div>
      );
    }
  }

  /* =========================================================================
     NORMAL INTERACTIVE TEMPLATE
     ========================================================================= */
  return (
    <div className={`min-h-screen py-8 px-4 flex flex-col justify-between max-w-6xl mx-auto font-sans relative overflow-hidden select-none transition-colors duration-500 ${isLight ? 'bg-[#FAF8F5] text-[#1c1917]' : 'bg-[#0d0d0f] text-[#f4f4f5]'}`}>
      
      {/* Styles injecting Playfair Display, Cinzel, and Alex Brush fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@400;600;700;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        
        .font-cinzel {
          font-family: 'Cinzel', serif;
        }
        .font-alex {
          font-family: 'Alex Brush', cursive;
        }
        .font-playfair {
          font-family: 'Playfair Display', serif;
        }
        .gold-foil-text {
          background: linear-gradient(to right, #b89742 0%, #f3e0aa 50%, #b89742 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .gold-foil-border {
          border-image: linear-gradient(to right, #b89742, #f3e0aa, #b89742) 1;
        }
      `}</style>

      {/* Decorative Golden Ambient Blur Lights */}
      <div className={`absolute top-10 left-1/4 w-[350px] h-[350px] bg-[#d4af37]/5 rounded-full blur-[140px] pointer-events-none ${isLight ? 'opacity-30' : 'opacity-100'}`} />
      <div className={`absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-[#b89742]/5 rounded-full blur-[140px] pointer-events-none ${isLight ? 'opacity-30' : 'opacity-100'}`} />

      {/* Dynamic Maps Selection Modal for Scanned Locations QR */}
      <AnimatePresence>
        {showMapsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`border rounded-3xl p-6 w-full max-w-sm text-center space-y-6 relative ${isLight ? 'bg-white border-[#b89742]/40 text-[#1c1917] shadow-2xl' : 'bg-[#121215] border-[#d4af37]/30 text-white'}`}
            >
              <button
                onClick={() => setShowMapsModal(false)}
                className={`absolute top-4 right-4 text-sm ${isLight ? 'text-stone-400 hover:text-stone-800' : 'text-white/50 hover:text-white'}`}
              >
                ✕
              </button>
              <h3 className={`font-cinzel font-bold text-sm tracking-wider border-b pb-3 ${isLight ? 'text-[#8A6D2B] border-[#b89742]/20' : 'text-[#f3e0aa] border-[#d4af37]/20'}`}>
                📍 COMO CHEGAR AO EVENTO
              </h3>
              <p className={`text-[11px] ${isLight ? 'text-stone-600' : 'text-white/70'}`}>Escolha o local para o qual deseja obter direções:</p>
              
              <div className="space-y-3">
                {event.ceremony_location && (
                  <a
                    href={getGoogleMapsLink(event.ceremony_location, event.ceremony_maps_url) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#b89742] hover:bg-[#d4af37] text-[#0d0d0f] font-bold rounded-xl text-xs uppercase transition-all shadow-md"
                  >
                    🚗 {event.type === 'casamento' ? 'Cerimónia Civil / Igreja' : 'Local Principal'}
                  </a>
                )}
                {event.party_location && (
                  <a
                    href={getGoogleMapsLink(event.party_location, event.party_maps_url) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 w-full py-3 border font-bold rounded-xl text-xs uppercase transition-all ${isLight ? 'border-[#b89742]/40 hover:bg-[#b89742]/10 text-stone-900' : 'border-[#d4af37]/40 hover:bg-[#d4af37]/10 text-white'}`}
                  >
                    🎉 Copo d&apos;Água / Salão
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* CLOSED STATE: Luxury Trifold Outer Envelope */
          <motion.div
            key="envelope"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="flex-1 flex items-center justify-center py-10"
          >
            <div className={`relative w-full max-w-[420px] aspect-[1/1.4] rounded-[24px] border p-8 flex flex-col justify-between items-center overflow-hidden transition-all duration-300 ${isLight ? 'border-[#b89742]/30 bg-white shadow-[0_20px_50px_rgba(212,175,55,0.15)] text-[#1c1917]' : 'border-[#d4af37]/20 bg-[#121215] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-white'}`}>
              {/* Outer double border */}
              <div className={`absolute inset-4 border rounded-[18px] pointer-events-none ${isLight ? 'border-[#b89742]/20' : 'border-[#d4af37]/10'}`} />
              <div className={`absolute inset-5 border rounded-[16px] pointer-events-none ${isLight ? 'border-[#b89742]/10' : 'border-[#d4af37]/5'}`} />
              
              {/* Gold corners */}
              <div className={`absolute top-6 left-6 w-8 h-8 border-t border-l ${isLight ? 'border-[#b89742]/50' : 'border-[#d4af37]/40'}`} />
              <div className={`absolute top-6 right-6 w-8 h-8 border-t border-r ${isLight ? 'border-[#b89742]/50' : 'border-[#d4af37]/40'}`} />
              <div className={`absolute bottom-6 left-6 w-8 h-8 border-b border-l ${isLight ? 'border-[#b89742]/50' : 'border-[#d4af37]/40'}`} />
              <div className={`absolute bottom-6 right-6 w-8 h-8 border-b border-r ${isLight ? 'border-[#b89742]/50' : 'border-[#d4af37]/40'}`} />

              <div className="text-center space-y-4 z-10 pt-6">
                <span className={`text-[10px] font-black uppercase tracking-[5px] ${isLight ? 'text-[#8A6D2B]' : 'text-[#d4af37]'}`}>
                  {eventLabels.invitation}
                </span>
                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent mx-auto" />
              </div>

              {/* Envelope Seal Monogram */}
              <div className="relative flex flex-col items-center justify-center z-10 my-4">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                  className={`absolute w-32 h-32 border border-dashed rounded-full ${isLight ? 'border-[#b89742]/30' : 'border-[#d4af37]/20'}`}
                />
                <div className={`w-28 h-28 rounded-full border flex flex-col items-center justify-center shadow-2xl relative ${isLight ? 'bg-gradient-to-tr from-[#FAF8F5] to-white border-[#b89742]/40' : 'bg-gradient-to-tr from-[#16161a] to-[#242429] border-[#d4af37]/40'}`}>
                  <span className="text-3xl font-cinzel font-black tracking-widest gold-foil-text">
                    {hosts.initials}
                  </span>
                </div>
              </div>

              <div className="text-center space-y-6 z-10 pb-6 w-full">
                <div className="space-y-1">
                  <h2 className={`text-[10px] uppercase font-bold tracking-[3px] ${isLight ? 'text-stone-500' : 'text-[#8a8a93]'}`}>
                    Convidado(a):
                  </h2>
                  <p className="text-lg font-playfair font-bold gold-foil-text">
                    {guest.name}
                  </p>
                </div>

                <Button
                  onClick={() => setIsOpen(true)}
                  className="w-full justify-center rounded-full bg-gradient-to-r from-[#b89742] to-[#d4af37] text-[#0d0d0f] font-bold text-xs py-4 tracking-widest uppercase hover:brightness-110 active:scale-97 transition-all shadow-[0_8px_20px_rgba(212,175,55,0.15)] border-t border-[#f3e0aa]/20"
                  leftIcon={<MailOpen className="h-4 w-4" />}
                >
                  Abrir Convite
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* OPEN STATE: Premium Trifold Page */
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="space-y-8"
          >
            {/* Desktop Layout: Trifold 3 columns | Mobile: Stacks vertically */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              
              {/* LEFT COLUMN: Details / Important Info Panel */}
              <div className={`border rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-xl relative backdrop-blur-md ${isLight ? 'bg-white/95 border-[#b89742]/30 text-stone-900' : 'bg-[#121215]/90 border-[#d4af37]/20 text-white'}`}>
                <div className={`absolute inset-3 border rounded-[20px] pointer-events-none ${isLight ? 'border-[#b89742]/10' : 'border-[#d4af37]/5'}`} />
                
                <div className="space-y-6 relative z-10">
                  <div className={`text-center space-y-2 border-b pb-4 ${isLight ? 'border-[#b89742]/20' : 'border-[#d4af37]/15'}`}>
                    <h3 className={`font-cinzel font-bold text-sm tracking-[3px] ${isLight ? 'text-[#8A6D2B]' : 'gold-foil-text'}`}>
                      DETALHES
                    </h3>
                  </div>

                  <div className={`space-y-4 text-xs leading-relaxed ${isLight ? 'text-stone-800' : 'text-white/90'}`}>
                    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${isLight ? 'bg-stone-50 border-stone-200/80 text-stone-800' : 'bg-white/5 border-white/10 text-white/90'}`}>
                      <Calendar className={`h-5 w-5 shrink-0 mt-0.5 ${isLight ? 'text-[#997328]' : 'text-[#d4af37]'}`} />
                      <div>
                        <h4 className={`font-bold text-[10px] uppercase tracking-wider ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>Data e Hora</h4>
                        <p className={`font-semibold text-sm mt-0.5 ${isLight ? 'text-stone-900' : 'text-white'}`}>
                          {new Date(event.date).toLocaleDateString('pt-PT', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {event.ceremony_location && (
                      <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${isLight ? 'bg-stone-50 border-stone-200/80 text-stone-800' : 'bg-white/5 border-white/10 text-white/90'}`}>
                        <MapPin className={`h-5 w-5 shrink-0 mt-0.5 ${isLight ? 'text-[#997328]' : 'text-[#d4af37]'}`} />
                        <div className="flex-1">
                          <h4 className={`font-bold text-[10px] uppercase tracking-wider ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>
                            {event.type === 'casamento' ? 'Cerimónia' : 'Local'}
                          </h4>
                          <p className={`font-semibold text-sm mt-0.5 ${isLight ? 'text-stone-900' : 'text-white'}`}>{event.ceremony_location}</p>
                          {event.ceremony_time && (
                            <p className={`text-xs mt-0.5 ${isLight ? 'text-stone-600' : 'text-zinc-300'}`}>Hora: {event.ceremony_time}</p>
                          )}
                          {getGoogleMapsLink(event.ceremony_location, event.ceremony_maps_url) && (
                            <a
                              href={getGoogleMapsLink(event.ceremony_location, event.ceremony_maps_url)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 text-xs font-bold mt-2 transition-colors ${isLight ? 'text-[#997328] hover:text-[#b89742]' : 'text-[#d4af37] hover:text-[#f3e0aa]'}`}
                            >
                              <Map className="h-3.5 w-3.5" /> Ver localização no mapa
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {event.party_location && (
                      <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${isLight ? 'bg-stone-50 border-stone-200/80 text-stone-800' : 'bg-white/5 border-white/10 text-white/90'}`}>
                        <MapPin className={`h-5 w-5 shrink-0 mt-0.5 ${isLight ? 'text-[#997328]' : 'text-[#d4af37]'}`} />
                        <div className="flex-1">
                          <h4 className={`font-bold text-[10px] uppercase tracking-wider ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>
                            {event.type === 'casamento' ? 'Copo d\'Água' : 'Recepção'}
                          </h4>
                          <p className={`font-semibold text-sm mt-0.5 ${isLight ? 'text-stone-900' : 'text-white'}`}>{event.party_location}</p>
                          {event.party_time && (
                            <p className={`text-xs mt-0.5 ${isLight ? 'text-stone-600' : 'text-zinc-300'}`}>Hora: {event.party_time}</p>
                          )}
                          {getGoogleMapsLink(event.party_location, event.party_maps_url) && (
                            <a
                              href={getGoogleMapsLink(event.party_location, event.party_maps_url)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 text-xs font-bold mt-2 transition-colors ${isLight ? 'text-[#997328] hover:text-[#b89742]' : 'text-[#d4af37] hover:text-[#f3e0aa]'}`}
                            >
                              <Map className="h-3.5 w-3.5" /> Ver localização no mapa
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Blocks / Dress code under details */}
                <div className="space-y-3 relative z-10 pt-4">
                  {(event.dress_code_style || event.dress_code_colors) && (
                    <div className={`p-3.5 border rounded-xl text-xs space-y-1 ${isLight ? 'border-[#b89742]/20 bg-stone-50 text-stone-800' : 'border-[#d4af37]/20 bg-white/5 text-white'}`}>
                      <h4 className={`font-bold text-[10px] uppercase tracking-wider ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>👗 Dress Code</h4>
                      {event.dress_code_style && <p className={`font-medium text-xs mt-0.5 ${isLight ? 'text-stone-900' : 'text-white'}`}>{event.dress_code_style}</p>}
                      {event.dress_code_colors && (
                        <p className={`text-xs ${isLight ? 'text-stone-600' : 'text-zinc-300'}`}>Sugerido: {event.dress_code_colors}</p>
                      )}
                    </div>
                  )}

                  {event.gift_suggestions && (
                    <div className={`p-3.5 border rounded-xl text-xs space-y-1 ${isLight ? 'border-[#b89742]/20 bg-stone-50 text-stone-800' : 'border-[#d4af37]/20 bg-white/5 text-white'}`}>
                      <h4 className={`font-bold text-[10px] uppercase tracking-wider ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>🎁 Sugestões de Presentes</h4>
                      <p className={`text-xs mt-0.5 ${isLight ? 'text-stone-900' : 'text-white/90'}`}>{event.gift_suggestions}</p>
                    </div>
                  )}

                  {event.kids_restriction_note && (
                    <div className={`p-3.5 border rounded-xl text-xs space-y-1 ${isLight ? 'border-[#b89742]/20 bg-stone-50 text-stone-800' : 'border-[#d4af37]/20 bg-white/5 text-white'}`}>
                      <h4 className={`font-bold text-[10px] uppercase tracking-wider ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>ℹ️ Nota Importante</h4>
                      <p className={`text-xs mt-0.5 ${isLight ? 'text-stone-900' : 'text-white/90'}`}>{event.kids_restriction_note}</p>
                    </div>
                  )}

                  {event.rsvp_deadline && (
                    <div className={`p-3.5 border rounded-xl text-xs space-y-1 ${isLight ? 'border-[#b89742]/20 bg-stone-50 text-stone-800' : 'border-[#d4af37]/20 bg-white/5 text-white'}`}>
                      <h4 className={`font-bold text-[10px] uppercase tracking-wider ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>⏰ Confirmação Até</h4>
                      <p className={`text-xs mt-0.5 ${isLight ? 'text-stone-900' : 'text-white/90'}`}>{event.rsvp_deadline}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CENTER COLUMN: The Acrylic Sheet Main Invitation */}
              <div className={`border rounded-3xl p-8 md:p-10 flex flex-col justify-between items-center text-center shadow-2xl relative overflow-hidden min-h-[500px] ${isLight ? 'bg-white border-[#b89742]/35 text-stone-900' : 'bg-[#121215] border-[#d4af37]/35 text-white'}`}>
                
                {/* Simulated Raw Gold Leaf Torn Edges Border inside the card */}
                <div className={`absolute inset-3 border border-dashed rounded-[20px] pointer-events-none ${isLight ? 'border-[#b89742]/20' : 'border-[#d4af37]/20'}`} />
                <div className={`absolute inset-4 rounded-[18px] pointer-events-none ${isLight ? 'bg-gradient-to-b from-[#b89742]/10 to-[#d4af37]/0' : 'bg-gradient-to-b from-[#b89742]/5 to-[#d4af37]/0'}`} />

                {/* Monogram header */}
                <div className="space-y-2 relative z-10">
                  <div className={`w-14 h-14 rounded-full border flex items-center justify-center mx-auto ${isLight ? 'bg-[#FAF8F5] border-[#b89742]/35 text-[#8A6D2B]' : 'bg-[#0d0d0f]/60 border-[#d4af37]/30 text-[#d4af37]'}`}>
                    <span className={`text-xs font-cinzel font-bold tracking-widest ${isLight ? 'text-[#8A6D2B]' : 'text-[#d4af37]'}`}>
                      {hosts.initials}
                    </span>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-[4px] block mt-2 ${isLight ? 'text-stone-400' : 'text-white/40'}`}>
                    {eventLabels.invitation}
                  </span>
                </div>

                {/* Hosts / Main Text */}
                <div className="space-y-6 relative z-10 py-6 my-auto">
                  <h1 className="text-3xl md:text-5xl font-alex tracking-wide px-2 py-1 leading-tight gold-foil-text font-medium">
                    {event.title}
                  </h1>

                  <p className={`text-xs md:text-sm font-playfair italic max-w-sm mx-auto leading-relaxed px-4 ${isLight ? 'text-stone-700' : 'text-white/90'}`}>
                    {phrases.intro}
                  </p>
                  
                  {event.description && (
                    <p className={`text-xs font-playfair italic mt-4 ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>
                      &quot;{event.description}&quot;
                    </p>
                  )}
                </div>

                {/* Footer Monogram Date */}
                <div className={`space-y-1 relative z-10 w-full pt-4 border-t ${isLight ? 'border-[#b89742]/20' : 'border-[#d4af37]/15'}`}>
                  <p className={`text-[10px] font-cinzel tracking-[3px] uppercase ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>
                    {new Date(event.date).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN: Ticket access & RSVP Panel */}
              <div className={`border rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-xl relative backdrop-blur-md ${isLight ? 'bg-white/95 border-[#b89742]/30 text-stone-900' : 'bg-[#121215]/90 border-[#d4af37]/20 text-white'}`}>
                <div className={`absolute inset-3 border rounded-[20px] pointer-events-none ${isLight ? 'border-[#b89742]/10' : 'border-[#d4af37]/5'}`} />
                
                <div className="space-y-6 relative z-10">
                  <div className={`text-center space-y-2 border-b pb-4 ${isLight ? 'border-[#b89742]/20' : 'border-[#d4af37]/15'}`}>
                    <h3 className={`font-cinzel font-bold text-sm tracking-[3px] ${isLight ? 'text-[#8A6D2B]' : 'gold-foil-text'}`}>
                      RSVP / PASSE
                    </h3>
                  </div>

                  {/* Access QR Ticket */}
                  {isConfirmed && qrCodeUrl ? (
                    <div className={`border rounded-2xl p-4 flex flex-col items-center gap-3.5 relative overflow-hidden ${isLight ? 'bg-stone-50 border-[#b89742]/30 text-stone-900' : 'bg-white/5 border-[#d4af37]/20 text-white'}`}>
                      {/* Ticket header label */}
                      <span className={`text-[9px] font-black tracking-[3px] uppercase ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>PASSE DIGITAL INDIVIDUAL</span>
                      
                      <div className="bg-white p-2.5 rounded-xl border-2 border-[#d4af37]/30 shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCodeUrl} alt="Acesso QR" className="w-32 h-32 object-contain" />
                      </div>

                      <div className="text-center space-y-1 text-xs">
                        <p className={`font-bold text-sm ${isLight ? 'text-stone-900' : 'text-white'}`}>{guest.name}</p>
                        <p className={`text-xs font-semibold ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>
                          {table ? `Mesa: ${table.name}` : 'Mesa: Confirmada'}
                        </p>
                      </div>

                      <Button
                        onClick={handleDownloadInvite}
                        disabled={downloading}
                        className={`w-full justify-center rounded-xl border font-bold py-2.5 text-xs tracking-wider uppercase transition-all ${isLight ? 'border-[#b89742]/40 text-[#8A6D2B] bg-[#b89742]/10 hover:bg-[#b89742]/20' : 'border-[#d4af37]/40 text-[#f3e0aa] bg-[#d4af37]/10 hover:bg-[#d4af37]/20'}`}
                        leftIcon={downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      >
                        Baixar PDF
                      </Button>
                    </div>
                  ) : (
                    /* RSVP selection buttons */
                    <div className="space-y-4">
                      <p className={`text-xs text-center px-2 leading-relaxed ${isLight ? 'text-stone-700' : 'text-white/90'}`}>
                        Olá <span className={`font-bold ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>{guest.name}</span>, confirme a sua presença no evento abaixo:
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleRSVPSubmit('Confirmed')}
                          disabled={saving}
                          className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer active:scale-95 transition-all gap-1.5 ${
                            isConfirmed
                              ? (isLight ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-bold' : 'border-success bg-success/20 text-success font-bold')
                              : (isLight ? 'border-stone-300 hover:bg-stone-100 text-stone-800 font-semibold' : 'border-[#d4af37]/20 hover:bg-white/10 text-white font-semibold')
                          }`}
                        >
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-xs">Vou</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRSVPSubmit('Declined')}
                          disabled={saving}
                          className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer active:scale-95 transition-all gap-1.5 ${
                            isDeclined
                              ? (isLight ? 'border-red-600 bg-red-50 text-red-700 font-bold' : 'border-error bg-error/20 text-error font-bold')
                              : (isLight ? 'border-stone-300 hover:bg-stone-100 text-stone-800 font-semibold' : 'border-[#d4af37]/20 hover:bg-white/10 text-white font-semibold')
                          }`}
                        >
                          <XCircle className="h-5 w-5" />
                          <span className="text-xs">Não vou</span>
                        </button>
                      </div>

                      {/* Extra food restriction note input */}
                      {isConfirmed && (
                        <div className="flex flex-col gap-1.5 pt-1">
                          <label className={`text-[10px] font-bold uppercase tracking-wide ${isLight ? 'text-stone-600' : 'text-zinc-300'}`}>Observações / Restrições</label>
                          <textarea
                            rows={2}
                            placeholder="Vegetariano, alergias..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={`w-full rounded-xl border px-3.5 py-2 text-xs focus:outline-none transition-all ${isLight ? 'border-stone-300 bg-[#FAF8F5] text-stone-900 placeholder:text-stone-400 focus:border-[#b89742]' : 'border-white/20 bg-[#0d0d0f] text-white placeholder:text-zinc-500 focus:border-[#d4af37]'}`}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={`text-center pt-4 border-t relative z-10 ${isLight ? 'border-[#b89742]/20' : 'border-[#d4af37]/15'}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className={`text-[11px] rounded-full ${isLight ? 'text-stone-600 hover:text-stone-900 border-stone-300 hover:border-[#b89742]' : 'text-zinc-300 hover:text-white border-white/10 hover:border-[#d4af37]/40'}`}
                  >
                    Voltar à Capa
                  </Button>
                </div>
              </div>

            </div>

            {/* Timelines and Schedules below panels */}
            {schedules.length > 0 && (
              <div 
                className={`rounded-3xl border shadow-xl backdrop-blur-md relative overflow-hidden p-6 md:p-8 text-left transition-all ${
                  isLight 
                    ? 'border-[#b89742]/30 text-stone-900 shadow-[0_20px_50px_rgba(212,175,55,0.12)]' 
                    : 'border-[#d4af37]/20 text-white'
                }`}
                style={{
                  backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : '#121215',
                  color: isLight ? '#1c1917' : '#ffffff',
                }}
              >
                {/* Luxury inner decorative frame matching Left/Right columns */}
                <div className={`absolute inset-3 border rounded-[20px] pointer-events-none ${isLight ? 'border-[#b89742]/10' : 'border-[#d4af37]/5'}`} />

                {/* Ambient glow accent matching Left/Right columns */}
                <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${isLight ? 'bg-[#d4af37]/5' : 'bg-[#d4af37]/10'}`} />

                {/* Section Header */}
                <div className={`flex items-center gap-2.5 border-b pb-4 mb-6 relative z-10 ${isLight ? 'border-[#b89742]/20' : 'border-[#d4af37]/15'}`}>
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                    isLight 
                      ? 'bg-[#b89742]/15 border-[#b89742]/35 text-[#8A6D2B]' 
                      : 'bg-[#d4af37]/15 border-[#d4af37]/35 text-[#f3e0aa]'
                  }`}>
                    <Clock className="h-4 w-4" />
                  </div>
                  <h3 className={`font-cinzel font-bold text-sm tracking-[3px] ${isLight ? 'text-[#8A6D2B]' : 'gold-foil-text'}`}>
                    AGENDA DO DIA
                  </h3>
                </div>

                {/* Timeline Content */}
                <div className="relative z-10">
                  <div className={`relative border-l-2 ml-3.5 pl-6 space-y-4 py-1 ${isLight ? 'border-[#b89742]/30' : 'border-[#d4af37]/30'}`}>
                    {schedules.map((sched) => (
                      <div key={sched.id} className="relative group">
                        {/* Node circle on timeline */}
                        <span 
                          className={`absolute -left-[33px] top-3 flex h-4 w-4 items-center justify-center rounded-full border shadow-sm transition-all ${
                            isLight 
                              ? 'border-[#b89742] bg-[#FAF8F5]' 
                              : 'border-[#d4af37] bg-[#121215]'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-[#b89742]' : 'bg-[#d4af37]'}`} />
                        </span>

                        {/* Schedule Item Card with palette identical to "Detalhes" */}
                        <div 
                          className={`p-4 rounded-2xl border transition-all ${
                            isLight 
                              ? 'bg-stone-50 border-stone-200/80 text-stone-800 shadow-sm' 
                              : 'bg-white/5 border-white/10 text-white/90 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${
                              isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'
                            }`}>
                              <Clock className="h-3 w-3" /> {sched.time}
                            </span>
                          </div>
                          <h4 className={`text-sm font-semibold tracking-wide ${isLight ? 'text-stone-900' : 'text-white'}`}>
                            {sched.title}
                          </h4>
                          {sched.location && (
                            <p className={`text-xs flex items-center gap-1.5 mt-1.5 ${isLight ? 'text-stone-600' : 'text-zinc-300'}`}>
                              <MapPin className={`h-3.5 w-3.5 shrink-0 ${isLight ? 'text-[#997328]' : 'text-[#d4af37]'}`} /> 
                              <span>{sched.location}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Custom Info Blocks */}
            {(() => {
              const visibleInfoBlocks = infoBlocks.filter((b) => !b.title.startsWith('__'));
              if (visibleInfoBlocks.length === 0) return null;
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {visibleInfoBlocks.map((block) => (
                    <div 
                      key={block.id} 
                      className={`rounded-3xl border shadow-xl backdrop-blur-md relative overflow-hidden p-6 text-left ${isLight ? 'bg-white border-[#b89742]/30 text-stone-900' : 'bg-[#121215] border-[#d4af37]/25 text-white'}`}
                    >
                      <div className={`absolute inset-3 border rounded-[20px] pointer-events-none ${isLight ? 'border-[#b89742]/10' : 'border-[#d4af37]/10'}`} />
                      <h4 className={`font-cinzel font-bold text-xs tracking-[2px] uppercase border-b pb-2.5 mb-3.5 relative z-10 ${isLight ? 'text-[#8A6D2B] border-[#b89742]/20' : 'text-[#f3e0aa] border-[#d4af37]/15'}`}>
                        {block.title}
                      </h4>
                      <p className={`text-xs leading-relaxed relative z-10 ${isLight ? 'text-stone-700' : 'text-white/90'}`}>
                        {block.content}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Injected collaborative gallery wall children */}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
