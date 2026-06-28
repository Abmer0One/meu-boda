'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { TaskRepository } from '@/repositories/task.repository';
import { Task } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema } from '@/validations/schemas';
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';

export default function TarefasPage() {
  const { currentEvent } = useEvent();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taskSchema),
  });

  const loadData = async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      const fetchedTasks = await TaskRepository.getAll(currentEvent.id);
      setTasks(fetchedTasks);
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

  const handleNewTaskClick = () => {
    setEditingTask(null);
    reset({
      title: '',
      description: '',
      due_date: '',
      priority: 'Média',
      status: 'Pendente',
    });
    setTaskModalOpen(true);
  };

  const handleEditTaskClick = (task: Task) => {
    setEditingTask(task);
    // Format YYYY-MM-DD for date input
    const formattedDate = task.due_date ? task.due_date.slice(0, 10) : '';

    reset({
      title: task.title,
      description: task.description || '',
      due_date: formattedDate,
      priority: task.priority,
      status: task.status,
    });
    setTaskModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (!currentEvent) return;

    const payload = {
      event_id: currentEvent.id,
      title: data.title,
      description: data.description || null,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      priority: data.priority,
      status: data.status,
    };

    try {
      if (editingTask) {
        await TaskRepository.update(editingTask.id, payload);
      } else {
        await TaskRepository.create(payload);
      }
      setTaskModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTaskComplete = async (task: Task) => {
    const nextStatus = task.status === 'Concluído' ? 'Pendente' : 'Concluído';
    try {
      await TaskRepository.update(task.id, { status: nextStatus });
      // Update local state instantly
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await TaskRepository.delete(taskToDelete.id);
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!currentEvent) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <p className="text-foreground/50 text-sm">Selecione um casamento para gerir as tarefas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" /> Checklist de Tarefas
          </h1>
          <p className="text-sm text-foreground/60">
            Adicione tarefas de planeamento, defina prioridades e prazos de conclusão.
          </p>
        </div>

        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleNewTaskClick} size="sm">
          Nova Tarefa
        </Button>
      </div>

      {/* Checklist List */}
      <Card className="bg-card-bg">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isCompleted = task.status === 'Concluído';
              const isHigh = task.priority === 'Alta';
              const isMed = task.priority === 'Média';

              return (
                <div
                  key={task.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-2xl bg-background/50 hover:bg-secondary/15 transition-all gap-4 ${
                    isCompleted ? 'border-success/35 opacity-70' : 'border-border-custom'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Completion checkbox */}
                    <button
                      onClick={() => toggleTaskComplete(task)}
                      className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                        isCompleted
                          ? 'bg-success border-success text-white'
                          : 'border-border-custom hover:border-primary bg-card-bg'
                      }`}
                    >
                      {isCompleted && <Check className="h-3.5 w-3.5" />}
                    </button>

                    <div>
                      <p className={`text-sm font-semibold ${isCompleted ? 'line-through text-foreground/50' : ''}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-foreground/60 mt-0.5">{task.description}</p>
                      )}
                      {task.due_date && (
                        <p className="text-[10px] text-foreground/45 flex items-center gap-1 mt-1 font-semibold">
                          <Calendar className="h-3 w-3" /> Vence a:{' '}
                          {new Date(task.due_date).toLocaleDateString('pt-PT')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <Badge variant={isHigh ? 'error' : isMed ? 'warning' : 'default'}>
                      {task.priority}
                    </Badge>
                    <Badge variant={isCompleted ? 'success' : task.status === 'Em Progresso' ? 'primary' : 'default'}>
                      {task.status}
                    </Badge>

                    <div className="flex gap-1 border-l border-border-custom pl-2.5 ml-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditTaskClick(task)} className="p-1 rounded-lg">
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(task)} className="p-1 text-error hover:bg-error/10 rounded-lg">
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-border-custom rounded-xl">
            <CheckSquare className="h-10 w-10 text-foreground/25 mb-2" />
            <p className="text-sm font-semibold text-foreground/75">Nenhuma tarefa criada</p>
            <p className="text-xs text-foreground/50 mt-1">
              Crie a sua primeira tarefa clicando no botão &quot;Nova Tarefa&quot; acima.
            </p>
          </div>
        )}
      </Card>

      {/* ADD/EDIT TASK DIALOG */}
      <Dialog
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title={editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <Input
            label="Título da Tarefa"
            placeholder="Contratar fotógrafo"
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Data de Vencimento"
              type="date"
              error={errors.due_date?.message}
              {...register('due_date')}
            />

            <Select
              label="Prioridade"
              options={[
                { value: 'Baixa', label: 'Baixa' },
                { value: 'Média', label: 'Média' },
                { value: 'Alta', label: 'Alta' },
              ]}
              error={errors.priority?.message}
              {...register('priority')}
            />

            <Select
              label="Estado"
              options={[
                { value: 'Pendente', label: 'Pendente' },
                { value: 'Em Progresso', label: 'Em Progresso' },
                { value: 'Concluído', label: 'Concluído' },
              ]}
              error={errors.status?.message}
              {...register('status')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground/75 tracking-wide">Descrição / Notas</label>
            <textarea
              rows={3}
              placeholder="Pesquisar portefólios, marcar reuniões..."
              className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              {...register('description')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setTaskModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Tarefa</Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Eliminar Tarefa">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-error shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Tem certeza que deseja remover esta tarefa?</p>
              <p className="text-xs text-foreground/60 mt-1">
                Remover a tarefa <span className="font-semibold">{taskToDelete?.title}</span> é uma ação permanente e não pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Eliminar Tarefa
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
