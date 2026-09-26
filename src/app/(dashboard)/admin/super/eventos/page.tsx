'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  SuperAdminRepository,
  AdminEvent,
  AdminTask,
  AdminCheckin,
} from '@/repositories/superadmin.repository';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  CalendarDays,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Eye,
  ArrowRight,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Users,
  CheckSquare,
  RefreshCw,
  UserCheck,
  Mail,
  AlertTriangle,
  Archive,
  PlayCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function SuperAdminEventosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Diagnostic modal state
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [eventTasks, setEventTasks] = useState<AdminTask[]>([]);
  const [eventCheckins, setEventCheckins] = useState<AdminCheckin[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Transfer ownership modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferEventTarget, setTransferEventTarget] = useState<AdminEvent | null>(null);
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Status updating state
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const isAdmin = user?.app_metadata?.role === 'admin'
    || user?.email === 'amota@example.com';

  const loadEvents = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await SuperAdminRepository.getEvents();
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [isAdmin]);

  // Support Mode: enter customer event view
  const handleOpenAsSupport = (eventId: string, title: string) => {
    try {
      localStorage.setItem('meuboda_selected_event_id', eventId);
      localStorage.setItem('meuboda_support_mode', 'true');
      localStorage.setItem('meuboda_support_event_title', title);
      router.push('/admin/dashboard');
    } catch (e) {
      console.error('Failed to set support session', e);
    }
  };

  // Open Diagnostic Modal
  const handleOpenDiagnostic = async (evt: AdminEvent) => {
    setSelectedEvent(evt);
    setLoadingDetails(true);
    try {
      const [tasks, checkins] = await Promise.all([
        SuperAdminRepository.getEventTasks(evt.id),
        SuperAdminRepository.getEventCheckins(evt.id),
      ]);
      setEventTasks(tasks);
      setEventCheckins(checkins);
    } catch (err) {
      console.error('Error loading diagnostic details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Toggle Event Status (Active <-> Archived)
  const handleToggleStatus = async (evt: AdminEvent) => {
    const newStatus = evt.status === 'Active' ? 'Archived' : 'Active';
    setUpdatingStatusId(evt.id);
    try {
      const success = await SuperAdminRepository.updateEventStatus(evt.id, newStatus);
      if (success) {
        setEvents(prev =>
          prev.map(e => (e.id === evt.id ? { ...e, status: newStatus } : e))
        );
        if (selectedEvent?.id === evt.id) {
          setSelectedEvent({ ...selectedEvent, status: newStatus });
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Transfer Ownership Submit
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferEventTarget || !newOwnerEmail.trim()) return;

    setTransferring(true);
    setTransferError(null);
    try {
      const res = await SuperAdminRepository.transferEvent(transferEventTarget.id, newOwnerEmail.trim());
      if (res.success) {
        setEvents(prev =>
          prev.map(evt =>
            evt.id === transferEventTarget.id ? { ...evt, owner_email: newOwnerEmail.trim() } : evt
          )
        );
        setTransferModalOpen(false);
        setTransferEventTarget(null);
        setNewOwnerEmail('');
      } else {
        setTransferError(res.error || 'Erro ao transferir evento.');
      }
    } catch (err: any) {
      setTransferError(err?.message || 'Falha na comunicação com o servidor.');
    } finally {
      setTransferring(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 max-w-lg mx-auto">
        <ShieldAlert className="h-16 w-16 text-error mb-4" />
        <h2 className="text-xl font-bold text-foreground">Acesso Negado</h2>
        <p className="text-sm text-foreground/60 mt-2">
          Área exclusiva para administradores da plataforma Meu Boda.
        </p>
      </div>
    );
  }

  // Filter events
  const filteredEvents = events.filter(evt => {
    const matchesSearch =
      (evt.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (evt.owner_email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (evt.slug?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesType = typeFilter === 'all' || evt.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || evt.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const activeCount = events.filter(e => e.status === 'Active').length;
  const archivedCount = events.filter(e => e.status === 'Archived').length;
  const totalGuests = events.reduce((sum, e) => sum + (e.guests_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Gestão Global de Eventos
            </h1>
            <Badge variant="primary">{events.length} Totais</Badge>
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            Controlo centralizado de todos os casamentos e celebrações ativos e arquivados no sistema.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadEvents}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const headers = ['ID', 'Título', 'Slug', 'Tipo', 'Proprietário', 'Data', 'Estado', 'Convidados', 'Check-ins', 'Tarefas'];
              const rows = events.map(e => [
                e.id,
                e.title,
                e.slug,
                e.type,
                e.owner_email,
                e.date,
                e.status,
                e.guests_count,
                e.checkins_count,
                e.total_tasks,
              ]);
              SuperAdminRepository.exportToCSV('eventos_meuboda', headers, rows);
            }}
            className="flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Total de Eventos</p>
          <p className="text-2xl font-bold text-foreground mt-1">{events.length}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Eventos Ativos</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{activeCount}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Eventos Arquivados</p>
          <p className="text-2xl font-bold text-foreground/40 mt-1">{archivedCount}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Convidados Registados</p>
          <p className="text-2xl font-bold text-primary mt-1">{totalGuests.toLocaleString()}</p>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="bg-card-bg border-border-custom p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <Input
              placeholder="Pesquisar por título, email ou link..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-border-custom"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-foreground/40" />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border-custom text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todos os Tipos de Celebração</option>
              <option value="casamento">Casamento</option>
              <option value="aniversario">Aniversário</option>
              <option value="corporativo">Corporativo</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border-custom text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todos os Estados</option>
              <option value="Active">Apenas Ativos</option>
              <option value="Archived">Apenas Arquivados</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Events Table / List */}
      <Card className="bg-card-bg border-border-custom overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center p-12">
            <p className="text-foreground/50 text-sm">Nenhum evento encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-foreground/[0.02] text-foreground/60 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Evento / Titular</th>
                  <th className="py-3 px-4">Data Prevista</th>
                  <th className="py-3 px-4 text-center">Convidados</th>
                  <th className="py-3 px-4 text-center">Check-ins</th>
                  <th className="py-3 px-4 text-center">Tarefas</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50">
                {filteredEvents.map(evt => {
                  const checkinPct = evt.guests_count > 0
                    ? Math.round((evt.checkins_count / evt.guests_count) * 100)
                    : 0;
                  const taskPct = evt.total_tasks > 0
                    ? Math.round((evt.completed_tasks / evt.total_tasks) * 100)
                    : 0;

                  return (
                    <tr key={evt.id} className="hover:bg-foreground/[0.015] transition-colors">
                      {/* Title & Owner */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>{evt.title}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/60 border border-border-custom">
                            {evt.type || 'evento'}
                          </span>
                        </div>
                        <div className="text-xs text-foreground/50 flex items-center gap-1.5 mt-0.5">
                          <Mail className="h-3 w-3" />
                          <span>{evt.owner_email || 'Sem proprietário associado'}</span>
                        </div>
                        {evt.slug && (
                          <div className="text-[11px] text-primary/80 mt-0.5 flex items-center gap-1">
                            <span className="opacity-60">Link:</span>
                            <a
                              href={`/convite/${evt.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline flex items-center gap-0.5 font-mono"
                            >
                              /convite/{evt.slug}
                              <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs font-medium text-foreground">
                          {evt.date ? new Date(evt.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sem data'}
                        </div>
                        <div className="text-[11px] text-foreground/40 mt-0.5">
                          {evt.created_at ? `Criado a ${new Date(evt.created_at).toLocaleDateString('pt-PT')}` : ''}
                        </div>
                      </td>

                      {/* Guests */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-foreground text-sm">
                          {evt.guests_count || 0}
                        </div>
                        <div className="text-[10px] text-foreground/40">
                          {evt.confirmed_guests_count || 0} confirmados
                        </div>
                      </td>

                      {/* Check-ins */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-foreground text-sm flex items-center justify-center gap-1">
                          <span>{evt.checkins_count || 0}</span>
                          {evt.guests_count > 0 && (
                            <span className="text-[10px] text-emerald-500 font-semibold">
                              ({checkinPct}%)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-foreground/40">na portaria</div>
                      </td>

                      {/* Tasks */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-semibold text-foreground text-xs">
                          {evt.completed_tasks}/{evt.total_tasks}
                        </div>
                        <div className="w-16 bg-foreground/10 h-1 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${taskPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(evt)}
                          disabled={updatingStatusId === evt.id}
                          className="group inline-flex items-center gap-1 cursor-pointer transition-opacity"
                          title="Clique para alternar estado"
                        >
                          {evt.status === 'Active' ? (
                            <Badge variant="success" className="group-hover:opacity-80">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="default" className="group-hover:opacity-80">
                              <Archive className="h-3 w-3 mr-1 text-foreground/40" />
                              Arquivado
                            </Badge>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Modo Suporte */}
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenAsSupport(evt.id, evt.title)}
                            className="h-8 text-xs font-semibold px-2.5 flex items-center gap-1 bg-primary text-black hover:bg-primary-hover shadow-sm"
                            title="Entrar no painel deste evento como suporte"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Suporte</span>
                          </Button>

                          {/* Diagnóstico */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDiagnostic(evt)}
                            className="h-8 text-xs px-2.5 flex items-center gap-1 border-border-custom hover:bg-foreground/5"
                            title="Ver detalhes de diagnóstico e logs do evento"
                          >
                            <CheckSquare className="h-3.5 w-3.5" />
                            <span>Diag</span>
                          </Button>

                          {/* Transferir Titularidade */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setTransferEventTarget(evt);
                              setNewOwnerEmail('');
                              setTransferError(null);
                              setTransferModalOpen(true);
                            }}
                            className="h-8 text-xs px-2 flex items-center gap-1 border-border-custom hover:bg-foreground/5 text-foreground/70"
                            title="Transferir evento para outra conta de utilizador"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* DIAGNOSTIC MODAL */}
      <Dialog
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent ? `Diagnóstico: ${selectedEvent.title}` : 'Diagnóstico'}
        size="lg"
      >
        {selectedEvent && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="bg-foreground/5 rounded-xl p-4 border border-border-custom space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-foreground/50 block">ID do Evento:</span>
                  <span className="font-mono text-foreground font-semibold break-all">{selectedEvent.id}</span>
                </div>
                <div>
                  <span className="text-foreground/50 block">Proprietário:</span>
                  <span className="font-medium text-foreground">{selectedEvent.owner_email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-foreground/50 block">Data Prevista:</span>
                  <span className="font-medium text-foreground">
                    {selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString('pt-PT') : 'Sem data'}
                  </span>
                </div>
              </div>
            </div>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tasks block */}
                <div className="border border-border-custom rounded-xl p-4 bg-background/40">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      Tarefas ({eventTasks.length})
                    </h4>
                  </div>
                  {eventTasks.length === 0 ? (
                    <p className="text-xs text-foreground/40 italic py-4 text-center">Nenhuma tarefa criada neste evento.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {eventTasks.map(t => (
                        <div key={t.id} className="text-xs flex items-center justify-between p-2 rounded bg-foreground/[0.02] border border-border-custom/50">
                          <span className={`font-medium ${t.status === 'Completed' ? 'line-through text-foreground/40' : 'text-foreground'}`}>
                            {t.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/60">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Check-ins block */}
                <div className="border border-border-custom rounded-xl p-4 bg-background/40">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-emerald-500" />
                      Entradas na Portaria ({eventCheckins.length})
                    </h4>
                  </div>
                  {eventCheckins.length === 0 ? (
                    <p className="text-xs text-foreground/40 italic py-4 text-center">Nenhum check-in efetuado até ao momento.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {eventCheckins.map(c => (
                        <div key={c.id} className="text-xs flex items-center justify-between p-2 rounded bg-foreground/[0.02] border border-border-custom/50">
                          <div>
                            <span className="font-semibold text-foreground">{c.guest_name}</span>
                            <span className="text-[10px] text-foreground/50 block">Operador: {c.operator || 'Portaria'}</span>
                          </div>
                          <span className="text-[10px] font-mono text-foreground/60">
                            {new Date(c.checked_at).toLocaleTimeString('pt-PT')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border-custom">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleStatus(selectedEvent)}
                disabled={updatingStatusId === selectedEvent.id}
                className="text-xs"
              >
                {selectedEvent.status === 'Active' ? 'Arquivar Evento' : 'Reativar Evento'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const id = selectedEvent.id;
                  const title = selectedEvent.title;
                  setSelectedEvent(null);
                  handleOpenAsSupport(id, title);
                }}
                className="text-xs flex items-center gap-1 bg-primary text-black hover:bg-primary-hover"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Abrir como Suporte</span>
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* TRANSFER MODAL */}
      <Dialog
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Transferir Titularidade do Evento"
        size="md"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <p className="text-xs text-foreground/70">
            Transfira a propriedade do evento <strong className="text-foreground">{transferEventTarget?.title}</strong> para a conta de outro utilizador registado.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">Email do Novo Titular</label>
            <Input
              type="email"
              required
              placeholder="exemplo@meuboda.com"
              value={newOwnerEmail}
              onChange={e => setNewOwnerEmail(e.target.value)}
              className="bg-background/50 border-border-custom"
            />
          </div>

          {transferError && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-xs text-error flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{transferError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTransferModalOpen(false)}
              disabled={transferring}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={transferring || !newOwnerEmail.trim()}
              className="bg-primary text-black hover:bg-primary-hover"
            >
              {transferring ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  A transferir...
                </>
              ) : (
                'Confirmar Transferência'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
