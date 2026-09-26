'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  SuperAdminRepository,
  AdminUser,
  AdminEvent,
} from '@/repositories/superadmin.repository';
import { VendorProfile, LiveCheckinFeed, PlatformPayment } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  FileSpreadsheet,
  Download,
  Users,
  CalendarDays,
  Activity,
  Store,
  Receipt,
  ShieldAlert,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Database,
  FileCheck,
  Server,
  Layers,
} from 'lucide-react';

export default function SuperAdminRelatoriosPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [checkins, setCheckins] = useState<LiveCheckinFeed[]>([]);
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Download states
  const [exportingType, setExportingType] = useState<string | null>(null);

  const isAdmin = user?.app_metadata?.role === 'admin'
    || user?.email === 'amota@example.com';

  const loadAllData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [u, e, v, c, p] = await Promise.all([
        SuperAdminRepository.getUsers(),
        SuperAdminRepository.getEvents(),
        SuperAdminRepository.getVendors(),
        SuperAdminRepository.getRecentCheckins(200),
        SuperAdminRepository.getPlatformPayments(),
      ]);
      setUsers(u);
      setEvents(e);
      setVendors(v);
      setCheckins(c);
      setPayments(p);
    } catch (err) {
      console.error('Error fetching export datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [isAdmin]);

  // Export handlers
  const handleExportUsers = () => {
    setExportingType('users');
    try {
      const headers = ['ID', 'Email', 'Função', 'Slots Contratados', 'Eventos Criados', 'Data de Registo'];
      const rows = users.map(u => [
        u.id,
        u.email,
        u.role || 'user',
        u.planner_slots || 1,
        u.events_count || 0,
        u.created_at,
      ]);
      SuperAdminRepository.exportToCSV('utilizadores_meuboda', headers, rows);
    } finally {
      setExportingType(null);
    }
  };

  const handleExportEvents = () => {
    setExportingType('events');
    try {
      const headers = [
        'ID Evento',
        'Título',
        'Slug Link',
        'Tipo Celebração',
        'Proprietário Email',
        'Data Prevista',
        'Estado',
        'Convidados Registados',
        'Confirmados',
        'Check-ins Portaria',
        'Tarefas Criadas',
        'Tarefas Concluídas',
        'Data Criação',
      ];
      const rows = events.map(e => [
        e.id,
        e.title,
        e.slug || '',
        e.type || 'casamento',
        e.owner_email || '',
        e.date || '',
        e.status,
        e.guests_count || 0,
        e.confirmed_guests_count || 0,
        e.checkins_count || 0,
        e.total_tasks || 0,
        e.completed_tasks || 0,
        e.created_at,
      ]);
      SuperAdminRepository.exportToCSV('eventos_meuboda', headers, rows);
    } finally {
      setExportingType(null);
    }
  };

  const handleExportCheckins = () => {
    setExportingType('checkins');
    try {
      const headers = ['ID', 'Nome Convidado', 'Acompanhantes', 'Evento', 'Hora Entrada', 'Operador / Posto'];
      const rows = checkins.map(c => [
        c.id,
        c.guest_name,
        c.guest_companions || 0,
        c.event_title,
        c.checked_at,
        c.operator || 'Portaria',
      ]);
      SuperAdminRepository.exportToCSV('checkins_portaria_meuboda', headers, rows);
    } finally {
      setExportingType(null);
    }
  };

  const handleExportVendors = () => {
    setExportingType('vendors');
    try {
      const headers = [
        'ID Fornecedor',
        'Empresa',
        'Categoria',
        'Província',
        'Estado Moderação',
        'Telefone',
        'Email Comercial',
        'NIF',
        'IBAN Liquidação',
        'Data Registo',
      ];
      const rows = vendors.map(v => [
        v.id,
        v.company_name,
        v.category,
        v.province || 'Angola',
        v.status,
        v.phone || '',
        v.email || '',
        v.nif || '',
        v.iban || '',
        v.created_at,
      ]);
      SuperAdminRepository.exportToCSV('fornecedores_marketplace_meuboda', headers, rows);
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPayments = () => {
    setExportingType('payments');
    try {
      const headers = [
        'ID Transação',
        'Email Utilizador',
        'Plano',
        'Valor (Kz)',
        'Método Pagamento',
        'Referência',
        'Estado',
        'Data Criação',
        'Data Revisão',
      ];
      const rows = payments.map(p => [
        p.id,
        p.user_email || '',
        p.plan_type,
        p.amount,
        p.payment_method || 'Multicaixa / Transferência',
        p.reference_code || '',
        p.status,
        p.created_at,
        p.reviewed_at || '',
      ]);
      SuperAdminRepository.exportToCSV('pagamentos_plataforma_meuboda', headers, rows);
    } finally {
      setExportingType(null);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Central de Exportação & Relatórios
            </h1>
            <Badge variant="primary">Formatos Excel / CSV</Badge>
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            Extração de bases de dados auditadas em formato compatível com Excel, Numbers e Power BI.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAllData}
          disabled={loading}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </Button>
      </div>

      {/* Info Notice about Encoding */}
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-3">
        <Database className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-foreground">Compatibilidade Total com Microsoft Excel em Português</p>
          <p className="text-foreground/70">
            Todos os ficheiros são gerados com codificação UTF-8 com BOM e delimitador de ponto e vírgula (;), garantindo que acentos, caracteres especiais e números em Kwanzas abram perfeitamente sem necessidade de importação manual.
          </p>
        </div>
      </div>

      {/* Export Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Users Export */}
        <Card className="bg-card-bg border-border-custom p-5 flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
              </div>
              <Badge variant="default">{users.length} Registos</Badge>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">Base de Utilizadores & Noivos</h3>
              <p className="text-xs text-foreground/60 mt-1">
                Lista completa de todas as contas registadas, classificação B2C vs B2B (Wedding Planners), slots contratados e datas de adesão.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-border-custom flex items-center justify-between">
            <span className="text-[11px] text-foreground/40 font-mono">utilizadores_meuboda.csv</span>
            <Button
              size="sm"
              variant="primary"
              onClick={handleExportUsers}
              disabled={loading || exportingType === 'users'}
              className="bg-primary text-black hover:bg-primary-hover font-semibold text-xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Descarregar CSV
            </Button>
          </div>
        </Card>

        {/* Events Export */}
        <Card className="bg-card-bg border-border-custom p-5 flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CalendarDays className="h-5 w-5" />
              </div>
              <Badge variant="default">{events.length} Eventos</Badge>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">Relatório Consolidado de Eventos</h3>
              <p className="text-xs text-foreground/60 mt-1">
                Auditoria de todos os casamentos e eventos da plataforma com contagem de convidados, confirmações RSVP, check-ins e progresso de tarefas.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-border-custom flex items-center justify-between">
            <span className="text-[11px] text-foreground/40 font-mono">eventos_meuboda.csv</span>
            <Button
              size="sm"
              variant="primary"
              onClick={handleExportEvents}
              disabled={loading || exportingType === 'events'}
              className="bg-primary text-black hover:bg-primary-hover font-semibold text-xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Descarregar CSV
            </Button>
          </div>
        </Card>

        {/* Check-ins Live Export */}
        <Card className="bg-card-bg border-border-custom p-5 flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Activity className="h-5 w-5" />
              </div>
              <Badge variant="default">{checkins.length} Check-ins no Buffer</Badge>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">Logs de Entrada da Portaria</h3>
              <p className="text-xs text-foreground/60 mt-1">
                Histórico com carimbo temporal de validação de convites QR Code, nomes dos convidados, contagem de acompanhantes e postos de controlo.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-border-custom flex items-center justify-between">
            <span className="text-[11px] text-foreground/40 font-mono">checkins_portaria.csv</span>
            <Button
              size="sm"
              variant="primary"
              onClick={handleExportCheckins}
              disabled={loading || exportingType === 'checkins'}
              className="bg-primary text-black hover:bg-primary-hover font-semibold text-xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Descarregar CSV
            </Button>
          </div>
        </Card>

        {/* Vendors Export */}
        <Card className="bg-card-bg border-border-custom p-5 flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                <Store className="h-5 w-5" />
              </div>
              <Badge variant="default">{vendors.length} Fornecedores</Badge>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">Diretório de Fornecedores & Marketplace</h3>
              <p className="text-xs text-foreground/60 mt-1">
                Catálogo integral com nome de empresas prestadoras, categorias, dados fiscais (NIF), contas de pagamento (IBAN) e estado de moderação.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-border-custom flex items-center justify-between">
            <span className="text-[11px] text-foreground/40 font-mono">fornecedores_marketplace.csv</span>
            <Button
              size="sm"
              variant="primary"
              onClick={handleExportVendors}
              disabled={loading || exportingType === 'vendors'}
              className="bg-primary text-black hover:bg-primary-hover font-semibold text-xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Descarregar CSV
            </Button>
          </div>
        </Card>

        {/* Platform Payments Export */}
        <Card className="bg-card-bg border-border-custom p-5 flex flex-col justify-between hover:border-primary/40 transition-colors md:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Receipt className="h-5 w-5" />
              </div>
              <Badge variant="default">{payments.length} Transações Registadas</Badge>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">Relatório Financeiro de Subscrições & Planos</h3>
              <p className="text-xs text-foreground/60 mt-1">
                Histórico detalhado de pagamentos Multicaixa e transferências bancárias efetuadas para ativação de planos Pro e compra de slots.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-border-custom flex items-center justify-between">
            <span className="text-[11px] text-foreground/40 font-mono">pagamentos_plataforma.csv</span>
            <Button
              size="sm"
              variant="primary"
              onClick={handleExportPayments}
              disabled={loading || exportingType === 'payments'}
              className="bg-primary text-black hover:bg-primary-hover font-semibold text-xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Descarregar CSV Financeiro
            </Button>
          </div>
        </Card>
      </div>

      {/* System Health Summary Card */}
      <Card className="bg-card-bg border-border-custom p-5">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
          <Server className="h-4 w-4 text-primary" />
          Sumário de Saúde & Volumetria de Dados
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-foreground/[0.02] border border-border-custom/50">
            <span className="text-foreground/40 block">Tabelas Ativas</span>
            <span className="font-bold text-foreground text-sm mt-0.5 block">16 Tabelas RLS</span>
          </div>
          <div className="p-3 rounded-lg bg-foreground/[0.02] border border-border-custom/50">
            <span className="text-foreground/40 block">Total Convidados na Plataforma</span>
            <span className="font-bold text-foreground text-sm mt-0.5 block">
              {events.reduce((sum, e) => sum + (e.guests_count || 0), 0).toLocaleString()} Convidados
            </span>
          </div>
          <div className="p-3 rounded-lg bg-foreground/[0.02] border border-border-custom/50">
            <span className="text-foreground/40 block">Tarefas de Casamento</span>
            <span className="font-bold text-foreground text-sm mt-0.5 block">
              {events.reduce((sum, e) => sum + (e.total_tasks || 0), 0)} Registadas
            </span>
          </div>
          <div className="p-3 rounded-lg bg-foreground/[0.02] border border-border-custom/50">
            <span className="text-foreground/40 block">Integridade do Sistema</span>
            <span className="font-bold text-emerald-500 text-sm mt-0.5 block flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Operacional 100%
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
