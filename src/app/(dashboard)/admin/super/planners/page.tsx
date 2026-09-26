'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Award,
  Search,
  RefreshCw,
  FileSpreadsheet,
  ShieldAlert,
  Loader2,
  Plus,
  CalendarDays,
  Layers,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function SuperAdminPlannersPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [planners, setPlanners] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal for adjusting slots
  const [selectedPlanner, setSelectedPlanner] = useState<AdminUser | null>(null);
  const [customSlots, setCustomSlots] = useState<number>(5);
  const [updatingSlotId, setUpdatingSlotId] = useState<string | null>(null);
  const [savingCustom, setSavingCustom] = useState(false);

  const isAdmin = currentUser?.app_metadata?.role === 'admin'
    || currentUser?.email === 'amota@example.com';

  const loadPlanners = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const allUsers = await SuperAdminRepository.getUsers();
      const b2bPlanners = allUsers.filter(u => u.role === 'planner');
      setPlanners(b2bPlanners);
    } catch (err) {
      console.error('Error loading planners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanners();
  }, [isAdmin]);

  // Quick increment slots (+1 or +5)
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
        setPlanners(prev =>
          prev.map(p => (p.id === planner.id ? { ...p, planner_slots: newSlots } : p))
        );
      }
    } catch (err) {
      console.error('Error updating slots:', err);
    } finally {
      setUpdatingSlotId(null);
    }
  };

  // Custom slots save
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
        setPlanners(prev =>
          prev.map(p => (p.id === selectedPlanner.id ? { ...p, planner_slots: Number(customSlots) } : p))
        );
        setSelectedPlanner(null);
      }
    } catch (err) {
      console.error('Error saving custom slots:', err);
    } finally {
      setSavingCustom(false);
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

  // Filter planners
  const filteredPlanners = planners.filter(p => {
    return (
      (p.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.id?.toLowerCase() || '').includes(search.toLowerCase())
    );
  });

  // Calculate B2B metrics
  const totalSlots = planners.reduce((acc, p) => acc + (p.planner_slots || 5), 0);
  const totalEventsInProduction = planners.reduce((acc, p) => acc + (p.events_count || 0), 0);
  const occupancyRate = totalSlots > 0 ? Math.round((totalEventsInProduction / totalSlots) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              Wedding Planners B2B & Licenças
            </h1>
            <Badge variant="primary">{planners.length} Ativos</Badge>
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            Gestão das agências e profissionais parceiros autorizados a gerir múltiplos casamentos em simultâneo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPlanners}
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
              const headers = ['ID', 'Email', 'Slots Contratados', 'Eventos em Curso', 'Ocupação', 'Data de Adesão'];
              const rows = planners.map(p => [
                p.id,
                p.email,
                p.planner_slots || 5,
                p.events_count || 0,
                `${Math.round(((p.events_count || 0) / (p.planner_slots || 5)) * 100)}%`,
                p.created_at,
              ]);
              SuperAdminRepository.exportToCSV('planners_b2b', headers, rows);
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
          <p className="text-xs font-medium text-foreground/60">Planners Registados</p>
          <p className="text-2xl font-bold text-foreground mt-1">{planners.length}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Total Slots Licenciados</p>
          <p className="text-2xl font-bold text-primary mt-1">{totalSlots}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Eventos em Gestão</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{totalEventsInProduction}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Taxa de Ocupação B2B</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{occupancyRate}%</p>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-card-bg border-border-custom p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          <Input
            placeholder="Pesquisar por email de planner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
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
          <div className="text-center p-12 space-y-3">
            <Award className="h-10 w-10 text-foreground/20 mx-auto" />
            <p className="text-foreground/50 text-sm">Nenhum Wedding Planner B2B registado ou encontrado.</p>
            <p className="text-xs text-foreground/40 max-w-md mx-auto">
              Para transformar um utilizador comum em Planner B2B, aceda ao menu &ldquo;Utilizadores & Noivos&rdquo; e altere a respetiva função para Planner.
            </p>
            <Link href="/admin/super/utilizadores">
              <Button size="sm" variant="outline" className="mt-2">
                Ir para Utilizadores
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-foreground/[0.02] text-foreground/60 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Wedding Planner</th>
                  <th className="py-3 px-4 text-center">Eventos Ativos</th>
                  <th className="py-3 px-4 text-center">Capacidade / Slots</th>
                  <th className="py-3 px-4 text-center">Ocupação</th>
                  <th className="py-3 px-4">Membro Desde</th>
                  <th className="py-3 px-4 text-right">Ajuste de Capacidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50">
                {filteredPlanners.map(p => {
                  const slots = p.planner_slots || 5;
                  const used = p.events_count || 0;
                  const pct = Math.min(100, Math.round((used / slots) * 100));
                  const isFull = used >= slots;

                  return (
                    <tr key={p.id} className="hover:bg-foreground/[0.015] transition-colors">
                      {/* Email & ID */}
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

                      {/* Events Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-foreground text-sm">{used}</span>
                        <div className="text-[10px] text-foreground/40">casamentos</div>
                      </td>

                      {/* Slots */}
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="primary" className="font-bold">
                          {slots} Slots Contratados
                        </Badge>
                      </td>

                      {/* Occupancy bar */}
                      <td className="py-3.5 px-4 text-center min-w-[130px]">
                        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-foreground mb-1">
                          <span>{pct}%</span>
                          <span className="text-foreground/40 text-[10px]">({used}/{slots})</span>
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

                      {/* Member Since */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-foreground/60">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT') : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick +1 */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAddSlots(p, 1)}
                            disabled={updatingSlotId === p.id}
                            className="h-7 text-xs px-2 border-border-custom hover:bg-primary/10 hover:text-primary"
                            title="Adicionar +1 slot rapidamente"
                          >
                            +1
                          </Button>

                          {/* Quick +5 */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAddSlots(p, 5)}
                            disabled={updatingSlotId === p.id}
                            className="h-7 text-xs px-2 border-border-custom hover:bg-primary/10 hover:text-primary"
                            title="Adicionar +5 slots rapidamente"
                          >
                            +5
                          </Button>

                          {/* Custom modal */}
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

      {/* ADJUST SLOTS MODAL */}
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
                onChange={e => setCustomSlots(Number(e.target.value))}
                className="bg-background/50 border-border-custom text-lg font-bold"
              />
              <p className="text-[11px] text-foreground/40">
                Atualmente a utilizar {selectedPlanner.events_count || 0} de {selectedPlanner.planner_slots || 5} slots.
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
                className="bg-primary text-black hover:bg-primary-hover"
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
    </div>
  );
}
