'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  SuperAdminRepository,
} from '@/repositories/superadmin.repository';
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
} from 'lucide-react';

export default function SuperAdminPagamentosPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Receipt Modal
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PlatformPayment | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isAdmin = user?.app_metadata?.role === 'admin'
    || user?.email === 'amota@example.com';

  const loadPayments = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await SuperAdminRepository.getPlatformPayments();
      setPayments(data);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [isAdmin]);

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
        payment.plan_type
      );
      if (success) {
        setPayments(prev =>
          prev.map(p => (p.id === payment.id ? { ...p, status: decision, reviewed_at: new Date().toISOString() } : p))
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
  const filteredPayments = payments.filter(p => {
    const matchesSearch =
      (p.user_email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.plan_type?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.reference_code?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = payments.filter(p => p.status === 'Pendente').length;
  const approvedCount = payments.filter(p => p.status === 'Aprovado').length;
  const rejectedCount = payments.filter(p => p.status === 'Recusado').length;
  const totalApprovedAmount = payments
    .filter(p => p.status === 'Aprovado')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

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
            Validação de comprovativos Multicaixa e transferências bancárias para concessão automática de planos.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
              const headers = ['ID', 'Email Utilizador', 'Plano', 'Valor (Kz)', 'Método', 'Referência', 'Estado', 'Data Criação'];
              const rows = payments.map(p => [
                p.id,
                p.user_email || '',
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
          <p className="text-xs font-medium text-foreground/60">Aprovados</p>
          <p className="text-2xl font-bold text-foreground mt-1">{approvedCount}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Recusados</p>
          <p className="text-2xl font-bold text-error mt-1">{rejectedCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card-bg border-border-custom p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <Input
              placeholder="Pesquisar por email, referência ou plano..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-border-custom"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-foreground/40" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
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
            <p className="text-foreground/50 text-sm">Nenhum pagamento ou comprovativo registado.</p>
            <p className="text-xs text-foreground/40">
              Quando os clientes carregarem comprovativos bancários para aquisição de planos, surgirão aqui para validação.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-foreground/[0.02] text-foreground/60 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Utilizador / Referência</th>
                  <th className="py-3 px-4">Plano Adquirido</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4">Data Envio</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50">
                {filteredPayments.map(p => {
                  const isProcessing = processingId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-foreground/[0.015] transition-colors">
                      {/* User & Ref */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{p.user_email || 'Utilizador'}</div>
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
                <span className="font-bold text-emerald-500">{Number(selectedPayment.amount).toLocaleString('pt-AO')} Kz</span>
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
    </div>
  );
}
