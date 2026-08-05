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
    // splits by e, &, +, and, /, \
    const parts = event.title.split(/(?:e|&|and|\+|\by\b|\/|\\)/i).map(p => p.trim());
    if (parts.length >= 2) {
      return {
        initials: `${parts[0].charAt(0).toUpperCase()} & ${parts[1].charAt(0).toUpperCase()}`,
        names: `${parts[0]} & ${parts[1]}`,
      };
    }
    return {
      initials: event.title.substring(0, 2).toUpperCase(),
      names: event.title,
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
      const dayMonthYear = d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
      // Capitalize weekday
      const weekdayCapitalized = weekdayStr.charAt(0).toUpperCase() + weekdayStr.slice(1);
      
      const timeStr = event.party_time || d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      return {
        weekday: weekdayCapitalized,
        date: dayMonthYear,
        time: timeStr,
      };
    } catch (e) {
      return {
        weekday: 'Sábado',
        date: '18 de Junho de 2026',
        time: '15:00',
      };
    }
  };

  const dateDetails = getFormattedDate();

  /* =========================================================================
     PDF PRINT MODE LAYOUTS (Landscape A4: 1120x792)
     ========================================================================= */
  if (isPrinting) {
    if (renderPage === 'cover') {
      /* ---------------------------------------------------------------------
         COVER PAGE: Foldable outer sheets (Left: Photo, Center: Brand, Right: Front Names)
         --------------------------------------------------------------------- */
      return (
        <div className="w-[1120px] h-[792px] bg-[#0c0c0e] text-[#f4f4f5] p-8 flex flex-col justify-between font-sans relative overflow-hidden select-none box-border border-[6px] border-[#d4af37]/35 rounded-[32px]">
          {/* Google Fonts and CSS styles */}
          <style jsx global>{`
            @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@400;600;700;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
            .font-cinzel { font-family: 'Cinzel', serif; }
            .font-alex { font-family: 'Alex Brush', cursive; }
            .font-playfair { font-family: 'Playfair Display', serif; }
            .gold-foil-text {
              background: linear-gradient(to right, #b89742 0%, #f3e0aa 50%, #b89742 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
          `}</style>
          
          <div className="absolute inset-3 border border-[#d4af37]/20 rounded-[22px] pointer-events-none" />

          {/* Grid Layout: Left: 25%, Center: 50%, Right: 25% */}
          <div className="grid grid-cols-[1fr_2fr_1fr] gap-10 h-full items-stretch relative z-10 box-border">
            
            {/* LEFT COLUMN: Couple Photo (25%) */}
            <div className="bg-[#121215] border border-[#d4af37]/20 rounded-3xl p-4 flex flex-col items-center justify-center shadow-xl relative overflow-hidden h-full">
              {event.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={event.cover_image} 
                  alt="Couple" 
                  className="w-full h-full object-cover rounded-2xl border border-[#d4af37]/30"
                />
              ) : (
                <div className="w-full h-full rounded-2xl border border-dashed border-[#d4af37]/25 flex flex-col items-center justify-center bg-white/5 text-center p-6 my-auto">
                  <span className="text-5xl">📸</span>
                  <span className="text-xs font-bold text-[#d4af37] uppercase tracking-wider mt-4">Sua Foto Aqui</span>
                  <span className="text-[9px] text-white/55 mt-2">Carregue no painel do evento</span>
                </div>
              )}
            </div>

            {/* CENTER COLUMN: Back Cover / App Reference (50%) */}
            <div className="bg-[#121215] border border-[#d4af37]/45 rounded-3xl p-10 flex flex-col justify-between items-center text-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-4 border border-dashed border-[#d4af37]/25 rounded-[22px] pointer-events-none" />
              <div className="absolute inset-5 bg-gradient-to-b from-[#b89742]/5 to-[#d4af37]/0 rounded-[20px] pointer-events-none" />

              <div className="my-auto space-y-8 py-8">
                <div className="w-32 h-32 rounded-full border-2 border-[#d4af37]/35 flex items-center justify-center mx-auto bg-[#0d0d0f]/80 shadow-2xl">
                  <span className="text-4xl font-cinzel font-black tracking-widest text-[#f3e0aa]">
                    {hosts.initials}
                  </span>
                </div>
                <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent mx-auto" />
                <span className="text-xs font-black uppercase tracking-[8px] text-white/50 block">
                  CONVITE DIGITAL EXCLUSIVO
                </span>
              </div>

              {/* Small application reference text */}
              <div className="text-center pb-4 z-10">
                <p className="text-xs font-mono tracking-widest text-white/45 uppercase">
                  Desenvolvido com carinho através da aplicação www.meuboda.com
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Front Cover Names (25%) */}
            <div className="bg-[#121215] border border-[#d4af37]/25 rounded-3xl p-8 flex flex-col justify-between shadow-xl relative">
              <div className="absolute inset-3 border border-[#d4af37]/10 rounded-[20px] pointer-events-none" />
              
              <div className="flex-1 flex flex-col justify-around items-center text-center py-10">
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[6px] text-[#d4af37]">CONVITE</span>
                  <div className="h-[1px] w-12 bg-[#d4af37]/40 mx-auto mt-2.5" />
                </div>

                <div className="space-y-6 my-auto">
                  <h1 className="text-5xl font-alex leading-tight gold-foil-text font-black py-2">
                    {hosts.names}
                  </h1>
                  <span className="text-xs font-black tracking-[3px] text-white/60 uppercase block">
                    {event.type === 'casamento' ? 'CASAMENTO' : event.type === 'aniversario' ? 'ANIVERSÁRIO' : 'PEDIDO'}
                  </span>
                </div>

                <div className="space-y-2 w-full">
                  <span className="text-xs font-cinzel tracking-[3px] text-[#f3e0aa] font-black block">
                    {new Date(event.date).toLocaleDateString('pt-PT', { year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      );
    } else {
      /* ---------------------------------------------------------------------
         INFORMATION PAGE: Trifold inside sheets (Left: Manual + Locations QR, Center: Invitation, Right: Access QR + Agenda)
         --------------------------------------------------------------------- */
      return (
        <div className="w-[1120px] h-[792px] bg-[#0c0c0e] text-[#f4f4f5] p-8 flex flex-col justify-between font-sans relative overflow-hidden select-none box-border border-[6px] border-[#d4af37]/35 rounded-[32px]">
          {/* Google Fonts and CSS styles */}
          <style jsx global>{`
            @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@400;600;700;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
            .font-cinzel { font-family: 'Cinzel', serif; }
            .font-alex { font-family: 'Alex Brush', cursive; }
            .font-playfair { font-family: 'Playfair Display', serif; }
            .gold-foil-text {
              background: linear-gradient(to right, #b89742 0%, #f3e0aa 50%, #b89742 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
          `}</style>
          
          <div className="absolute inset-3 border border-[#d4af37]/20 rounded-[22px] pointer-events-none" />

          {/* Grid Layout: Left: 25%, Center: 50%, Right: 25% */}
          <div className="grid grid-cols-[1fr_2fr_1fr] gap-10 h-full items-stretch relative z-10 box-border">
            
            {/* LEFT COLUMN: Guest Manual, Extra Info, Locations QR Code */}
            <div className="bg-[#121215] border border-[#d4af37]/20 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative">
              <div className="absolute inset-3 border border-[#d4af37]/5 rounded-[20px] pointer-events-none" />
              
              <div className="space-y-6 relative z-10 flex-1 flex flex-col justify-between h-full">
                <div className="text-center border-b border-[#d4af37]/15 pb-2.5">
                  <h3 className="font-cinzel font-black text-xs tracking-[3px] text-[#f3e0aa]">
                    MANUAL DO CONVIDADO
                  </h3>
                </div>

                {/* Important guidelines / Gift suggestions */}
                <div className="space-y-4 text-xs leading-relaxed flex-1 py-4 flex flex-col justify-center">
                  {(event.dress_code_style || event.dress_code_colors) && (
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#d4af37]">👗 Dress Code</h4>
                      <p className="text-white font-semibold">{event.dress_code_style || 'Esporte Fino / Social'}</p>
                      {event.dress_code_colors && (
                        <p className="text-[10px] text-white/60">Paleta sugerida: {event.dress_code_colors}</p>
                      )}
                    </div>
                  )}

                  {event.gift_suggestions && (
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#d4af37]">🎁 Sugestão de Presentes</h4>
                      <p className="text-white font-semibold line-clamp-3">{event.gift_suggestions}</p>
                    </div>
                  )}

                  {event.kids_restriction_note && (
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#d4af37]">👶 Restrição de Crianças</h4>
                      <p className="text-white font-semibold">{event.kids_restriction_note}</p>
                    </div>
                  )}

                  {event.rsvp_deadline && (
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#d4af37]">📅 Limite de Confirmação</h4>
                      <p className="text-white font-semibold">Até dia {new Date(event.rsvp_deadline).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                  )}
                </div>

                {/* Locations multi-redirect QR Code */}
                {locationsQrCodeUrl ? (
                  <div className="bg-white/5 border border-[#d4af37]/15 rounded-2xl p-4 flex flex-col items-center gap-2.5 relative overflow-hidden">
                    <span className="text-[9px] font-black tracking-[2px] text-[#d4af37] uppercase">MAPAS E LOCALIZAÇÕES</span>
                    
                    <div className="bg-white p-2 rounded-xl border border-[#d4af37]/35 shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={locationsQrCodeUrl} alt="Locais QR" className="w-28 h-28 object-contain" />
                    </div>
                    <span className="text-[8.5px] text-white/70 font-bold uppercase text-center leading-tight">SCAN PARA VER NO MAPA</span>
                  </div>
                ) : (
                  <div className="h-28" />
                )}
              </div>
            </div>

            {/* CENTER COLUMN: The Invitation Core card */}
            <div className="bg-[#121215] border border-[#d4af37]/45 rounded-3xl p-10 flex flex-col justify-around items-center text-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-4 border border-dashed border-[#d4af37]/25 rounded-[22px] pointer-events-none" />
              <div className="absolute inset-5 bg-gradient-to-b from-[#b89742]/5 to-[#d4af37]/0 rounded-[20px] pointer-events-none" />

              {/* Initials */}
              <div className="space-y-1 relative z-10 pt-4">
                <div className="w-20 h-20 rounded-full border-2 border-[#d4af37]/45 flex items-center justify-center mx-auto bg-[#0d0d0f]/80 shadow-lg">
                  <span className="text-2xl font-cinzel font-black tracking-widest text-[#f3e0aa]">
                    {hosts.initials}
                  </span>
                </div>
              </div>

              {/* Names and Phrase */}
              <div className="space-y-6 relative z-10 py-4 my-auto w-full">
                <h1 className="text-5xl md:text-6xl font-alex tracking-wide text-white leading-tight gold-foil-text font-black px-2 py-1">
                  {hosts.names}
                </h1>

                <p className="text-sm font-playfair italic max-w-sm mx-auto leading-relaxed text-white font-semibold">
                  {phrases.intro}
                </p>
                
                {/* Date copo d'agua & Weekday */}
                <div className="border-y-2 border-[#d4af37]/20 py-4 my-6 text-center space-y-1 bg-white/5 rounded-2xl px-8 w-full max-w-md mx-auto">
                  <span className="text-xs font-cinzel tracking-[4px] text-[#d4af37] font-black uppercase block">
                    {dateDetails.weekday}
                  </span>
                  <span className="text-xl font-playfair text-white font-black block mt-1">
                    {dateDetails.date}
                  </span>
                  <span className="text-xs font-cinzel text-white/70 block mt-1">
                    Salão / Recepção às {dateDetails.time}
                  </span>
                </div>

                <p className="text-xs font-playfair italic text-[#f3e0aa] font-bold">
                  &quot;{phrases.outro}&quot;
                </p>
              </div>

              <div className="h-4" />
            </div>

            {/* RIGHT COLUMN: Check-in / Gatekeeper QR Code & Agenda */}
            <div className="bg-[#121215] border border-[#d4af37]/25 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative">
              <div className="absolute inset-3 border border-[#d4af37]/5 rounded-[20px] pointer-events-none" />
              
              <div className="space-y-6 relative z-10 flex-1 flex flex-col justify-between h-full">
                <div className="text-center border-b border-[#d4af37]/15 pb-2.5">
                  <h3 className="font-cinzel font-black text-xs tracking-[3px] text-[#f3e0aa]">
                    AGENDA DO DIA
                  </h3>
                </div>

                {/* Vertical compact agenda */}
                <div className="space-y-4 max-h-[220px] overflow-hidden flex-1 py-4 flex flex-col justify-center">
                  {schedules.length > 0 ? (
                    schedules.slice(0, 5).map((sched) => (
                      <div key={sched.id} className="flex items-center gap-2.5 text-xs font-semibold">
                        <span className="text-[#d4af37] font-black tracking-tighter shrink-0">{sched.time}</span>
                        <span className="text-white/40 font-bold shrink-0">|</span>
                        <span className="text-white truncate font-bold">{sched.title}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-white/50 italic font-medium">
                      Agenda será exibida no convite.
                    </div>
                  )}
                </div>

                {/* Access check-in QR Code */}
                {qrCodeUrl ? (
                  <div className="bg-white/5 border border-[#d4af37]/15 rounded-2xl p-4 flex flex-col items-center gap-2.5 relative overflow-hidden">
                    <span className="text-[9px] font-black tracking-[2px] text-[#d4af37] uppercase">CHECK-IN / PORTARIA</span>
                    
                    <div className="bg-white p-2 rounded-xl border border-[#d4af37]/35 shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeUrl} alt="Acesso QR" className="w-28 h-28 object-contain" />
                    </div>
                    <span className="text-[10px] text-white font-bold uppercase truncate max-w-full leading-none">{guest.name}</span>
                  </div>
                ) : (
                  <div className="h-28" />
                )}
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
