'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VendorContract } from '@/types';
import { ContractRepository } from '@/repositories/marketplace.repository';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  CheckSquare, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Paperclip,
  ExternalLink,
  Check,
  X,
  Clock
} from 'lucide-react';

export default function VendorContractsPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [loading, setLoading] = useState(true);

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [selectedInstallmentIndex, setSelectedInstallmentIndex] = useState<number>(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadContracts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const fetched = await ContractRepository.getContractsForVendor(user.id);
      setContracts(fetched);
    } catch (err) {
      console.error('Error loading vendor contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Confirm receipt / payment
  const handleConfirmPayment = async (contract: any, index: number) => {
    setActionLoading(`${contract.id}_${index}`);
    try {
      await ContractRepository.confirmPayment(
        contract.id,
        index,
        contract.event_id,
        contract.vendor_profile?.category || 'Serviços'
      );
      await loadContracts();
    } catch (err) {
      console.error(err);
      alert('Erro ao confirmar pagamento.');
    } finally {
      setActionLoading(null);
    }
  };

  // Open rejection modal
  const handleOpenRejectModal = (contract: any, index: number) => {
    setSelectedContract(contract);
    setSelectedInstallmentIndex(index);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  // Confirm rejection
  const handleRejectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract || !rejectionReason.trim()) return;
    setIsRejecting(true);
    try {
      await ContractRepository.rejectPayment(
        selectedContract.id,
        selectedInstallmentIndex,
        rejectionReason.trim()
      );
      setRejectModalOpen(false);
      await loadContracts();
    } catch (err) {
      console.error(err);
      alert('Erro ao recusar comprovativo.');
    } finally {
      setIsRejecting(false);
    }
  };

  // Record direct payment (Cash/TPA)
  const handleDirectPayment = async (contract: any, index: number) => {
    const amount = contract.payment_installments?.[index]?.amount || 0;
    if (!confirm(`Confirma o recebimento direto (Cash / TPA) da parcela #${index + 1} (${amount.toLocaleString('pt-AO')} Kz)? O valor será creditado no orçamento do casamento.`)) {
      return;
    }
    setActionLoading(`${contract.id}_${index}`);
    try {
      await ContractRepository.recordDirectPayment(
        contract.id,
        index,
        contract.event_id,
        contract.vendor_profile?.category || 'Serviços'
      );
      await loadContracts();
    } catch (err) {
      console.error(err);
      alert('Erro ao registar pagamento direto.');
    } finally {
      setActionLoading(null);
    }
  };

  // Calculations
  const activeContracts = contracts.filter(c => c.status === 'Ativo');
  const totalValue = activeContracts.reduce((sum, c) => sum + Number(c.total_value), 0);
  
  let totalPaid = 0;
  let totalPending = 0;

  activeContracts.forEach(c => {
    c.payment_installments?.forEach(inst => {
      if (inst.status === 'Paid') {
        totalPaid += inst.amount;
      } else {
        totalPending += inst.amount;
      }
    });
  });

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Meus Contratos & Faturação
        </h1>
        <p className="text-sm text-foreground/60">
          Controle a sua agenda de casamentos fechados, orçamentos recebidos e parcelas financeiras pendentes.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-card-bg border border-border-custom px-4 py-3 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">Volume de Vendas</p>
            <h4 className="text-lg font-bold text-foreground">{totalValue.toLocaleString('pt-AO')} Kz</h4>
          </div>
        </Card>

        <Card className="bg-card-bg border border-border-custom px-4 py-3 flex items-center gap-3">
          <div className="rounded-lg bg-success/10 p-2 text-success shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">Total Recebido (Confirmado)</p>
            <h4 className="text-lg font-bold text-foreground">{totalPaid.toLocaleString('pt-AO')} Kz</h4>
          </div>
        </Card>

        <Card className="bg-card-bg border border-border-custom px-4 py-3 flex items-center gap-3">
          <div className="rounded-lg bg-warning/10 p-2 text-warning shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">A Receber (Restante)</p>
            <h4 className="text-lg font-bold text-foreground">{totalPending.toLocaleString('pt-AO')} Kz</h4>
          </div>
        </Card>
      </div>

      {/* Contracts List */}
      {contracts.length > 0 ? (
        <div className="space-y-6">
          {contracts.map((contract: any) => (
            <Card key={contract.id} className="bg-card-bg border border-border-custom">
              <CardContent className="p-6 space-y-4">
                {/* Contract Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border-custom pb-4 gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-foreground">
                      {contract.room?.event?.title || 'Casamento do Cliente'}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-foreground/50 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(contract.event_date).toLocaleDateString('pt-AO')}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {contract.service_title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-primary">
                      {Number(contract.total_value).toLocaleString('pt-AO')} Kz
                    </span>
                    <Badge variant={contract.status === 'Ativo' ? 'success' : contract.status === 'Recusado' ? 'error' : 'warning'}>
                      {contract.status === 'Ativo' ? 'Confirmado' : contract.status}
                    </Badge>
                  </div>
                </div>

                {/* Installments Breakdown */}
                {contract.status === 'Ativo' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Parcelas & Validação de Pagamentos</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {contract.payment_installments?.map((inst: any, idx: number) => {
                        const isPaid = inst.status === 'Paid';
                        const isUnderReview = inst.status === 'UnderReview';
                        const isRejected = inst.status === 'Rejected';
                        const isPending = !inst.status || inst.status === 'Pending';
                        const isCurrentActionLoading = actionLoading === `${contract.id}_${idx}`;

                        return (
                          <div 
                            key={idx} 
                            className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                              isPaid 
                                ? 'bg-success/5 border-success/30' 
                                : isUnderReview
                                ? 'bg-blue-500/10 border-blue-500/40 shadow-sm'
                                : isRejected
                                ? 'bg-rose-500/5 border-rose-500/30'
                                : 'bg-secondary/5 border-border-custom'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <p className="font-bold text-xs text-foreground">Parcela {idx + 1} ({inst.percentage}%)</p>
                                <p className="text-sm font-extrabold text-foreground">{inst.amount.toLocaleString('pt-AO')} Kz</p>
                              </div>

                              <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                isPaid
                                  ? 'bg-emerald-600 text-white'
                                  : isUnderReview
                                  ? 'bg-blue-600 text-white animate-pulse'
                                  : isRejected
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                              }`}>
                                {isPaid ? 'Recebido & Validado' : isUnderReview ? 'Comprovativo Recebido' : isRejected ? 'Recusado' : 'Pendente'}
                              </span>
                            </div>

                            {/* Receipt view link */}
                            {inst.receipt_url && (
                              <div className="flex items-center justify-between text-[11px] bg-background/80 p-2 rounded-lg border border-border-custom/60">
                                <a
                                  href={inst.receipt_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 text-primary hover:underline font-medium truncate max-w-[220px]"
                                  title={inst.receipt_name || 'Comprovativo'}
                                >
                                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{inst.receipt_name || 'Ver Comprovativo'}</span>
                                </a>
                                <a
                                  href={inst.receipt_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-foreground/60 hover:text-foreground flex items-center gap-0.5"
                                >
                                  <ExternalLink className="h-3 w-3" /> Abrir
                                </a>
                              </div>
                            )}

                            {/* Rejection reason */}
                            {isRejected && inst.rejection_reason && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2 rounded-md">
                                <strong>Motivo da recusa:</strong> {inst.rejection_reason}
                              </p>
                            )}

                            {/* Notes */}
                            {inst.notes && (
                              <p className="text-[10px] text-foreground/60 italic">
                                Nota: {inst.notes}
                              </p>
                            )}

                            {/* Verification date */}
                            {isPaid && inst.verified_at && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Confirmado em {new Date(inst.verified_at).toLocaleDateString('pt-AO')}
                              </p>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-border-custom/40 flex items-center justify-end gap-2">
                              {/* Under Review: Confirm or Reject */}
                              {isUnderReview && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isCurrentActionLoading}
                                    onClick={() => handleOpenRejectModal(contract, idx)}
                                    className="text-xs h-7 px-2 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                                  >
                                    <X className="h-3 w-3 mr-1" /> Recusar
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={isCurrentActionLoading}
                                    isLoading={isCurrentActionLoading}
                                    onClick={() => handleConfirmPayment(contract, idx)}
                                    className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                  >
                                    <Check className="h-3 w-3 mr-1" /> Confirmar Recebimento
                                  </Button>
                                </>
                              )}

                              {/* Pending: Direct payment */}
                              {isPending && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isCurrentActionLoading}
                                  isLoading={isCurrentActionLoading}
                                  onClick={() => handleDirectPayment(contract, idx)}
                                  className="text-xs h-7 px-2 text-foreground/75 hover:text-foreground"
                                >
                                  <CheckSquare className="h-3.5 w-3.5 mr-1" /> Registar Recebido (Presencial/TPA)
                                </Button>
                              )}

                              {/* Rejected: Option to mark direct payment */}
                              {isRejected && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isCurrentActionLoading}
                                  isLoading={isCurrentActionLoading}
                                  onClick={() => handleDirectPayment(contract, idx)}
                                  className="text-xs h-7 px-2 text-foreground/75 hover:text-foreground"
                                >
                                  <CheckSquare className="h-3.5 w-3.5 mr-1" /> Marcar Pago (Direto)
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-border-custom rounded-xl bg-card-bg">
          <FileText className="h-10 w-10 text-foreground/25 mb-2" />
          <p className="text-sm font-semibold text-foreground/75">Nenhum contrato ativo</p>
          <p className="text-xs text-foreground/50 mt-1">
            As propostas aceites pelos noivos aparecerão aqui automaticamente como contratos de prestação de serviços.
          </p>
        </div>
      )}

      {/* REJECT RECEIPT MODAL */}
      <Dialog
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={`Recusar Comprovativo - Parcela #${selectedInstallmentIndex + 1}`}
      >
        <form onSubmit={handleRejectPayment} className="space-y-4">
          <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400">
            <p className="font-semibold">
              Indique o motivo da recusa para que o cliente saiba porque o comprovativo não foi validado.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Motivo da Recusa *
            </label>
            <textarea
              rows={3}
              required
              placeholder="ex: O valor ainda não foi creditado na conta; o documento anexado está cortado..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full text-xs rounded-xl border border-border-custom p-3 bg-secondary/5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setRejectModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              isLoading={isRejecting} 
              disabled={!rejectionReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <X className="h-4 w-4 mr-1.5" /> Confirmar Recusa
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
