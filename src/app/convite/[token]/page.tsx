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

import DefaultTemplate from '@/components/templates/invitations/DefaultTemplate';

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
      setRsvpStatus((() => {
        const s = fetchedGuest.status?.toLowerCase() || '';
        if (s === 'confirmed' || s === 'confirmado' || s === 'sim' || s === 'yes') return 'Confirmed';
        if (s === 'declined' || s === 'recusado' || s === 'recusada' || s === 'não' || s === 'no') return 'Declined';
        return 'Pending';
      })());
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
      const pdf = await generateGuestPDF(guest, event, tableName, qrCodeUrl, schedules, infoBlocks);
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

  const templateProps = {
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
  };

  const renderTemplate = () => {
    // Fallback template_id if undefined
    const templateId = event.template_id || 'default';

    const galleryChildren = (
      <Card className="mt-8 bg-card-bg border border-border-custom shadow-md text-left">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Camera className="h-5 w-5 text-primary" />
            Galeria Colaborativa (Meu Boda Live)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-foreground">
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
                className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
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
    );

    return <DefaultTemplate {...templateProps}>{galleryChildren}</DefaultTemplate>;
  };

  return renderTemplate();
}
