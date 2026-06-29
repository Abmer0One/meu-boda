'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { GuestRepository } from '@/repositories/guest.repository';
import { TableRepository } from '@/repositories/table.repository';
import { EventRepository } from '@/repositories/event.repository';
import { ScheduleRepository } from '@/repositories/schedule.repository';
import { Guest, Table, EventSchedule } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { generateQRCode } from '@/utils/qr';
import { generateGuestPDF } from '@/utils/pdf';
import { supabase } from '@/lib/supabase';
import {
  MailOpen,
  Upload,
  Download,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  Loader2,
  Users,
  Send,
  MessageSquare,
  Mail,
} from 'lucide-react';

export default function ConvitesPage() {
  const { currentEvent, setCurrentEvent, refreshEvents } = useEvent();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [schedules, setSchedules] = useState<EventSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Individual send modal
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [messageText, setMessageText] = useState('');

  // Bulk send wizard modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkQueue, setBulkQueue] = useState<Guest[]>([]);
  const [bulkIndex, setBulkIndex] = useState(0);
  const [bulkChannel, setBulkChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [bulkMessageText, setBulkMessageText] = useState('');

  const getInvitationMessage = (guest: Guest) => {
    if (!currentEvent) return '';
    const rsvpLink = `${window.location.origin}/convite/${guest.qr_token}`;
    const dateStr = new Date(currentEvent.date).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    
    if (currentEvent.type === 'casamento') {
      return `Olá ${guest.name}! ❤️\n\nConvidamos-te para o nosso casamento: *${currentEvent.title}*.\n\n📅 Data: ${dateStr}\n💒 Cerimónia: ${currentEvent.ceremony_location || 'A definir'}${currentEvent.ceremony_time ? ` às ${currentEvent.ceremony_time}` : ''}\n🎉 Festa: ${currentEvent.party_location || 'A definir'}${currentEvent.party_time ? ` às ${currentEvent.party_time}` : ''}\n\nPor favor, confirma a tua presença (RSVP) e descarrega o teu passe com código QR no seguinte link:\n👉 ${rsvpLink}\n\nMal podemos esperar para celebrar contigo!`;
    } else {
      return `Olá ${guest.name}! 🎉\n\nConvidamos-te para o evento: *${currentEvent.title}*.\n\n📅 Data: ${dateStr}\n📍 Local: ${currentEvent.ceremony_location || 'A definir'}\n\nPor favor, confirma a tua presença (RSVP) no seguinte link:\n👉 ${rsvpLink}\n\nContamos com a tua presença!`;
    }
  };

  const handleOpenSendModal = (guest: Guest) => {
    setSelectedGuest(guest);
    setMessageText(getInvitationMessage(guest));
    setSendModalOpen(true);
  };

  const handleSendChannel = async (channel: 'whatsapp' | 'sms' | 'email', guest: Guest, text: string) => {
    if (!currentEvent) return;

    const encodedText = encodeURIComponent(text);
    let url = '';

    if (channel === 'whatsapp') {
      if (!guest.phone) {
        alert('Este convidado não tem número de telefone registado.');
        return;
      }
      const phoneClean = guest.phone.replace(/[\s\(\)\-\+]/g, '');
      const finalPhone = phoneClean.length === 9 ? '244' + phoneClean : phoneClean;
      url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodedText}`;
    } else if (channel === 'sms') {
      if (!guest.phone) {
        alert('Este convidado não tem número de telefone registado.');
        return;
      }
      url = `sms:${guest.phone}?body=${encodedText}`;
    } else if (channel === 'email') {
      if (!guest.email) {
        alert('Este convidado não tem e-mail registado.');
        return;
      }
      const subject = encodeURIComponent(`Convite para ${currentEvent.title}`);
      url = `mailto:${guest.email}?subject=${subject}&body=${encodedText}`;
    }

    if (url) {
      window.open(url, '_blank');
      
      // Mark as sent in DB
      if (!guest.invitation_sent) {
        await GuestRepository.update(guest.id, { invitation_sent: true });
        setGuests((prev) =>
          prev.map((g) => (g.id === guest.id ? { ...g, invitation_sent: true } : g))
        );
      }
    }
  };

  const handleMarkAsSentDirectly = async (guest: Guest) => {
    try {
      await GuestRepository.update(guest.id, { invitation_sent: !guest.invitation_sent });
      setGuests((prev) =>
        prev.map((g) => (g.id === guest.id ? { ...g, invitation_sent: !g.invitation_sent } : g))
      );
      if (selectedGuest && selectedGuest.id === guest.id) {
        setSelectedGuest((prev) => prev ? { ...prev, invitation_sent: !prev.invitation_sent } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenBulkModal = () => {
    // Get all guests who have not received invitation yet
    const pending = guests.filter((g) => !g.invitation_sent && g.status !== 'Declined');
    if (pending.length === 0) {
      alert('Todos os convidados já têm o convite enviado (ou recusaram)!');
      return;
    }
    setBulkQueue(pending);
    setBulkIndex(0);
    setBulkChannel('whatsapp');
    setBulkMessageText(getInvitationMessage(pending[0]));
    setBulkModalOpen(true);
  };

  const handleBulkNext = async () => {
    if (bulkIndex >= bulkQueue.length) return;
    const currentGuest = bulkQueue[bulkIndex];
    
    // Send
    await handleSendChannel(bulkChannel, currentGuest, bulkMessageText);

    // Advance
    const nextIndex = bulkIndex + 1;
    setBulkIndex(nextIndex);
    if (nextIndex < bulkQueue.length) {
      setBulkMessageText(getInvitationMessage(bulkQueue[nextIndex]));
    }
  };

  const loadData = async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      const [fetchedGuests, fetchedTables, fetchedSchedules] = await Promise.all([
        GuestRepository.getAll(currentEvent.id),
        TableRepository.getAll(currentEvent.id),
        ScheduleRepository.getAll(currentEvent.id),
      ]);
      setGuests(fetchedGuests);
      setTables(fetchedTables);
      setSchedules(fetchedSchedules);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent]);

  // Upload invitation image to Supabase Storage
  const handleInvitationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentEvent) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentEvent.id}/convite_${Date.now()}.${fileExt}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from('invitations')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invitations')
        .getPublicUrl(data.path);

      // Save to event
      const updatedEvent = await EventRepository.update(currentEvent.id, {
        cover_image: publicUrl,
      });

      if (updatedEvent) {
        await refreshEvents();
        setCurrentEvent(updatedEvent);
      }
    } catch (err) {
      console.error('Error uploading invitation:', err);
    } finally {
      setUploading(false);
    }
  };

  const getTableName = (tableId: string | null) => {
    if (!tableId) return 'Sem Mesa';
    const foundTable = tables.find((t) => t.id === tableId);
    return foundTable ? foundTable.name : 'Mesa eliminada';
  };

  // Helper to generate the guest PDF download
  const handleDownloadPDF = async (guest: Guest) => {
    if (!currentEvent) return;
    setDownloadingId(guest.id);
    try {
      const tableName = getTableName(guest.table_id);

      // JSON metadata inside the QR Code
      const qrData = {
        eventId: currentEvent.id,
        guestId: guest.id,
        name: guest.name,
        table: tableName,
        companions: guest.companions.toString(),
        event: currentEvent.title,
        date: currentEvent.date.split('T')[0],
        token: guest.qr_token, // for check-in validation
      };

      const qrCodeUrl = await generateQRCode(qrData);
      const pdf = await generateGuestPDF(guest, currentEvent, tableName, qrCodeUrl, schedules);
      
      pdf.save(`convite_${guest.name.replace(/\s+/g, '_')}.pdf`);

      // Mark as sent
      if (!guest.invitation_sent) {
        await GuestRepository.update(guest.id, { invitation_sent: true });
        // Update local state
        setGuests((prev) =>
          prev.map((g) => (g.id === guest.id ? { ...g, invitation_sent: true } : g))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  // Bulk download PDFs for all Confirmed/Pending guests
  const handleBulkDownload = async () => {
    if (!currentEvent || guests.length === 0) return;
    setBulkDownloading(true);
    try {
      // Loop over guests and download sequentially (with slight delay to avoid browser blocking)
      for (const guest of guests) {
        if (guest.status === 'Declined') continue;
        await handleDownloadPDF(guest);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBulkDownloading(false);
    }
  };

  if (!currentEvent) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <p className="text-foreground/50 text-sm">Selecione um casamento para gerir os convites.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MailOpen className="h-6 w-6 text-primary" /> Convites & QR Codes
          </h1>
          <p className="text-sm text-foreground/60">
            Carregue o design do seu convite Canva, associe aos convidados e gere as folhas complementares com QR Code.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            leftIcon={<Send className="h-4 w-4" />}
            onClick={handleOpenBulkModal}
            disabled={guests.length === 0}
            size="sm"
          >
            Enviar Convites (Massa)
          </Button>
          <Button
            leftIcon={bulkDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            onClick={handleBulkDownload}
            disabled={bulkDownloading || guests.length === 0}
            size="sm"
          >
            Gerar Todos PDFs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Canva Template Upload */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-card-bg">
            <CardHeader>
              <CardTitle>Arte do Convite (PNG/JPG)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border-custom rounded-xl p-6 flex flex-col items-center justify-center text-center bg-secondary/10 relative overflow-hidden min-h-[220px]">
                {currentEvent.cover_image ? (
                  <div className="space-y-4 w-full h-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentEvent.cover_image}
                      alt="Convite"
                      className="w-full h-40 object-contain rounded-lg border border-border-custom"
                    />
                    <p className="text-xs text-foreground/50">Arte do convite ativa</p>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="h-10 w-10 text-foreground/30 mb-3" />
                    <p className="text-sm font-semibold">Carregar Convite Canva</p>
                    <p className="text-xs text-foreground/50 mt-1 max-w-[200px]">
                      Exportar do Canva em PNG e carregar aqui.
                    </p>
                  </>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleInvitationUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:pointer-events-none"
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  leftIcon={<Upload className="h-4 w-4" />}
                >
                  Substituir Imagem
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Guest invite status & download */}
        <div className="lg:col-span-8">
          <Card className="bg-card-bg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Envio de Convites por Convidado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : guests.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border-custom">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-secondary/30 text-foreground/70 font-semibold border-b border-border-custom text-xs">
                        <th className="p-3">Convidado</th>
                        <th className="p-3">Mesa</th>
                        <th className="p-3">Acompanhantes</th>
                        <th className="p-3">Estado Envio</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {guests.map((guest) => (
                        <tr key={guest.id} className="hover:bg-secondary/15 transition-colors">
                          <td className="p-3 font-medium">{guest.name}</td>
                          <td className="p-3 text-foreground/75">{getTableName(guest.table_id)}</td>
                          <td className="p-3 text-center">{guest.companions}</td>
                          <td className="p-3">
                            {guest.invitation_sent ? (
                              <Badge variant="success" className="gap-1">
                                <CheckCircle className="h-3 w-3" /> Enviado
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="gap-1">
                                <Clock className="h-3 w-3" /> Pendente
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={
                                  downloadingId === guest.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Download className="h-3.5 w-3.5" />
                                  )
                                }
                                onClick={() => handleDownloadPDF(guest)}
                                disabled={downloadingId !== null || guest.status === 'Declined'}
                              >
                                Baixar PDF
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Send className="h-3.5 w-3.5" />}
                                onClick={() => handleOpenSendModal(guest)}
                                disabled={guest.status === 'Declined'}
                              >
                                Enviar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-foreground/50 border border-dashed border-border-custom rounded-xl">
                  Nenhum convidado registado para envio de convites.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* INDIVIDUAL SEND DIALOG */}
      <Dialog
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        title={`Enviar Convite - ${selectedGuest?.name}`}
      >
        <div className="space-y-4">
          <div className="space-y-1 text-xs">
            <p className="text-foreground/60"><span className="font-semibold">Contacto Telefónico:</span> {selectedGuest?.phone || <span className="italic text-error">Não registado</span>}</p>
            <p className="text-foreground/60"><span className="font-semibold">E-mail:</span> {selectedGuest?.email || <span className="italic text-error">Não registado</span>}</p>
            <p className="text-foreground/60"><span className="font-semibold">Estado Envio:</span> {selectedGuest?.invitation_sent ? <span className="text-success font-semibold">Enviado</span> : <span className="text-warning font-semibold">Pendente</span>}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground/75 tracking-wide">Mensagem a Enviar</label>
            <textarea
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            />
          </div>

          <div className="border-t border-border-custom pt-4">
            <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2.5">Canais de Envio</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button
                variant="outline"
                leftIcon={<MessageSquare className="h-4 w-4 text-[#25D366]" />}
                onClick={() => selectedGuest && handleSendChannel('whatsapp', selectedGuest, messageText)}
                disabled={!selectedGuest?.phone}
                className="justify-center text-xs"
              >
                WhatsApp
              </Button>
              <Button
                variant="outline"
                leftIcon={<Send className="h-4 w-4 text-blue-500" />}
                onClick={() => selectedGuest && handleSendChannel('sms', selectedGuest, messageText)}
                disabled={!selectedGuest?.phone}
                className="justify-center text-xs"
              >
                SMS / Normal
              </Button>
              <Button
                variant="outline"
                leftIcon={<Mail className="h-4 w-4 text-primary" />}
                onClick={() => selectedGuest && handleSendChannel('email', selectedGuest, messageText)}
                disabled={!selectedGuest?.email}
                className="justify-center text-xs"
              >
                E-mail
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-border-custom pt-4 mt-2">
            <Button
              variant="ghost"
              onClick={() => selectedGuest && handleMarkAsSentDirectly(selectedGuest)}
              className="text-xs"
            >
              {selectedGuest?.invitation_sent ? 'Marcar como Pendente' : 'Marcar como Enviado'}
            </Button>
            <Button variant="outline" onClick={() => setSendModalOpen(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </Dialog>

      {/* BULK SEND WIZARD DIALOG */}
      <Dialog
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Assistente de Envio em Massa"
      >
        <div className="space-y-4">
          {bulkIndex < bulkQueue.length ? (
            <>
              {/* Progress */}
              <div className="flex items-center justify-between text-xs font-semibold text-foreground/50 border-b border-border-custom pb-2">
                <span>Convidado {bulkIndex + 1} de {bulkQueue.length}</span>
                <span>Progresso: {Math.round((bulkIndex / bulkQueue.length) * 100)}%</span>
              </div>

              {/* Guest Details */}
              <div className="bg-secondary/10 p-3 rounded-xl space-y-1 text-xs">
                <p className="font-bold text-sm text-foreground">{bulkQueue[bulkIndex].name}</p>
                <p className="text-foreground/60"><span className="font-semibold">Telefone:</span> {bulkQueue[bulkIndex].phone || <span className="italic text-error">Não registado</span>}</p>
                <p className="text-foreground/60"><span className="font-semibold">E-mail:</span> {bulkQueue[bulkIndex].email || <span className="italic text-error">Não registado</span>}</p>
              </div>

              {/* Channel Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground/75 tracking-wide">Canal Preferido</label>
                <div className="grid grid-cols-3 border border-border-custom rounded-xl overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setBulkChannel('whatsapp')}
                    className={`py-2 text-center font-medium cursor-pointer transition-all ${
                      bulkChannel === 'whatsapp' ? 'bg-[#25D366] text-white' : 'bg-background hover:bg-secondary/40 text-foreground/70'
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkChannel('sms')}
                    className={`py-2 text-center font-medium cursor-pointer transition-all ${
                      bulkChannel === 'sms' ? 'bg-blue-500 text-white' : 'bg-background hover:bg-secondary/40 text-foreground/70'
                    }`}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkChannel('email')}
                    className={`py-2 text-center font-medium cursor-pointer transition-all ${
                      bulkChannel === 'email' ? 'bg-primary text-white' : 'bg-background hover:bg-secondary/40 text-foreground/70'
                    }`}
                  >
                    E-mail
                  </button>
                </div>
              </div>

              {/* Message text area */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground/75 tracking-wide">Mensagem Personalizada</label>
                <textarea
                  rows={5}
                  value={bulkMessageText}
                  onChange={(e) => setBulkMessageText(e.target.value)}
                  className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-2">
                <Button variant="ghost" onClick={() => setBulkIndex(bulkIndex + 1)} className="text-xs text-foreground/50">
                  Saltar
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setBulkModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleBulkNext}
                    disabled={
                      (bulkChannel === 'whatsapp' && !bulkQueue[bulkIndex].phone) ||
                      (bulkChannel === 'sms' && !bulkQueue[bulkIndex].phone) ||
                      (bulkChannel === 'email' && !bulkQueue[bulkIndex].email)
                    }
                  >
                    Enviar e Avançar
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <CheckCircle className="h-14 w-14 text-success mx-auto" />
              <div>
                <h3 className="text-lg font-bold">Fila de Envio Concluída!</h3>
                <p className="text-xs text-foreground/50 mt-1">
                  Todos os convidados da fila foram processados.
                </p>
              </div>
              <Button onClick={() => setBulkModalOpen(false)} className="mx-auto">
                Concluir
              </Button>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
