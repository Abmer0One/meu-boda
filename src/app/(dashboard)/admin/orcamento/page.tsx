'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { BudgetRepository } from '@/repositories/budget.repository';
import { Budget } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { budgetSchema } from '@/validations/schemas';
import { DollarSign, Plus, Edit2, Loader2, TrendingUp, CreditCard, Trash2, AlertCircle } from 'lucide-react';

export default function OrcamentoPage() {
  const { currentEvent } = useEvent();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: '',
      estimated_amount: 0,
      paid_amount: 0,
    },
  });

  const loadData = async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      let fetchedBudgets = await BudgetRepository.getAll(currentEvent.id);

      // Pre-populate default categories if this event has NO budget records yet
      if (fetchedBudgets.length === 0) {
        let defaultCategories: string[] = [];
        if (currentEvent.type === 'casamento') {
          defaultCategories = [
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
        } else if (currentEvent.type === 'aniversario') {
          defaultCategories = [
            'Espaço / Salão',
            'Buffet & Bebidas',
            'Bolo de Aniversário',
            'Decoração',
            'DJ & Equipamento de Som',
            'Fotografia',
            'Convites Digitais',
            'Animação / Entretenimento',
            'Outros',
          ];
        } else if (currentEvent.type === 'pedido') {
          defaultCategories = [
            'Anel / Alianças',
            'Restaurante / Espaço',
            'Flores / Rosas',
            'Música ao Vivo / Violinista',
            'Fotografia',
            'Outros',
          ];
        } else {
          defaultCategories = [
            'Espaço / Local',
            'Alimentação / Catering',
            'Decoração',
            'Som & Iluminação',
            'Fotografia',
            'Outros',
          ];
        }

        // Sequential insert to avoid race conditions or use upsert
        await Promise.all(
          defaultCategories.map((cat) =>
            BudgetRepository.upsert({
              event_id: currentEvent.id,
              category: cat,
              estimated_amount: 0,
              paid_amount: 0,
            })
          )
        );

        // Reload from DB
        fetchedBudgets = await BudgetRepository.getAll(currentEvent.id);
      }

      setBudgets(fetchedBudgets);
    } catch (err) {
      console.error('Error loading budget details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent]);

  const handleAddBudget = () => {
    setBudgetToEdit(null);
    reset({
      category: '',
      estimated_amount: 0,
      paid_amount: 0,
    });
    setBudgetModalOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setBudgetToEdit(budget);
    reset({
      category: budget.category,
      estimated_amount: Number(budget.estimated_amount),
      paid_amount: Number(budget.paid_amount),
    });
    setBudgetModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (!currentEvent) return;

    try {
      if (budgetToEdit) {
        // Edit category using update by ID (allows renaming category names safely)
        await BudgetRepository.update(budgetToEdit.id, {
          category: data.category,
          estimated_amount: Number(data.estimated_amount),
          paid_amount: Number(data.paid_amount),
        });
      } else {
        // Create new category entry
        await BudgetRepository.upsert({
          event_id: currentEvent.id,
          category: data.category,
          estimated_amount: Number(data.estimated_amount),
          paid_amount: Number(data.paid_amount),
        });
      }
      setBudgetModalOpen(false);
      setBudgetToEdit(null);
      loadData();
    } catch (err) {
      console.error('Error saving budget item:', err);
    }
  };

  const handleDeleteBudgetClick = (budget: Budget) => {
    setBudgetToDelete(budget);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteBudget = async () => {
    if (!budgetToDelete) return;
    try {
      await BudgetRepository.delete(budgetToDelete.id);
      setDeleteConfirmOpen(false);
      setBudgetToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting budget item:', err);
    }
  };

  // Calculations
  const totalEstimated = budgets.reduce((sum, b) => sum + Number(b.estimated_amount), 0);
  const totalPaid = budgets.reduce((sum, b) => sum + Number(b.paid_amount), 0);
  const totalRemaining = totalEstimated - totalPaid;

  if (!currentEvent) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <p className="text-foreground/50 text-sm">Selecione um evento para gerir o orçamento.</p>
      </div>
    );
  }

  // Get localized title depending on event type
  const getEventName = () => {
    switch (currentEvent.type) {
      case 'casamento':
        return 'casamento';
      case 'aniversario':
        return 'aniversário';
      case 'pedido':
        return 'pedido de casamento';
      default:
        return 'evento';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" /> Gestão Financeira & Orçamento
          </h1>
          <p className="text-sm text-foreground/60">
            Gerencie despesas, planeamento de gastos e valores pagos por categorias.
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleAddBudget} size="sm">
          Adicionar Gasto
        </Button>
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
          ) : budgets.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border-custom">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-secondary/30 text-foreground/70 font-semibold border-b border-border-custom text-xs">
                    <th className="p-3.5">Categoria</th>
                    <th className="p-3.5">Orçado (Estimado)</th>
                    <th className="p-3.5">Pago</th>
                    <th className="p-3.5">Restante</th>
                    <th className="p-3.5 text-center">Progresso Pago</th>
                    <th className="p-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom">
                  {budgets.map((budget) => {
                    const estimated = Number(budget.estimated_amount);
                    const paid = Number(budget.paid_amount);
                    const remaining = estimated - paid;
                    const paidPercent = estimated > 0 ? Math.min(100, Math.round((paid / estimated) * 100)) : 0;

                    return (
                      <tr key={budget.id} className="hover:bg-secondary/15 transition-colors">
                        <td className="p-3.5 font-medium">{budget.category}</td>
                        <td className="p-3.5 font-medium">
                          {estimated.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                        </td>
                        <td className="p-3.5 font-medium text-success">
                          {paid.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                        </td>
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
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditBudget(budget)}
                              className="p-1.5 rounded-lg text-foreground/50 hover:bg-secondary hover:text-primary transition-all cursor-pointer"
                              title="Editar Orçamento"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBudgetClick(budget)}
                              className="p-1.5 rounded-lg text-foreground/50 hover:bg-error/15 hover:text-error transition-all cursor-pointer"
                              title="Eliminar Gasto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-10 text-foreground/40 border border-dashed border-border-custom rounded-xl">
              <DollarSign className="h-10 w-10 text-foreground/20 mb-2" />
              <p className="text-sm font-semibold">Nenhum gasto registado</p>
              <p className="text-xs text-foreground/50 mt-1">
                Adicione categorias personalizadas clicando no botão &quot;Adicionar Gasto&quot;.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* EDIT/ADD BUDGET DIALOG */}
      <Dialog
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        title={budgetToEdit ? 'Editar Categoria / Gasto' : 'Adicionar Gasto / Categoria'}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <Input
            label="Nome da Categoria / Gasto"
            placeholder="Ex: Decoração de Mesa, Bolo extra"
            error={errors.category?.message}
            {...register('category')}
          />
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
            <Button type="submit">{budgetToEdit ? 'Guardar Valores' : 'Adicionar Gasto'}</Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar Gasto do Orçamento"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-error shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Deseja eliminar este gasto?</p>
              <p className="text-xs text-foreground/60 mt-1">
                Ao eliminar a categoria <span className="font-semibold">{budgetToDelete?.category}</span>, ela será permanentemente removida do orçamento do {getEventName()}. Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDeleteBudget}>
              Eliminar Gasto
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
