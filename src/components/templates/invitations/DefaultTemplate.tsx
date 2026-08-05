'use client';

import React from 'react';
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
} from 'lucide-react';
import { Guest, Event, Table, EventSchedule, EventInfoBlock } from '@/types';

export interface TemplateProps {
  guest: Guest;
  event: Event;
  table: Table | null;
  qrCodeUrl: string;
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
}

export default function DefaultTemplate({
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
    <div className="min-h-screen bg-gradient-to-br from-secondary/40 via-background to-secondary/30 py-8 px-4 flex flex-col justify-between max-w-5xl mx-auto">
      {/* Event Cover Art */}
      <Card className="p-0 overflow-hidden border border-border-custom bg-card-bg shadow-md mb-8">
        <div className="relative h-60 md:h-80 bg-primary/10">
          {event.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.cover_image}
              alt={`Capa ${eventLabels.title}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary/30">
              <Heart className="h-16 w-16 fill-current animate-pulse" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          
          {/* Header Info overlays */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col items-center text-center">
            <Badge variant="secondary" className="mb-2">
              {eventLabels.invitation}
            </Badge>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-wide">
              {event.title}
            </h1>
            <p className="text-xs text-foreground/75 mt-1 tracking-widest uppercase">
              {new Date(event.date).toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Event details */}
        <div className="md:col-span-7 space-y-6">
          <Card className="bg-card-bg">
            <CardHeader>
              <CardTitle>{eventLabels.details}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-foreground/80">
              {event.description && <p className="italic text-center text-foreground/60 my-2">&quot;{event.description}&quot;</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="flex items-start gap-3 p-3.5 border border-border-custom/50 rounded-xl bg-secondary/10">
                  <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-foreground/50 uppercase">Data e Hora</h4>
                    <p className="font-semibold text-xs mt-1">
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
                  <div className="flex items-start gap-3 p-3.5 border border-border-custom/50 rounded-xl bg-secondary/10">
                    <Palette className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-foreground/50 uppercase">{eventLabels.theme}</h4>
                      <p className="font-semibold text-xs mt-1">{event.theme}</p>
                    </div>
                  </div>
                )}
              </div>

              {event.type === 'casamento' ? (
                <div className="space-y-4">
                  {event.ceremony_location && (
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-3.5 border border-border-custom/50 rounded-xl bg-secondary/10">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-xs text-foreground/50 uppercase">Cerimónia / Igreja</h4>
                          <p className="font-semibold text-xs mt-1">{event.ceremony_location}</p>
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
                          <Button variant="outline" size="sm" className="text-xs py-1 px-3 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Como Chegar
                          </Button>
                        </a>
                      )}
                    </div>
                  )}

                  {event.party_location && (
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-3.5 border border-border-custom/50 rounded-xl bg-secondary/10">
                      <div className="flex items-start gap-3">
                        <Utensils className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-xs text-foreground/50 uppercase">Copo d&apos;Água / Festa</h4>
                          <p className="font-semibold text-xs mt-1">{event.party_location}</p>
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
                          <Button variant="outline" size="sm" className="text-xs py-1 px-3 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Como Chegar
                          </Button>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {event.ceremony_location && (
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-3.5 border border-border-custom/50 rounded-xl bg-secondary/10">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-xs text-foreground/50 uppercase">Local do Evento</h4>
                          <p className="font-semibold text-xs mt-1">{event.ceremony_location}</p>
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.ceremony_location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 sm:self-center"
                      >
                        <Button variant="outline" size="sm" className="text-xs py-1 px-3 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Como Chegar
                        </Button>
                      </a>
                    </div>
                  )}

                  {event.party_location && (
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-3.5 border border-border-custom/50 rounded-xl bg-secondary/10">
                      <div className="flex items-start gap-3">
                        <Utensils className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-xs text-foreground/50 uppercase">Recepção</h4>
                          <p className="font-semibold text-xs mt-1">{event.party_location}</p>
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.party_location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 sm:self-center"
                      >
                        <Button variant="outline" size="sm" className="text-xs py-1 px-3 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Como Chegar
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agenda do Dia Timeline */}
          {schedules.length > 0 && (
            <Card className="bg-card-bg border border-border-custom">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Agenda do Dia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative border-l-2 border-primary/30 ml-3 pl-6 space-y-4 py-2">
                  {schedules.map((sched) => (
                    <div key={sched.id} className="relative">
                      {/* Dot */}
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-background">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary uppercase tracking-wide">
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
          <Card className="bg-card-bg border border-border-custom">
            <CardHeader>
              <CardTitle>Responder Presença (RSVP)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-2">
                <p className="text-xs text-foreground/60">
                  Olá <span className="font-bold text-foreground">{guest.name}</span>, por favor informe-nos se poderá comparecer ao nosso {eventLabels.title.toLowerCase()}.
                </p>
                {event.rsvp_deadline && (
                  <p className="text-[11px] text-primary font-semibold mt-1.5">
                    ⏰ Por favor confirme a sua presença até ao dia{' '}
                    <span className="font-bold">
                      {new Date(event.rsvp_deadline + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </p>
                )}
              </div>

              {/* Status selectors */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleRSVPSubmit('Confirmed')}
                  disabled={saving}
                  className={`flex flex-col items-center justify-center p-4 border rounded-2xl cursor-pointer active:scale-[0.98] transition-all gap-1.5 ${
                    isConfirmed
                      ? 'border-success bg-success/10 text-success'
                      : 'border-border-custom hover:bg-secondary/40 text-foreground/70'
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
                      : 'border-border-custom hover:bg-secondary/40 text-foreground/70'
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
                        <Users className="h-4 w-4 text-primary" /> Acompanhantes Extra
                      </label>
                      <div className="rounded-xl border border-border-custom bg-secondary/10 px-3.5 py-2.5 text-sm font-semibold text-foreground">
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
                      className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: QR and seating assignment */}
        <div className="md:col-span-5 space-y-6">
          {/* Seating card */}
          {table && isConfirmed && (
            <Card className="bg-card-bg border border-success/35">
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

          {/* QR Code and complement sheet card */}
          {isConfirmed && qrCodeUrl && (
            <Card className="bg-card-bg border border-primary/20 shadow-lg overflow-hidden p-0">
              {/* Ticket Header Banner */}
              <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3 text-white text-center">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-90">Passe de Acesso Digital</span>
                <h3 className="font-bold text-sm truncate mt-0.5">{event.title}</h3>
              </div>

              <CardContent className="p-5 space-y-4 flex flex-col items-center">
                {/* Guest & Seating Quick Info */}
                <div className="w-full bg-secondary/10 rounded-xl p-3 text-left space-y-2 border border-border-custom/50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-foreground/50">Titular:</span>
                    <span className="font-bold text-foreground">{guest.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-foreground/50">Mesa / Lugar:</span>
                    <span className="font-bold text-primary">{table ? table.name : 'Pendente'}</span>
                  </div>
                  {guest.companions > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-foreground/50">Acompanhantes:</span>
                      <span className="font-bold text-foreground">+{guest.companions}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs border-t border-border-custom/40 pt-1.5 mt-1">
                    <span className="text-foreground/50">Data:</span>
                    <span className="font-semibold text-foreground">
                      {new Date(event.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Ticket Dotted Separator Line */}
                <div className="w-full flex items-center justify-between my-1">
                  <div className="-ml-6 w-3 h-6 bg-background rounded-r-full border-r border-y border-primary/20 shrink-0"></div>
                  <div className="flex-1 border-b-2 border-dashed border-border-custom/80 mx-2"></div>
                  <div className="-mr-6 w-3 h-6 bg-background rounded-l-full border-l border-y border-primary/20 shrink-0"></div>
                </div>

                {/* QR Code Container */}
                <div className="border-2 border-primary/10 rounded-2xl p-3 bg-white inline-block shadow-md hover:scale-102 transition-transform duration-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="QR Code Checkin" className="h-40 w-40 object-contain" />
                </div>

                <div className="space-y-1 text-center">
                  <p className="text-xs font-semibold text-foreground">Apresente este código na entrada.</p>
                  <p className="text-[10px] text-foreground/50 max-w-[240px] mx-auto leading-normal">
                    Pode descarregar o PDF completo para imprimir ou guardar no seu telemóvel.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center mt-1 border-primary/30 text-primary hover:bg-primary/5"
                  leftIcon={downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  onClick={handleDownloadInvite}
                  disabled={downloading}
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
        <Card className="mt-8 bg-card-bg border border-border-custom shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              ✨ Informações Importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Dress Code */}
            {(event.dress_code_style || event.dress_code_colors) && (
              <div className="p-4 rounded-2xl border border-border-custom/60 bg-secondary/10 space-y-2">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  👗 Dress Code
                </h4>
                {event.dress_code_style && (
                  <p className="text-xs text-foreground/80">
                    <span className="font-semibold">Estilo:</span> {event.dress_code_style}
                  </p>
                )}
                {event.dress_code_colors && (
                  <p className="text-xs text-foreground/80">
                    <span className="font-semibold">Sugestões de Cores:</span> {event.dress_code_colors}
                  </p>
                )}
              </div>
            )}

            {/* Outros blocos adicionais de info */}
            {infoBlocks.map((block) => (
              <div key={block.id} className="p-4 rounded-2xl border border-border-custom/60 bg-secondary/10 space-y-1.5">
                <h4 className="font-bold text-sm">{block.title}</h4>
                <p className="text-xs text-foreground/85 leading-relaxed">{block.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {children}
    </div>
  );
}
