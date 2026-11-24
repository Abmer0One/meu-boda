'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  SuperAdminRepository,
  AdminEvent,
} from '@/repositories/superadmin.repository';
import { isSuperAdmin } from '@/utils/admin';
import { PlatformPayment } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileSpreadsheet,
  ShieldAlert,
  Loader2,
  RefreshCw,
  CreditCard,
  Building,
  Sparkles,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';

export default function SuperAdminPagamentosPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'pending' | 'couples' | 'planners'>('all');

  // Receipt Modal
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PlatformPayment | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const loadPayments = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [paymentsData, eventsData] = await Promise.all([
        SuperAdminRepository.getPlatformPayments(),
        SuperAdminRepository.getEvents(),
      ]);
      setPayments(paymentsData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [isAdmin]);

  const isPlannerPayment = (p: PlatformPayment) => {
    const plan = (p.plan_type || '').toLowerCase();
    return plan.includes('planner') || plan.includes('b2b') || plan.includes('starter') || plan.includes('pro');
  };

  const handleDecision = async (
    payment: PlatformPayment,
    decision: 'Aprovado' | 'Recusado'
  ) => {
    setProcessingId(payment.id);
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
        if (selectedPayment?.id === payment.id) {
          setSelectedPayment(null);
          setSelectedReceiptUrl(null);
        }
      }
    } catch (err) {
      console.error('Error updating payment status:', err);
    } finally {
      setProcessingId(null);
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
          Área restrita aos administradores da plataforma Meu Boda.
        </p>
      </div>
    );
  }

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      (p.user_email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.plan_type?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.event_title?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.reference_code?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    let matchesSegment = true;
    if (segmentFilter === 'pending') matchesSegment = p.status === 'Pendente';
    else if (segmentFilter === 'couples') matchesSegment = !isPlannerPayment(p);
    else if (segmentFilter === 'planners') matchesSegment = isPlannerPayment(p);

    return matchesSearch && matchesStatus && matchesSegment;
  });

  const pendingCount = payments.filter((p) => p.status === 'Pendente').length;
  const approvedCount = payments.filter((p) => p.status === 'Aprovado').length;
  const rejectedCount = payments.filter((p) => p.status === 'Recusado').length;
  const totalApprovedAmount = payments
    .filter((p) => p.status === 'Aprovado')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const couplePaymentsCount = payments.filter((p) => !isPlannerPayment(p)).length;
  const plannerPaymentsCount = payments.filter((p) => isPlannerPayment(p)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              Comprovativos & Pagamentos da Plataforma
            </h1>
            <Badge variant="primary">{payments.length} Registos</Badge>
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            Validação de pagamentos e comprovativos bancários para Noivos (Licença Casamento 45.000 Kz) e Wedding Planners (Assinaturas B2B).
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
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            <PlusCircle className="h-4 w-4" />
            + Registar Pagamento Manual
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadPayments}
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
              const headers = [
                'ID',
                'Email Utilizador',
                'Tipo Cliente',
                'Evento / Destino',
                'Plano',
                'Valor (Kz)',
                'Método',
                'Referência',
                'Estado',
                'Data Criação',
              ];
              const rows = payments.map((p) => [
                p.id,
                p.user_email || '',
                isPlannerPayment(p) ? 'Wedding Planner' : 'Noivo (Casamento)',
                p.event_title || 'N/A',
                p.plan_type,
                p.amount,
                p.payment_method || 'Multicaixa / Transferência',
                p.reference_code || '',
                p.status,
                p.created_at,
              ]);
              SuperAdminRepository.exportToCSV('pagamentos_meuboda', headers, rows);
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
          <p className="text-xs font-medium text-foreground/60">Receita Validada</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">
            {totalApprovedAmount.toLocaleString('pt-AO')} Kz
          </p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Pendentes de Validação</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCount}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Noivos Licenciados</p>
          <p className="text-2xl font-bold text-foreground mt-1">{couplePaymentsCount}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Planners B2B Ativos</p>
          <p className="text-2xl font-bold text-primary mt-1">{plannerPaymentsCount}</p>
        </Card>
      </div>

      {/* Segmentation Tabs + Search Bar */}
      <Card className="bg-card-bg border-border-custom p-4 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background/50 border border-border-custom w-fit overflow-x-auto max-w-full">
          <button
            onClick={() => setSegmentFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              segmentFilter === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'text-foreground/70 hover:text-foreground hover:bg-card-bg'
            }`}
          >
            Todos ({payments.length})
          </button>
          <button
            onClick={() => setSegmentFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              segmentFilter === 'pending'
                ? 'bg-primary text-white shadow-sm'
                : 'text-foreground/70 hover:text-foreground hover:bg-card-bg'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Pendentes ({pendingCount})
          </button>
          <button
            onClick={() => setSegmentFilter('couples')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              segmentFilter === 'couples'
                ? 'bg-primary text-white shadow-sm'
                : 'text-foreground/70 hover:text-foreground hover:bg-card-bg'
            }`}
          >
            Noivos 💍 ({couplePaymentsCount})
          </button>
          <button
            onClick={() => setSegmentFilter('planners')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              segmentFilter === 'planners'
                ? 'bg-primary text-white shadow-sm'
                : 'text-foreground/70 hover:text-foreground hover:bg-card-bg'
            }`}
          >
            Wedding Planners 📋 ({plannerPaymentsCount})
          </button>
        </div>

        {/* Search & Status select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <Input
              placeholder="Pesquisar por email, título de casamento, ref ou plano..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-border-custom"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-foreground/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border-custom text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todos os Estados</option>
              <option value="Pendente">Pendentes de Validação</option>
              <option value="Aprovado">Aprovados</option>
              <option value="Recusado">Recusados</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-card-bg border-border-custom overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center p-12 space-y-2">
            <Receipt className="h-10 w-10 text-foreground/20 mx-auto" />
            <p className="text-foreground/50 text-sm">Nenhum pagamento ou comprovativo registado nesta seleção.</p>
            <p className="text-xs text-foreground/40">
              Quando os noivos ou wedding planners submeterem transferências, surgirão aqui para validação instantânea.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-foreground/[0.02] text-foreground/60 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Cliente / Tipo</th>
                  <th className="py-3 px-4">Evento / Âmbito</th>
                  <th className="py-3 px-4">Plano Adquirido</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4">Data Envio</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50">
                {filteredPayments.map((p) => {
                  const isPlanner = isPlannerPayment(p);
                  const isProcessing = processingId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-foreground/[0.015] transition-colors">
                      {/* Cliente & Tipo */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{p.user_email || 'Utilizador'}</div>
                        <div className="mt-1">
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
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground">{p.event_title || (isPlanner ? 'Assinatura Plataforma' : 'Casamento')}</div>
                        <div className="text-[11px] text-foreground/40 font-mono mt-0.5">
                          Ref: {p.reference_code || p.id.slice(0, 8)}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="primary" className="font-medium text-xs">
                          {p.plan_type}
                        </Badge>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-foreground">
                        {Number(p.amount).toLocaleString('pt-AO')} Kz
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-foreground/70">
                        {p.payment_method || 'Multicaixa / Transf.'}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-foreground/60">
                        {new Date(p.created_at).toLocaleDateString('pt-PT')}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {p.status === 'Aprovado' ? (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Aprovado
                          </Badge>
                        ) : p.status === 'Pendente' ? (
                          <Badge variant="warning">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        ) : (
                          <Badge variant="error">
                            <XCircle className="h-3 w-3 mr-1" />
                            Recusado
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.receipt_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPayment(p);
                                setSelectedReceiptUrl(p.receipt_url || null);
                              }}
                              className="h-7 text-xs px-2.5 border-border-custom hover:bg-foreground/5"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Ver Doc
                            </Button>
                          )}

                          {p.status === 'Pendente' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDecision(p, 'Recusado')}
                                disabled={isProcessing}
                                className="h-7 text-xs px-2 border-error/30 text-error hover:bg-error/10"
                                title="Recusar comprovativo"
                              >
                                Recusar
                              </Button>

                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleDecision(p, 'Aprovado')}
                                disabled={isProcessing}
                                className="h-7 text-xs px-2.5 bg-emerald-600 text-white hover:bg-emerald-500 font-semibold"
                                title="Aprovar e conceder capacidade"
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                )}
                                Aprovar
                              </Button>
                            </>
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
      </Card>

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
                    disabled={!!processingId}
                    className="border-error/30 text-error hover:bg-error/10 text-xs"
                  >
                    Recusar
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleDecision(selectedPayment, 'Aprovado')}
                    disabled={!!processingId}
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
            Registe um pagamento confirmado via transferência bancária, Multicaixa Express ou numerário para conceder imediatamente a licença de casamento ou slots a planners.
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
