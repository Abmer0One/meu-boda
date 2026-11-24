'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  SuperAdminRepository,
  AdminUser,
  AdminEvent,
} from '@/repositories/superadmin.repository';
import { isSuperAdmin } from '@/utils/admin';
import { PlatformPayment } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
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
  CheckCircle2,
  XCircle,
  Eye,
  PlusCircle,
  ExternalLink,
  CreditCard,
  Building,
} from 'lucide-react';

export default function SuperAdminOverviewPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [pendingVendorsCount, setPendingVendorsCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [activeBroadcastsCount, setActiveBroadcastsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Payment validation states
  const [paymentFilter, setPaymentFilter] = useState<'pending' | 'all' | 'couples' | 'planners'>('pending');
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PlatformPayment | null>(null);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

  // Manual payment modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualClientType, setManualClientType] = useState<'couple' | 'planner'>('couple');
  const [manualUserEmail, setManualUserEmail] = useState('');
  const [manualEventId, setManualEventId] = useState('');
  const [manualEventTitle, setManualEventTitle] = useState('');
  const [manualPlanType, setManualPlanType] = useState('Licença Casamento B2C');
  const [manualAmount, setManualAmount] = useState(45000);
  const [manualRefCode, setManualRefCode] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  const isAdmin = isSuperAdmin(user);

  const loadData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [fetchedUsers, fetchedEvents, vendors, fetchedPayments, broadcasts] = await Promise.all([
        SuperAdminRepository.getUsers().catch(() => []),
        SuperAdminRepository.getEvents().catch(() => []),
        SuperAdminRepository.getVendors().catch(() => []),
        SuperAdminRepository.getPlatformPayments().catch(() => []),
        SuperAdminRepository.getActiveBroadcasts().catch(() => []),
      ]);

      const safeUsers = Array.isArray(fetchedUsers) ? fetchedUsers : [];
      const safeEvents = Array.isArray(fetchedEvents) ? fetchedEvents : [];
      const safeVendors = Array.isArray(vendors) ? vendors : [];
      const safePayments = Array.isArray(fetchedPayments) ? fetchedPayments : [];
      const safeBroadcasts = Array.isArray(broadcasts) ? broadcasts : [];

      setUsers(safeUsers);
      setEvents(safeEvents);
      setPayments(safePayments);
      setPendingVendorsCount(safeVendors.filter((v) => v && v.status === 'Pendente').length);
      setPendingPaymentsCount(safePayments.filter((p) => p && p.status === 'Pendente').length);
      setActiveBroadcastsCount(safeBroadcasts.length);
    } catch (err) {
      console.error('Error loading super admin overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const isPlannerPayment = (p: PlatformPayment) => {
    const plan = (p.plan_type || '').toLowerCase();
    return plan.includes('planner') || plan.includes('b2b') || plan.includes('starter') || plan.includes('pro');
  };

  const handleDecision = async (
    payment: PlatformPayment,
    decision: 'Aprovado' | 'Recusado'
  ) => {
    setProcessingPaymentId(payment.id);
    try {
      const success = await SuperAdminRepository.updatePaymentStatus(
        payment.id,
        decision,
        payment.user_id,
        payment.plan_type,
        payment.event_id || undefined
      );
      if (success) {
        setPayments((prev) =>
          prev.map((p) =>
            p.id === payment.id
              ? { ...p, status: decision, reviewed_at: new Date().toISOString() }
              : p
          )
        );
        setPendingPaymentsCount((prev) => Math.max(0, prev - 1));
        if (selectedPayment?.id === payment.id) {
          setSelectedPayment(null);
          setSelectedReceiptUrl(null);
        }
      }
    } catch (err) {
      console.error('Error updating payment status:', err);
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleCreateManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUserEmail) {
      alert('Por favor insira o email do utilizador/cliente.');
      return;
    }

    setSubmittingManual(true);
    try {
      const selectedEvent = events.find((ev) => ev.id === manualEventId);
      const res = await SuperAdminRepository.createManualPayment({
        userEmail: manualUserEmail,
        eventId: manualClientType === 'couple' ? (manualEventId || undefined) : undefined,
        eventTitle: manualClientType === 'couple' ? (selectedEvent?.title || manualEventTitle || undefined) : undefined,
        planType: manualPlanType,
        amount: Number(manualAmount) || 0,
        referenceCode: manualRefCode,
        notes: manualNotes,
      });

      if (res.success && res.payment) {
        setPayments((prev) => [res.payment!, ...prev]);
        setIsManualModalOpen(false);
        // Reset form
        setManualUserEmail('');
        setManualEventId('');
        setManualEventTitle('');
        setManualRefCode('');
        setManualNotes('');
      } else {
        alert(res.error || 'Falha ao registar pagamento manual.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao processar ativação manual.');
    } finally {
      setSubmittingManual(false);
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
      <div className="flex h-[55vh] items-center justify-center text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-foreground/60 font-medium">A carregar centro de comando do Super Admin...</p>
        </div>
      </div>
    );
  }

  // Analytics helpers
  const activeEvents = events.filter((e) => e.status === 'Active');
  const archivedEvents = events.filter((e) => e.status === 'Archived');
  const plannersCount = users.filter((u) => u.role === 'planner').length;
  const couplesCount = users.filter((u) => u.role !== 'planner' && u.role !== 'admin').length;

  // Payments segmentation
  const couplePaymentsCount = payments.filter((p) => !isPlannerPayment(p)).length;
  const plannerPaymentsCount = payments.filter((p) => isPlannerPayment(p)).length;
  const totalApprovedRevenue = payments
    .filter((p) => p.status === 'Aprovado')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const approvedPaymentsCount = payments.filter((p) => p.status === 'Aprovado').length;

  const filteredPayments = payments.filter((p) => {
    if (paymentFilter === 'pending') return p.status === 'Pendente';
    if (paymentFilter === 'couples') return !isPlannerPayment(p);
    if (paymentFilter === 'planners') return isPlannerPayment(p);
    return true;
  });

  // Upcoming weddings in the next 7 days
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingEvents = events.filter((e) => {
    const d = new Date(e.date);
    return d >= now && d <= next7Days;
  });

  // Events by type breakdown
  const typeMap: Record<string, number> = {};
  events.forEach((e) => {
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
              href="/admin/super/fornecedores?tab=pendentes"
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
                    {pendingPaymentsCount} Comprovativo(s) a Aguardar Validação
                  </h4>
                  <p className="text-[11px] opacity-80">
                    Transferências de Noivos ou Planners prontas para aprovação imediata.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Utilizadores */}
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

        {/* Total Eventos */}
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

        {/* Receita Validada & Licenças */}
        <Card className="bg-card-bg border-border-custom hover:border-emerald-500/40 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Receita & Licenças</p>
                <h3 className="text-2xl font-bold text-emerald-500 mt-1">
                  {totalApprovedRevenue.toLocaleString('pt-AO')} Kz
                </h3>
                <p className="text-[11px] text-foreground/60 mt-1">
                  {pendingPaymentsCount > 0 ? (
                    <span className="font-semibold text-amber-500">{pendingPaymentsCount} a validar</span>
                  ) : (
                    <span className="text-emerald-500 font-medium">100% em dia</span>
                  )}{' '}
                  • {approvedPaymentsCount} ativados
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Eventos Próximos */}
        <Card className="bg-card-bg border-border-custom hover:border-primary/40 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Eventos da Semana</p>
                <h3 className="text-2xl font-bold text-primary mt-1">{upcomingEvents.length}</h3>
                <p className="text-[11px] text-foreground/60 mt-1">
                  Acontecendo nos próximos 7 dias
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avisos Ativos */}
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

      {/* DEDICATED PAYMENT VALIDATION SECTION (NOIVOS & WEDDING PLANNERS) */}
      <Card className="bg-card-bg border-border-custom shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom/50 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Receipt className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                Verificação & Validação de Pagamentos
                {pendingPaymentsCount > 0 && (
                  <Badge variant="warning" className="animate-pulse">
                    {pendingPaymentsCount} Pendente{pendingPaymentsCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
            </div>
            <p className="text-xs text-foreground/60">
              Aprove comprovativos bancários e ative licenças de Noivos (45.000 Kz) ou pacotes B2B de Wedding Planners (20.000 Kz / 50.000 Kz).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setManualClientType('couple');
                setManualPlanType('Licença Casamento B2C');
                setManualAmount(45000);
                setIsManualModalOpen(true);
              }}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              leftIcon={<PlusCircle className="h-3.5 w-3.5" />}
            >
              + Registar Pagamento / Ativar Licença Manual
            </Button>
            <Link href="/admin/super/pagamentos">
              <Button size="sm" variant="outline" className="text-xs">
                Ver Todos <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background/50 border border-border-custom w-fit overflow-x-auto max-w-full">
            <button
              onClick={() => setPaymentFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                paymentFilter === 'pending'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground/70 hover:text-foreground hover:bg-card-bg'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Pendentes ({pendingPaymentsCount})
            </button>
            <button
              onClick={() => setPaymentFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                paymentFilter === 'all'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground/70 hover:text-foreground hover:bg-card-bg'
              }`}
            >
              Todos ({payments.length})
            </button>
            <button
              onClick={() => setPaymentFilter('couples')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                paymentFilter === 'couples'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground/70 hover:text-foreground hover:bg-card-bg'
              }`}
            >
              Noivos 💍 ({couplePaymentsCount})
            </button>
            <button
              onClick={() => setPaymentFilter('planners')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                paymentFilter === 'planners'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground/70 hover:text-foreground hover:bg-card-bg'
              }`}
            >
              Wedding Planners 📋 ({plannerPaymentsCount})
            </button>
          </div>

          {/* Table */}
          {filteredPayments.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border-custom bg-foreground/[0.01] space-y-2">
              <Receipt className="h-8 w-8 text-foreground/30 mx-auto" />
              <p className="text-xs text-foreground/60 font-medium">
                {paymentFilter === 'pending'
                  ? 'Excelente! Não há comprovativos pendentes a aguardar validação de momento.'
                  : 'Nenhum pagamento registado nesta categoria.'}
              </p>
              <p className="text-[11px] text-foreground/40">
                Pode utilizar o botão "+ Registar Pagamento / Ativar Licença Manual" para ativar licenças pagas por transferência direta ou Multicaixa Express.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-custom bg-foreground/[0.02] text-foreground/60 uppercase font-semibold">
                    <th className="py-2.5 px-3">Cliente / Tipo</th>
                    <th className="py-2.5 px-3">Evento / Âmbito</th>
                    <th className="py-2.5 px-3">Plano & Valor</th>
                    <th className="py-2.5 px-3">Comprovativo</th>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/50">
                  {filteredPayments.slice(0, 10).map((p, idx) => {
                    const isPlanner = isPlannerPayment(p);
                    const isProcessing = processingPaymentId === p.id;
                    const safeRef = p.reference_code || (typeof p.id === 'string' && p.id.length > 5 ? p.id.slice(0, 8) : `P-${idx + 1}`);
                    const safeAmount = Number(p.amount || 0).toLocaleString('pt-AO');
                    const safeDate = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT') : 'Recente';

                    return (
                      <tr key={p.id || `pay_ov_${idx}`} className="hover:bg-foreground/[0.015] transition-colors">
                        {/* Cliente */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-foreground">{p.user_email || 'Cliente'}</div>
                          <div className="mt-0.5">
                            {isPlanner ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                📋 Wedding Planner
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                💍 Noivos (Casamento)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Evento / Âmbito */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-foreground">
                            {p.event_title || (isPlanner ? 'Assinatura Agência' : 'Casamento')}
                          </div>
                          <div className="text-[10px] text-foreground/40 font-mono mt-0.5">
                            Ref: {safeRef}
                          </div>
                        </td>

                        {/* Plano & Valor */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-bold text-foreground text-sm">
                            {safeAmount} Kz
                          </div>
                          <div className="text-[10px] text-primary font-medium mt-0.5">
                            {p.plan_type || 'Licença Casamento'}
                          </div>
                        </td>

                        {/* Comprovativo */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {p.receipt_url ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPayment(p);
                                setSelectedReceiptUrl(p.receipt_url || null);
                              }}
                              className="h-7 text-[11px] px-2.5 border-border-custom hover:bg-foreground/5 flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" /> Ver Doc
                            </Button>
                          ) : (
                            <span className="text-[11px] text-foreground/40 italic">
                              {p.payment_method || 'Registo Manual'}
                            </span>
                          )}
                        </td>

                        {/* Data */}
                        <td className="py-3 px-3 whitespace-nowrap text-foreground/60">
                          {safeDate}
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {p.status === 'Aprovado' ? (
                            <Badge variant="success">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovado
                            </Badge>
                          ) : p.status === 'Pendente' ? (
                            <Badge variant="warning">
                              <Clock className="h-3 w-3 mr-1" /> Pendente
                            </Badge>
                          ) : (
                            <Badge variant="error">
                              <XCircle className="h-3 w-3 mr-1" /> Recusado
                            </Badge>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.status === 'Pendente' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDecision(p, 'Recusado')}
                                  disabled={isProcessing}
                                  className="h-7 text-xs px-2 border-error/30 text-error hover:bg-error/10"
                                >
                                  Recusar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleDecision(p, 'Aprovado')}
                                  disabled={isProcessing}
                                  className="h-7 text-xs px-2.5 bg-emerald-600 text-white hover:bg-emerald-500 font-semibold"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                  )}
                                  Aprovar
                                </Button>
                              </>
                            ) : p.status === 'Aprovado' ? (
                              <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Licenciado
                              </span>
                            ) : (
                              <span className="text-[11px] text-error font-medium">Recusado</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              href="/admin/super/pagamentos"
              className="p-5 rounded-2xl bg-card-bg border border-border-custom hover:border-primary/50 transition-all space-y-2 group relative"
            >
              {pendingPaymentsCount > 0 && (
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  {pendingPaymentsCount} pendente{pendingPaymentsCount > 1 ? 's' : ''}
                </span>
              )}
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform">
                <Receipt className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                Validação de Pagamentos
              </h4>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Verificar comprovativos de noivos e wedding planners, aprovar licenças e histórico financeiro.
              </p>
            </Link>

            <Link
              href="/admin/super/utilizadores?tab=planners"
              className="p-5 rounded-2xl bg-card-bg border border-border-custom hover:border-primary/50 transition-all space-y-2 group"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Award className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                Planners B2B & Licenças
              </h4>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Configurar limites de eventos simultâneos e gerir agências e organizadores parceiros.
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
                Marketplace & Fornecedores
              </h4>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Supervisionar catálogo, validar documentação pendente e moderar novos parceiros.
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
                const formattedType =
                  type === 'casamento'
                    ? 'Casamento Religioso / Civil'
                    : type === 'casamento_tradicional'
                    ? 'Casamento Tradicional'
                    : type === 'noivado'
                    ? 'Noivado'
                    : type === 'aniversario'
                    ? 'Aniversário'
                    : type;

                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="capitalize text-foreground/80">{formattedType}</span>
                      <span className="text-primary font-bold">
                        {count} ({percentage}%)
                      </span>
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
                    users.map((u) => [u.id, u.email, u.role, u.planner_slots, u.created_at])
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
                    events.map((e) => [
                      e.id,
                      e.title,
                      e.type,
                      e.owner_email,
                      e.guests_count,
                      e.checkins_count,
                      e.status,
                      e.date,
                    ])
                  );
                }}
              >
                Exportar Eventos (CSV)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => {
                  SuperAdminRepository.exportToCSV(
                    'pagamentos_meuboda',
                    ['ID', 'Email Utilizador', 'Plano', 'Valor (Kz)', 'Método', 'Referência', 'Estado', 'Data Criação'],
                    payments.map((p) => [
                      p.id,
                      p.user_email || '',
                      p.plan_type,
                      p.amount,
                      p.payment_method || 'Multicaixa / Transferência',
                      p.reference_code || '',
                      p.status,
                      p.created_at,
                    ])
                  );
                }}
              >
                Exportar Pagamentos (CSV)
              </Button>
              <Link
                href="/admin/super/relatorios"
                className="w-full pt-2 mt-2 border-t border-border-custom flex items-center justify-between text-xs text-primary hover:underline font-medium transition-colors"
              >
                <span>Central de Exportações & Auditoria</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RECEIPT PREVIEW MODAL */}
      <Dialog
        isOpen={!!selectedReceiptUrl}
        onClose={() => {
          setSelectedReceiptUrl(null);
          setSelectedPayment(null);
        }}
        title="Comprovativo Bancário de Pagamento"
        size="md"
      >
        {selectedReceiptUrl && selectedPayment && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-foreground/5 border border-border-custom flex items-center justify-between text-xs">
              <div>
                <span className="text-foreground/50 block">Cliente:</span>
                <span className="font-semibold text-foreground">{selectedPayment.user_email}</span>
              </div>
              <div>
                <span className="text-foreground/50 block">Valor:</span>
                <span className="font-bold text-emerald-500">
                  {Number(selectedPayment.amount).toLocaleString('pt-AO')} Kz
                </span>
              </div>
              <div>
                <span className="text-foreground/50 block">Plano:</span>
                <span className="font-medium text-foreground">{selectedPayment.plan_type}</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-xl border border-border-custom bg-black/40 flex items-center justify-center p-2">
              {selectedReceiptUrl.endsWith('.pdf') ? (
                <iframe src={selectedReceiptUrl} className="w-full h-96 rounded-lg" title="PDF Comprovativo" />
              ) : (
                <img
                  src={selectedReceiptUrl}
                  alt="Comprovativo de Pagamento"
                  className="max-h-[50vh] object-contain rounded-lg"
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-custom">
              <a
                href={selectedReceiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Abrir em tamanho original
                <ExternalLink className="h-3 w-3" />
              </a>

              {selectedPayment.status === 'Pendente' && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecision(selectedPayment, 'Recusado')}
                    disabled={!!processingPaymentId}
                    className="border-error/30 text-error hover:bg-error/10 text-xs"
                  >
                    Recusar
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleDecision(selectedPayment, 'Aprovado')}
                    disabled={!!processingPaymentId}
                    className="bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold"
                  >
                    Aprovar & Ativar Plano
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* MANUAL PAYMENT REGISTRATION MODAL */}
      <Dialog
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Registar Pagamento & Ativar Licença Manual"
        size="md"
      >
        <form onSubmit={handleCreateManualPayment} className="space-y-4">
          <p className="text-xs text-foreground/60">
            Registe um pagamento confirmado via transferência bancária direta, Multicaixa Express ou dinheiro para conceder imediatamente a licença de casamento ou slots a planners.
          </p>

          {/* Client Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Tipo de Licenciamento</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setManualClientType('couple');
                  setManualPlanType('Licença Casamento B2C');
                  setManualAmount(45000);
                }}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  manualClientType === 'couple'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border-custom bg-background/50 text-foreground/70 hover:bg-card-bg'
                }`}
              >
                <div className="font-bold">💍 Noivos (B2C)</div>
                <div className="text-[10px] opacity-80 mt-0.5">Licença Única: 45.000 Kz</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setManualClientType('planner');
                  setManualPlanType('Planner Starter (5 Eventos)');
                  setManualAmount(20000);
                }}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  manualClientType === 'planner'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border-custom bg-background/50 text-foreground/70 hover:bg-card-bg'
                }`}
              >
                <div className="font-bold">📋 Wedding Planner (B2B)</div>
                <div className="text-[10px] opacity-80 mt-0.5">Assinatura mensal / slots</div>
              </button>
            </div>
          </div>

          {/* User Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Email do Cliente / Utilizador</label>
            <input
              type="email"
              required
              value={manualUserEmail}
              onChange={(e) => setManualUserEmail(e.target.value)}
              placeholder="ex: noivos@gmail.com ou planner@agencia.ao"
              className="w-full h-9 px-3 rounded-lg bg-background/50 border border-border-custom text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* If couple, option to bind to event */}
          {manualClientType === 'couple' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Vincular a Evento Existente (Opcional)</label>
              <select
                value={manualEventId}
                onChange={(e) => {
                  const val = e.target.value;
                  setManualEventId(val);
                  const ev = events.find((item) => item.id === val);
                  if (ev) {
                    setManualEventTitle(ev.title);
                    if (ev.owner_email && !manualUserEmail) {
                      setManualUserEmail(ev.owner_email);
                    }
                  }
                }}
                className="w-full h-9 px-3 rounded-lg bg-background/50 border border-border-custom text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Selecionar Evento da Lista (ou deixar em branco) --</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.owner_email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Plan Selector & Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Plano / Tipo</label>
              <select
                value={manualPlanType}
                onChange={(e) => {
                  const val = e.target.value;
                  setManualPlanType(val);
                  if (val.includes('45.000') || val.includes('B2C') || val.includes('Casamento')) {
                    setManualAmount(45000);
                  } else if (val.includes('Starter') || val.includes('20.000')) {
                    setManualAmount(20000);
                  } else if (val.includes('Pro') || val.includes('50.000')) {
                    setManualAmount(50000);
                  }
                }}
                className="w-full h-9 px-3 rounded-lg bg-background/50 border border-border-custom text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {manualClientType === 'couple' ? (
                  <>
                    <option value="Licença Casamento B2C">Licença Casamento (45.000 Kz)</option>
                    <option value="Licença Cortesia / VIP">Licença Cortesia / VIP (0 Kz)</option>
                    <option value="Licença Personalizada">Outro Valor</option>
                  </>
                ) : (
                  <>
                    <option value="Planner Starter (5 Eventos)">Planner Starter - 5 Eventos (20.000 Kz)</option>
                    <option value="Planner Pro (15 Eventos)">Planner Pro - 15 Eventos (50.000 Kz)</option>
                    <option value="Planner Agência Ilimitada">Planner Agência VIP</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Valor (Kz)</label>
              <input
                type="number"
                required
                value={manualAmount}
                onChange={(e) => setManualAmount(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg bg-background/50 border border-border-custom text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold"
              />
            </div>
          </div>

          {/* Reference & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Código de Ref. / Método</label>
              <input
                type="text"
                value={manualRefCode}
                onChange={(e) => setManualRefCode(e.target.value)}
                placeholder="Ex: MCX-89312 ou BAI Direto"
                className="w-full h-9 px-3 rounded-lg bg-background/50 border border-border-custom text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Observações</label>
              <input
                type="text"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Ex: Confirmado por WhatsApp"
                className="w-full h-9 px-3 rounded-lg bg-background/50 border border-border-custom text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-custom">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsManualModalOpen(false)}
              disabled={submittingManual}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingManual}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {submittingManual ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  A Ativar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Ativar Licença Imediatamente
                </>
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
