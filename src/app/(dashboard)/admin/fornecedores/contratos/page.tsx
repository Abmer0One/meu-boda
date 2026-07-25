'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VendorContract } from '@/types';
import { ContractRepository } from '@/repositories/marketplace.repository';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  CheckSquare, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';

export default function VendorContractsPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleToggleInstallmentStatus = async (contract: VendorContract, index: number) => {
    const updatedInstallments = [...contract.payment_installments];
    const currentStatus = updatedInstallments[index].status;
    updatedInstallments[index].status = currentStatus === 'Paid' ? 'Pending' : 'Paid';

    try {
      const result = await ContractRepository.updateInstallments(contract.id, updatedInstallments);
      if (result) {
        // Update local state without full reload
        setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, payment_installments: updatedInstallments } : c));
      }
    } catch (err) {
      console.error(err);
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
            <p className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">Total Recebido (Sinais)</p>
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
                    <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Parcelas & Pagamentos</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {contract.payment_installments?.map((inst: any, idx: number) => {
                        const isPaid = inst.status === 'Paid';
                        return (
                          <div 
                            key={idx} 
                            className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                              isPaid 
                                ? 'bg-success/5 border-success/20 text-success' 
                                : 'bg-secondary/5 border-border-custom text-foreground/80'
                            }`}
                          >
                            <div className="space-y-1">
                              <p className="font-bold text-xs">Parcela {idx + 1} ({inst.percentage}%)</p>
                              <p className="text-sm font-extrabold">{inst.amount.toLocaleString('pt-AO')} Kz</p>
                            </div>

                            <button
                              onClick={() => handleToggleInstallmentStatus(contract, idx)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                isPaid 
                                  ? 'bg-success text-white' 
                                  : 'bg-foreground/10 text-foreground/75 hover:bg-foreground/20'
                              }`}
                            >
                              <CheckSquare className="h-3.5 w-3.5" />
                              {isPaid ? 'Recebido' : 'Marcar Pago'}
                            </button>
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
    </div>
  );
}
