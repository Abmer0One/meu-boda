'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  SuperAdminRepository,
} from '@/repositories/superadmin.repository';
import { LiveCheckinFeed } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Activity,
  Search,
  Filter,
  Users,
  ShieldCheck,
  Clock,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  ShieldAlert,
  Loader2,
  CalendarDays,
  Radio,
  UserPlus,
} from 'lucide-react';

export default function SuperAdminPortariaLivePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [feed, setFeed] = useState<LiveCheckinFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = user?.app_metadata?.role === 'admin'
    || user?.email === 'amota@example.com';

  const loadFeed = async (showSpinner = false) => {
    if (!isAdmin) return;
    if (showSpinner) setLoading(true);
    try {
      const data = await SuperAdminRepository.getRecentCheckins(60);
      setFeed(data);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Error fetching live check-ins:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed(true);
  }, [isAdmin]);

  // Setup auto-refresh every 12 seconds
  useEffect(() => {
    if (!autoRefresh) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      loadFeed(false);
    }, 12000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, isAdmin]);

  // Support mode navigation
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

  // Derive unique events present in the feed for the filter
  const uniqueEvents = Array.from(new Set(feed.map(f => f.event_title))).filter(Boolean);

  // Filter feed
  const filteredFeed = feed.filter(item => {
    const matchesSearch =
      (item.guest_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (item.event_title?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (item.operator?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesEvent = selectedEventFilter === 'all' || item.event_title === selectedEventFilter;

    return matchesSearch && matchesEvent;
  });

  // Calculate statistics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckinsCount = feed.filter(f => f.checked_at?.startsWith(todayStr)).length;
  const totalCompanions = feed.reduce((acc, f) => acc + (f.guest_companions || 0), 0);
  const activeOperators = Array.from(new Set(feed.map(f => f.operator))).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <Activity className="h-6 w-6 text-emerald-500 animate-pulse" />
              Radar Live da Portaria
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Em Direto
            </span>
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            Fluxo em tempo real de entradas de convidados em todos os eventos Meu Boda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                : 'bg-card-bg border-border-custom text-foreground/60'
            }`}
            title="Alternar atualização automática a cada 12 segundos"
          >
            <Radio className={`h-3.5 w-3.5 ${autoRefresh ? 'text-emerald-500' : 'text-foreground/40'}`} />
            Auto-Sync: {autoRefresh ? 'Ligado' : 'Pausado'}
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadFeed(true)}
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
              const headers = ['ID', 'Convidado', 'Acompanhantes', 'Evento', 'Hora Check-in', 'Operador'];
              const rows = feed.map(f => [
                f.id,
                f.guest_name,
                f.guest_companions || 0,
                f.event_title,
                f.checked_at,
                f.operator,
              ]);
              SuperAdminRepository.exportToCSV('checkins_live', headers, rows);
            }}
            className="flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Entradas Hoje</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{todayCheckinsCount}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Total no Radar</p>
          <p className="text-2xl font-bold text-foreground mt-1">{feed.length}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Acompanhantes</p>
          <p className="text-2xl font-bold text-primary mt-1">+{totalCompanions}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Operadores Ativos</p>
          <p className="text-2xl font-bold text-foreground mt-1">{activeOperators}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card-bg border-border-custom p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <Input
              placeholder="Pesquisar por convidado, operador ou evento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-border-custom"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-foreground/40" />
            <select
              value={selectedEventFilter}
              onChange={e => setSelectedEventFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border-custom text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todos os Eventos no Radar</option>
              {uniqueEvents.map(evt => (
                <option key={evt} value={evt}>
                  {evt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Live Stream Table */}
      <Card className="bg-card-bg border-border-custom overflow-hidden">
        <div className="px-4 py-3 border-b border-border-custom flex items-center justify-between bg-foreground/[0.01]">
          <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Últimas Validações de QR Code
          </span>
          <span className="text-[11px] text-foreground/40">
            Última sincronização: {lastRefreshedAt.toLocaleTimeString('pt-PT')}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredFeed.length === 0 ? (
          <div className="text-center p-12 space-y-2">
            <Users className="h-10 w-10 text-foreground/20 mx-auto" />
            <p className="text-foreground/50 text-sm font-medium">Nenhum registo de portaria encontrado.</p>
            <p className="text-foreground/40 text-xs">Os check-ins efetuados na aplicação de portaria surgirão aqui em tempo real.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-foreground/[0.02] text-foreground/60 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Convidado & Acompanhantes</th>
                  <th className="py-3 px-4">Evento</th>
                  <th className="py-3 px-4">Hora de Entrada</th>
                  <th className="py-3 px-4">Operador / Posto</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50">
                {filteredFeed.map((item, idx) => {
                  const checkinDate = new Date(item.checked_at);
                  const isRecent = idx === 0 && (new Date().getTime() - checkinDate.getTime()) < 30000;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-foreground/[0.015] transition-colors ${
                        isRecent ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      {/* Guest */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {item.guest_name ? item.guest_name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{item.guest_name}</span>
                              {isRecent && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                                  Novo
                                </span>
                              )}
                            </div>
                            {item.guest_companions > 0 ? (
                              <div className="text-[11px] text-primary flex items-center gap-1 mt-0.5">
                                <UserPlus className="h-3 w-3" />
                                <span>+{item.guest_companions} acompanhante(s)</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-foreground/40">Entrada individual</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Event */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground text-xs flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
                          <span>{item.event_title || 'Evento Geral'}</span>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs font-semibold text-foreground font-mono">
                          {checkinDate.toLocaleTimeString('pt-PT')}
                        </div>
                        <div className="text-[11px] text-foreground/40">
                          {checkinDate.toLocaleDateString('pt-PT')}
                        </div>
                      </td>

                      {/* Operator */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="default" className="text-[11px]">
                          <ShieldCheck className="h-3 w-3 mr-1 text-primary" />
                          {item.operator || 'Portaria Principal'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {item.event_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAsSupport(item.event_id, item.event_title)}
                            className="h-7 text-xs px-2.5 flex items-center gap-1 border-border-custom hover:bg-foreground/5 ml-auto"
                            title="Entrar no painel deste evento como suporte"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Ver Evento</span>
                          </Button>
                        )}
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
  );
}
