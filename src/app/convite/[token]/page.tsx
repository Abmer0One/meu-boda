'use client';

import React, { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
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
  Sun,
  Moon,
} from 'lucide-react';

import DefaultTemplate from '@/components/templates/invitations/DefaultTemplate';
import ModernTicketTemplate from '@/components/templates/invitations/ModernTicketTemplate';
import RoyalParisienneTemplate from '@/components/templates/invitations/RoyalParisienneTemplate';
import GlobalBroadcastBanner from '@/components/common/GlobalBroadcastBanner';
import InvitationLeadBadge from '@/components/common/InvitationLeadBadge';
import { resolveCanvaConfig } from '@/utils/canvaConfig';

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
import { getEventLabels } from '@/utils/eventHelpers';

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
  const [invitationTheme, setInvitationTheme] = useState<'dark' | 'light'>('dark');
  
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
      let fetchedGuest = await GuestRepository.getByToken(token);
      let fetchedEvent: Event | null = null;

      if (!fetchedGuest) {
        // Suporte a links de teste / demonstração (ex: MB-TESTE-VIP, MB-TESTE-ernesto-helena, demo-*)
        const isDemoToken =
          token === 'MB-TESTE-VIP' ||
          token.startsWith('MB-TESTE-') ||
          token.startsWith('demo-') ||
          token.toLowerCase().includes('teste') ||
          token.toLowerCase().includes('demo');

        if (isDemoToken) {
          let eventIdentifier = '';
          if (token.startsWith('MB-TESTE-') && token !== 'MB-TESTE-VIP') {
            eventIdentifier = token.replace('MB-TESTE-', '');
          } else if (token.startsWith('demo-')) {
            eventIdentifier = token.replace('demo-', '');
          }

          if (eventIdentifier) {
            fetchedEvent = await EventRepository.getBySlug(eventIdentifier);
            if (!fetchedEvent) {
              fetchedEvent = await EventRepository.getById(eventIdentifier);
            }
          }

          // Se for token genérico 'MB-TESTE-VIP' ou evento ainda não localizado:
          if (!fetchedEvent) {
            // 1. Tentar verificar se o utilizador está autenticado e carregar o seu evento ativo
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const userEvents = await EventRepository.getByUserId(user.id);
                if (userEvents && userEvents.length > 0) {
                  fetchedEvent = userEvents[0];
                }
              }
            } catch (e) {}

            // 2. Se for MB-TESTE-VIP em acesso anónimo no telemóvel, associar ao evento ativo de Ernesto & Helena
            if (!fetchedEvent) {
              fetchedEvent = await EventRepository.getById('04eb84a1-864f-4faf-b836-874a579e1de7');
            }
          }

          if (fetchedEvent) {
            fetchedGuest = {
              id: 'demo-guest',
              event_id: fetchedEvent.id,
              name: 'Convidado de Demonstração',
              phone: '+244 923 000 000',
              email: 'convidado@meuboda.com',
              family_group: null,
              status: 'Confirmed',
              companions: 1,
              table_id: null,
              invitation_sent: true,
              qr_token: token,
              notes: null,
              created_at: new Date().toISOString(),
            };
          }
        }
      }

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

      const [resolvedEvent, fetchedTables, fetchedSchedules, fetchedInfoBlocks] = await Promise.all([
        fetchedEvent ? Promise.resolve(fetchedEvent) : EventRepository.getById(fetchedGuest.event_id),
        TableRepository.getAll(fetchedGuest.event_id),
        ScheduleRepository.getAll(fetchedGuest.event_id),
        InfoBlockRepository.getAll(fetchedGuest.event_id),
      ]);

      setSchedules(fetchedSchedules);
      setInfoBlocks(fetchedInfoBlocks);

      setEvent(resolvedEvent);

      if (resolvedEvent) {
        // Resolve default theme defined by the couple in Canva Template Config
        const canvaCfg = resolveCanvaConfig(resolvedEvent.id, resolvedEvent.template_config, fetchedInfoBlocks, null, resolvedEvent);
        if (canvaCfg?.invitation_theme) {
          setInvitationTheme(canvaCfg.invitation_theme);
        }
      }

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
      colors: ['#E86C64', '#4D2046', '#F8EDEF', '#10B981'],
    });
  };

  const handleRSVPSubmit = async (status: 'Confirmed' | 'Declined') => {
    if (!guest) return;
    setSaving(true);
    try {
      if (guest.id === 'demo-guest' || guest.qr_token.startsWith('MB-TESTE') || guest.qr_token === 'MB-TESTE-VIP') {
        setRsvpStatus(status);
        if (status === 'Confirmed') {
          triggerConfetti();
        }
        alert('Modo Demonstração: Resposta registada como teste com sucesso!');
        setSaving(false);
        return;
      }

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
  const eventLabels = getEventLabels(event);

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
    theme: invitationTheme,
  };

  const renderTemplate = () => {
    // Fallback template_id if undefined
    const templateId = event.template_id || 'default';
    const isLight = invitationTheme === 'light';

    const galleryChildren = (
      <div 
        className={`mt-10 rounded-3xl border-2 shadow-2xl text-left overflow-hidden relative backdrop-blur-xl transition-all ${
          isLight
            ? 'border-[#b89742]/35 bg-white text-stone-900 shadow-[0_20px_50px_rgba(212,175,55,0.12)]'
            : 'border-[#d4af37]/35 bg-[#0c0c10] text-white'
        }`}
      >
        {/* Luxury inner decorative frame */}
        <div className={`absolute inset-3 border rounded-[20px] pointer-events-none ${
          isLight ? 'border-[#b89742]/20' : 'border-[#d4af37]/20'
        }`} />
        
        {/* Ambient gold glow */}
        <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          isLight ? 'bg-[#d4af37]/5' : 'bg-[#d4af37]/10'
        }`} />
        <div className={`absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          isLight ? 'bg-[#b89742]/5' : 'bg-[#b89742]/10'
        }`} />

        {/* Section Header */}
        <div className={`p-6 md:p-8 border-b relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
          isLight ? 'border-[#b89742]/20' : 'border-[#d4af37]/20'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.2)] ${
              isLight ? 'bg-[#b89742]/15 border-[#b89742]/40' : 'bg-[#d4af37]/15 border-[#d4af37]/40'
            }`}>
              <Camera className={`h-6 w-6 ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`} />
            </div>
            <div>
              <h3 className={`font-cinzel text-lg md:text-2xl font-black tracking-wider ${
                isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'
              }`}>
                Galeria Colaborativa (Meu Boda Live)
              </h3>
              <p className={`text-xs font-medium tracking-wide mt-0.5 ${
                isLight ? 'text-stone-600' : 'text-white/80'
              }`}>
                Transmissão e partilha de fotos e vídeos em tempo real
              </p>
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full border shadow-sm ${
            isLight ? 'bg-[#b89742]/10 border-[#b89742]/30' : 'bg-[#d4af37]/15 border-[#d4af37]/40'
          }`}>
            <span className={`h-2 w-2 rounded-full animate-pulse ${isLight ? 'bg-[#b89742]' : 'bg-[#d4af37]'}`} />
            <span className={`text-[10px] font-black tracking-[2px] uppercase ${
              isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'
            }`}>
              Ao Vivo
            </span>
          </div>
        </div>

        {/* Section Body */}
        <div className="p-6 md:p-8 space-y-6 relative z-10">
          <p className={`text-sm font-normal leading-relaxed max-w-3xl ${
            isLight ? 'text-stone-700' : 'text-white'
          }`}>
            Partilhe as suas fotos e vídeos da festa em direto! As memórias enviadas serão projetadas no telão do evento e guardadas na <span className={`font-semibold ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>galeria oficial dos noivos</span>.
          </p>

          {/* Upload Form Box */}
          <div 
            className={`flex flex-col md:flex-row items-stretch md:items-end gap-4 max-w-2xl p-5 rounded-2xl border shadow-inner ${
              isLight ? 'bg-stone-50 border-stone-200 text-stone-900' : 'bg-[#14141a] border-[#d4af37]/30 text-white'
            }`}
          >
            <div className="flex-1 flex flex-col gap-2">
              <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'
              }`}>
                <span>✍️ Legenda da Foto ou Vídeo</span>
                <span className={`text-[10px] font-normal lowercase ${isLight ? 'text-stone-500' : 'text-white/60'}`}>(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Escreva uma mensagem de carinho..."
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-1 focus:outline-none transition-all font-medium ${
                  isLight
                    ? 'border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:border-[#b89742] focus:ring-[#b89742]'
                    : 'border-[#d4af37]/35 bg-[#09090c] text-white placeholder:text-zinc-500 focus:border-[#f3e0aa] focus:ring-[#f3e0aa]'
                }`}
                disabled={uploadingMedia}
              />
            </div>
            
            <div className="shrink-0 flex items-center">
              <label className="relative w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#b89742] via-[#d4af37] to-[#f3e0aa] text-[#09090c] rounded-xl font-extrabold text-xs uppercase tracking-wider cursor-pointer hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.3)]">
                {uploadingMedia ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#09090c]" />
                    <span>A enviar...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-[#09090c]" />
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
          <div className="space-y-4 pt-2">
            <div className={`flex items-center justify-between border-b pb-3 ${
              isLight ? 'border-[#b89742]/20' : 'border-[#d4af37]/20'
            }`}>
              <h4 className={`text-xs md:text-sm font-bold uppercase tracking-wider flex items-center gap-2.5 font-cinzel ${
                isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'
              }`}>
                <span>Fotos do Evento</span>
                <span className={`text-[11px] font-sans font-extrabold px-2.5 py-0.5 rounded-full border ${
                  isLight
                    ? 'bg-[#b89742]/10 text-[#8A6D2B] border-[#b89742]/30'
                    : 'bg-[#d4af37]/20 text-[#f3e0aa] border-[#d4af37]/40'
                }`}>
                  {galleryList.length}
                </span>
              </h4>
              <span className={`text-[11px] font-medium ${isLight ? 'text-stone-500' : 'text-white/70'}`}>
                Atualização automática
              </span>
            </div>

            {galleryList.length === 0 ? (
              <div 
                className={`flex flex-col items-center justify-center text-center py-14 px-4 border border-dashed rounded-2xl ${
                  isLight ? 'border-[#b89742]/35 bg-stone-50' : 'border-[#d4af37]/35 bg-[#14141a]'
                }`}
              >
                <div className={`w-14 h-14 rounded-full border flex items-center justify-center mb-3 ${
                  isLight ? 'bg-[#b89742]/10 border-[#b89742]/25' : 'bg-[#d4af37]/10 border-[#d4af37]/25'
                }`}>
                  <Camera className={`h-7 w-7 ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`} />
                </div>
                <p className={`text-sm font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>Ainda nenhuma foto foi partilhada.</p>
                <p className={`text-xs mt-1 font-medium ${isLight ? 'text-[#8A6D2B]' : 'text-[#f3e0aa]'}`}>Seja o primeiro a enviar uma recordação!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {galleryList.map((item) => (
                  <div
                    key={item.id}
                    className={`relative aspect-square rounded-2xl overflow-hidden border group shadow-lg transition-all ${
                      isLight
                        ? 'border-[#b89742]/35 bg-stone-100 hover:border-[#b89742]'
                        : 'border-[#d4af37]/35 bg-[#09090c] hover:border-[#f3e0aa]'
                    }`}
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
                      <div className={`absolute inset-x-0 bottom-0 p-2.5 text-[10px] font-medium leading-tight ${
                        isLight
                          ? 'bg-gradient-to-t from-white via-white/80 to-transparent text-stone-900'
                          : 'bg-gradient-to-t from-[#09090c] via-[#09090c]/80 to-transparent text-white'
                      }`}>
                        <p className={`line-clamp-2 italic ${isLight ? 'text-stone-900' : 'text-white'}`}>&quot;{item.caption}&quot;</p>
                      </div>
                    )}
                    <div className={`absolute top-2 right-2 backdrop-blur-md border rounded-full px-2.5 py-0.5 text-[9px] font-bold shadow-md ${
                      isLight
                        ? 'bg-white/90 border-[#b89742]/40 text-[#8A6D2B]'
                        : 'bg-[#09090c]/90 border-[#d4af37]/40 text-[#f3e0aa]'
                    }`}>
                      {item.guest_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    const combinedChildren = (
      <>
        {galleryChildren}
        <InvitationLeadBadge theme={invitationTheme} />
      </>
    );

    if (templateId === 'royal_parisienne' || templateId === 'royal') {
      return <RoyalParisienneTemplate {...templateProps}>{combinedChildren}</RoyalParisienneTemplate>;
    }
    if (templateId === 'modern_ticket' || templateId === 'ticket') {
      return <ModernTicketTemplate {...templateProps}>{combinedChildren}</ModernTicketTemplate>;
    }
    return <DefaultTemplate {...templateProps}>{combinedChildren}</DefaultTemplate>;
  };

  return (
    <>
      {/* Floating Theme Toggle Switch (Dark / Light) */}
      <button
        type="button"
        onClick={() => setInvitationTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        className={`fixed top-4 right-4 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xl backdrop-blur-xl border cursor-pointer active:scale-95 ${
          invitationTheme === 'light'
            ? 'bg-white/95 text-stone-800 border-[#b89742]/40 hover:bg-white shadow-[0_4px_20px_rgba(212,175,55,0.2)]'
            : 'bg-[#121215]/95 text-[#f3e0aa] border-[#d4af37]/40 hover:bg-[#1a1a20] shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
        }`}
        title={invitationTheme === 'light' ? 'Mudar para Modo Noturno' : 'Mudar para Modo Claro'}
      >
        {invitationTheme === 'light' ? (
          <Moon className="h-3.5 w-3.5 text-[#b89742]" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-[#f3e0aa]" />
        )}
        <span className="hidden sm:inline font-cinzel text-[11px] tracking-wider">
          {invitationTheme === 'light' ? 'Modo Noturno' : 'Modo Claro'}
        </span>
      </button>

      <div className="fixed top-3 inset-x-3 z-50 max-w-xl mx-auto pointer-events-auto">
        <GlobalBroadcastBanner className="backdrop-blur-md shadow-xl" />
      </div>
      {renderTemplate()}
    </>
  );
}
