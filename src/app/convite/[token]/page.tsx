'use client';

import React, { useEffect, useState, use } from 'react';
import { GuestRepository } from '@/repositories/guest.repository';
import { EventRepository } from '@/repositories/event.repository';
import { TableRepository } from '@/repositories/table.repository';
import { MediaRepository, EventMedia } from '@/repositories/media.repository';
import { ScheduleRepository } from '@/repositories/schedule.repository';
import { InfoBlockRepository } from '@/repositories/infoblock.repository';
import { Guest, Event, Table, EventSchedule, EventInfoBlock } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { generateQRCode } from '@/utils/qr';
import { generateGuestPDF } from '@/utils/pdf';
import confetti from 'canvas-confetti';
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
  QrCode,
  Download,
  Camera,
  Upload,
  Clock,
} from 'lucide-react';

interface RSVPPageProps {
  params: Promise<{ token: string }>;
}

function getGoogleMapsLink(locationName: string | null | undefined, mapsUrlOrCoords: string | null | undefined): string | null {
  if (mapsUrlOrCoords && (mapsUrlOrCoords.startsWith('http://') || mapsUrlOrCoords.startsWith('https://'))) {
    return mapsUrlOrCoords;
  }
  const query = mapsUrlOrCoords || locationName;
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const getEventTypeLabel = (type: string) => {
  switch (type) {
    case 'casamento':
      return {
        title: 'Casamento',
        invitation: 'Convite de Casamento',
        details: 'Detalhes do Casamento',
        theme: 'Tema do Casamento',
        rsvpQuestion: 'comparecer ao nosso casamento',
      };
    case 'aniversario':
      return {
        title: 'Aniversário',
        invitation: 'Convite de Aniversário',
        details: 'Detalhes do Aniversário',
        theme: 'Tema do Aniversário',
        rsvpQuestion: 'comparecer ao nosso aniversário',
      };
    case 'pedido':
      return {
        title: 'Pedido de Casamento',
        invitation: 'Convite de Pedido de Casamento',
        details: 'Detalhes do Pedido',
        theme: 'Tema do Pedido',
        rsvpQuestion: 'comparecer ao nosso pedido de casamento',
      };
    default:
      return {
        title: 'Evento',
        invitation: 'Convite do Evento',
        details: 'Detalhes do Evento',
        theme: 'Tema do Evento',
        rsvpQuestion: 'comparecer ao nosso evento',
      };
  }
};

export default function PublicRSVPPage({ params }: RSVPPageProps) {
  // Await params promise in Next.js 15
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [guest, setGuest] = useState<Guest | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [schedules, setSchedules] = useState<EventSchedule[]>([]);
  const [infoBlocks, setInfoBlocks] = useState<EventInfoBlock[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Form states
  const [rsvpStatus, setRsvpStatus] = useState<'Pending' | 'Confirmed' | 'Declined'>('Pending');
  const [companions, setCompanions] = useState(0);
  const [notes, setNotes] = useState('');

  // Collaborative gallery states
  const [galleryList, setGalleryList] = useState<EventMedia[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaCaption, setMediaCaption] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedGuest = await GuestRepository.getByToken(token);
      if (!fetchedGuest) {
        setLoading(false);
        return;
      }

      setGuest(fetchedGuest);
      setRsvpStatus(fetchedGuest.status);
      setCompanions(fetchedGuest.companions);
      setNotes(fetchedGuest.notes || '');

      const [fetchedEvent, fetchedTables, fetchedSchedules, fetchedInfoBlocks] = await Promise.all([
        EventRepository.getById(fetchedGuest.event_id),
        TableRepository.getAll(fetchedGuest.event_id),
        ScheduleRepository.getAll(fetchedGuest.event_id),
        InfoBlockRepository.getAll(fetchedGuest.event_id),
      ]);

      setSchedules(fetchedSchedules);
      setInfoBlocks(fetchedInfoBlocks);

      setEvent(fetchedEvent);

      if (fetchedGuest.table_id) {
        const foundTable = fetchedTables.find((t) => t.id === fetchedGuest.table_id);
        setTable(foundTable || null);
      }

      // Generate local QR Code
      if (fetchedEvent) {
        const tableName = fetchedGuest.table_id
          ? fetchedTables.find((t) => t.id === fetchedGuest.table_id)?.name || 'Sem Mesa'
          : 'Sem Mesa';

        const qrData = {
          eventId: fetchedEvent.id,
          guestId: fetchedGuest.id,
          name: fetchedGuest.name,
          table: tableName,
          companions: fetchedGuest.companions.toString(),
          event: fetchedEvent.title,
          date: fetchedEvent.date.split('T')[0],
          token: fetchedGuest.qr_token,
        };

        const url = await generateQRCode(qrData);
        setQrCodeUrl(url);

        // Fetch approved gallery media
        const approvedMedia = await MediaRepository.getApproved(fetchedEvent.id);
        setGalleryList(approvedMedia);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleUploadGalleryMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event || !guest) return;

    setUploadingMedia(true);
    try {
      const publicUrl = await MediaRepository.uploadFile(event.id, file);
      if (!publicUrl) throw new Error('Falha no upload');

      const isVideo = file.type.startsWith('video');
      const mediaType = isVideo ? 'video' : 'image';

      await MediaRepository.create({
        event_id: event.id,
        guest_name: guest.name,
        media_url: publicUrl,
        media_type: mediaType,
        caption: mediaCaption || null,
        status: 'approved',
      });

      setMediaCaption('');
      // Reload approved gallery list
      const approved = await MediaRepository.getApproved(event.id);
      setGalleryList(approved);
      alert('Foto/Vídeo partilhado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao carregar o ficheiro.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#B76E79', '#D8A7B1', '#F8EDEB', '#22C55E'],
    });
  };

  const handleRSVPSubmit = async (status: 'Confirmed' | 'Declined') => {
    if (!guest) return;
    setSaving(true);
    try {
      const updated = await GuestRepository.update(guest.id, {
        status,
        companions: status === 'Confirmed' ? Number(companions) : 0,
        notes: notes || null,
      });

      if (updated) {
        setGuest(updated);
        setRsvpStatus(status);
        if (status === 'Confirmed') {
          triggerConfetti();
        }
        alert('Resposta de presença enviada com sucesso!');
      }
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao enviar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadInvite = async () => {
    if (!guest || !event) return;
    setDownloading(true);
    try {
      const tableName = table ? table.name : 'Sem Mesa';
      const pdf = await generateGuestPDF(guest, event, tableName, qrCodeUrl, schedules);
      pdf.save(`convite_${guest.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-primary">A carregar convite...</p>
        </div>
      </div>
    );
  }

  if (!guest || !event) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4 text-center">
        <Card className="max-w-md bg-card-bg">
          <CardContent className="space-y-4 py-6">
            <XCircle className="h-14 w-14 text-error mx-auto" />
            <h2 className="text-xl font-bold">Convite não encontrado</h2>
            <p className="text-sm text-foreground/60">
              O link que utilizou parece estar inválido ou expirado. Por favor, verifique com o organizador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isConfirmed = rsvpStatus === 'Confirmed';
  const isDeclined = rsvpStatus === 'Declined';
  const eventLabels = getEventTypeLabel(event.type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/40 via-background to-secondary/30 py-8 px-4 flex flex-col justify-between max-w-5xl mx-auto">
      {/* Wedding Cover Art */}
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
                        <span className="text-xs text-foreground/60 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 opacity-70" /> {sched.location}
                        </span>
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
            <Card className="bg-card-bg text-center space-y-4">
              <CardHeader>
                <CardTitle className="text-center">Acesso ao Evento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex flex-col items-center">
                <div className="border border-border-custom rounded-2xl p-4 bg-white inline-block shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="QR Code Checkin" className="h-44 w-44 object-contain" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold">Este é o seu QR Code individual.</p>
                  <p className="text-[10px] text-foreground/50 max-w-[220px] mx-auto">
                    Apresente-o no seu telemóvel ou imprima o PDF para validação de check-in na entrada.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  leftIcon={downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  onClick={handleDownloadInvite}
                  disabled={downloading}
                >
                  Descarregar Folha PDF
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

            {/* Kids restriction */}
            {event.kids_restriction_note && (
              <div className="p-4 rounded-2xl border border-border-custom/60 bg-secondary/10 space-y-2">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  👶 Nota Importante
                </h4>
                <p className="text-xs text-foreground/80 leading-relaxed">{event.kids_restriction_note}</p>
              </div>
            )}

            {/* Gift Suggestions */}
            {event.gift_suggestions && (
              <div className="p-4 rounded-2xl border border-border-custom/60 bg-secondary/10 space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  🎁 Sugestões de Presente
                </h4>
                <div className="space-y-1">
                  {event.gift_suggestions.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{line}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Instagram Deep Links */}
            {(event.instagram_host_1 || event.instagram_host_2) && (
              <div className="p-4 rounded-2xl border border-border-custom/60 bg-secondary/10 space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  📸 Partilhe o Momento
                </h4>
                <p className="text-xs text-foreground/60">
                  Registe os melhores momentos e identifique-nos:
                </p>
                <div className="flex flex-wrap gap-2">
                  {event.instagram_host_1 && (
                    <a
                      href={`https://instagram.com/_u/${event.instagram_host_1}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      @{event.instagram_host_1}
                    </a>
                  )}
                  {event.instagram_host_2 && (
                    <a
                      href={`https://instagram.com/_u/${event.instagram_host_2}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      @{event.instagram_host_2}
                    </a>
                  )}
                </div>
              </div>
            )}
            {/* Dynamic Info Blocks */}
            {infoBlocks.length > 0 && infoBlocks.map((block) => (
              <div key={block.id} className="p-4 rounded-2xl border border-border-custom/60 bg-secondary/10 space-y-2">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  ℹ️ {block.title}
                </h4>
                <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{block.content}</p>
              </div>
            ))}

          </CardContent>
        </Card>
      )}

      {/* Gallery Section */}
      <Card className="mt-8 bg-card-bg border border-border-custom shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Camera className="h-5 w-5 text-primary" />
            Galeria Colaborativa (Meu Boda Live)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-foreground/75">
            Partilhe as suas fotos e vídeos em tempo real! Os ficheiros enviados serão exibidos no projetor do evento e partilhados na galeria.
          </p>

          <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4 max-w-2xl bg-secondary/10 p-4 rounded-2xl border border-border-custom/50">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground/75 tracking-wide">
                Legenda da Foto/Vídeo (opcional)
              </label>
              <input
                type="text"
                placeholder="Escreva uma mensagem ou legenda..."
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                disabled={uploadingMedia}
              />
            </div>
            
            <div className="shrink-0 flex items-center">
              <label className="relative w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-primary-hover active:scale-95 transition-all shadow-md shadow-primary/20">
                {uploadingMedia ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>A enviar...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Tirar / Enviar Foto</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleUploadGalleryMedia}
                  disabled={uploadingMedia}
                />
              </label>
            </div>
          </div>

          {/* Media list */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
              Fotos do Evento ({galleryList.length})
            </h4>

            {galleryList.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-border-custom rounded-2xl bg-secondary/5">
                <Camera className="h-10 w-10 text-foreground/20 mb-2" />
                <p className="text-xs font-medium text-foreground/60">Ainda nenhuma foto foi publicada.</p>
                <p className="text-[10px] text-foreground/40 mt-0.5">Seja o primeiro a enviar uma recordação!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {galleryList.map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-square rounded-xl overflow-hidden border border-border-custom bg-black group shadow-sm"
                  >
                    {item.media_type === 'video' ? (
                      <video
                        src={item.media_url}
                        className="w-full h-full object-cover"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.media_url}
                        alt={item.caption || ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    {item.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2 text-[10px] text-white font-medium leading-tight">
                        <p className="line-clamp-2 italic">&quot;{item.caption}&quot;</p>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-full px-2 py-0.5 text-[9px] text-white font-bold">
                      {item.guest_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <footer className="mt-12 text-center text-[10px] text-foreground/40 border-t border-border-custom/50 pt-4">
        © {new Date().getFullYear()} Meu Boda. Todos os direitos reservados.
      </footer>
    </div>
  );
}
