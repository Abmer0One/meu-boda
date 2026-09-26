'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  SuperAdminRepository,
  AdminUser,
} from '@/repositories/superadmin.repository';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  Award,
  Heart,
  ShieldCheck,
  Edit,
  Mail,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function SuperAdminUtilizadoresPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState('user');
  const [selectedSlots, setSelectedSlots] = useState(1);
  const [savingUserMeta, setSavingUserMeta] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdmin = currentUser?.app_metadata?.role === 'admin'
    || currentUser?.email === 'amota@example.com';

  const loadUsers = async () => {
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
    loadUsers();
  }, [isAdmin]);

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
        setUsers(prev =>
          prev.map(u =>
            u.id === editingUser.id
              ? { ...u, role: selectedRole, planner_slots: Number(selectedSlots) }
              : u
          )
        );
        setEditingUser(null);
      } else {
        setErrorMsg('Não foi possível atualizar as permissões do utilizador.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao comunicar com a base de dados.');
    } finally {
      setSavingUserMeta(false);
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

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (u.id?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesRole = roleFilter === 'all' || (u.role || 'user') === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalCouples = users.filter(u => !u.role || u.role === 'user').length;
  const totalPlanners = users.filter(u => u.role === 'planner').length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Utilizadores & Noivos
            </h1>
            <Badge variant="primary">{users.length} Registados</Badge>
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            Gestão de contas, atribuição de perfis de noivos e concessão de funções de Wedding Planner.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
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
              const headers = ['ID', 'Email', 'Função', 'Slots Contratados', 'Eventos Criados', 'Data de Registo'];
              const rows = users.map(u => [
                u.id,
                u.email,
                u.role || 'user',
                u.planner_slots || 1,
                u.events_count || 0,
                u.created_at,
              ]);
              SuperAdminRepository.exportToCSV('utilizadores_meuboda', headers, rows);
            }}
            className="flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

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
          <p className="text-2xl font-bold text-primary mt-1">{totalPlanners}</p>
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
              placeholder="Pesquisar por email de utilizador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-border-custom"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-foreground/40" />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
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
                {filteredUsers.map(u => {
                  const isPlanner = u.role === 'planner';
                  const isSuperAdminRole = u.role === 'admin';

                  return (
                    <tr key={u.id} className="hover:bg-foreground/[0.015] transition-colors">
                      {/* Email & ID */}
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

                      {/* Role Badge */}
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

                      {/* Slots */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-foreground text-xs">
                          {u.planner_slots || 1} {u.planner_slots === 1 ? 'slot' : 'slots'}
                        </span>
                      </td>

                      {/* Events Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-foreground text-sm">
                          {u.events_count || 0}
                        </span>
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-foreground/60">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-PT') : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditModal(u)}
                            className="h-8 text-xs px-2.5 flex items-center gap-1 border-border-custom hover:bg-foreground/5"
                            title="Editar papel e slots do utilizador"
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

      {/* EDIT USER META MODAL */}
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
                onChange={e => {
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
                onChange={e => setSelectedSlots(Number(e.target.value))}
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
                className="bg-primary text-black hover:bg-primary-hover"
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
    </div>
  );
}
