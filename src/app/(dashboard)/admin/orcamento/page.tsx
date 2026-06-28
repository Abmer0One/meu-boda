'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { BudgetRepository } from '@/repositories/budget.repository';
import { Budget } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { budgetSchema } from '@/validations/schemas';
import { DollarSign, Plus, Edit2, Loader2, TrendingUp, CreditCard } from 'lucide-react';

const CATEGORIES = [
  'Salão',
  'Buffet',
  'Fotografia',
  'Vídeo',
  'DJ',
  'Flores',
  'Transporte',
  'Convites',
  'Lua de Mel',
  'Outros',
];

export default function OrcamentoPage() {
  const { currentEvent } = useEvent();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(budgetSchema),
  });

  const loadData = async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      const fetchedBudgets = await BudgetRepository.getAll(currentEvent.id);
      setBudgets(fetchedBudgets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent]);

  const handleEditBudget = (category: string) => {
    setSelectedCategory(category);
    const existing = budgets.find((b) => b.category === category);

    reset({
      category: category,
      estimated_amount: existing ? Number(existing.estimated_amount) : 0,
      paid_amount: existing ? Number(existing.paid_amount) : 0,
    });
    setBudgetModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (!currentEvent) return;

    try {
      await BudgetRepository.upsert({
        event_id: currentEvent.id,
        category: data.category,
        estimated_amount: Number(data.estimated_amount),
        paid_amount: Number(data.paid_amount),
      });
      setBudgetModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations
  const getCategoryStats = (category: string) => {
    const found = budgets.find((b) => b.category === category);
    const estimated = found ? Number(found.estimated_amount) : 0;
    const paid = found ? Number(found.paid_amount) : 0;
    const remaining = estimated - paid;
    return { estimated, paid, remaining };
  };

  const totalEstimated = budgets.reduce((sum, b) => sum + Number(b.estimated_amount), 0);
  const totalPaid = budgets.reduce((sum, b) => sum + Number(b.paid_amount), 0);
  const totalRemaining = totalEstimated - totalPaid;

  if (!currentEvent) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <p className="text-foreground/50 text-sm">Selecione um casamento para gerir o orçamento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" /> Gestão Financeira & Orçamento
        </h1>
        <p className="text-sm text-foreground/60">
          Gerencie despesas, planeamento de gastos e valores pagos por categorias.
        </p>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card-bg">
          <CardContent className="flex items-center gap-4 py-2">
            <div className="rounded-xl bg-accent/15 p-3 text-accent">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                Orçamento Estimado
              </p>
              <h3 className="text-2xl font-bold text-foreground">
                {totalEstimated.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg">
          <CardContent className="flex items-center gap-4 py-2">
            <div className="rounded-xl bg-success/10 p-3 text-success">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                Valor Total Pago
              </p>
              <h3 className="text-2xl font-bold text-foreground">
                {totalPaid.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg">
          <CardContent className="flex items-center gap-4 py-2">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                Balanço Restante
              </p>
              <h3 className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-error' : 'text-success'}`}>
                {totalRemaining.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Breakdown */}
      <Card className="bg-card-bg">
        <CardHeader>
          <CardTitle>Detalhamento por Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border-custom">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-secondary/30 text-foreground/70 font-semibold border-b border-border-custom text-xs">
                    <th className="p-3.5">Categoria</th>
                    <th className="p-3.5">Orçado (Estimado)</th>
                    <th className="p-3.5">Pago</th>
                    <th className="p-3.5">Restante</th>
                    <th className="p-3.5 text-center">Progresso Pago</th>
                    <th className="p-3.5 text-center">Editar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom">
                  {CATEGORIES.map((category) => {
                    const { estimated, paid, remaining } = getCategoryStats(category);
                    const paidPercent = estimated > 0 ? Math.min(100, Math.round((paid / estimated) * 100)) : 0;

                    return (
                      <tr key={category} className="hover:bg-secondary/15 transition-colors">
                        <td className="p-3.5 font-medium">{category}</td>
                        <td className="p-3.5 font-medium">{estimated.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz</td>
                        <td className="p-3.5 font-medium text-success">{paid.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz</td>
                        <td className={`p-3.5 font-medium ${remaining < 0 ? 'text-error' : 'text-foreground/70'}`}>
                          {remaining.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2 justify-center max-w-[120px] mx-auto">
                            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden border border-border-custom/35">
                              <div className="bg-primary h-1.5" style={{ width: `${paidPercent}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-foreground/60 w-8">{paidPercent}%</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleEditBudget(category)}
                            className="p-1.5 rounded-lg text-foreground/50 hover:bg-secondary hover:text-primary transition-all cursor-pointer"
                            title="Editar Orçamento"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
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

      {/* EDIT BUDGET DIALOG */}
      <Dialog
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        title={`Ajustar Orçamento - ${selectedCategory}`}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Hidden input for category */}
          <input type="hidden" {...register('category')} />

          <Input
            label="Estimativa Orçada (Kz)"
            type="number"
            step="0.01"
            error={errors.estimated_amount?.message}
            {...register('estimated_amount')}
          />
          <Input
            label="Valor Já Pago (Kz)"
            type="number"
            step="0.01"
            error={errors.paid_amount?.message}
            {...register('paid_amount')}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setBudgetModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Valores</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
