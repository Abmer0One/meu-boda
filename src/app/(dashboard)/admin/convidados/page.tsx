'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { supabase } from '@/lib/supabase';
import { GuestRepository } from '@/repositories/guest.repository';
import { TableRepository } from '@/repositories/table.repository';
import { cleanGuestNotesForDisplay } from '@/repositories/checkin.repository';
import { Guest, Table } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  exportGuestsToExcel,
  importGuestsFromExcel,
  downloadGuestTemplateExcel,
  ParsedExcelGuest,
} from '@/utils/excel';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { guestSchema } from '@/validations/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformPaymentRepository } from '@/repositories/platformPayment.repository';
import EventActivationModal from '@/components/modals/EventActivationModal';
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
  Sparkles,
} from 'lucide-react';

export default function ConvidadosPage() {
  const { currentEvent } = useEvent();
  const { user } = useAuth();
  const [isLicensed, setIsLicensed] = useState(true);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
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
  const [rsvpModalOpen, setRsvpModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Excel Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedGuests, setParsedGuests] = useState<ParsedExcelGuest[]>([]);
  const [duplicateGuests, setDuplicateGuests] = useState<{
    guest: ParsedExcelGuest;
    existingGuest: Guest;
    reason: string;
  }[]>([]);
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(true);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      const [fetchedGuests, fetchedTables, licenseRes] = await Promise.all([
        GuestRepository.getAll(currentEvent.id),
        TableRepository.getAll(currentEvent.id),
        PlatformPaymentRepository.isEventLicensed(currentEvent, user?.role),
      ]);
      setGuests(fetchedGuests);
      setTables(fetchedTables);
      setIsLicensed(licenseRes.isLicensed);
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
    // Limite de 10 convidados no modo demonstração
    if (!isLicensed && guests.length >= 10) {
      setIsActivationModalOpen(true);
      return;
    }

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
      notes: cleanGuestNotesForDisplay(guest.notes),
    });
    setGuestModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (!currentEvent) return;

    if (!editingGuest && !isLicensed && guests.length >= 10) {
      setGuestModalOpen(false);
      setIsActivationModalOpen(true);
      return;
    }

    const checkinTag = editingGuest?.notes?.match(/\[CHECKIN:.*?\]/)?.[0];
    const combinedNotes = data.notes
      ? (checkinTag ? `${data.notes.trim()}\n${checkinTag}` : data.notes.trim())
      : (checkinTag || null);

    const guestPayload = {
      event_id: currentEvent.id,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      family_group: data.family_group || null,
      companions: Number(data.companions),
      table_id: data.table_id || null,
      status: data.status,
      notes: combinedNotes,
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = '';
  };

  const processFile = async (file: File) => {
    setImportFile(file);
    setIsParsingExcel(true);
    setImportSuccessMessage(null);
    try {
      const parsed = await importGuestsFromExcel(file);
      setParsedGuests(parsed);

      // Check duplicates against existing guests in currentEvent (Option A)
      const duplicates: { guest: ParsedExcelGuest; existingGuest: Guest; reason: string }[] = [];

      parsed.forEach((pg) => {
        const existingByName = guests.find(
          (g) => g.name.trim().toLowerCase() === pg.name.trim().toLowerCase()
        );
        const existingByPhone = pg.phone
          ? guests.find((g) => g.phone && g.phone === pg.phone)
          : undefined;

        if (existingByName) {
          duplicates.push({
            guest: pg,
            existingGuest: existingByName,
            reason: `Nome "${existingByName.name}" já existente`,
          });
        } else if (existingByPhone) {
          duplicates.push({
            guest: pg,
            existingGuest: existingByPhone,
            reason: `Telefone ${pg.phone} já associado a "${existingByPhone.name}"`,
          });
        }
      });

      setDuplicateGuests(duplicates);
    } catch (err: any) {
      console.error('Erro ao ler Excel:', err);
      alert('Erro ao processar o ficheiro. Certifique-se de que é uma folha de cálculo válida (.xlsx, .xls ou .csv).');
      setImportFile(null);
      setParsedGuests([]);
      setDuplicateGuests([]);
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!currentEvent || parsedGuests.length === 0) return;
    setIsImportingExcel(true);

    try {
      const duplicateRowIndices = new Set(duplicateGuests.map((d) => d.guest.rawRowIndex));
      const guestsToInsert = ignoreDuplicates
        ? parsedGuests.filter((pg) => !duplicateRowIndices.has(pg.rawRowIndex))
        : parsedGuests;

      // Limite de 10 convidados no modo demonstração
      if (!isLicensed && guests.length + guestsToInsert.length > 10) {
        setIsImportingExcel(false);
        setImportModalOpen(false);
        setIsActivationModalOpen(true);
        return;
      }

      if (guestsToInsert.length === 0) {
        alert('Todos os convidados da folha de cálculo já existem no evento e a opção de ignorar duplicados está ativada.');
        setIsImportingExcel(false);
        return;
      }

      // Map table names to table_id if table exists in currentEvent
      const tableMap = new Map(tables.map((t) => [t.name.trim().toLowerCase(), t.id]));

      const readyGuests: Omit<Guest, 'id' | 'qr_token' | 'created_at'>[] = guestsToInsert.map((pg) => {
        const tableId = pg.tableName ? tableMap.get(pg.tableName.trim().toLowerCase()) || null : null;
        return {
          event_id: currentEvent.id,
          name: pg.name,
          phone: pg.phone,
          email: pg.email,
          family_group: pg.family_group,
          companions: pg.companions,
          table_id: tableId,
          status: pg.status,
          notes: pg.notes,
          invitation_sent: false,
        };
      });

      const inserted = await GuestRepository.createMany(readyGuests);
      await loadData();

      const skippedCount = parsedGuests.length - inserted.length;
      let msg = `🎉 Sucesso! ${inserted.length} convidados foram adicionados à lista.`;
      if (skippedCount > 0) {
        msg += ` (${skippedCount} duplicados ignorados)`;
      }
      setImportSuccessMessage(msg);

      setTimeout(() => {
        setImportModalOpen(false);
        setImportFile(null);
        setParsedGuests([]);
        setDuplicateGuests([]);
        setImportSuccessMessage(null);
      }, 2000);
    } catch (err) {
      console.error('Erro ao importar convidados:', err);
      alert('Ocorreu um erro ao gravar os convidados na base de dados.');
    } finally {
      setIsImportingExcel(false);
    }
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
            <Users className="h-6 w-6 text-primary" /> Lista de Convidados
            {!isLicensed && (
              <Badge variant="warning" className="text-[10px] py-0.5 px-2 font-bold ml-1">
                Modo Demonstração: {guests.length} / 10 Grátis
              </Badge>
            )}
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

          {/* Import from Excel */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="h-4 w-4 text-emerald-600" />}
            onClick={() => {
              setImportFile(null);
              setParsedGuests([]);
              setDuplicateGuests([]);
              setImportSuccessMessage(null);
              setImportModalOpen(true);
            }}
          >
            Importar Excel
          </Button>

          {/* Export to Excel */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => exportGuestsToExcel(guests, `convidados_${currentEvent.slug}.xlsx`, tables)}
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

      {/* IMPORT EXCEL DIALOG */}
      <Dialog
        isOpen={importModalOpen}
        onClose={() => {
          if (!isImportingExcel) {
            setImportModalOpen(false);
            setImportFile(null);
            setParsedGuests([]);
            setDuplicateGuests([]);
            setImportSuccessMessage(null);
          }
        }}
        title="Importar Convidados via Excel / CSV"
        size="lg"
      >
        <div className="space-y-4">
          {importSuccessMessage ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <Check className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground">{importSuccessMessage}</p>
              <p className="text-xs text-foreground/50">A atualizar a sua lista de convidados...</p>
            </div>
          ) : (
            <>
              {/* Header template download helper banner */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl bg-secondary/30 border border-border-custom text-xs">
                <div>
                  <p className="font-semibold text-foreground">Precisa do modelo de preenchimento?</p>
                  <p className="text-[11px] text-foreground/60 mt-0.5">
                    Descarregue o modelo oficial com as colunas certas e linhas de exemplo.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />}
                  onClick={() => downloadGuestTemplateExcel('modelo_convidados_meuboda.xlsx')}
                  className="shrink-0 text-xs h-8"
                >
                  Baixar Modelo Excel
                </Button>
              </div>

              {/* Upload Dropzone */}
              {!importFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border-custom hover:border-primary/60 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-secondary/20 flex flex-col items-center justify-center space-y-2 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Clique para selecionar ou arraste o ficheiro aqui
                    </p>
                    <p className="text-xs text-foreground/50 mt-0.5">
                      Ficheiros suportados: .xlsx, .xls ou .csv
                    </p>
                  </div>
                </div>
              ) : isParsingExcel ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-xs text-foreground/50">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <span>A analisar dados da folha de cálculo...</span>
                </div>
              ) : (
                /* Preview and confirmation section */
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-card-bg border border-border-custom text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-foreground truncate">{importFile.name}</span>
                      <span className="text-foreground/40 text-[10px]">
                        ({Math.round(importFile.size / 1024)} KB)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="font-semibold text-xs">
                        {parsedGuests.length} {parsedGuests.length === 1 ? 'convidado' : 'convidados'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => {
                          setImportFile(null);
                          setParsedGuests([]);
                          setDuplicateGuests([]);
                        }}
                        className="text-xs text-foreground/50 hover:text-foreground underline cursor-pointer"
                      >
                        Trocar ficheiro
                      </button>
                    </div>
                  </div>

                  {/* Duplicate warning (Option A) */}
                  {duplicateGuests.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                      <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 font-bold">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <span>Atenção: Detectámos {duplicateGuests.length} convidado(s) já existente(s) no evento.</span>
                          <p className="text-[11px] font-normal text-foreground/70 mt-0.5">
                            Estes convidados possuem o mesmo nome ou número de telefone que já constam na sua lista.
                          </p>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 pt-1 border-t border-amber-500/20 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={ignoreDuplicates}
                          onChange={(e) => setIgnoreDuplicates(e.target.checked)}
                          className="rounded border-amber-400 text-primary focus:ring-primary h-4 w-4"
                        />
                        <span className="font-bold text-foreground text-xs">
                          Ignorar duplicados já existentes (não importar repetidos) — Recomendado
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-foreground/60 px-1">
                      <span className="font-semibold">
                        Pré-visualização (Primeiros {Math.min(parsedGuests.length, 6)} de {parsedGuests.length}):
                      </span>
                      {parsedGuests.length > 6 && (
                        <span className="text-[10px] italic">
                          +{parsedGuests.length - 6} convidados adicionais serão importados
                        </span>
                      )}
                    </div>

                    <div className="border border-border-custom rounded-xl overflow-hidden overflow-x-auto max-h-[220px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-secondary/40 text-foreground/70 font-semibold border-b border-border-custom">
                          <tr>
                            <th className="py-2 px-3">Nome</th>
                            <th className="py-2 px-3">Telefone</th>
                            <th className="py-2 px-3 text-center">Acomp.</th>
                            <th className="py-2 px-3">Grupo</th>
                            <th className="py-2 px-3">Mesa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-custom/60 bg-card-bg">
                          {parsedGuests.slice(0, 6).map((g, idx) => {
                            const isDup = duplicateGuests.some((d) => d.guest.rawRowIndex === g.rawRowIndex);
                            return (
                              <tr
                                key={idx}
                                className={`transition-colors ${
                                  isDup && ignoreDuplicates ? 'opacity-40 bg-amber-500/5' : 'hover:bg-secondary/15'
                                }`}
                              >
                                <td className="py-2 px-3 font-medium text-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <span>{g.name}</span>
                                    {isDup && (
                                      <Badge variant="warning" className="text-[9px] py-0 px-1">
                                        Existente
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-mono text-foreground/80">
                                  {g.phone || <span className="text-foreground/30 italic">Sem telefone</span>}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {g.companions > 0 ? (
                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                                      +{g.companions}
                                    </Badge>
                                  ) : (
                                    <span className="text-foreground/40">0</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-foreground/70">
                                  {g.family_group || <span className="text-foreground/30 italic">-</span>}
                                </td>
                                <td className="py-2 px-3">
                                  {g.tableName ? (
                                    <span className="text-[#D4AF37] font-semibold">{g.tableName}</span>
                                  ) : (
                                    <span className="text-foreground/40 italic">Sem Mesa</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Warning: Trial Limit Exceeded in Excel Import */}
                  {!isLicensed && (guests.length + (ignoreDuplicates ? parsedGuests.length - duplicateGuests.length : parsedGuests.length)) > 10 && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1a1a24] via-[#2a2211] to-[#1a1a24] border border-[#d4af37]/40 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md my-2">
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="p-1 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3e0aa] shrink-0">
                          <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
                        </div>
                        <div>
                          <p className="font-bold text-[#f3e0aa]">Limite de Demonstração (10 Convidados Grátis)</p>
                          <p className="text-zinc-300 text-[11px] mt-0.5">
                            A sua folha tem mais convidados do que o plano gratuito de teste. Ative a licença oficial de 45.000 Kz para importar toda a sua lista.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => {
                          setImportModalOpen(false);
                          setIsActivationModalOpen(true);
                        }}
                        className="rounded-full bg-[#d4af37] hover:bg-[#b59226] text-black font-extrabold text-xs px-4 py-1.5 shrink-0"
                      >
                        Ativar Licença
                      </Button>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border-custom">
                    <p className="text-xs text-foreground/60">
                      Serão criados{' '}
                      <strong className="text-primary font-bold">
                        {ignoreDuplicates ? parsedGuests.length - duplicateGuests.length : parsedGuests.length}
                      </strong>{' '}
                      convites no seu evento.
                    </p>

                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setImportModalOpen(false);
                          setImportFile(null);
                          setParsedGuests([]);
                          setDuplicateGuests([]);
                        }}
                        disabled={isImportingExcel}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleConfirmImport}
                        disabled={
                          isImportingExcel ||
                          (ignoreDuplicates && parsedGuests.length - duplicateGuests.length === 0)
                        }
                        className={
                          !isLicensed && (guests.length + (ignoreDuplicates ? parsedGuests.length - duplicateGuests.length : parsedGuests.length)) > 10
                            ? 'bg-[#d4af37] hover:bg-[#b59226] text-black font-extrabold'
                            : ''
                        }
                        leftIcon={
                          isImportingExcel ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )
                        }
                      >
                        {isImportingExcel
                          ? 'A importar...'
                          : !isLicensed && (guests.length + (ignoreDuplicates ? parsedGuests.length - duplicateGuests.length : parsedGuests.length)) > 10
                          ? `Ativar Licença para Importar (${
                              ignoreDuplicates ? parsedGuests.length - duplicateGuests.length : parsedGuests.length
                            })`
                          : `Confirmar Importação (${
                              ignoreDuplicates ? parsedGuests.length - duplicateGuests.length : parsedGuests.length
                            })`}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Dialog>

      {/* Modal de Ativação Oficial de Licença */}
      <EventActivationModal
        isOpen={isActivationModalOpen}
        onClose={() => setIsActivationModalOpen(false)}
        event={currentEvent}
        onPaymentSubmitted={() => {
          loadData();
        }}
      />
    </div>
  );
}
