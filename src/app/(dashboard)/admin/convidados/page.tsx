'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { supabase } from '@/lib/supabase';
import { GuestRepository } from '@/repositories/guest.repository';
import { TableRepository } from '@/repositories/table.repository';
import { Guest, Table } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { exportGuestsToExcel, importGuestsFromExcel } from '@/utils/excel';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { guestSchema } from '@/validations/schemas';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  Loader2,
  MessageCircle,
  BellRing,
  Copy,
  Check,
} from 'lucide-react';

export default function ConvidadosPage() {
  const { currentEvent } = useEvent();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Confirmed' | 'Declined'>('All');

  // Modals state
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [rsvpModalOpen, setRsvpModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(guestSchema),
  });

  const loadData = async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      const [fetchedGuests, fetchedTables] = await Promise.all([
        GuestRepository.getAll(currentEvent.id),
        TableRepository.getAll(currentEvent.id),
      ]);
      setGuests(fetchedGuests);
      setTables(fetchedTables);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentEvent?.id) return;
    loadData();

    // Unique channel identifier per component instance
    const channelId = `convidados-guests-${currentEvent.id}-${Math.random().toString(36).substring(2, 9)}`;
    let channel: any = null;

    try {
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'guests',
            filter: `event_id=eq.${currentEvent.id}`,
          },
          () => {
            loadData();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription not available on convidados:', err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent?.id]);

  // Open modal for creating a new guest
  const handleNewGuestClick = () => {
    setEditingGuest(null);
    reset({
      name: '',
      phone: '',
      email: '',
      family_group: '',
      companions: 0,
      table_id: '',
      status: 'Pending',
      notes: '',
    });
    setGuestModalOpen(true);
  };

  // Open modal for editing guest details
  const handleEditGuestClick = (guest: Guest) => {
    setEditingGuest(guest);
    reset({
      name: guest.name,
      phone: guest.phone || '',
      email: guest.email || '',
      family_group: guest.family_group || '',
      companions: guest.companions,
      table_id: guest.table_id || '',
      status: (() => {
        const s = guest.status?.toLowerCase() || '';
        if (s === 'confirmed' || s === 'confirmado' || s === 'sim' || s === 'yes') return 'Confirmed';
        if (s === 'declined' || s === 'recusado' || s === 'recusada' || s === 'não' || s === 'no') return 'Declined';
        return 'Pending';
      })() as 'Pending' | 'Confirmed' | 'Declined',
      notes: guest.notes || '',
    });
    setGuestModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (!currentEvent) return;

    const guestPayload = {
      event_id: currentEvent.id,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      family_group: data.family_group || null,
      companions: Number(data.companions),
      table_id: data.table_id || null,
      status: data.status,
      notes: data.notes || null,
      invitation_sent: editingGuest ? editingGuest.invitation_sent : false,
    };

    try {
      if (editingGuest) {
        await GuestRepository.update(editingGuest.id, guestPayload);
      } else {
        await GuestRepository.create(guestPayload);
      }
      setGuestModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClick = (guest: Guest) => {
    setGuestToDelete(guest);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!guestToDelete) return;
    try {
      await GuestRepository.delete(guestToDelete.id);
      setDeleteConfirmOpen(false);
      setGuestToDelete(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentEvent) return;

    setImportingExcel(true);
    try {
      const parsedGuests = await importGuestsFromExcel(file);
      const readyGuests = parsedGuests.map((pg) => ({
        ...pg,
        event_id: currentEvent.id,
        invitation_sent: false,
      })) as Omit<Guest, 'id' | 'qr_token' | 'created_at'>[];

      if (readyGuests.length > 0) {
        await GuestRepository.createMany(readyGuests);
        loadData();
      }
    } catch (err) {
      console.error('Error importing Excel:', err);
    } finally {
      setImportingExcel(false);
      // Reset input value
      e.target.value = '';
    }
  };

  const handleExcelTemplateDownload = () => {
    const emptyTemplate: Guest[] = [];
    exportGuestsToExcel(emptyTemplate, 'modelo_convidados.xlsx');
  };

  // Filtered Guests list
  const filteredGuests = guests.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.email && g.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (g.family_group && g.family_group.toLowerCase().includes(searchTerm.toLowerCase()));

    const normalizeStatus = (status: string) => {
      if (!status) return 'Pending';
      const s = status.toLowerCase();
      if (s === 'confirmed' || s === 'confirmado' || s === 'sim' || s === 'yes') return 'Confirmed';
      if (s === 'declined' || s === 'recusado' || s === 'recusada' || s === 'não' || s === 'no') return 'Declined';
      return 'Pending';
    };

    const matchesStatus = statusFilter === 'All' || normalizeStatus(g.status) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getTableName = (tableId: string | null) => {
    if (!tableId) return '-';
    const foundTable = tables.find((t) => t.id === tableId);
    return foundTable ? foundTable.name : 'Mesa eliminada';
  };

  const buildWhatsAppLink = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/[\s\(\)\-\+]/g, '');
    const finalPhone = cleanPhone.length === 9 ? '244' + cleanPhone : cleanPhone;
    return `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(text)}`;
  };

  const getGuestInviteLink = (guest: Guest) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/convite/${guest.qr_token || guest.id}`;
  };

  const getInviteText = (guest: Guest) => {
    if (!currentEvent) return '';
    const dateStr = new Date(currentEvent.date).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const link = getGuestInviteLink(guest);

    return `Olá ${guest.name}! ❤️\n\nConvidamos-te com muito carinho para celebrar connosco: *${currentEvent.title}*.\n\n📅 Data: ${dateStr}\n💒 Cerimónia: ${currentEvent.ceremony_location || 'A definir'}\n🎉 Recepção: ${currentEvent.party_location || 'A definir'}\n\nPor favor clica no link abaixo para acederes ao teu convite oficial, confirmares a tua presença (RSVP) e descarregares o teu passe de entrada com código QR:\n👉 ${link}\n\nContamos muito contigo!`;
  };

  const getReminderText = (guest: Guest) => {
    if (!currentEvent) return '';
    const link = getGuestInviteLink(guest);
    const dateStr = new Date(currentEvent.date).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    return `Olá ${guest.name}! ❤️\n\nEsperamos que estejas bem. Estamos na reta final da organização do nosso evento *${currentEvent.title}* (📅 ${dateStr}) e gostaríamos muito de saber se poderás celebrar este momento especial connosco!\n\nPor favor, confirma a tua presença através deste link direto:\n👉 ${link}\n\nMuito obrigado pelo carinho!`;
  };

  const handleSendWhatsAppInvite = async (guest: Guest) => {
    const text = getInviteText(guest);
    if (guest.phone) {
      window.open(buildWhatsAppLink(guest.phone, text), '_blank');
      // Mark as sent in DB
      if (!guest.invitation_sent) {
        await GuestRepository.update(guest.id, { invitation_sent: true });
        setGuests((prev) =>
          prev.map((g) => (g.id === guest.id ? { ...g, invitation_sent: true } : g))
        );
      }
    } else {
      navigator.clipboard.writeText(text);
      setCopiedId(guest.id);
      setTimeout(() => setCopiedId(null), 3000);
      alert(`O convidado "${guest.name}" não tem número de telefone registado. O texto do convite e o link de acesso foram copiados para a sua área de transferência.`);
    }
  };

  const handleSendWhatsAppReminder = async (guest: Guest) => {
    const text = getReminderText(guest);
    if (guest.phone) {
      window.open(buildWhatsAppLink(guest.phone, text), '_blank');
    } else {
      navigator.clipboard.writeText(text);
      setCopiedId(guest.id);
      setTimeout(() => setCopiedId(null), 3000);
      alert(`O convidado "${guest.name}" não tem número de telefone registado. O texto do lembrete e o link foram copiados para a sua área de transferência.`);
    }
  };

  const pendingGuests = guests.filter((g) => {
    const s = g.status?.toLowerCase() || '';
    return s !== 'confirmed' && s !== 'confirmado' && s !== 'sim' && s !== 'yes' && s !== 'declined' && s !== 'recusado';
  });

  if (!currentEvent) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <p className="text-foreground/50 text-sm">Selecione um casamento para ver os convidados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Lista de Convidados
          </h1>
          <p className="text-sm text-foreground/60">
            Adicione, edite, organize por grupos de famílias e controle a mesa de cada convidado.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Lembretes RSVP */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<BellRing className="h-4 w-4 text-amber-500" />}
            onClick={() => setRsvpModalOpen(true)}
            disabled={pendingGuests.length === 0}
            title="Enviar lembretes aos convidados com estado pendente"
          >
            Lembretes RSVP ({pendingGuests.length})
          </Button>

          {/* Export to Excel */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => exportGuestsToExcel(guests, `convidados_${currentEvent.slug}.xlsx`)}
            disabled={guests.length === 0}
          >
            Exportar Lista
          </Button>

          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleNewGuestClick} size="sm">
            Novo Convidado
          </Button>
        </div>
      </div>

      {/* Main card with table */}
      <Card className="bg-card-bg">
        {/* Filters and search panel */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-foreground/45" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, família..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-border-custom bg-background/50 pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground/50">Filtrar por RSVP:</span>
            <div className="flex border border-border-custom rounded-xl overflow-hidden text-xs">
              {(['All', 'Confirmed', 'Pending', 'Declined'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 border-r border-border-custom last:border-r-0 font-medium cursor-pointer transition-all ${
                    statusFilter === status
                      ? 'bg-primary text-white'
                      : 'bg-background hover:bg-secondary/40 text-foreground/80'
                  }`}
                >
                  {status === 'All'
                    ? 'Todos'
                    : status === 'Confirmed'
                    ? 'Confirmados'
                    : status === 'Pending'
                    ? 'Pendentes'
                    : 'Recusados'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Guest Table */}
        {loading ? (
          <div className="flex h-32 w-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredGuests.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border-custom">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-secondary/30 text-foreground/70 font-semibold border-b border-border-custom text-xs">
                  <th className="p-3.5">Nome</th>
                  <th className="p-3.5">Contacto</th>
                  <th className="p-3.5">Grupo Familiar</th>
                  <th className="p-3.5 text-center">Acompanhantes</th>
                  <th className="p-3.5">Mesa</th>
                  <th className="p-3.5">RSVP</th>
                  <th className="p-3.5 text-center">Opções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-secondary/15 transition-colors">
                    <td className="p-3.5 font-medium">{guest.name}</td>
                    <td className="p-3.5">
                      <div className="flex flex-col text-xs text-foreground/75">
                        {guest.email && <span>{guest.email}</span>}
                        {guest.phone && <span>{guest.phone}</span>}
                        {!guest.email && !guest.phone && <span className="text-foreground/40 italic">Sem contacto</span>}
                      </div>
                    </td>
                    <td className="p-3.5 text-foreground/80">{guest.family_group || '-'}</td>
                    <td className="p-3.5 text-center font-medium">{guest.companions}</td>
                    <td className="p-3.5">
                      <Badge variant={guest.table_id ? 'primary' : 'default'}>
                        {getTableName(guest.table_id)}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          (() => {
                            const s = guest.status?.toLowerCase() || '';
                            if (s === 'confirmed' || s === 'confirmado' || s === 'sim' || s === 'yes') return 'success';
                            if (s === 'declined' || s === 'recusado' || s === 'recusada' || s === 'não' || s === 'no') return 'error';
                            return 'warning';
                          })()
                        }
                      >
                        {(() => {
                          const s = guest.status?.toLowerCase() || '';
                          if (s === 'confirmed' || s === 'confirmado' || s === 'sim' || s === 'yes') return 'Confirmado';
                          if (s === 'declined' || s === 'recusado' || s === 'recusada' || s === 'não' || s === 'no') return 'Recusado';
                          return 'Pendente';
                        })()}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* WhatsApp Invite Button */}
                        <button
                          onClick={() => handleSendWhatsAppInvite(guest)}
                          className="p-1.5 rounded-lg text-[#25D366] hover:bg-[#25D366]/15 transition-all cursor-pointer"
                          title="Enviar Convite com Link RSVP via WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>

                        {/* WhatsApp RSVP Reminder for Pending Guests */}
                        {(() => {
                          const s = guest.status?.toLowerCase() || '';
                          const isPending = s !== 'confirmed' && s !== 'confirmado' && s !== 'sim' && s !== 'yes' && s !== 'declined' && s !== 'recusado';
                          if (isPending) {
                            return (
                              <button
                                onClick={() => handleSendWhatsAppReminder(guest)}
                                className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/15 transition-all cursor-pointer"
                                title="Enviar Lembrete RSVP via WhatsApp"
                              >
                                <BellRing className="h-4 w-4" />
                              </button>
                            );
                          }
                          return null;
                        })()}

                        <button
                          onClick={() => handleEditGuestClick(guest)}
                          className="p-1.5 rounded-lg text-foreground/50 hover:bg-secondary hover:text-primary transition-all cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(guest)}
                          className="p-1.5 rounded-lg text-foreground/50 hover:bg-error/10 hover:text-error transition-all cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-10 border border-dashed border-border-custom rounded-xl">
            <Users className="h-10 w-10 text-foreground/25 mb-2" />
            <p className="text-sm font-semibold text-foreground/75">Nenhum convidado encontrado</p>
            <p className="text-xs text-foreground/50 mt-1">
              Adicione novos convidados manualmente ou importe-os a partir de um ficheiro Excel.
            </p>
          </div>
        )}
      </Card>

      {/* ADD/EDIT GUEST DIALOG */}
      <Dialog
        isOpen={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        title={editingGuest ? 'Editar Convidado' : 'Novo Convidado'}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <Input label="Nome Completo" placeholder="Pedro Silva" error={errors.name?.message} {...register('name')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Telefone" placeholder="+244 912 345 678" error={errors.phone?.message} {...register('phone')} />
            <Input label="E-mail" placeholder="pedro@email.com" type="email" error={errors.email?.message} {...register('email')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Grupo Familiar (ex: Família Silva)" placeholder="Família Silva" error={errors.family_group?.message} {...register('family_group')} />
            <Input label="Acompanhantes Extra" type="number" error={errors.companions?.message} {...register('companions')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Mesa Reservada"
              options={[
                { value: '', label: 'Nenhuma (Pendente)' },
                ...tables.map((t) => ({ value: t.id, label: t.name })),
              ]}
              error={errors.table_id?.message}
              {...register('table_id')}
            />

            <Select
              label="Estado RSVP"
              options={[
                { value: 'Pending', label: 'Pendente' },
                { value: 'Confirmed', label: 'Confirmado' },
                { value: 'Declined', label: 'Recusado' },
              ]}
              error={errors.status?.message}
              {...register('status')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground/75 tracking-wide">Notas / Alergias</label>
            <textarea
              rows={3}
              placeholder="Alergia a marisco, vegetariano, etc..."
              className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setGuestModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Convidado</Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Eliminar Convidado">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-error shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Tem certeza que deseja remover este convidado?</p>
              <p className="text-xs text-foreground/60 mt-1">
                Remover <span className="font-semibold">{guestToDelete?.name}</span> apagará todos os seus registos permanentemente. Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Eliminar Convidado
            </Button>
          </div>
        </div>
      </Dialog>

      {/* RSVP REMINDER MODAL */}
      <Dialog
        isOpen={rsvpModalOpen}
        onClose={() => setRsvpModalOpen(false)}
        title={`Disparo de Lembretes de Presença (RSVP) • ${pendingGuests.length} Pendente(s)`}
      >
        <div className="space-y-4">
          <p className="text-xs text-foreground/65 leading-relaxed">
            Envie mensagens de lembrete com 1 clique via WhatsApp para os convidados que ainda não confirmaram a presença no casamento.
          </p>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-border-custom rounded-xl border border-border-custom bg-card-bg">
            {pendingGuests.length > 0 ? (
              pendingGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-secondary/15 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{guest.name}</p>
                    <p className="text-[11px] text-foreground/50 truncate">
                      {guest.phone || <span className="italic text-error">Sem telefone</span>}
                      {guest.companions > 0 && ` • +${guest.companions} acompanhante(s)`}
                      {guest.family_group && ` • ${guest.family_group}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs py-1 px-3 h-8 border-[#25D366]/40 hover:bg-[#25D366]/10 text-[#25D366]"
                      leftIcon={<MessageCircle className="h-3.5 w-3.5" />}
                      onClick={() => handleSendWhatsAppReminder(guest)}
                    >
                      WhatsApp
                    </Button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getReminderText(guest));
                        setCopiedId(guest.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="p-1.5 rounded-lg text-foreground/50 hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                      title="Copiar texto do lembrete"
                    >
                      {copiedId === guest.id ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-foreground/50">
                🎉 Parabéns! Todos os convidados já responderam ao RSVP.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setRsvpModalOpen(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
