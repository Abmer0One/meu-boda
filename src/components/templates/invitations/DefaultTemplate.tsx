'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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
}: TemplateProps) {
  const [isOpen, setIsOpen] = useState(forceOpen ?? false);
  const [showMapsModal, setShowMapsModal] = useState(false);
  
  const isConfirmed = rsvpStatus === 'Confirmed';
  const isDeclined = rsvpStatus === 'Declined';

  // Modal map trigger for public invitation scan
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#mapas') {
      setShowMapsModal(true);
    }
  }, []);

  // Dynamic host initials and names parsing
  const getAnfitriões = () => {
    let cleanTitle = event.title;
    const prefixes = [
      /^(?:O\s+)?Casamento\s+(?:de|do|da|d')\s+/i,
      /^(?:O\s+)?Aniversário\s+(?:de|do|da|d')\s+/i,
      /^(?:O\s+)?Pedido\s+(?:de\s+casamento\s+de|de|do|da)\s+/i,
      /^(?:O\s+)?Chá\s+de\s+panela\s+(?:de|do|da)\s+/i,
      /^(?:O\s+)?Alambamento\s+(?:de|do|da)\s+/i,
      /^(?:A\s+)?Festa\s+(?:de|do|da)\s+/i,
      /^(?:O\s+)?Workshop\s+(?:de|do|da)\s+/i,
      /^(?:A\s+)?Palestra\s+(?:de|do|da)\s+/i
    ];
    for (const prefix of prefixes) {
      cleanTitle = cleanTitle.replace(prefix, '');
    }

    const parts = cleanTitle.split(/(?:e|&|and|\+|\by\b|\/|\\)/i).map(p => p.trim());
    if (parts.length >= 2) {
      return {
        initials: `${parts[0].charAt(0).toUpperCase()} & ${parts[1].charAt(0).toUpperCase()}`,
        names: cleanTitle,
        firstName: parts[0],
        secondName: parts[1],
      };
    }
    const words = cleanTitle.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return {
        initials: `${words[0].charAt(0).toUpperCase()} & ${words[1].charAt(0).toUpperCase()}`,
        names: cleanTitle,
        firstName: words[0],
        secondName: words[1],
      };
    }
    return {
      initials: cleanTitle.charAt(0).toUpperCase(),
      names: cleanTitle,
      firstName: cleanTitle,
      secondName: '',
    };
  };

  const hosts = getAnfitriões();

  // Dynamic Intro and Ending Phrases
  const getPhrases = () => {
    switch (event.type) {
      case 'casamento':
        return {
          intro: 'Com a bênção de Deus e de nossas famílias, convidamo-vos para partilhar connosco este dia.',
          outro: 'A vossa presença tornará o nosso dia ainda mais inesquecível e feliz.',
        };
      case 'aniversario':
        return {
          intro: 'A vida é uma dádiva e celebrá-la ao lado de pessoas queridas é a maior das alegrias.',
          outro: 'Espero por si para partilhar abraços, sorrisos e brindes a este novo ciclo.',
        };
      case 'alambamento':
        return {
          intro: 'Em união com as nossas tradições e as nossas famílias, convidamo-vos para o nosso Alambamento.',
          outro: 'Vem testemunhar o início do nosso compromisso e celebrar o amor familiar.',
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
        monthDayYear: `${monthShort} | ${day} | ${year}`,
        weekdayAtTime: `${weekdayCapitalized} às ${timeDisplay}`,
        time: timeStr,
      };
    } catch (e) {
      return {
        weekday: 'Sexta Feira',
        date: '06 de Novembro de 2026',
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
    const isLight = event.template_config?.print_theme !== 'dark'; // DEFAULT TO LIGHT (ivory) as requested!

    const containerBg = isLight ? 'bg-[#FAF8F5]' : 'bg-[#0c0c0e]';
    const containerText = isLight ? 'text-[#2C2B29]' : 'text-[#f4f4f5]';
    const bgPhoto = event.background_image || event.cover_image;

    // PAGE 1: COVER (Aba da Capa - Horizontal A4)
    if (renderPage === 'cover') {
      return (
        <div className={`w-[1120px] h-[792px] ${containerBg} ${containerText} p-0 flex flex-col justify-between font-sans relative overflow-hidden select-none box-border`}>
          <style jsx global>{`
            @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Ballet:opsz@16..72&family=Cinzel:wght@400;600;700;900&family=Cinzel+Decorative:wght@700;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
            .font-ballet { font-family: 'Ballet', cursive; }
            .font-cinzel { font-family: 'Cinzel', serif; }
            .font-alex { font-family: 'Alex Brush', cursive; }
            .font-playfair { font-family: 'Playfair Display', serif; }
            .font-cinzel-dec { font-family: 'Cinzel Decorative', serif; }
            .gold-foil-text {
              background: linear-gradient(to right, #b89742 0%, #f3e0aa 50%, #b89742 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
          `}</style>

          {/* 3 Panels layout: Left (25%), Center (50%), Right (25%) */}
          <div className="grid grid-cols-[1fr_2fr_1fr] gap-0 h-full items-stretch relative z-10 box-border">
            {/* Aba Esquerda: limpa para dobra */}
            <div className="h-full" />

            {/* Painel Central: Exatamente como na Página 1 do PDF fornecido */}
            <div className="h-full flex flex-col justify-between items-center text-center py-20 px-8 relative">
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                {/* Monograma com a fonte Ballet solicitada */}
                <div className="py-2 select-none overflow-visible leading-normal">
                  <span className="font-ballet text-8xl md:text-9xl text-[#cda344] leading-none block font-normal tracking-wider px-6">
                    {hosts.initials}
                  </span>
                </div>

                {/* CONVITE EXCLUSIVO */}
                <span className="font-cinzel text-sm sm:text-base font-bold tracking-[4px] text-[#cda344] uppercase block mt-3 mb-6">
                  CONVITE EXCLUSIVO
                </span>

                {/* Versículo Bíblico */}
                <div className="max-w-md mx-auto space-y-1.5 my-4 text-center">
                  <p className="font-serif text-xs sm:text-sm text-[#4A4844] leading-relaxed italic">
                    “Assim, permanecem agora estes três: a fé, a esperança e o amor.<br />
                    O maior deles, porém, é o amor.”
                  </p>
                  <p className="font-serif text-xs text-[#6E6B65] mt-1 font-medium">
                    1 Coríntios 13, 13
                  </p>
                </div>
              </div>

              {/* Nosso Casamento */}
              <div className="pb-4">
                <p className="font-alex text-4xl sm:text-5xl text-[#cda344] font-normal tracking-wide">
                  Nosso Casamento
                </p>
              </div>
            </div>

            {/* Aba Direita: limpa para dobra */}
            <div className="h-full" />
          </div>
        </div>
      );
    } else {
      // PAGE 2: INFO (Folha de Informações - Horizontal A4)
      const formatRSVPDeadline = () => {
        if (!event.rsvp_deadline) return '25 de Outubro de 2026';
        try {
          const d = new Date(event.rsvp_deadline);
          return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
          return '25 de Outubro de 2026';
        }
      };

      const defaultSchedules = [
        { id: '1', title: 'Cerimonia Religiosa', time: '16:00', icon: 'church' },
        { id: '2', title: 'Cortejo', time: '18:00', icon: 'procession' },
        { id: '3', title: 'Recepção de Convidados', time: '20:30', icon: 'reception' },
        { id: '4', title: 'Aperitivos', time: '21:30', icon: 'appetizers' },
        { id: '5', title: 'Dança dos Noivos', time: '23:30', icon: 'dance' },
      ];

      const displaySchedules = schedules && schedules.length > 0 
        ? schedules.slice(0, 5).map((s, idx) => ({
            id: s.id,
            title: s.title,
            time: s.time,
            icon: idx === 0 ? 'church' : idx === 1 ? 'procession' : idx === 2 ? 'reception' : idx === 3 ? 'appetizers' : 'dance'
          }))
        : defaultSchedules;

      const getScheduleIcon = (type: string) => {
        switch (type) {
          case 'church':
            return (
              <svg className="w-7 h-7 text-[#cda344] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v3m-2-1.5h4" />
                <path d="M12 5l-4 3v13h8V8l-4-3z" />
                <path d="M4 11l4-3v13H3v-7l1-3z" />
                <path d="M20 11l-4-3v13h5v-7l-1-3z" />
                <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
                <circle cx="12" cy="11" r="1.5" />
              </svg>
            );
          case 'procession':
            return (
              <svg className="w-7 h-7 text-[#cda344] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="5" r="2" />
                <circle cx="15" cy="5" r="2" />
                <path d="M7 21l2-8 2 8" />
                <path d="M13 13l-2 8" />
                <path d="M13 13l4 8" />
                <path d="M15 7l-2 6h4l-2-6z" />
              </svg>
            );
          case 'reception':
            return (
              <svg className="w-7 h-7 text-[#cda344] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3l-3 7a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3L8 3z" />
                <path d="M8 13v7m-3 0h6" />
                <path d="M16 3l-3 7a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3l-3-7z" />
                <path d="M16 13v7m-3 0h6" />
                <path d="M11 6l2-1" />
              </svg>
            );
          case 'appetizers':
            return (
              <svg className="w-7 h-7 text-[#cda344] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8" />
                <circle cx="12" cy="12" r="5" />
                <path d="M2 7v5a2 2 0 0 0 2 2h0v8" />
                <path d="M3 4v4m-2-4v4m4-4v4" />
                <path d="M22 4c0 3-1 6-2 7v11" />
              </svg>
            );
          case 'dance':
          default:
            return (
              <svg className="w-7 h-7 text-[#cda344] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="4" r="1.5" />
                <circle cx="15" cy="4.5" r="1.5" />
                <path d="M8 8l2 5-3 8" />
                <path d="M10 13l2 8" />
                <path d="M14 6l-3 3 3 3-2 9" />
                <path d="M16 9l-2 4 4 8" />
              </svg>
            );
        }
      };

      return (
        <div className={`w-[1120px] h-[792px] ${containerBg} ${containerText} p-0 flex flex-col justify-between font-sans relative overflow-hidden select-none box-border`}>
          <style jsx global>{`
            @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Ballet:opsz@16..72&family=Cinzel:wght@400;600;700;900&family=Cinzel+Decorative:wght@700;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
            .font-ballet { font-family: 'Ballet', cursive; }
            .font-cinzel { font-family: 'Cinzel', serif; }
            .font-alex { font-family: 'Alex Brush', cursive; }
            .font-playfair { font-family: 'Playfair Display', serif; }
            .font-cinzel-dec { font-family: 'Cinzel Decorative', serif; }
            .gold-foil-text {
              background: linear-gradient(to right, #b89742 0%, #f3e0aa 50%, #b89742 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
          `}</style>

          <div className="grid grid-cols-[1fr_2fr_1fr] gap-0 h-full items-stretch relative z-10 box-border">
            {/* ABA ESQUERDA: CRONOGRAMA & CÓDIGO DE LOCALIZAÇÕES */}
            <div className="p-6 flex flex-col justify-between items-center text-center h-full relative">
              {/* Top floral ornament */}
              <div className="w-full flex flex-col items-center">
                <svg className="w-12 h-10 text-[#cda344] mx-auto opacity-90 mb-2" viewBox="0 0 100 80" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M50,40 C35,20 20,35 25,50 C30,65 45,55 50,40 Z" />
                  <path d="M50,40 C65,20 80,35 75,50 C70,65 55,55 50,40 Z" />
                  <circle cx="50" cy="40" r="3" fill="currentColor" />
                  <path d="M50,15 C48,25 52,35 50,40" />
                  <path d="M35,25 C40,28 45,35 50,40" />
                  <path d="M65,25 C60,28 55,35 50,40" />
                </svg>

                {/* Schedule items list */}
                <div className="space-y-4 w-full px-2 mt-1">
                  {displaySchedules.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-0.5 text-left">
                      {getScheduleIcon(item.icon)}
                      <div>
                        <div className="text-[11.5px] font-serif text-[#4A4844] leading-snug">{item.title}</div>
                        <div className="text-xs font-bold text-[#2C2B29] font-sans tracking-tight mt-0.5">{item.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom: Locations QR code */}
              <div className="flex flex-col items-center pb-2">
                {locationsQrCodeUrl ? (
                  <div className="relative p-2.5 inline-block bg-white shadow-sm border border-[#cda344]/25">
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#cda344]" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#cda344]" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#cda344]" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#cda344]" />
                    <img src={locationsQrCodeUrl} alt="Código de Localizações" className="w-28 h-28 object-contain" />
                  </div>
                ) : (
                  <div className="w-28 h-28" />
                )}
                <span className="font-serif text-xs font-bold text-[#cda344] tracking-wider uppercase block mt-2.5">
                  Código de Localizações
                </span>
                <span className="font-serif text-[9px] text-[#555] text-center leading-tight mt-1 max-w-[190px]">
                  Scaneie o código QR para ver a localização pelo Google Maps.
                </span>
              </div>
            </div>

            {/* PAINEL CENTRAL: O CORAÇÃO DO CONVITE */}
            <div className="relative h-full flex flex-col justify-between items-center text-center overflow-hidden p-6">
              {/* Couple Background Photo */}
              {bgPhoto ? (
                <div className="absolute inset-0 z-0 select-none pointer-events-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={bgPhoto} 
                    alt="Background" 
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-[#FAF8F5]/85" />
                </div>
              ) : null}

              <div className="relative z-10 w-full h-full flex flex-col justify-between items-center text-center py-2 px-4">
                {/* Blessing of God and Parents */}
                <div className="w-full space-y-2 pt-2">
                  <p className="font-serif text-xs text-[#6E6B65] tracking-wide">
                    Com a magnifica bênção de Deus e de seus Pais,
                  </p>

                  <div className="w-full max-w-sm mx-auto flex justify-between items-start text-xs font-serif text-[#cda344] px-4 pt-1">
                    <div className="text-left space-y-0.5">
                      <p>Armando Quitamba</p>
                      <p>Maria Quitamba</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p>António da Costa</p>
                      <p>Beatriz da Costa</p>
                    </div>
                  </div>
                </div>

                {/* Hosts names stacked */}
                <div className="flex flex-col items-center justify-center my-1 select-none">
                  <span className="font-alex text-5xl sm:text-6xl text-[#cda344] leading-tight font-normal">
                    {hosts.firstName || 'Abiúd'}
                  </span>
                  <span className="font-alex text-3xl sm:text-4xl text-[#cda344] leading-none my-0.5">
                    &
                  </span>
                  <span className="font-alex text-5xl sm:text-6xl text-[#cda344] leading-tight font-normal">
                    {hosts.secondName || 'Marinela'}
                  </span>
                </div>

                {/* Invitation Line */}
                <p className="font-serif text-xs text-[#555] tracking-wide max-w-sm mx-auto">
                  Temos a honra de convidar-te para o nosso casamento
                </p>

                {/* Date Block */}
                <div className="my-1">
                  <div className="font-playfair text-3xl sm:text-4xl font-bold tracking-widest text-[#2C2B29]">
                    <span>{dateDetails.monthDayYear.split('|')[0]?.trim() || 'NOV'}</span>
                    <span className="text-[#cda344] font-normal mx-2.5">|</span>
                    <span>{dateDetails.monthDayYear.split('|')[1]?.trim() || '06'}</span>
                    <span className="text-[#cda344] font-normal mx-2.5">|</span>
                    <span>{dateDetails.monthDayYear.split('|')[2]?.trim() || '2026'}</span>
                  </div>
                  <p className="font-serif text-xs sm:text-sm text-[#4A4844] mt-1 font-medium">
                    {dateDetails.weekdayAtTime}
                  </p>
                </div>

                {/* Locations */}
                <div className="space-y-1 text-center my-1 max-w-md mx-auto">
                  <p className="font-serif text-xs text-[#cda344] font-medium leading-relaxed">
                    {event.ceremony_location ? `Cerimonia Religiosa no ${event.ceremony_location}` : 'Cerimonia Religiosa no Centro Nossa Senhora da Paz, Golf2'}
                  </p>
                  <p className="font-serif text-xs text-[#cda344] font-medium leading-relaxed">
                    {event.party_location ? `copo d´agua no ${event.party_location}` : 'copo d´agua no Salão de Festas Jailinda, Camama.'}
                  </p>
                </div>

                {/* Bottom: Nosso Casamento */}
                <div className="pb-1">
                  <p className="font-alex text-3xl sm:text-4xl text-[#cda344] font-normal tracking-wide">
                    Nosso Casamento
                  </p>
                </div>
              </div>
            </div>

            {/* ABA DIREITA: RSVP & CÓDIGO DE ACESSO */}
            <div className="p-6 flex flex-col justify-between items-center text-center h-full relative">
              <div className="w-full flex flex-col items-center">
                {/* Top minimalist line-art flower SVG */}
                <svg className="w-20 h-28 mx-auto text-[#cda344]" viewBox="0 0 100 160" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M52,150 C54,120 50,85 53,50" />
                  <path d="M51,105 C42,108 34,103 36,92 C38,82 48,89 52,98" />
                  <path d="M52,80 C62,82 70,76 68,66 C66,58 56,64 53,72" />
                  <path d="M53,50 C44,45 36,32 42,18 C48,4 62,10 58,26 C56,36 53,46 53,50 Z" />
                  <path d="M53,50 C63,46 74,36 71,22 C68,8 54,16 53,28" />
                  <path d="M42,20 C32,15 26,24 32,34 C38,44 48,46 53,50" />
                </svg>

                {/* RSPV Header */}
                <span className="font-cinzel text-base tracking-[4px] text-[#cda344] font-bold block my-3">
                  RSPV
                </span>

                {/* Portaria / Access QR Code */}
                {qrCodeUrl ? (
                  <div className="relative p-2.5 inline-block bg-white shadow-sm border border-[#cda344]/25 mt-1">
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#cda344]" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#cda344]" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#cda344]" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#cda344]" />
                    <img src={qrCodeUrl} alt="Código de Acesso" className="w-28 h-28 object-contain" />
                  </div>
                ) : (
                  <div className="w-28 h-28" />
                )}

                <span className="font-serif text-xs font-bold text-[#cda344] tracking-wider uppercase block mt-2.5">
                  Código de Acesso
                </span>
              </div>

              {/* RSVP confirmation note */}
              <div className="text-center space-y-0.5 pb-2">
                <p className="font-serif text-[10px] text-[#4A4844] leading-tight">
                  Por Favor, confirme a presença
                </p>
                <p className="font-serif text-[10px] text-[#4A4844] leading-tight font-medium">
                  até o dia {formatRSVPDeadline()}
                </p>
              </div>
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
    <div className="min-h-screen bg-[#0d0d0f] text-[#f4f4f5] py-8 px-4 flex flex-col justify-between max-w-6xl mx-auto font-sans relative overflow-hidden select-none">
      
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
      <div className="absolute top-10 left-1/4 w-[350px] h-[350px] bg-[#d4af37]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-[#b89742]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Dynamic Maps Selection Modal for Scanned Locations QR */}
      <AnimatePresence>
        {showMapsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121215] border border-[#d4af37]/30 rounded-3xl p-6 w-full max-w-sm text-center space-y-6 relative"
            >
              <button
                onClick={() => setShowMapsModal(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white text-sm"
              >
                ✕
              </button>
              <h3 className="font-cinzel font-bold text-sm text-[#f3e0aa] tracking-wider border-b border-[#d4af37]/20 pb-3">
                📍 COMO CHEGAR AO EVENTO
              </h3>
              <p className="text-[11px] text-white/70">Escolha o local para o qual deseja obter direções:</p>
              
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
                    className="flex items-center justify-center gap-2 w-full py-3 border border-[#d4af37]/40 hover:bg-[#d4af37]/10 text-white font-bold rounded-xl text-xs uppercase transition-all"
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
            <div className="relative w-full max-w-[420px] aspect-[1/1.4] rounded-[24px] border border-[#d4af37]/20 bg-[#121215] p-8 flex flex-col justify-between items-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
              {/* Outer double border */}
              <div className="absolute inset-4 border border-[#d4af37]/10 rounded-[18px] pointer-events-none" />
              <div className="absolute inset-5 border border-[#d4af37]/5 rounded-[16px] pointer-events-none" />
              
              {/* Gold corners */}
              <div className="absolute top-6 left-6 w-8 h-8 border-t border-l border-[#d4af37]/40" />
              <div className="absolute top-6 right-6 w-8 h-8 border-t border-r border-[#d4af37]/40" />
              <div className="absolute bottom-6 left-6 w-8 h-8 border-b border-l border-[#d4af37]/40" />
              <div className="absolute bottom-6 right-6 w-8 h-8 border-b border-r border-[#d4af37]/40" />

              <div className="text-center space-y-4 z-10 pt-6">
                <span className="text-[10px] font-black uppercase tracking-[5px] text-[#d4af37]">
                  {eventLabels.invitation}
                </span>
                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent mx-auto" />
              </div>

              {/* Envelope Seal Monogram */}
              <div className="relative flex flex-col items-center justify-center z-10 my-4">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                  className="absolute w-32 h-32 border border-dashed border-[#d4af37]/20 rounded-full"
                />
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#16161a] to-[#242429] border border-[#d4af37]/40 flex flex-col items-center justify-center shadow-2xl relative">
                  <span className="text-3xl font-cinzel font-black tracking-widest gold-foil-text">
                    {hosts.initials}
                  </span>
                </div>
              </div>

              <div className="text-center space-y-6 z-10 pb-6 w-full">
                <div className="space-y-1">
                  <h2 className="text-[10px] uppercase font-bold tracking-[3px] text-[#8a8a93]">
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
              <div className="bg-[#121215]/80 border border-[#d4af37]/15 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-xl relative backdrop-blur-md">
                <div className="absolute inset-3 border border-[#d4af37]/5 rounded-[20px] pointer-events-none" />
                
                <div className="space-y-6 relative z-10">
                  <div className="text-center space-y-2 border-b border-[#d4af37]/10 pb-4">
                    <h3 className="font-cinzel font-bold text-sm tracking-[3px] gold-foil-text">
                      DETALHES
                    </h3>
                  </div>

                  <div className="space-y-4 text-xs leading-relaxed text-foreground/80">
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                      <Calendar className="h-4.5 w-4.5 text-[#d4af37] shrink-0" />
                      <div>
                        <h4 className="font-bold text-[9px] uppercase tracking-wider text-[#d4af37]">Data e Hora</h4>
                        <p className="font-semibold text-foreground mt-0.5">
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
                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <MapPin className="h-4.5 w-4.5 text-[#d4af37] shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-bold text-[9px] uppercase tracking-wider text-[#d4af37]">
                            {event.type === 'casamento' ? 'Cerimónia' : 'Local'}
                          </h4>
                          <p className="font-semibold text-foreground mt-0.5">{event.ceremony_location}</p>
                          {event.ceremony_time && (
                            <p className="text-[10px] text-foreground/50">Hora: {event.ceremony_time}</p>
                          )}
                          {getGoogleMapsLink(event.ceremony_location, event.ceremony_maps_url) && (
                            <a
                              href={getGoogleMapsLink(event.ceremony_location, event.ceremony_maps_url)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-[#d4af37] mt-1.5 hover:underline"
                            >
                              <Map className="h-3 w-3" /> Ver no mapa
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {event.party_location && (
                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <MapPin className="h-4.5 w-4.5 text-[#d4af37] shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-bold text-[9px] uppercase tracking-wider text-[#d4af37]">
                            {event.type === 'casamento' ? 'Copo d\'Água' : 'Recepção'}
                          </h4>
                          <p className="font-semibold text-foreground mt-0.5">{event.party_location}</p>
                          {event.party_time && (
                            <p className="text-[10px] text-foreground/50">Hora: {event.party_time}</p>
                          )}
                          {getGoogleMapsLink(event.party_location, event.party_maps_url) && (
                            <a
                              href={getGoogleMapsLink(event.party_location, event.party_maps_url)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-[#d4af37] mt-1.5 hover:underline"
                            >
                              <Map className="h-3 w-3" /> Ver no mapa
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Blocks / Dress code under details */}
                <div className="space-y-4 relative z-10 pt-6">
                  {(event.dress_code_style || event.dress_code_colors) && (
                    <div className="p-3 border border-[#d4af37]/10 bg-white/5 rounded-xl text-xs space-y-1">
                      <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#d4af37]">👗 Dress Code</h4>
                      {event.dress_code_style && <p className="text-foreground/80">{event.dress_code_style}</p>}
                      {event.dress_code_colors && (
                        <p className="text-[10px] text-foreground/50">Sugerido: {event.dress_code_colors}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* CENTER COLUMN: The Acrylic Sheet Main Invitation */}
              <div className="bg-[#121215] border border-[#d4af37]/35 rounded-3xl p-8 md:p-10 flex flex-col justify-between items-center text-center shadow-2xl relative overflow-hidden min-h-[500px]">
                
                {/* Simulated Raw Gold Leaf Torn Edges Border inside the card */}
                <div className="absolute inset-3 border border-dashed border-[#d4af37]/20 rounded-[20px] pointer-events-none" />
                <div className="absolute inset-4 bg-gradient-to-b from-[#b89742]/5 to-[#d4af37]/0 rounded-[18px] pointer-events-none" />

                {/* Monogram header */}
                <div className="space-y-2 relative z-10">
                  <div className="w-14 h-14 rounded-full border border-[#d4af37]/30 flex items-center justify-center mx-auto bg-[#0d0d0f]/60">
                    <span className="text-xs font-cinzel font-bold tracking-widest text-[#d4af37]">
                      {hosts.initials}
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[4px] text-white/40 block mt-2">
                    {eventLabels.invitation}
                  </span>
                </div>

                {/* Hosts / Main Text */}
                <div className="space-y-6 relative z-10 py-6 my-auto">
                  <h1 className="text-3xl md:text-5xl font-alex tracking-wide text-foreground px-2 py-1 leading-tight gold-foil-text font-medium">
                    {event.title}
                  </h1>

                  <p className="text-xs font-playfair italic max-w-sm mx-auto leading-relaxed text-foreground/75 px-4">
                    {phrases.intro}
                  </p>
                  
                  {event.description && (
                    <p className="text-[11px] font-playfair italic text-[#f3e0aa]/75 mt-4">
                      &quot;{event.description}&quot;
                    </p>
                  )}
                </div>

                {/* Footer Monogram Date */}
                <div className="space-y-1 relative z-10 w-full pt-4 border-t border-[#d4af37]/10">
                  <p className="text-[10px] font-cinzel tracking-[3px] text-[#d4af37] uppercase">
                    {new Date(event.date).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN: Ticket access & RSVP Panel */}
              <div className="bg-[#121215]/80 border border-[#d4af37]/15 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-xl relative backdrop-blur-md">
                <div className="absolute inset-3 border border-[#d4af37]/5 rounded-[20px] pointer-events-none" />
                
                <div className="space-y-6 relative z-10">
                  <div className="text-center space-y-2 border-b border-[#d4af37]/10 pb-4">
                    <h3 className="font-cinzel font-bold text-sm tracking-[3px] gold-foil-text">
                      RSVP / PASSE
                    </h3>
                  </div>

                  {/* Access QR Ticket */}
                  {isConfirmed && qrCodeUrl ? (
                    <div className="bg-white/5 border border-[#d4af37]/10 rounded-2xl p-4 flex flex-col items-center gap-3.5 relative overflow-hidden">
                      {/* Ticket header label */}
                      <span className="text-[8px] font-black tracking-[3px] text-[#d4af37] uppercase">PASSE DIGITAL INDIVIDUAL</span>
                      
                      <div className="bg-white p-2.5 rounded-xl border-2 border-[#d4af37]/20 shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCodeUrl} alt="Acesso QR" className="w-32 h-32 object-contain" />
                      </div>

                      <div className="text-center space-y-1 text-xs">
                        <p className="font-bold text-foreground">{guest.name}</p>
                        <p className="text-[10.5px] text-[#f3e0aa]">
                          {table ? `Mesa: ${table.name}` : 'Mesa: Confirmada'}
                        </p>
                      </div>

                      <Button
                        onClick={handleDownloadInvite}
                        disabled={downloading}
                        className="w-full justify-center rounded-xl border border-[#d4af37]/30 text-[#d4af37] bg-transparent hover:bg-[#d4af37]/5 font-bold py-2 text-xs tracking-wider uppercase transition-colors"
                        leftIcon={downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      >
                        Baixar PDF
                      </Button>
                    </div>
                  ) : (
                    /* RSVP selection buttons */
                    <div className="space-y-4">
                      <p className="text-xs text-center text-foreground/70 px-2">
                        Olá <span className="font-bold text-[#d4af37]">{guest.name}</span>, confirme a sua presença no evento abaixo:
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleRSVPSubmit('Confirmed')}
                          disabled={saving}
                          className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer active:scale-95 transition-all gap-1 ${
                            isConfirmed
                              ? 'border-success bg-success/15 text-success'
                              : 'border-[#d4af37]/10 hover:bg-white/5 text-[#f4f4f5]/60'
                          }`}
                        >
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-[10px] font-bold">Vou</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRSVPSubmit('Declined')}
                          disabled={saving}
                          className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer active:scale-95 transition-all gap-1 ${
                            isDeclined
                              ? 'border-error bg-error/15 text-error'
                              : 'border-[#d4af37]/10 hover:bg-white/5 text-[#f4f4f5]/60'
                          }`}
                        >
                          <XCircle className="h-5 w-5" />
                          <span className="text-[10px] font-bold">Não vou</span>
                        </button>
                      </div>

                      {/* Extra food restriction note input */}
                      {isConfirmed && (
                        <div className="flex flex-col gap-1 pt-1">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wide">Observações / Restrições</label>
                          <textarea
                            rows={2}
                            placeholder="Vegetariano, alergias..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[#0d0d0f] px-3.5 py-1.5 text-xs focus:border-[#d4af37] focus:outline-none transition-all text-foreground"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-center pt-4 border-t border-[#d4af37]/10 relative z-10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="text-[10px] text-white/40 hover:text-foreground border-white/5 hover:border-[#d4af37]/30 rounded-full"
                  >
                    Voltar à Capa
                  </Button>
                </div>
              </div>

            </div>

            {/* Timelines and Schedules below panels */}
            {schedules.length > 0 && (
              <Card className="bg-[#121215]/80 border border-[#d4af37]/15 shadow-xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute inset-3 border border-[#d4af37]/5 rounded-[20px] pointer-events-none" />
                <CardHeader className="border-b border-[#d4af37]/10 relative z-10">
                  <CardTitle className="flex items-center gap-2 font-cinzel font-bold text-sm tracking-[3px] gold-foil-text">
                    <Clock className="h-4.5 w-4.5 text-[#d4af37]" /> AGENDA DO DIA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 py-6 relative z-10">
                  <div className="relative border-l-2 border-[#d4af37]/30 ml-3 pl-6 space-y-5 py-2">
                    {schedules.map((sched) => (
                      <div key={sched.id} className="relative">
                        <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#d4af37] bg-[#0d0d0f]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
                        </span>
                        <div className="space-y-1 text-left">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#d4af37] uppercase tracking-wider">
                            <Clock className="h-3 w-3" /> {sched.time}
                          </span>
                          <h4 className="text-sm font-semibold text-foreground">{sched.title}</h4>
                          {sched.location && (
                            <span className="text-xs text-foreground/60 flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 opacity-70" /> {sched.location}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Info Blocks */}
            {infoBlocks.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {infoBlocks.map((block) => (
                  <Card key={block.id} className="bg-[#121215]/80 border border-[#d4af37]/15 shadow-xl backdrop-blur-md relative overflow-hidden">
                    <div className="absolute inset-3 border border-[#d4af37]/5 rounded-[20px] pointer-events-none" />
                    <CardHeader className="border-b border-[#d4af37]/10 relative z-10">
                      <CardTitle className="font-cinzel font-bold text-xs tracking-[2px] text-[#d4af37]">{block.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-4 text-xs text-foreground/80 leading-relaxed text-left relative z-10">
                      {block.content}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Injected collaborative gallery wall children */}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
