'use client';

import React from 'react';
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
  Ticket,
} from 'lucide-react';
import { TemplateProps } from './DefaultTemplate';

export default function ModernTicketTemplate({
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
}: TemplateProps) {
  const isConfirmed = rsvpStatus === 'Confirmed';
  const isDeclined = rsvpStatus === 'Declined';

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#f4f4f5] py-8 px-4 flex flex-col justify-between max-w-5xl mx-auto font-sans relative overflow-hidden">
      
      {/* Background neon glows */}
      <div className="absolute top-1/4 -left-10 w-[250px] h-[250px] bg-[#3b82f6]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-10 w-[250px] h-[250px] bg-[#a855f7]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Ticket Container */}
      <div className="relative w-full border border-border-custom bg-[#121215] rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Ticket Header (Branding & QR) */}
        <div className="bg-gradient-to-r from-[#3b82f6] to-[#a855f7] p-6 text-white flex flex-col md:flex-row justify-between items-center gap-6 relative">
          {/* Subtle grid decoration */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

          <div className="space-y-2 text-center md:text-left relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-xs font-bold uppercase tracking-wider">
              <Ticket className="h-3.5 w-3.5" /> PASSE DE ACESSO VIP
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">{event.title}</h1>
            <p className="text-xs text-white/80 font-medium tracking-wide">
              Data: {new Date(event.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* QR code right on top for tickets */}
          {isConfirmed && qrCodeUrl && (
            <div className="bg-white p-3 rounded-2xl shadow-lg shrink-0 hover:scale-105 transition-transform duration-300 relative z-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCodeUrl} alt="Ticket QR" className="h-28 w-28 object-contain" />
              <div className="text-[7px] text-center text-[#0a0a0c] font-black uppercase tracking-widest mt-1 opacity-70">
                Passe Individual
              </div>
            </div>
          )}
        </div>

        {/* Ticket Dotted Separator */}
        <div className="w-full flex items-center justify-between my-0 bg-[#121215] relative">
          <div className="-ml-3 w-6 h-6 bg-[#0a0a0c] rounded-r-full border-r border-y border-border-custom shrink-0 z-10"></div>
          <div className="flex-1 border-b-2 border-dashed border-border-custom mx-1 opacity-50"></div>
          <div className="-mr-3 w-6 h-6 bg-[#0a0a0c] rounded-l-full border-l border-y border-border-custom shrink-0 z-10"></div>
        </div>

        {/* Ticket Body */}
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Details Column */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Event Info Card */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border-custom/50 pb-2">
                <h3 className="font-extrabold text-sm uppercase text-[#a855f7] tracking-wider">Especificações do Evento</h3>
                <span className="text-[10px] text-foreground/50 font-bold uppercase">{eventLabels.title}</span>
              </div>
              
              {event.description && (
                <p className="text-xs text-foreground/70 leading-relaxed font-semibold italic border-l-2 border-[#3b82f6] pl-3 py-1 bg-secondary/5 rounded-r-lg">
                  &quot;{event.description}&quot;
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#1c1c21] border border-border-custom/60 flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-[#3b82f6] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-[10px] text-foreground/45 uppercase tracking-wider">Data / Hora</h4>
                    <p className="font-bold text-xs mt-1 text-foreground">
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
                  <div className="p-4 rounded-2xl bg-[#1c1c21] border border-border-custom/60 flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-[#a855f7] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-[10px] text-foreground/45 uppercase tracking-wider">{eventLabels.theme}</h4>
                      <p className="font-bold text-xs mt-1 text-foreground">{event.theme}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {event.ceremony_location && (
                  <div className="p-4 rounded-2xl bg-[#1c1c21] border border-border-custom/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-[#3b82f6] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-[10px] text-foreground/45 uppercase tracking-wider">Local do Evento</h4>
                        <p className="font-bold text-xs mt-0.5 text-foreground">{event.ceremony_location}</p>
                      </div>
                    </div>
                    {getGoogleMapsLink(event.ceremony_location, event.ceremony_maps_url) && (
                      <a
                        href={getGoogleMapsLink(event.ceremony_location, event.ceremony_maps_url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button variant="outline" size="sm" className="text-xs py-1 px-3 border-white/10 text-white hover:bg-white/5">
                          Como Chegar
                        </Button>
                      </a>
                    )}
                  </div>
                )}

                {event.party_location && (
                  <div className="p-4 rounded-2xl bg-[#1c1c21] border border-border-custom/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-[#a855f7] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-[10px] text-foreground/45 uppercase tracking-wider">Local da Recepção</h4>
                        <p className="font-bold text-xs mt-0.5 text-foreground">{event.party_location}</p>
                      </div>
                    </div>
                    {getGoogleMapsLink(event.party_location, event.party_maps_url) && (
                      <a
                        href={getGoogleMapsLink(event.party_location, event.party_maps_url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button variant="outline" size="sm" className="text-xs py-1 px-3 border-white/10 text-white hover:bg-white/5">
                          Como Chegar
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            {schedules.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border-custom/50 pb-2">
                  <h3 className="font-extrabold text-sm uppercase text-[#3b82f6] tracking-wider flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Cronograma do Evento
                  </h3>
                </div>
                <div className="relative border-l border-white/10 ml-3 pl-6 space-y-4 py-1">
                  {schedules.map((sched) => (
                    <div key={sched.id} className="relative">
                      <span className="absolute -left-[30px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#3b82f6] bg-[#121215]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
                      </span>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black text-[#3b82f6] uppercase tracking-wider">{sched.time}</span>
                        <h4 className="text-xs font-bold text-foreground">{sched.title}</h4>
                        {sched.location && <p className="text-[10px] text-foreground/50">{sched.location}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action / RSVP Column */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* RSVP Form */}
            <div className="p-5 rounded-2xl bg-[#1c1c21] border border-border-custom/60 space-y-4">
              <div className="text-center space-y-1">
                <h3 className="font-extrabold text-sm uppercase text-foreground">Responder Convite (RSVP)</h3>
                <p className="text-xs text-foreground/50">
                  Olá <span className="font-bold text-[#3b82f6]">{guest.name}</span>, indique a sua presença no painel.
                </p>
                {event.rsvp_deadline && (
                  <p className="text-[10px] text-[#a855f7] font-semibold">
                    Confirmação até: {new Date(event.rsvp_deadline + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRSVPSubmit('Confirmed')}
                  disabled={saving}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 border rounded-xl font-bold text-xs cursor-pointer transition-all ${
                    isConfirmed
                      ? 'border-success bg-success/10 text-success'
                      : 'border-white/10 hover:bg-[#27272a] text-foreground/75'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" /> Comparecer
                </button>

                <button
                  type="button"
                  onClick={() => handleRSVPSubmit('Declined')}
                  disabled={saving}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 border rounded-xl font-bold text-xs cursor-pointer transition-all ${
                    isDeclined
                      ? 'border-error bg-error/10 text-error'
                      : 'border-white/10 hover:bg-[#27272a] text-foreground/75'
                  }`}
                >
                  <XCircle className="h-4 w-4" /> Recusar
                </button>
              </div>

              {isConfirmed && (
                <div className="space-y-4 pt-1">
                  {guest.companions > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Acompanhantes Autorizados</label>
                      <div className="rounded-xl border border-white/5 bg-[#121215] px-3.5 py-2.5 text-xs font-bold">
                        {guest.companions} {guest.companions === 1 ? 'Acompanhante autorizado' : 'Acompanhantes autorizados'}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Alergias ou Observações</label>
                    <textarea
                      rows={2}
                      placeholder="Vegetariano, alergias alimentares..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0c0c0e] px-3.5 py-2 text-xs focus:border-[#3b82f6] focus:outline-none transition-all text-foreground"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick seat stats for tickets */}
            {table && isConfirmed && (
              <div className="p-4 rounded-xl border border-success/30 bg-success/5 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success shrink-0" />
                <div>
                  <h4 className="font-bold text-[9px] text-success uppercase tracking-wider">Mesa Reservada</h4>
                  <p className="text-xs font-extrabold text-foreground">{table.name}</p>
                </div>
              </div>
            )}

            {/* Ticket download options */}
            {isConfirmed && qrCodeUrl && (
              <div className="p-5 rounded-2xl bg-[#1c1c21] border border-border-custom/60 space-y-4">
                <div className="w-full bg-[#121215] rounded-xl p-4 text-xs space-y-2 border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground/45">Titular:</span>
                    <span className="font-bold text-foreground">{guest.name}</span>
                  </div>
                  {table && (
                    <div className="flex justify-between items-center">
                      <span className="text-foreground/45">Mesa / Lugar:</span>
                      <span className="font-bold text-[#3b82f6]">{table.name}</span>
                    </div>
                  )}
                  {guest.companions > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-foreground/45">Acompanhantes:</span>
                      <span className="font-bold text-foreground">+{guest.companions}</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleDownloadInvite}
                  disabled={downloading}
                  className="w-full justify-center rounded-xl bg-white text-black font-extrabold py-3 text-xs tracking-wider uppercase hover:bg-white/90 active:scale-95 transition-all shadow-md"
                  leftIcon={downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                >
                  Descarregar Passe PDF
                </Button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Info Blocks (Dress code, rules) */}
      {(event.dress_code_style || event.kids_restriction_note || event.gift_suggestions || event.instagram_host_1 || infoBlocks.length > 0) && (
        <div className="mt-8 p-6 rounded-3xl border border-border-custom/50 bg-[#121215] space-y-6">
          <h3 className="font-extrabold text-sm uppercase text-foreground border-b border-border-custom/50 pb-2">Informações Gerais</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(event.dress_code_style || event.dress_code_colors) && (
              <div className="p-4 rounded-2xl bg-[#1c1c21] border border-white/5 space-y-2">
                <h4 className="font-bold text-xs text-[#3b82f6] uppercase tracking-wider">👗 Dress Code</h4>
                {event.dress_code_style && (
                  <p className="text-xs text-foreground/85">
                    <span className="font-semibold text-foreground/50">Estilo:</span> {event.dress_code_style}
                  </p>
                )}
                {event.dress_code_colors && (
                  <p className="text-xs text-foreground/85">
                    <span className="font-semibold text-foreground/50">Cores sugeridas:</span> {event.dress_code_colors}
                  </p>
                )}
              </div>
            )}

            {infoBlocks.map((block) => (
              <div key={block.id} className="p-4 rounded-2xl bg-[#1c1c21] border border-white/5 space-y-1.5">
                <h4 className="font-bold text-xs text-[#a855f7] uppercase tracking-wider">{block.title}</h4>
                <p className="text-xs text-foreground/80 leading-relaxed">{block.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {children}

      {/* Footer copyright */}
      <div className="text-center py-8 text-[10px] text-foreground/30 font-bold uppercase tracking-widest mt-8">
        &copy; {new Date().getFullYear()} Meu Boda. Todos os direitos reservados.
      </div>
      
    </div>
  );
}
