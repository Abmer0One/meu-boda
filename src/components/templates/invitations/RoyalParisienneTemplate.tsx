'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Heart,
  Calendar,
  MapPin,
  Palette,
  Users,
  Utensils,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Clock,
  MailOpen,
} from 'lucide-react';
import { TemplateProps } from './DefaultTemplate';

export default function RoyalParisienneTemplate({
  guest,
  event,
  table,
  qrCodeUrl,
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
}: TemplateProps) {
  const [isOpen, setIsOpen] = useState(forceOpen ?? false);
  const isConfirmed = rsvpStatus === 'Confirmed';
  const isDeclined = rsvpStatus === 'Declined';

  // Get initials for the envelope seal (e.g. M & A)
  const getInitials = (title: string) => {
    const parts = title.split(/(?:e|&|and|\+)/i).map(p => p.trim());
    if (parts.length >= 2) {
      return `${parts[0].charAt(0).toUpperCase()} & ${parts[1].charAt(0).toUpperCase()}`;
    }
    return title.substring(0, 3).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] py-8 px-4 flex flex-col justify-between max-w-5xl mx-auto font-sans relative overflow-hidden select-none">
      
      {/* Background ambient gold lights */}
      <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-[#c084fc]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-[#d4af37]/5 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* Tri-fold Envelope Wrapper (Capa) */
          <motion.div
            key="envelope"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="flex-1 flex items-center justify-center py-12"
          >
            <div className="relative w-full max-w-md aspect-[3/4] rounded-2xl border border-[#d4af37]/30 bg-[#121214] p-8 flex flex-col justify-between items-center shadow-2xl overflow-hidden group">
              {/* Outer borders and luxury lines */}
              <div className="absolute inset-4 border border-[#d4af37]/20 rounded-xl pointer-events-none" />
              <div className="absolute inset-5 border border-[#d4af37]/10 rounded-lg pointer-events-none" />
              
              {/* Gold corners */}
              <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-[#d4af37]/60" />
              <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-[#d4af37]/60" />
              <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-[#d4af37]/60" />
              <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-[#d4af37]/60" />

              <div className="text-center space-y-3 z-10 pt-8">
                <span className="text-[10px] font-black uppercase tracking-[4px] text-[#d4af37]">
                  {eventLabels.invitation}
                </span>
                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent mx-auto" />
              </div>

              {/* Envelope Seal (Medallion) */}
              <div className="relative flex flex-col items-center justify-center z-10">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                  className="absolute w-28 h-28 border border-dashed border-[#d4af37]/40 rounded-full"
                />
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#1a1a1f] to-[#27272a] border-2 border-[#d4af37] flex items-center justify-center shadow-2xl relative">
                  <span className="text-xl font-serif font-extrabold tracking-widest bg-gradient-to-r from-[#b89742] via-[#f3e0aa] to-[#b89742] bg-clip-text text-transparent">
                    {getInitials(event.title)}
                  </span>
                </div>
              </div>

              <div className="text-center space-y-6 z-10 pb-8 w-full">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold tracking-wide text-foreground/80">
                    Convidado de Honra:
                  </h2>
                  <p className="text-base font-bold text-[#d4af37] font-serif">
                    {guest.name}
                  </p>
                </div>

                <Button
                  onClick={() => setIsOpen(true)}
                  className="w-full justify-center rounded-full bg-gradient-to-r from-[#b89742] to-[#d4af37] text-[#09090b] font-bold text-xs py-3.5 tracking-wider uppercase border border-[#f3e0aa]/20 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                  leftIcon={<MailOpen className="h-4 w-4" />}
                >
                  Abrir Convite Virtual
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Opened Tri-fold Content (Ficha do Convite Aberto) */
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="space-y-8"
          >
            {/* Header / Cover Art styled block */}
            <div className="relative rounded-2xl border border-[#d4af37]/20 bg-[#121214] p-8 md:p-12 text-center shadow-xl overflow-hidden group">
              <div className="absolute inset-0 z-0 opacity-15 mix-blend-overlay bg-cover bg-center" style={{ backgroundImage: event.cover_image ? `url('${event.cover_image}')` : 'none' }} />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]" />

              <div className="relative z-10 space-y-4">
                <Badge className="bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30 uppercase tracking-widest text-[9px] px-3.5 py-1">
                  {eventLabels.invitation}
                </Badge>
                
                <h1 className="text-3xl md:text-5xl font-serif font-black tracking-wide bg-gradient-to-r from-[#b89742] via-[#f3e0aa] to-[#b89742] bg-clip-text text-transparent py-2">
                  {event.title}
                </h1>
                
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent mx-auto my-4" />
                
                <p className="text-sm tracking-[2px] uppercase text-[#f3e0aa]">
                  {new Date(event.date).toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Details */}
              <div className="md:col-span-7 space-y-6">
                
                {/* Details Card */}
                <Card className="bg-[#121214] border border-[#d4af37]/15">
                  <CardHeader className="border-b border-[#d4af37]/10">
                    <CardTitle className="bg-gradient-to-r from-[#b89742] via-[#f3e0aa] to-[#b89742] bg-clip-text text-transparent font-serif tracking-wide text-lg">
                      {eventLabels.details}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 py-6 text-sm text-[#f4f4f5]/80">
                    {event.description && (
                      <p className="italic text-center text-[#f3e0aa]/70 my-2 font-serif text-base">&quot;{event.description}&quot;</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 p-4 border border-[#d4af37]/10 rounded-xl bg-[#18181b]/60">
                        <Calendar className="h-5 w-5 text-[#d4af37] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-xs text-[#d4af37]/60 uppercase tracking-wider">Data e Hora</h4>
                          <p className="font-semibold text-xs mt-1 text-foreground">
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

                      {event.theme && (
                        <div className="flex items-start gap-3 p-4 border border-[#d4af37]/10 rounded-xl bg-[#18181b]/60">
                          <Palette className="h-5 w-5 text-[#d4af37] shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-xs text-[#d4af37]/60 uppercase tracking-wider">{eventLabels.theme}</h4>
                            <p className="font-semibold text-xs mt-1 text-foreground">{event.theme}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {event.ceremony_location && (
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 border border-[#d4af37]/10 rounded-xl bg-[#18181b]/60">
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-[#d4af37] shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-bold text-xs text-[#d4af37]/60 uppercase tracking-wider">Local / Espaço</h4>
                              <p className="font-semibold text-xs mt-1 text-foreground">{event.ceremony_location}</p>
                              {event.ceremony_time && (
                                <p className="text-xs text-foreground/60 mt-0.5 font-medium">Hora: {event.ceremony_time}</p>
                              )}
                            </div>
                          </div>
                          {getGoogleMapsLink(event.ceremony_location, event.ceremony_maps_url) && (
                            <a
                              href={getGoogleMapsLink(event.ceremony_location, event.ceremony_maps_url)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 sm:self-center"
                            >
                              <Button variant="outline" size="sm" className="text-xs py-1 px-3 border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10">
                                Como Chegar
                              </Button>
                            </a>
                          )}
                        </div>
                      )}

                      {event.party_location && (
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 border border-[#d4af37]/10 rounded-xl bg-[#18181b]/60">
                          <div className="flex items-start gap-3">
                            <Utensils className="h-5 w-5 text-[#d4af37] shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-bold text-xs text-[#d4af37]/60 uppercase tracking-wider">Recepção / Banquete</h4>
                              <p className="font-semibold text-xs mt-1 text-foreground">{event.party_location}</p>
                              {event.party_time && (
                                <p className="text-xs text-foreground/60 mt-0.5 font-medium">Hora: {event.party_time}</p>
                              )}
                            </div>
                          </div>
                          {getGoogleMapsLink(event.party_location, event.party_maps_url) && (
                            <a
                              href={getGoogleMapsLink(event.party_location, event.party_maps_url)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 sm:self-center"
                            >
                              <Button variant="outline" size="sm" className="text-xs py-1 px-3 border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10">
                                Como Chegar
                              </Button>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline Card */}
                {schedules.length > 0 && (
                  <Card className="bg-[#121214] border border-[#d4af37]/15">
                    <CardHeader className="border-b border-[#d4af37]/10">
                      <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-[#b89742] via-[#f3e0aa] to-[#b89742] bg-clip-text text-transparent font-serif tracking-wide text-lg">
                        <Clock className="h-5 w-5 text-[#d4af37]" /> Agenda do Dia
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 py-6">
                      <div className="relative border-l-2 border-[#d4af37]/30 ml-3 pl-6 space-y-5 py-2">
                        {schedules.map((sched) => (
                          <div key={sched.id} className="relative">
                            <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#d4af37] bg-[#09090b]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
                            </span>
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#d4af37] uppercase tracking-wider">
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

                {/* RSVP confirmation forms */}
                <Card className="bg-[#121214] border border-[#d4af37]/15">
                  <CardHeader className="border-b border-[#d4af37]/10">
                    <CardTitle className="bg-gradient-to-r from-[#b89742] via-[#f3e0aa] to-[#b89742] bg-clip-text text-transparent font-serif tracking-wide text-lg">
                      Confirmar Presença (RSVP)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 py-6">
                    <div className="text-center py-2">
                      <p className="text-xs text-foreground/75">
                        Olá <span className="font-bold text-[#d4af37]">{guest.name}</span>, por favor informe-nos se poderá comparecer ao nosso {eventLabels.title.toLowerCase()}.
                      </p>
                      {event.rsvp_deadline && (
                        <p className="text-[11px] text-[#d4af37] font-semibold mt-1.5">
                          ⏰ Confirmação requerida até ao dia{' '}
                          <span className="font-bold">
                            {new Date(event.rsvp_deadline + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => handleRSVPSubmit('Confirmed')}
                        disabled={saving}
                        className={`flex flex-col items-center justify-center p-4 border rounded-2xl cursor-pointer active:scale-[0.98] transition-all gap-1.5 ${
                          isConfirmed
                            ? 'border-success bg-success/10 text-success'
                            : 'border-[#d4af37]/10 hover:bg-[#18181b] text-[#f4f4f5]/70'
                        }`}
                      >
                        <CheckCircle className="h-6 w-6" />
                        <span className="text-xs font-bold">Vou Comparecer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRSVPSubmit('Declined')}
                        disabled={saving}
                        className={`flex flex-col items-center justify-center p-4 border rounded-2xl cursor-pointer active:scale-[0.98] transition-all gap-1.5 ${
                          isDeclined
                            ? 'border-error bg-error/10 text-error'
                            : 'border-[#d4af37]/10 hover:bg-[#18181b] text-[#f4f4f5]/70'
                        }`}
                      >
                        <XCircle className="h-6 w-6" />
                        <span className="text-xs font-bold">Não poderei ir</span>
                      </button>
                    </div>

                    {isConfirmed && (
                      <div className="space-y-4 pt-2">
                        {guest.companions > 0 && (
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-foreground/75 tracking-wide flex items-center gap-1">
                              <Users className="h-4 w-4 text-[#d4af37]" /> Acompanhantes Extra
                            </label>
                            <div className="rounded-xl border border-[#d4af37]/10 bg-[#18181b] px-3.5 py-2.5 text-sm font-semibold text-foreground">
                              {guest.companions} {guest.companions === 1 ? 'acompanhante autorizado' : 'acompanhantes autorizados'}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-foreground/75 tracking-wide">
                            Alergias ou Restrições Alimentares
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Vegetariano, alergia a frutos secos..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full rounded-xl border border-[#d4af37]/10 bg-[#09090b] px-3.5 py-2 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 transition-all text-foreground"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: QR and Seating */}
              <div className="md:col-span-5 space-y-6">
                
                {/* Seating Table */}
                {table && isConfirmed && (
                  <Card className="bg-[#121214] border border-success/35">
                    <CardContent className="flex items-center gap-3 py-3">
                      <div className="rounded-xl bg-success/15 p-2 text-success shrink-0">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-foreground/50 uppercase tracking-wide">Sua Mesa</h4>
                        <p className="text-sm font-semibold">{table.name}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* QR Code and Ticket details */}
                {isConfirmed && qrCodeUrl && (
                  <Card className="bg-[#121214] border border-[#d4af37]/20 shadow-2xl overflow-hidden p-0">
                    <div className="bg-gradient-to-r from-[#b89742] to-[#d4af37] px-4 py-3 text-[#09090b] text-center">
                      <span className="text-[10px] font-black tracking-[3px] uppercase opacity-90">Passe de Acesso Digital</span>
                      <h3 className="font-serif font-extrabold text-sm truncate mt-0.5">{event.title}</h3>
                    </div>

                    <CardContent className="p-5 space-y-4 flex flex-col items-center">
                      {/* Ticket Info */}
                      <div className="w-full bg-[#18181b] rounded-xl p-4 text-left space-y-2 border border-[#d4af37]/10">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#f4f4f5]/50">Titular:</span>
                          <span className="font-bold text-foreground">{guest.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#f4f4f5]/50">Mesa / Lugar:</span>
                          <span className="font-bold text-[#d4af37]">{table ? table.name : 'Pendente'}</span>
                        </div>
                        {guest.companions > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#f4f4f5]/50">Acompanhantes:</span>
                            <span className="font-bold text-foreground">+{guest.companions}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-xs border-t border-[#d4af37]/10 pt-2.5 mt-1">
                          <span className="text-[#f4f4f5]/50">Data do Evento:</span>
                          <span className="font-semibold text-foreground">
                            {new Date(event.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Dotted Picot line */}
                      <div className="w-full flex items-center justify-between my-2">
                        <div className="-ml-6 w-3 h-6 bg-[#09090b] rounded-r-full border-r border-y border-[#d4af37]/20 shrink-0"></div>
                        <div className="flex-1 border-b border-dashed border-[#d4af37]/30 mx-2"></div>
                        <div className="-mr-6 w-3 h-6 bg-[#09090b] rounded-l-full border-l border-y border-[#d4af37]/20 shrink-0"></div>
                      </div>

                      {/* QR image */}
                      <div className="border-4 border-[#d4af37]/20 rounded-2xl p-3 bg-white inline-block shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCodeUrl} alt="QR Code Checkin" className="h-40 w-40 object-contain" />
                      </div>

                      <div className="space-y-1 text-center">
                        <p className="text-xs font-semibold text-foreground">Apresente este código na entrada.</p>
                        <p className="text-[10px] text-foreground/40 max-w-[220px] mx-auto leading-normal">
                          Descarregue o PDF de alta resolução no botão abaixo para impressão ou suporte offline.
                        </p>
                      </div>

                      <Button
                        onClick={handleDownloadInvite}
                        disabled={downloading}
                        className="w-full justify-center mt-2 rounded-full border border-[#d4af37]/30 text-[#d4af37] bg-transparent hover:bg-[#d4af37]/5 font-bold py-2.5 text-xs tracking-wide uppercase transition-colors"
                        leftIcon={downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      >
                        Descarregar Convite PDF
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Informações Importantes Card */}
            {(event.dress_code_style || event.kids_restriction_note || event.gift_suggestions || event.instagram_host_1 || infoBlocks.length > 0) && (
              <Card className="bg-[#121214] border border-[#d4af37]/15 shadow-xl">
                <CardHeader className="border-b border-[#d4af37]/10">
                  <CardTitle className="bg-gradient-to-r from-[#b89742] via-[#f3e0aa] to-[#b89742] bg-clip-text text-transparent font-serif tracking-wide text-lg">
                    ✨ Informações Importantes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 py-6">
                  {/* Dress Code */}
                  {(event.dress_code_style || event.dress_code_colors) && (
                    <div className="p-4 rounded-2xl border border-[#d4af37]/10 bg-[#18181b]/50 space-y-2">
                      <h4 className="font-bold text-sm text-[#d4af37] flex items-center gap-2">
                        👗 Dress Code
                      </h4>
                      {event.dress_code_style && (
                        <p className="text-xs text-foreground/85">
                          <span className="font-semibold text-foreground">Estilo:</span> {event.dress_code_style}
                        </p>
                      )}
                      {event.dress_code_colors && (
                        <p className="text-xs text-foreground/85">
                          <span className="font-semibold text-foreground">Sugestões de Cores:</span> {event.dress_code_colors}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Outros blocos adicionais de info */}
                  {infoBlocks.map((block) => (
                    <div key={block.id} className="p-4 rounded-2xl border border-[#d4af37]/10 bg-[#18181b]/50 space-y-1.5">
                      <h4 className="font-bold text-sm text-[#d4af37]">{block.title}</h4>
                      <p className="text-xs text-foreground/80 leading-relaxed">{block.content}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {children}
            
            <div className="text-center py-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs text-foreground/40 hover:text-foreground border-[#d4af37]/10 hover:border-[#d4af37]/30"
              >
                Voltar à Capa
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
