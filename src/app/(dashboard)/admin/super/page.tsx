'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminRepository, AdminUser, AdminEvent, AdminTask, AdminCheckin } from '@/repositories/superadmin.repository';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { 
  ShieldAlert, 
  Users, 
  Heart, 
  Loader2, 
  Settings, 
  Edit3, 
  TrendingUp, 
  Award,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  CheckSquare,
  Activity,
  UserCheck
} from 'lucide-react';

export default function SuperAdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter states
  const [searchUser, setSearchUser] = useState('');
  const [searchEvent, setSearchEvent] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'events'>('users');
  
  // Edit License Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState('user');
  const [newSlots, setNewSlots] = useState(1);
  const [isUpdating, setIsUpdating] = useState(false);

  // Diagnostic Modal state
  const [diagModalOpen, setDiagModalOpen] = useState(false);
  const [selectedDiagEvent, setSelectedDiagEvent] = useState<AdminEvent | null>(null);
  const [diagTasks, setDiagTasks] = useState<AdminTask[]>([]);
  const [diagCheckins, setDiagCheckins] = useState<AdminCheckin[]>([]);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [diagActiveTab, setDiagActiveTab] = useState<'tasks' | 'checkins'>('checkins');

  const [toastSuccess, setToastSuccess] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  // Check if current user is admin
  const isAdmin = user?.app_metadata?.role === 'admin' 
    || user?.email?.includes('admin') 
    || user?.email === 'amota@example.com';

  const loadData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [fetchedUsers, fetchedEvents] = await Promise.all([
        SuperAdminRepository.getUsers(),
        SuperAdminRepository.getEvents()
      ]);
      setUsers(fetchedUsers);
      setEvents(fetchedEvents);
    } catch (err) {
      console.error('Error loading super admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleOpenEdit = (targetUser: AdminUser) => {
    setSelectedUser(targetUser);
    setNewRole(targetUser.role || 'user');
    setNewSlots(targetUser.planner_slots || 1);
    setEditModalOpen(true);
  };

  const handleOpenDiagnostics = async (targetEvent: AdminEvent) => {
    setSelectedDiagEvent(targetEvent);
    setDiagModalOpen(true);
    setLoadingDiag(true);
    setDiagActiveTab('checkins');
    try {
      const [tasks, checkins] = await Promise.all([
        SuperAdminRepository.getEventTasks(targetEvent.id),
        SuperAdminRepository.getEventCheckins(targetEvent.id)
      ]);
      setDiagTasks(tasks);
      setDiagCheckins(checkins);
    } catch (err) {
      console.error('Error loading diagnostics data:', err);
    } finally {
      setLoadingDiag(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsUpdating(true);
    setToastSuccess(null);
    setToastError(null);
    
    try {
      const success = await SuperAdminRepository.updateUserMeta(
        selectedUser.id,
        newRole,
        newSlots
      );

      if (success) {
        setToastSuccess(`Utilizador ${selectedUser.email} atualizado com sucesso!`);
        setEditModalOpen(false);
        await loadData();
      } else {
        setToastError('Falha ao atualizar os dados do utilizador.');
      }
    } catch (err: any) {
      setToastError(err.message || 'Ocorreu um erro ao processar a atualização.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 max-w-lg mx-auto">
        <ShieldAlert className="h-16 w-16 text-error mb-4" />
        <h2 className="text-xl font-bold text-foreground">Acesso Negado</h2>
        <p className="text-sm text-foreground/60 mt-2">
          Este ambiente é estritamente confidencial e reservado aos administradores da plataforma Meu Boda.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-foreground/60 font-medium">A carregar consola de controlo...</p>
        </div>
      </div>
    );
  }

  // Analytics helper calculations
  const activeEventsCount = events.filter(e => e.status === 'Active').length;
  const archivedEventsCount = events.filter(e => e.status === 'Archived').length;
  // Estimate revenue: B2C single licenses + subscriptions
  const estimatedRevenue = (events.length * 45000) + (users.filter(u => u.role === 'planner').length * 20000);

  // Filtered lists
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.role && u.role.toLowerCase().includes(searchUser.toLowerCase()))
  );

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchEvent.toLowerCase()) ||
    e.owner_email.toLowerCase().includes(searchEvent.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Consola Super Admin
        </h1>
        <p className="text-sm text-foreground/60">
          Monitorize todos os utilizadores, controle slots ativos, modere e diagnostique o andamento de cada evento.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card-bg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Total Utilizadores</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{users.length}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Total Eventos</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{events.length}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Heart className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Eventos Ativos</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {activeEventsCount} <span className="text-xs text-foreground/40 font-normal">/ {archivedEventsCount} arq.</span>
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Faturação Estimada</p>
                <h3 className="text-2xl font-bold text-primary mt-1">
                  {estimatedRevenue.toLocaleString('pt-PT')} <span className="text-xs font-semibold">Kz</span>
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Award className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {toastSuccess && (
        <div className="rounded-xl bg-success/15 p-3.5 text-xs text-success font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
          <span>{toastSuccess}</span>
        </div>
      )}
      {toastError && (
        <div className="rounded-xl bg-error/15 p-3.5 text-xs text-error font-medium flex items-center gap-2">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Tabs Control */}
      <div className="flex border-b border-border-custom gap-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-foreground/50 hover:text-foreground/80'
          }`}
        >
          Gestão de Utilizadores ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'events' ? 'border-primary text-primary' : 'border-transparent text-foreground/50 hover:text-foreground/80'
          }`}
        >
          Eventos Criados ({events.length})
        </button>
      </div>

      {/* TAB CONTENT: USERS */}
      {activeTab === 'users' && (
        <Card className="bg-card-bg">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Utilizadores Registados</CardTitle>
            <div className="w-full sm:w-72">
              <Input
                placeholder="Pesquisar por email ou tipo..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-custom text-foreground/50 font-semibold text-xs tracking-wider">
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Data de Registo</th>
                  <th className="py-3 px-4">Eventos Criados</th>
                  <th className="py-3 px-4">Tipo (Role)</th>
                  <th className="py-3 px-4">Slots Planner</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border-custom/50 hover:bg-secondary/5 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-foreground">{u.email}</td>
                      <td className="py-3.5 px-4 text-foreground/60">
                        {new Date(u.created_at).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground/80">{u.events_count} evento(s)</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          u.role === 'admin' 
                            ? 'bg-error/10 text-error' 
                            : u.role === 'planner'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-secondary text-foreground/75'
                        }`}>
                          {u.role === 'admin' ? 'Super Admin' : u.role === 'planner' ? 'Planner B2B' : 'Noivos B2C'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-foreground/80">{u.planner_slots}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                          onClick={() => handleOpenEdit(u)}
                          className="text-xs"
                        >
                          Licenciamento
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-foreground/50">
                      Nenhum utilizador encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: EVENTS */}
      {activeTab === 'events' && (
        <Card className="bg-card-bg">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Histórico de Eventos</CardTitle>
            <div className="w-full sm:w-72">
              <Input
                placeholder="Pesquisar por noivos ou dono..."
                value={searchEvent}
                onChange={(e) => setSearchEvent(e.target.value)}
                className="text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-custom text-foreground/50 font-semibold text-xs tracking-wider">
                  <th className="py-3 px-4">Título do Evento</th>
                  <th className="py-3 px-4">Dono do Evento</th>
                  <th className="py-3 px-4">Convidados / Portaria</th>
                  <th className="py-3 px-4">Tarefas (Andamento)</th>
                  <th className="py-3 px-4">Data do Evento</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((e) => {
                    const taskPercentage = e.total_tasks > 0 
                      ? Math.round((e.completed_tasks / e.total_tasks) * 100)
                      : 0;

                    return (
                      <tr key={e.id} className="border-b border-border-custom/50 hover:bg-secondary/5 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground">{e.title}</td>
                        <td className="py-3.5 px-4 text-foreground/60 text-xs">{e.owner_email}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-xs text-foreground/80">
                              {e.checkins_count} <span className="text-foreground/40 font-normal">de {e.guests_count} confirmados</span>
                            </span>
                            {e.guests_count > 0 && (
                              <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden mt-0.5">
                                <div 
                                  className="h-full bg-success rounded-full" 
                                  style={{ width: `${(e.checkins_count / e.guests_count) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-xs text-foreground/80">
                              {taskPercentage}% <span className="text-foreground/40 font-normal">({e.completed_tasks}/{e.total_tasks})</span>
                            </span>
                            <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden mt-0.5">
                              <div 
                                className="h-full bg-primary rounded-full" 
                                style={{ width: `${taskPercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-foreground/60 text-xs">
                          {new Date(e.date).toLocaleDateString('pt-PT')}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            e.status === 'Active' 
                              ? 'bg-success/10 text-success' 
                              : 'bg-foreground/15 text-foreground/50'
                          }`}>
                            {e.status === 'Active' ? 'Ativo' : 'Arquivado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Eye className="h-3.5 w-3.5" />}
                            onClick={() => handleOpenDiagnostics(e)}
                            className="text-xs"
                          >
                            Diagnóstico
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-foreground/50">
                      Nenhum evento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* LICENSE MODAL DIALOG */}
      <Dialog
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Configurar Licença: ${selectedUser?.email}`}
      >
        <form onSubmit={handleUpdateUser} className="space-y-4 pt-2">
          {/* Plan/Role Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground/75 tracking-wide">
              Plano de Acesso (Role)
            </label>
            <select
              value={newRole}
              onChange={(e) => {
                setNewRole(e.target.value);
                // Auto-adjust slots based on standard B2B planner defaults
                if (e.target.value === 'planner') {
                  setNewSlots(2); // default starter
                } else if (e.target.value === 'user') {
                  setNewSlots(1); // default couple
                }
              }}
              className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            >
              <option value="user">Noivos (B2C - Normal)</option>
              <option value="planner">Planner (B2B - Profissional)</option>
              <option value="admin">Super Admin (Acesso Total)</option>
            </select>
          </div>

          {/* Slots count */}
          <Input
            label="Slots de Eventos Ativos em Simultâneo"
            type="number"
            min={1}
            max={50}
            value={newSlots}
            onChange={(e) => setNewSlots(parseInt(e.target.value) || 1)}
            helperText="Quantidade máxima de casamentos que este utilizador pode gerir em paralelo."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isUpdating}>
              Atualizar Licença
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DIAGNOSTICS DETAIL DIALOG */}
      <Dialog
        isOpen={diagModalOpen}
        onClose={() => setDiagModalOpen(false)}
        title={`Diagnóstico do Evento: ${selectedDiagEvent?.title}`}
        size="lg"
      >
        {loadingDiag ? (
          <div className="flex h-64 items-center justify-center text-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs text-foreground/50 font-medium">A carregar dados de auditoria...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Event Info Card */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-secondary/10 rounded-xl border border-border-custom/50 text-xs">
              <div>
                <p className="text-foreground/40 font-bold uppercase tracking-wider text-[9px]">Dono da Conta</p>
                <p className="font-semibold mt-0.5 text-foreground">{selectedDiagEvent?.owner_email}</p>
              </div>
              <div>
                <p className="text-foreground/40 font-bold uppercase tracking-wider text-[9px]">Data da Festa</p>
                <p className="font-semibold mt-0.5 text-foreground">
                  {selectedDiagEvent && new Date(selectedDiagEvent.date).toLocaleString('pt-PT')}
                </p>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-border-custom gap-4 text-xs font-semibold mt-4">
              <button
                onClick={() => setDiagActiveTab('checkins')}
                className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  diagActiveTab === 'checkins' ? 'border-primary text-primary' : 'border-transparent text-foreground/50'
                }`}
              >
                <UserCheck className="h-4 w-4" /> Entradas Portaria ({diagCheckins.length})
              </button>
              <button
                onClick={() => setDiagActiveTab('tasks')}
                className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  diagActiveTab === 'tasks' ? 'border-primary text-primary' : 'border-transparent text-foreground/50'
                }`}
              >
                <CheckSquare className="h-4 w-4" /> Checklist Tarefas ({diagTasks.length})
              </button>
            </div>

            {/* TAB: CHECKINS HISTORY */}
            {diagActiveTab === 'checkins' && (
              <div className="overflow-y-auto max-h-80 border border-border-custom/50 rounded-xl bg-card-bg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-custom bg-secondary/15 text-foreground/50 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 px-3">Convidado</th>
                      <th className="py-2.5 px-3">Cargo/Grupo</th>
                      <th className="py-2.5 px-3">Hora Check-in</th>
                      <th className="py-2.5 px-3">Operador Portaria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagCheckins.length > 0 ? (
                      diagCheckins.map((c) => (
                        <tr key={c.id} className="border-b border-border-custom/30 hover:bg-secondary/5">
                          <td className="py-2.5 px-3 font-semibold text-foreground">{c.guest_name}</td>
                          <td className="py-2.5 px-3 text-foreground/60">{c.guest_role}</td>
                          <td className="py-2.5 px-3 text-foreground/60">
                            {new Date(c.checked_at).toLocaleTimeString('pt-PT')} ({new Date(c.checked_at).toLocaleDateString('pt-PT')})
                          </td>
                          <td className="py-2.5 px-3 text-foreground/50 italic">{c.operator}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-foreground/40 font-medium">
                          Nenhum check-in efetuado até ao momento nesta portaria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: TASKS PROGRESS */}
            {diagActiveTab === 'tasks' && (
              <div className="overflow-y-auto max-h-80 border border-border-custom/50 rounded-xl bg-card-bg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-custom bg-secondary/15 text-foreground/50 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 px-3">Título da Tarefa</th>
                      <th className="py-2.5 px-3">Prioridade</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">Prazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagTasks.length > 0 ? (
                      diagTasks.map((t) => (
                        <tr key={t.id} className="border-b border-border-custom/30 hover:bg-secondary/5">
                          <td className="py-2.5 px-3 font-semibold text-foreground">{t.title}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                              t.priority === 'Alta' 
                                ? 'bg-error/10 text-error' 
                                : t.priority === 'Média'
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-secondary text-foreground/60'
                            }`}>
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                              t.status === 'Concluído' 
                                ? 'bg-success/10 text-success' 
                                : t.status === 'Em Progresso'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-foreground/10 text-foreground/50'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-foreground/50">
                            {t.due_date ? new Date(t.due_date).toLocaleDateString('pt-PT') : 'Sem prazo'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-foreground/40 font-medium">
                          Nenhuma tarefa criada para este evento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-border-custom mt-4">
              <Button type="button" onClick={() => setDiagModalOpen(false)}>
                Fechar Auditoria
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
