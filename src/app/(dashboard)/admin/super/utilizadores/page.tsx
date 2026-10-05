'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  SuperAdminRepository,
  AdminUser,
} from '@/repositories/superadmin.repository';
import { isSuperAdmin } from '@/utils/admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  Users,
  Award,
  Search,
  Filter,
  ShieldAlert,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  Heart,
  ShieldCheck,
  Edit,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Database,
  Copy,
  Check,
  ShieldOff,
  Briefcase,
  Building2,
  Layers,
} from 'lucide-react';

function UtilizadoresContent() {
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'planners' ? 'planners' : 'todos';

  const [activeTab, setActiveTab] = useState<'todos' | 'planners'>(initialTab);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Alert banner
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab 1: Todos os utilizadores
  const [searchUsers, setSearchUsers] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Edit User Permissions Modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState('user');
  const [selectedSlots, setSelectedSlots] = useState(1);
  const [savingUserMeta, setSavingUserMeta] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab 2: Wedding Planners B2B
  const [searchPlanners, setSearchPlanners] = useState('');
  const [showInfoGuide, setShowInfoGuide] = useState(true);
  const [selectedPlanner, setSelectedPlanner] = useState<AdminUser | null>(null);
  const [customSlots, setCustomSlots] = useState<number>(5);
  const [updatingSlotId, setUpdatingSlotId] = useState<string | null>(null);
  const [savingCustom, setSavingCustom] = useState(false);

  // Modal: Conceder Licença B2B (Promote User)
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [userSearchCandidate, setUserSearchCandidate] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<AdminUser | null>(null);
  const [initialSlots, setInitialSlots] = useState<number>(5);
  const [promotingSaving, setPromotingSaving] = useState(false);

  // SQL Config Modal
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const isAdmin = isSuperAdmin(currentUser);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'planners') {
      setActiveTab('planners');
    }
  }, [searchParams]);

  const loadData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await SuperAdminRepository.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const planners = users.filter((u) => u.role === 'planner');
  const totalCouples = users.filter((u) => !u.role || u.role === 'user').length;
  const totalAdmins = users.filter((u) => u.role === 'admin').length;

  // Tab 1: Edit User Role / Slots
  const handleOpenEditModal = (u: AdminUser) => {
    setEditingUser(u);
    setSelectedRole(u.role || 'user');
    setSelectedSlots(u.planner_slots || 1);
    setErrorMsg(null);
  };

  const handleSaveUserMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSavingUserMeta(true);
    setErrorMsg(null);
    try {
      const success = await SuperAdminRepository.updateUserMeta(
        editingUser.id,
        selectedRole,
        Number(selectedSlots)
      );
      if (success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? { ...u, role: selectedRole, planner_slots: Number(selectedSlots) }
              : u
          )
        );
        setEditingUser(null);
        setAlertBanner({
          type: 'success',
          text: `Permissões de ${editingUser.email} atualizadas com sucesso.`,
        });
        setTimeout(() => setAlertBanner(null), 4000);
      } else {
        setErrorMsg('Não foi possível atualizar as permissões do utilizador.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao comunicar com a base de dados.');
    } finally {
      setSavingUserMeta(false);
    }
  };

  // Tab 2: Quick add slots (+1 or +5)
  const handleQuickAddSlots = async (planner: AdminUser, delta: number) => {
    const newSlots = (planner.planner_slots || 5) + delta;
    setUpdatingSlotId(planner.id);
    try {
      const success = await SuperAdminRepository.updateUserMeta(
        planner.id,
        'planner',
        newSlots
      );
      if (success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === planner.id ? { ...u, planner_slots: newSlots } : u))
        );
        setAlertBanner({
          type: 'success',
          text: `Capacidade de ${planner.email} atualizada para ${newSlots} slots.`,
        });
        setTimeout(() => setAlertBanner(null), 4000);
      }
    } catch (err) {
      console.error('Error updating slots:', err);
    } finally {
      setUpdatingSlotId(null);
    }
  };

  // Tab 2: Save custom slots
  const handleSaveCustomSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanner) return;

    setSavingCustom(true);
    try {
      const success = await SuperAdminRepository.updateUserMeta(
        selectedPlanner.id,
        'planner',
        Number(customSlots)
      );
      if (success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedPlanner.id ? { ...u, planner_slots: Number(customSlots) } : u
          )
        );
        setSelectedPlanner(null);
        setAlertBanner({
          type: 'success',
          text: `Capacidade de ${selectedPlanner.email} ajustada para ${customSlots} slots.`,
        });
        setTimeout(() => setAlertBanner(null), 4000);
      }
    } catch (err) {
      console.error('Error saving custom slots:', err);
    } finally {
      setSavingCustom(false);
    }
  };

  // Tab 2: Promote candidate to planner
  const handlePromoteCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    setPromotingSaving(true);
    try {
      const success = await SuperAdminRepository.updateUserMeta(
        selectedCandidate.id,
        'planner',
        Number(initialSlots)
      );
      if (success) {
        const updatedCandidate: AdminUser = {
          ...selectedCandidate,
          role: 'planner',
          planner_slots: Number(initialSlots),
        };
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedCandidate.id ? updatedCandidate : u))
        );
        setPromoteModalOpen(false);
        setSelectedCandidate(null);
        setAlertBanner({
          type: 'success',
          text: `Licença B2B concedida a ${selectedCandidate.email} com ${initialSlots} slots!`,
        });
        setTimeout(() => setAlertBanner(null), 5000);
      }
    } catch (err) {
      console.error('Error granting B2B license:', err);
    } finally {
      setPromotingSaving(false);
    }
  };

  // Tab 2: Revoke planner license
  const handleRevokePlanner = async (planner: AdminUser) => {
    const confirmed = window.confirm(
      `Deseja realmente revogar a licença B2B de ${planner.email}?\n\nO utilizador voltará ao estatuto padrão de Noivo individual (1 evento).`
    );
    if (!confirmed) return;

    setUpdatingSlotId(planner.id);
    try {
      const success = await SuperAdminRepository.updateUserMeta(planner.id, 'user', 1);
      if (success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === planner.id ? { ...u, role: 'user', planner_slots: 1 } : u))
        );
        setAlertBanner({
          type: 'success',
          text: `Licença B2B de ${planner.email} revogada. Utilizador regressou ao perfil padrão.`,
        });
        setTimeout(() => setAlertBanner(null), 4000);
      }
    } catch (err) {
      console.error('Error revoking planner:', err);
    } finally {
      setUpdatingSlotId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 max-w-lg mx-auto">
        <ShieldAlert className="h-16 w-16 text-error mb-4" />
        <h2 className="text-xl font-bold text-foreground">Acesso Negado</h2>
        <p className="text-sm text-foreground/60 mt-2">
          Área restrita aos administradores da plataforma Meu Boda.
        </p>
      </div>
    );
  }

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.email?.toLowerCase() || '').includes(searchUsers.toLowerCase()) ||
      (u.id?.toLowerCase() || '').includes(searchUsers.toLowerCase());
    const matchesRole = roleFilter === 'all' || (u.role || 'user') === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredPlanners = planners.filter((p) => {
    return (
      (p.email?.toLowerCase() || '').includes(searchPlanners.toLowerCase()) ||
      (p.id?.toLowerCase() || '').includes(searchPlanners.toLowerCase())
    );
  });

  const promotionCandidates = users
    .filter((u) => u.role !== 'planner')
    .filter(
      (u) =>
        (u.email?.toLowerCase() || '').includes(userSearchCandidate.toLowerCase()) ||
        (u.id?.toLowerCase() || '').includes(userSearchCandidate.toLowerCase())
    );

  // B2B metrics
  const totalSlots = planners.reduce((acc, p) => acc + (p.planner_slots || 5), 0);
  const totalEventsInProduction = planners.reduce((acc, p) => acc + (p.events_count || 0), 0);
  const occupancyRate = totalSlots > 0 ? Math.round((totalEventsInProduction / totalSlots) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {alertBanner && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            alertBanner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{alertBanner.text}</span>
          </div>
          <button
            onClick={() => setAlertBanner(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Gestão de Utilizadores & Licenciamento B2B
            </h1>
            <Badge variant="primary">{users.length} Registados</Badge>
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            Administração central de contas individuais de noivos e concessão de licenças de Wedding Planner.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'planners' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedCandidate(null);
                  setUserSearchCandidate('');
                  setInitialSlots(5);
                  setPromoteModalOpen(true);
                }}
                className="bg-primary text-black hover:bg-primary-hover font-semibold flex items-center gap-1.5"
              >
                <UserPlus className="h-4 w-4" />
                Conceder Licença B2B
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSqlModalOpen(true)}
                className="flex items-center gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                title="Comandos SQL para gestão de permissões no Supabase"
              >
                <Database className="h-4 w-4" />
                SQL Supabase
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
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
              if (activeTab === 'todos') {
                const headers = ['ID', 'Email', 'Função', 'Slots Contratados', 'Eventos Criados', 'Data de Registo'];
                const rows = users.map((u) => [
                  u.id,
                  u.email,
                  u.role || 'user',
                  u.planner_slots || 1,
                  u.events_count || 0,
                  u.created_at,
                ]);
                SuperAdminRepository.exportToCSV('utilizadores_meuboda', headers, rows);
              } else {
                const headers = ['ID', 'Email', 'Slots Contratados', 'Eventos em Produção', 'Ocupação', 'Data de Adesão'];
                const rows = planners.map((p) => [
                  p.id,
                  p.email,
                  p.planner_slots || 5,
                  p.events_count || 0,
                  `${Math.round(((p.events_count || 0) / (p.planner_slots || 5)) * 100)}%`,
                  p.created_at,
                ]);
                SuperAdminRepository.exportToCSV('planners_b2b', headers, rows);
              }
            }}
            className="flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex border-b border-border-custom gap-2 sm:gap-6">
        <button
          onClick={() => setActiveTab('todos')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all relative ${
            activeTab === 'todos'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground/50 hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Todos os Utilizadores & Noivos</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/80 font-mono">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('planners')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all relative ${
            activeTab === 'planners'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground/50 hover:text-foreground'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Wedding Planners B2B & Licenças</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
            {planners.length}
          </span>
        </button>
      </div>

      {/* TAB 1: TODOS OS UTILIZADORES */}
      {activeTab === 'todos' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-card-bg border-border-custom p-4">
              <p className="text-xs font-medium text-foreground/60">Total Contas</p>
              <p className="text-2xl font-bold text-foreground mt-1">{users.length}</p>
            </Card>
            <Card className="bg-card-bg border-border-custom p-4">
              <p className="text-xs font-medium text-foreground/60">Noivos (B2C)</p>
              <p className="text-2xl font-bold text-rose-500 mt-1">{totalCouples}</p>
            </Card>
            <Card className="bg-card-bg border-border-custom p-4">
              <p className="text-xs font-medium text-foreground/60">Planners B2B</p>
              <p className="text-2xl font-bold text-primary mt-1">{planners.length}</p>
            </Card>
            <Card className="bg-card-bg border-border-custom p-4">
              <p className="text-xs font-medium text-foreground/60">Administradores</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">{totalAdmins}</p>
            </Card>
          </div>

          {/* Filters Bar */}
          <Card className="bg-card-bg border-border-custom p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  placeholder="Pesquisar por email ou identificador..."
                  value={searchUsers}
                  onChange={(e) => setSearchUsers(e.target.value)}
                  className="pl-9 bg-background/50 border-border-custom"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-foreground/40 shrink-0" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border-custom text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Todas as Funções</option>
                  <option value="user">Noivos (B2C - Padrão)</option>
                  <option value="planner">Wedding Planners B2B</option>
                  <option value="admin">Administradores da Plataforma</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Users Table */}
          <Card className="bg-card-bg border-border-custom overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center p-12 space-y-2">
                <Users className="h-10 w-10 text-foreground/20 mx-auto" />
                <p className="text-foreground/50 text-sm">Nenhum utilizador encontrado para a pesquisa.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border-custom bg-foreground/[0.02] text-foreground/60 text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Utilizador</th>
                      <th className="py-3 px-4">Função</th>
                      <th className="py-3 px-4 text-center">Slots Licenciados</th>
                      <th className="py-3 px-4 text-center">Eventos Atuais</th>
                      <th className="py-3 px-4">Data de Registo</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom/50">
                    {filteredUsers.map((u) => {
                      const isPlanner = u.role === 'planner';
                      const isSuperAdminRole = u.role === 'admin';

                      return (
                        <tr key={u.id} className="hover:bg-foreground/[0.015] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                {u.email ? u.email.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">{u.email}</div>
                                <div className="text-[10px] text-foreground/40 font-mono">{u.id}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isSuperAdminRole ? (
                              <Badge variant="warning" className="gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                Super Admin
                              </Badge>
                            ) : isPlanner ? (
                              <Badge variant="primary" className="gap-1">
                                <Award className="h-3 w-3" />
                                Planner B2B
                              </Badge>
                            ) : (
                              <Badge variant="default" className="gap-1">
                                <Heart className="h-3 w-3 text-rose-500" />
                                Noivo (B2C)
                              </Badge>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-semibold text-foreground text-xs">
                              {u.planner_slots || 1} {u.planner_slots === 1 ? 'slot' : 'slots'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-foreground text-sm">
                              {u.events_count || 0}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-foreground/60">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-PT') : 'N/A'}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditModal(u)}
                                className="h-8 text-xs px-2.5 flex items-center gap-1 border-border-custom hover:bg-foreground/5"
                                title="Editar papel e capacidade do utilizador"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                <span>Permissões</span>
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
        </div>
      )}

      {/* TAB 2: WEDDING PLANNERS B2B */}
      {activeTab === 'planners' && (
        <div className="space-y-6">
          {/* Educational Hero Guide */}
          <Card className="bg-gradient-to-br from-card-bg via-card-bg to-primary/[0.04] border border-primary/30 overflow-hidden shadow-lg shadow-black/20">
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-foreground flex items-center gap-2">
                      <span>Como Funciona o Licenciamento B2B no Meu Boda?</span>
                      <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">
                        Guia de Negócio
                      </span>
                    </h3>
                    <p className="text-xs text-foreground/70 mt-0.5">
                      Compreenda a diferença entre clientes particulares (Noivos) e parceiros empresariais (Agências / Planners).
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowInfoGuide(!showInfoGuide)}
                  className="text-foreground/50 hover:text-foreground text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border-custom bg-background/40 transition-colors"
                >
                  <span>{showInfoGuide ? 'Ocultar Detalhes' : 'Ver Detalhes'}</span>
                  {showInfoGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>

              {showInfoGuide && (
                <div className="mt-4 pt-4 border-t border-border-custom grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-background/50 border border-border-custom space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-primary">
                      <Building2 className="h-4 w-4" />
                      <span>1. Noivos (B2C) vs Planners (B2B)</span>
                    </div>
                    <p className="text-foreground/70 leading-relaxed">
                      Os <strong>Noivos</strong> criam conta para gerir <strong>1 casamento único</strong>. Já as agências e organizadores profissionais gerem dezenas de casamentos para clientes distintos ao longo do ano.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-background/50 border border-border-custom space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-primary">
                      <Layers className="h-4 w-4" />
                      <span>2. O Conceito de &ldquo;Slots de Capacidade&rdquo;</span>
                    </div>
                    <p className="text-foreground/70 leading-relaxed">
                      Cada <strong>Slot</strong> contratado dá direito à agência de manter <strong>1 casamento ativo em simultâneo</strong> no painel. Se a agência contratar um pacote de 10 slots, pode produzir até 10 casamentos ao mesmo tempo.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-background/50 border border-border-custom space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-primary">
                      <TrendingUp className="h-4 w-4" />
                      <span>3. Oportunidade de Monetização</span>
                    </div>
                    <p className="text-foreground/70 leading-relaxed">
                      A coluna <strong>Taxa de Ocupação</strong> alerta quando uma agência atinge 100% da sua capacidade. Utilize os botões <strong>+1</strong>, <strong>+5</strong> ou <strong>Configurar</strong> para expandir a licença após cobrarem a mensalidade.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* B2B KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-card-bg border-border-custom p-4">
              <p className="text-xs font-medium text-foreground/60">Agências B2B Ativas</p>
              <p className="text-2xl font-bold text-foreground mt-1">{planners.length}</p>
            </Card>
            <Card className="bg-card-bg border-border-custom p-4">
              <p className="text-xs font-medium text-foreground/60">Total Slots Licenciados</p>
              <p className="text-2xl font-bold text-primary mt-1">{totalSlots}</p>
            </Card>
            <Card className="bg-card-bg border-border-custom p-4">
              <p className="text-xs font-medium text-foreground/60">Casamentos em Produção</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">{totalEventsInProduction}</p>
            </Card>
            <Card className="bg-card-bg border-border-custom p-4">
              <p className="text-xs font-medium text-foreground/60">Taxa Média de Ocupação</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">{occupancyRate}%</p>
            </Card>
          </div>

          {/* Planners Search */}
          <Card className="bg-card-bg border-border-custom p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <Input
                placeholder="Pesquisar por email da agência ou identificador..."
                value={searchPlanners}
                onChange={(e) => setSearchPlanners(e.target.value)}
                className="pl-9 bg-background/50 border-border-custom"
              />
            </div>
          </Card>

          {/* Planners Table */}
          <Card className="bg-card-bg border-border-custom overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPlanners.length === 0 ? (
              <div className="text-center p-12 space-y-4">
                <Award className="h-12 w-12 text-foreground/20 mx-auto" />
                <div>
                  <p className="text-foreground/70 text-base font-semibold">
                    Nenhum Wedding Planner B2B registado ou encontrado.
                  </p>
                  <p className="text-xs text-foreground/50 max-w-md mx-auto mt-1">
                    Conceda a primeira licença B2B a qualquer utilizador registado para que este possa gerir múltiplos eventos simultaneamente.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setSelectedCandidate(null);
                    setUserSearchCandidate('');
                    setInitialSlots(5);
                    setPromoteModalOpen(true);
                  }}
                  className="bg-primary text-black hover:bg-primary-hover font-semibold inline-flex items-center gap-1.5"
                >
                  <UserPlus className="h-4 w-4" />
                  Conceder Licença B2B Agora
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border-custom bg-foreground/[0.02] text-foreground/60 text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Agência / Wedding Planner</th>
                      <th className="py-3 px-4 text-center">Casamentos Ativos</th>
                      <th className="py-3 px-4 text-center">Capacidade Licenciada</th>
                      <th className="py-3 px-4 text-center">Ocupação</th>
                      <th className="py-3 px-4">Data de Início</th>
                      <th className="py-3 px-4 text-right">Gestão de Capacidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom/50">
                    {filteredPlanners.map((p) => {
                      const slots = p.planner_slots || 5;
                      const used = p.events_count || 0;
                      const pct = Math.min(100, Math.round((used / slots) * 100));
                      const isFull = used >= slots;
                      const isUpdating = updatingSlotId === p.id;

                      return (
                        <tr key={p.id} className="hover:bg-foreground/[0.015] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                {p.email ? p.email.charAt(0).toUpperCase() : 'P'}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground flex items-center gap-2">
                                  <span>{p.email}</span>
                                  {isFull && (
                                    <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded border border-amber-500/20">
                                      Limite Atingido
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-foreground/40 font-mono">{p.id}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-foreground text-sm">{used}</span>
                            <div className="text-[10px] text-foreground/40">em produção</div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <Badge variant="primary" className="font-bold text-xs">
                              {slots} Slots Contratados
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-center min-w-[140px]">
                            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-foreground mb-1">
                              <span className={pct >= 100 ? 'text-amber-500 font-bold' : ''}>{pct}%</span>
                              <span className="text-foreground/40 text-[10px]">
                                ({used} de {slots} slots)
                              </span>
                            </div>
                            <div className="w-24 bg-foreground/10 h-1.5 rounded-full mx-auto overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pct >= 100 ? 'bg-amber-500' : 'bg-primary'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-foreground/60">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT') : 'N/A'}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickAddSlots(p, 1)}
                                disabled={isUpdating}
                                className="h-7 text-xs px-2 border-border-custom hover:bg-primary/10 hover:text-primary"
                                title="Adicionar +1 slot rapidamente"
                              >
                                +1
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickAddSlots(p, 5)}
                                disabled={isUpdating}
                                className="h-7 text-xs px-2 border-border-custom hover:bg-primary/10 hover:text-primary"
                                title="Adicionar +5 slots rapidamente"
                              >
                                +5
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPlanner(p);
                                  setCustomSlots(p.planner_slots || 5);
                                }}
                                className="h-7 text-xs px-2.5 border-border-custom hover:bg-foreground/5"
                                title="Definir capacidade personalizada"
                              >
                                Configurar
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRevokePlanner(p)}
                                disabled={isUpdating}
                                className="h-7 text-xs px-2 border-red-500/20 text-red-400 hover:bg-red-500/10"
                                title="Revogar licença B2B (regressar a utilizador padrão)"
                              >
                                <ShieldOff className="h-3.5 w-3.5" />
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
        </div>
      )}

      {/* EDIT USER META MODAL (TAB 1) */}
      <Dialog
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={editingUser ? `Gerir Permissões: ${editingUser.email}` : 'Permissões'}
        size="md"
      >
        {editingUser && (
          <form onSubmit={handleSaveUserMeta} className="space-y-4">
            <p className="text-xs text-foreground/60">
              Altere a função de utilizador ou conceda capacidade adicional de eventos simultâneos.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">Função no Sistema</label>
              <select
                value={selectedRole}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedRole(val);
                  if (val === 'planner' && selectedSlots < 5) {
                    setSelectedSlots(5);
                  }
                }}
                className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border-custom text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="user">Noivo (B2C) - Padrão</option>
                <option value="planner">Wedding Planner B2B (Múltiplos Eventos)</option>
                <option value="admin">Administrador Geral</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">
                Capacidade de Eventos (Slots Disponíveis)
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={selectedSlots}
                onChange={(e) => setSelectedSlots(Number(e.target.value))}
                className="bg-background/50 border-border-custom"
              />
              <p className="text-[11px] text-foreground/40">
                Noivos normais têm 1 slot. Planners Pro começam habitualmente com 5 a 10 slots.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-xs text-error">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-custom">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingUser(null)}
                disabled={savingUserMeta}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={savingUserMeta}
                className="bg-primary text-black hover:bg-primary-hover font-semibold"
              >
                {savingUserMeta ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    A guardar...
                  </>
                ) : (
                  'Guardar Alterações'
                )}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* MODAL: PROMOTING A USER TO PLANNER (TAB 2) */}
      <Dialog
        isOpen={promoteModalOpen}
        onClose={() => setPromoteModalOpen(false)}
        title="Conceder Licença B2B (Promover a Planner)"
        size="md"
      >
        <form onSubmit={handlePromoteCandidate} className="space-y-4">
          <p className="text-xs text-foreground/70">
            Selecione um utilizador registado para promover a <strong>Wedding Planner B2B</strong> e defina a quota inicial de eventos em simultâneo.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/80">
              1. Selecionar Utilizador / Conta
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
              <Input
                placeholder="Filtrar utilizadores por email..."
                value={userSearchCandidate}
                onChange={(e) => setUserSearchCandidate(e.target.value)}
                className="pl-8 text-xs bg-background/50 border-border-custom h-9"
              />
            </div>

            <div className="border border-border-custom rounded-lg max-h-40 overflow-y-auto divide-y divide-border-custom/50 bg-background/40">
              {promotionCandidates.length === 0 ? (
                <div className="p-4 text-center text-xs text-foreground/50">
                  Nenhum utilizador elegível encontrado.
                </div>
              ) : (
                promotionCandidates.slice(0, 15).map((candidate) => {
                  const isSelected = selectedCandidate?.id === candidate.id;
                  return (
                    <div
                      key={candidate.id}
                      onClick={() => setSelectedCandidate(candidate)}
                      className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border-l-2 border-primary text-foreground font-semibold'
                          : 'hover:bg-foreground/5 text-foreground/70'
                      }`}
                    >
                      <div>
                        <div>{candidate.email}</div>
                        <div className="text-[10px] text-foreground/40 font-mono">
                          Função atual: {candidate.role} • {candidate.events_count || 0} eventos
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/80">
              2. Quota Inicial de Casamentos em Simultâneo (Slots)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 10, 20].map((slotOption) => (
                <button
                  type="button"
                  key={slotOption}
                  onClick={() => setInitialSlots(slotOption)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    initialSlots === slotOption
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-background/50 border-border-custom text-foreground/70 hover:bg-foreground/5'
                  }`}
                >
                  {slotOption} Slots
                </button>
              ))}
            </div>

            <div className="pt-1">
              <Input
                type="number"
                min="1"
                max="200"
                value={initialSlots}
                onChange={(e) => setInitialSlots(Number(e.target.value))}
                placeholder="Ou digite capacidade personalizada..."
                className="text-xs bg-background/50 border-border-custom h-9"
              />
            </div>
          </div>

          {selectedCandidate && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs space-y-1">
              <div className="font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Resumo da Licença B2B
              </div>
              <p className="text-foreground/80">
                O utilizador <strong>{selectedCandidate.email}</strong> terá permissão para produzir até{' '}
                <strong>{initialSlots} casamentos em simultâneo</strong> com suporte a todas as ferramentas Meu Boda.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-custom">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPromoteModalOpen(false)}
              disabled={promotingSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!selectedCandidate || promotingSaving}
              className="bg-primary text-black hover:bg-primary-hover font-semibold"
            >
              {promotingSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  A conceder...
                </>
              ) : (
                'Ativar Licença B2B'
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ADJUST SLOTS MODAL (TAB 2) */}
      <Dialog
        isOpen={!!selectedPlanner}
        onClose={() => setSelectedPlanner(null)}
        title={selectedPlanner ? `Capacidade: ${selectedPlanner.email}` : 'Slots'}
        size="sm"
      >
        {selectedPlanner && (
          <form onSubmit={handleSaveCustomSlots} className="space-y-4">
            <p className="text-xs text-foreground/60">
              Ajuste o número de casamentos em simultâneo que este Wedding Planner pode gerir na plataforma.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">Número Total de Slots</label>
              <Input
                type="number"
                min="1"
                max="200"
                required
                value={customSlots}
                onChange={(e) => setCustomSlots(Number(e.target.value))}
                className="bg-background/50 border-border-custom text-lg font-bold"
              />
              <p className="text-[11px] text-foreground/40">
                Atualmente a utilizar {selectedPlanner.events_count || 0} de{' '}
                {selectedPlanner.planner_slots || 5} slots.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-custom">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlanner(null)}
                disabled={savingCustom}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={savingCustom}
                className="bg-primary text-black hover:bg-primary-hover font-semibold"
              >
                {savingCustom ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    A guardar...
                  </>
                ) : (
                  'Confirmar Slots'
                )}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* SQL CONFIG MODAL (TAB 2) */}
      <Dialog
        isOpen={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
        title="Funções de Licenciamento B2B na Base de Dados"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-foreground/70">
            Para que a alteração de permissões e capacidade de utilizadores seja guardada diretamente nos metadados de autenticação do Supabase (<code>raw_app_meta_data</code>), execute o script SQL abaixo no <strong>SQL Editor</strong> do Supabase:
          </p>

          <div className="relative">
            <pre className="p-3 bg-black/60 border border-border-custom rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-56 leading-relaxed select-all">
{`-- 1. RPC para atualizar a função (role) e slots de capacidade do utilizador
CREATE OR REPLACE FUNCTION public.admin_update_user_meta(
  target_user_id UUID,
  new_role TEXT,
  new_slots INT
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required.';
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', new_role, 'planner_slots', new_slots)
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
            </pre>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const sql = `-- 1. RPC para atualizar a função (role) e slots de capacidade do utilizador
CREATE OR REPLACE FUNCTION public.admin_update_user_meta(
  target_user_id UUID,
  new_role TEXT,
  new_slots INT
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required.';
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', new_role, 'planner_slots', new_slots)
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;
                navigator.clipboard.writeText(sql);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 2500);
              }}
              className="absolute top-2 right-2 text-xs bg-background/80 border-border-custom flex items-center gap-1.5"
            >
              {copiedSql ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar SQL</span>
                </>
              )}
            </Button>
          </div>

          <p className="text-[11px] text-foreground/50">
            A atribuição de licenças e quotas B2B é salva com persistência imediata na sessão do utilizador e no Supabase.
          </p>
        </div>
      </Dialog>
    </div>
  );
}

export default function SuperAdminUtilizadoresPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <UtilizadoresContent />
    </Suspense>
  );
}
