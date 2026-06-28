'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { DashboardService } from '@/services/dashboard.service';
import { TaskRepository } from '@/repositories/task.repository';
import { BudgetRepository } from '@/repositories/budget.repository';
import { CheckInRepository } from '@/repositories/checkin.repository';
import { DashboardStats, Task, Budget, CheckIn } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  FadeInUp,
  StaggerContainer,
  StaggerItem,
  HoverCard,
  AnimatedCounter,
} from '@/components/animations/FramerAnimations';
import {
  Calendar,
  Users,
  CheckCircle,
  HelpCircle,
  XCircle,
  Mail,
  DollarSign,
  TrendingUp,
  ClipboardList,
  CheckSquare,
  QrCode,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { currentEvent } = useEvent();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentEvent) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [fetchedStats, fetchedTasks, fetchedBudgets, fetchedCheckins] = await Promise.all([
          DashboardService.getStats(currentEvent.id),
          TaskRepository.getAll(currentEvent.id),
          BudgetRepository.getAll(currentEvent.id),
          CheckInRepository.getAll(currentEvent.id),
        ]);

        setStats(fetchedStats);
        setTasks(fetchedTasks.slice(0, 5)); // show top 5 tasks
        setBudgets(fetchedBudgets);
        setCheckins(fetchedCheckins.slice(0, 5)); // show last 5 checkins
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentEvent]);

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-foreground/60 font-medium">A carregar métricas...</p>
        </div>
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center text-center">
        <p className="text-sm text-foreground/50">Por favor, selecione ou crie um casamento para ver o painel.</p>
      </div>
    );
  }

  // RSVP Chart Data
  const rsvpData = [
    { name: 'Confirmados', value: stats?.confirmedGuests || 0, color: '#22C55E' },
    { name: 'Pendentes', value: stats?.pendingGuests || 0, color: '#F59E0B' },
    { name: 'Recusados', value: stats?.declinedGuests || 0, color: '#EF4444' },
  ].filter((d) => d.value > 0);

  // Fallback if empty
  const isRsvpDataEmpty = rsvpData.length === 0;
  const displayRsvpData = isRsvpDataEmpty
    ? [{ name: 'Sem Dados', value: 1, color: '#E8DFE0' }]
    : rsvpData;

  // Budget Chart Data (Categories)
  const budgetChartData = budgets.map((b) => ({
    category: b.category,
    Orçado: Number(b.estimated_amount),
    Pago: Number(b.paid_amount),
  }));

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Painel de Controlo - {currentEvent.title}
        </h1>
        <p className="text-sm text-foreground/60">
          Acompanhe o estado de organização do seu grande dia.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <StaggerContainer>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <HoverCard className="h-full">
              <Card className="h-full bg-card-bg">
                <CardContent className="flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center gap-2 min-[380px]:gap-4 p-3.5 sm:p-4">
                  <div className="rounded-xl bg-primary/10 p-2.5 sm:p-3 text-primary shrink-0">
                    <Calendar className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-foreground/50 uppercase tracking-wider">
                      Dias Restantes
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-0">
                      <AnimatedCounter value={stats?.daysRemaining || 0} />
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </HoverCard>
          </StaggerItem>

          <StaggerItem>
            <HoverCard className="h-full">
              <Card className="h-full bg-card-bg">
                <CardContent className="flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center gap-2 min-[380px]:gap-4 p-3.5 sm:p-4">
                  <div className="rounded-xl bg-accent/15 p-2.5 sm:p-3 text-accent shrink-0">
                    <Users className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-foreground/50 uppercase tracking-wider">
                      Total Convidados
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-0">
                      <AnimatedCounter value={stats?.totalGuests || 0} />
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </HoverCard>
          </StaggerItem>

          <StaggerItem>
            <HoverCard className="h-full">
              <Card className="h-full bg-card-bg">
                <CardContent className="flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center gap-2 min-[380px]:gap-4 p-3.5 sm:p-4">
                  <div className="rounded-xl bg-success/10 p-2.5 sm:p-3 text-success shrink-0">
                    <CheckCircle className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-foreground/50 uppercase tracking-wider">
                      Confirmados
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-0">
                      <AnimatedCounter value={stats?.confirmedGuests || 0} />
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </HoverCard>
          </StaggerItem>

          <StaggerItem>
            <HoverCard className="h-full">
              <Card className="h-full bg-card-bg">
                <CardContent className="flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center gap-2 min-[380px]:gap-4 p-3.5 sm:p-4">
                  <div className="rounded-xl bg-warning/10 p-2.5 sm:p-3 text-warning shrink-0">
                    <HelpCircle className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-foreground/50 uppercase tracking-wider">
                      Pendentes
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-0">
                      <AnimatedCounter value={stats?.pendingGuests || 0} />
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </HoverCard>
          </StaggerItem>
        </div>
      </StaggerContainer>

      {/* Secondary Row (Invites & Budget overview) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card-bg">
          <CardContent className="flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center gap-2 min-[380px]:gap-4 p-3.5 sm:p-4 py-3 sm:py-4">
            <div className="rounded-xl bg-foreground/5 p-2.5 sm:p-3 text-foreground/60 shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-foreground/50 uppercase tracking-wider">
                Convites Enviados
              </p>
              <h4 className="text-base sm:text-lg font-bold text-foreground mt-0.5 sm:mt-0">
                <AnimatedCounter value={stats?.invitationsSent || 0} />
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg">
          <CardContent className="flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center gap-2 min-[380px]:gap-4 p-3.5 sm:p-4 py-3 sm:py-4">
            <div className="rounded-xl bg-foreground/5 p-2.5 sm:p-3 text-foreground/60 shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-foreground/50 uppercase tracking-wider">
                Tarefas Pendentes
              </p>
              <h4 className="text-base sm:text-lg font-bold text-foreground mt-0.5 sm:mt-0">
                <AnimatedCounter value={stats?.pendingTasksCount || 0} />
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card-bg col-span-1 sm:col-span-2">
          <CardContent className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center justify-between gap-4 p-4">
            <div className="flex flex-col min-[380px]:flex-row items-start min-[380px]:items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 sm:p-3 text-primary shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-foreground/50 uppercase tracking-wider">
                  Total Pago / Orçamento
                </p>
                <h4 className="text-sm sm:text-base font-bold text-foreground mt-0.5 sm:mt-0 break-all">
                  {(stats?.totalBudgetSpent || 0).toLocaleString()} Kz / {(stats?.totalEstimatedBudget || 0).toLocaleString()} Kz
                </h4>
              </div>
            </div>
            <div className="text-left min-[480px]:text-right border-t min-[480px]:border-t-0 border-border-custom/50 pt-2 min-[480px]:pt-0">
              <p className="text-[10px] sm:text-xs font-bold text-foreground/50 uppercase tracking-wider">
                Restante
              </p>
              <span className={`text-sm sm:text-base font-bold ${stats?.remainingBudget && stats.remainingBudget < 0 ? 'text-error' : 'text-success'}`}>
                {(stats?.remainingBudget || 0).toLocaleString()} Kz
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphs Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* RSVP Chart */}
        <Card className="lg:col-span-5 bg-card-bg">
          <CardHeader>
            <CardTitle>Confirmações (RSVP)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex flex-col justify-center">
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayRsvpData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {displayRsvpData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} convidados`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="flex justify-center gap-4 text-xs font-medium mt-2">
              {rsvpData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>
                    {d.name}: {d.value}
                  </span>
                </div>
              ))}
              {isRsvpDataEmpty && (
                <div className="text-foreground/50">Sem confirmações registadas.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Budget Chart */}
        <Card className="lg:col-span-7 bg-card-bg">
          <CardHeader>
            <CardTitle>Orçamento por Categoria (Kz)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {budgets.length > 0 ? (
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetChartData}>
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => `${Number(value).toLocaleString()} Kz`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Orçado" fill="#D8A7B1" name="Estimativa" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Pago" fill="#B76E79" name="Valor Pago" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-xs text-foreground/50">
                Nenhum orçamento configurado. Adicione categorias no módulo financeiro.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row with Quick Tasks & Guest Checkins */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <Card className="bg-card-bg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-4.5 w-4.5 text-primary" /> Próximas Tarefas
            </CardTitle>
            <Link href="/admin/tarefas">
              <Button variant="ghost" size="sm" className="text-xs p-1" rightIcon={<ArrowRight className="h-3 w-3" />}>
                Ver todas
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between border-b border-border-custom pb-2.5 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-semibold">{task.title}</p>
                    <p className="text-xs text-foreground/50">
                      {task.due_date ? `Vence a: ${new Date(task.due_date).toLocaleDateString('pt-PT')}` : 'Sem data de vencimento'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={task.priority === 'Alta' ? 'error' : task.priority === 'Média' ? 'warning' : 'default'}>
                      {task.priority}
                    </Badge>
                    <Badge variant={task.status === 'Concluído' ? 'success' : task.status === 'Em Progresso' ? 'primary' : 'default'}>
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-foreground/50 text-center py-4">Sem tarefas registadas.</p>
            )}
          </CardContent>
        </Card>

        {/* Check-ins Recentes */}
        <Card className="bg-card-bg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-4.5 w-4.5 text-primary" /> Check-ins Recentes
            </CardTitle>
            <Link href="/admin/checkin">
              <Button variant="ghost" size="sm" className="text-xs p-1" rightIcon={<ArrowRight className="h-3 w-3" />}>
                Controle de entrada
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {checkins.length > 0 ? (
              checkins.map((ci) => (
                <div
                  key={ci.id}
                  className="flex items-center justify-between border-b border-border-custom pb-2.5 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-semibold">{ci.guest?.name || 'Convidado'}</p>
                    <p className="text-xs text-foreground/50">
                      Operador: <span className="font-medium">{ci.operator}</span>
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-success bg-success/15 px-2.5 py-1 rounded-full">
                    {new Date(ci.checked_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-foreground/50 text-center py-4">Nenhuma entrada registada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
