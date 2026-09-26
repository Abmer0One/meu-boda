'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  SuperAdminRepository,
  AdminUser,
  AdminEvent,
} from '@/repositories/superadmin.repository';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ShieldAlert,
  Users,
  Heart,
  Loader2,
  CalendarDays,
  Activity,
  Store,
  ShieldCheck,
  Receipt,
  Megaphone,
  Award,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';

export default function SuperAdminOverviewPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [pendingVendorsCount, setPendingVendorsCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [activeBroadcastsCount, setActiveBroadcastsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.app_metadata?.role === 'admin'
    || user?.email === 'amota@example.com';

  const loadData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [fetchedUsers, fetchedEvents, vendors, payments, broadcasts] = await Promise.all([
        SuperAdminRepository.getUsers(),
        SuperAdminRepository.getEvents(),
        SuperAdminRepository.getVendors(),
        SuperAdminRepository.getPlatformPayments(),
        SuperAdminRepository.getActiveBroadcasts(),
      ]);

      setUsers(fetchedUsers);
      setEvents(fetchedEvents);
      setPendingVendorsCount(vendors.filter(v => v.status === 'Pendente').length);
      setPendingPaymentsCount(payments.filter(p => p.status === 'Pendente').length);
      setActiveBroadcastsCount(broadcasts.length);
    } catch (err) {
      console.error('Error loading super admin overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

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
      <div className="flex h-[55vh] items-center justify-center text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-foreground/60 font-medium">A carregar centro de comando do Super Admin...</p>
        </div>
      </div>
    );
  }

  // Analytics helpers
  const activeEvents = events.filter(e => e.status === 'Active');
  const archivedEvents = events.filter(e => e.status === 'Archived');
  const plannersCount = users.filter(u => u.role === 'planner').length;
  const couplesCount = users.filter(u => u.role !== 'planner' && u.role !== 'admin').length;

  // Upcoming weddings in the next 7 days
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingEvents = events.filter((e) => {
    const d = new Date(e.date);
    return d >= now && d <= next7Days;
  });

  // Events by type breakdown
  const typeMap: Record<string, number> = {};
  events.forEach(e => {
    const t = e.type || 'casamento';
    typeMap[t] = (typeMap[t] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[10px] font-bold uppercase tracking-wider">
              Central de Comando
            </span>
            <span className="text-xs text-foreground/50">Meu Boda Executive</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Visão Geral da Plataforma
          </h1>
          <p className="text-xs sm:text-sm text-foreground/60 mt-0.5">
            Monitorização em tempo real de casamentos, utilizadores, marketplace e receitas operacionais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/super/portaria-live">
            <Button size="sm" leftIcon={<Activity className="h-4 w-4 text-emerald-500 animate-pulse" />}>
              Radar Portaria Live
            </Button>
          </Link>
        </div>
      </div>

      {/* Immediate Attention Alert Banners */}
      {(pendingVendorsCount > 0 || pendingPaymentsCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pendingVendorsCount > 0 && (
            <Link
              href="/admin/super/fornecedores/pendentes"
              className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">
                    {pendingVendorsCount} Fornecedor(es) Aguardam Moderação
                  </h4>
                  <p className="text-[11px] opacity-80">
                    Clique para rever perfis e aprovar visibilidade no catálogo.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          {pendingPaymentsCount > 0 && (
            <Link
              href="/admin/super/pagamentos"
              className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">
                    {pendingPaymentsCount} Comprovativo(s) Pendente(s)
                  </h4>
                  <p className="text-[11px] opacity-80">
                    Transferências bancárias a aguardar validação de slots.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card-bg border-border-custom hover:border-primary/40 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Total Utilizadores</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{users.length}</h3>
                <p className="text-[11px] text-foreground/60 mt-1">
                  <span className="font-semibold text-primary">{plannersCount} Planners B2B</span> • {couplesCount} Noivos
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg border-border-custom hover:border-primary/40 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Total de Eventos</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{events.length}</h3>
                <p className="text-[11px] text-foreground/60 mt-1">
                  <span className="font-semibold text-emerald-500">{activeEvents.length} Ativos</span> • {archivedEvents.length} Arquivados
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Heart className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg border-border-custom hover:border-primary/40 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Eventos do Fim de Semana</p>
                <h3 className="text-2xl font-bold text-emerald-500 mt-1">{upcomingEvents.length}</h3>
                <p className="text-[11px] text-foreground/60 mt-1">
                  Acontecendo nos próximos 7 dias
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg border-border-custom hover:border-primary/40 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Avisos Ativos</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{activeBroadcastsCount}</h3>
                <p className="text-[11px] text-foreground/60 mt-1">
                  Faixas de transmissão no painel
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Megaphone className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Radar Live + Event Types + Navigation Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upcoming Events Monitor */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-card-bg border-border-custom">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Casamentos & Festas Iminentes (Próximos 7 Dias)
                </CardTitle>
                <p className="text-xs text-foreground/60">
                  Eventos com maior necessidade de suporte ativo e prontidão da portaria.
                </p>
              </div>
              <Link href="/admin/super/eventos">
                <Button variant="outline" size="sm" className="text-xs">
                  Ver Todos
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="divide-y divide-border-custom">
                  {upcomingEvents.map((evt) => (
                    <div key={evt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{evt.title}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                            {evt.type || 'Casamento'}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/60 mt-0.5">
                          Dono: <span className="text-foreground/80 font-medium">{evt.owner_email}</span> • Data: {new Date(evt.date).toLocaleDateString('pt-PT')}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <p className="text-[10px] text-foreground/50 uppercase font-semibold">Convidados</p>
                          <p className="font-bold text-foreground">{evt.confirmed_guests_count} / {evt.guests_count}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-foreground/50 uppercase font-semibold">Portaria</p>
                          <p className="font-bold text-emerald-500">{evt.checkins_count} entradas</p>
                        </div>
                        <Link href="/admin/super/eventos">
                          <Button size="sm" variant="secondary" className="text-xs">
                            Auditar
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-foreground/50 italic">
                  Nenhum evento agendado para os próximos 7 dias.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Modules Navigation Hub */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/admin/super/eventos"
              className="p-5 rounded-2xl bg-card-bg border border-border-custom hover:border-primary/50 transition-all space-y-2 group"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                Gestão de Eventos
              </h4>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Alterar estados, transferir titularidade e abrir modo de suporte para qualquer casamento.
              </p>
            </Link>

            <Link
              href="/admin/super/planners"
              className="p-5 rounded-2xl bg-card-bg border border-border-custom hover:border-primary/50 transition-all space-y-2 group"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Award className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                Planners B2B & Slots
              </h4>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Configurar limites de eventos simultâneos e gerir organizadores parceiros da plataforma.
              </p>
            </Link>

            <Link
              href="/admin/super/fornecedores"
              className="p-5 rounded-2xl bg-card-bg border border-border-custom hover:border-primary/50 transition-all space-y-2 group"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Store className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                Marketplace
              </h4>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Supervisionar catálogo, conceder selos oficiais de verificação e aprovar novos parceiros.
              </p>
            </Link>
          </div>
        </div>

        {/* Right Column: Breakdown & Quick Tools */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-card-bg border-border-custom">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Distribuição por Tipo de Festa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(typeMap).map(([type, count]) => {
                const percentage = events.length > 0 ? Math.round((count / events.length) * 100) : 0;
                const formattedType = type === 'casamento' ? 'Casamento Religioso / Civil'
                  : type === 'casamento_tradicional' ? 'Casamento Tradicional'
                  : type === 'noivado' ? 'Noivado'
                  : type === 'aniversario' ? 'Aniversário'
                  : type;

                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="capitalize text-foreground/80">{formattedType}</span>
                      <span className="text-primary font-bold">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-card-bg border-border-custom">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" /> Exportações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => {
                  SuperAdminRepository.exportToCSV(
                    'utilizadores_meuboda',
                    ['ID', 'Email', 'Role', 'Slots', 'Data Criacao'],
                    users.map(u => [u.id, u.email, u.role, u.planner_slots, u.created_at])
                  );
                }}
              >
                Exportar Utilizadores (CSV)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => {
                  SuperAdminRepository.exportToCSV(
                    'eventos_meuboda',
                    ['ID', 'Titulo', 'Tipo', 'Dono', 'Convidados', 'Checkins', 'Estado', 'Data'],
                    events.map(e => [e.id, e.title, e.type, e.owner_email, e.guests_count, e.checkins_count, e.status, e.date])
                  );
                }}
              >
                Exportar Eventos (CSV)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
