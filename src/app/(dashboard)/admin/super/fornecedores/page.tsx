'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  SuperAdminRepository,
} from '@/repositories/superadmin.repository';
import { VendorProfile } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  Store,
  Search,
  Filter,
  ShieldAlert,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  ShieldCheck,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Database,
  Copy,
  Check,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

function FornecedoresContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'pendentes' ? 'pendentes' : 'catalogo';

  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'catalogo'>(initialTab);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Details modal & alerts
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const isAdmin =
    user?.app_metadata?.role === 'admin' ||
    user?.user_metadata?.role === 'admin' ||
    user?.email?.toLowerCase().includes('admin') ||
    user?.email?.toLowerCase().includes('amota') ||
    user?.email === 'amota@example.com';

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'pendentes') {
      setActiveTab('pendentes');
    }
  }, [searchParams]);

  const loadVendors = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await SuperAdminRepository.getVendors();
      setVendors(data);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [isAdmin]);

  const handleUpdateStatus = async (vendorId: string, newStatus: 'Pendente' | 'Aprovado' | 'Suspenso') => {
    setUpdatingId(vendorId);
    try {
      const res = await SuperAdminRepository.updateVendorStatus(vendorId, newStatus);
      if (res.success) {
        setVendors(prev =>
          prev.map(v => (v.id === vendorId ? { ...v, status: newStatus } : v))
        );
        if (selectedVendor?.id === vendorId) {
          setSelectedVendor({ ...selectedVendor, status: newStatus });
        }
        if (res.savedLocally && res.error) {
          setAlertMessage({
            type: 'warning',
            text: `Fornecedor marcado como "${newStatus}" com persistência imediata local. Para refletir na base de dados do Supabase para todos os utilizadores, execute o script SQL de permissões.`,
          });
        } else {
          setAlertMessage({
            type: 'success',
            text: `Estado do fornecedor alterado para "${newStatus}" com sucesso!`,
          });
        }
      }
    } catch (err: any) {
      console.error('Error updating vendor status:', err);
      setAlertMessage({ type: 'error', text: 'Ocorreu um erro ao atualizar o estado do fornecedor.' });
    } finally {
      setUpdatingId(null);
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

  // Derive unique categories
  const categories = Array.from(new Set(vendors.map(v => v.category))).filter(Boolean);

  const pendingVendors = vendors.filter(v => v.status === 'Pendente');
  const pendingCount = pendingVendors.length;
  const approvedCount = vendors.filter(v => v.status === 'Aprovado').length;
  const suspendedCount = vendors.filter(v => v.status === 'Suspenso').length;

  // Filter vendors for Catalogue table
  const filteredVendors = vendors.filter(v => {
    const matchesSearch =
      (v.company_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (v.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (v.phone?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (v.province?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || v.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              Fornecedores & Moderação
            </h1>
            <Badge variant="primary">{vendors.length} Parceiros</Badge>
            {pendingCount > 0 && (
              <Badge variant="warning">{pendingCount} Pendentes</Badge>
            )}
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            Gestão integrada de aprovações de novos cadastros e catálogo oficial de prestadores de serviços.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadVendors}
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
              const headers = ['ID', 'Empresa', 'Categoria', 'Província', 'Estado', 'Telefone', 'Email', 'NIF', 'IBAN', 'Data Registo'];
              const rows = vendors.map(v => [
                v.id,
                v.company_name,
                v.category,
                v.province || '',
                v.status,
                v.phone || '',
                v.email || '',
                v.nif || '',
                v.iban || '',
                v.created_at,
              ]);
              SuperAdminRepository.exportToCSV('fornecedores_meuboda', headers, rows);
            }}
            className="flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSqlModalOpen(true)}
            className="flex items-center gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            title="Ver e copiar comandos SQL para configurar permissões no Supabase"
          >
            <Database className="h-4 w-4" />
            Configurar na BD (SQL)
          </Button>
        </div>
      </div>

      {/* ALERT FEEDBACK BANNER */}
      {alertMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in transition-all ${
            alertMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : alertMessage.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              : 'bg-error/10 border-error/30 text-error'
          }`}
        >
          <div className="flex items-center gap-2">
            {alertMessage.type === 'success' ? (
              <CheckCircle className="h-5 w-5 shrink-0" />
            ) : alertMessage.type === 'warning' ? (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 shrink-0" />
            )}
            <span>{alertMessage.text}</span>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Total Cadastrados</p>
          <p className="text-2xl font-bold text-foreground mt-1">{vendors.length}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Aprovados & Ativos</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{approvedCount}</p>
        </Card>
        <Card
          onClick={() => setActiveTab('pendentes')}
          className={`bg-card-bg border-border-custom p-4 cursor-pointer transition-all ${
            activeTab === 'pendentes' ? 'ring-2 ring-amber-500/50 bg-amber-500/5' : 'hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground/60">Pendentes de Revisão</p>
            {pendingCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
          </div>
          <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCount}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Suspensos</p>
          <p className="text-2xl font-bold text-error mt-1">{suspendedCount}</p>
        </Card>
      </div>

      {/* UNIFIED TABS */}
      <div className="flex items-center gap-2 border-b border-border-custom pb-2">
        <button
          onClick={() => setActiveTab('pendentes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'pendentes'
              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-sm'
              : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Fila de Moderação</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-extrabold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('catalogo')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'catalogo'
              ? 'bg-primary/15 border border-primary/30 text-primary shadow-sm'
              : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
          }`}
        >
          <Store className="h-4 w-4" />
          <span>Catálogo Completo</span>
          <span className="px-1.5 py-0.2 rounded-full bg-foreground/10 text-foreground/70 text-[10px] font-semibold">
            {vendors.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: FILA DE MODERAÇÃO (PENDENTES) */}
      {activeTab === 'pendentes' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingVendors.length === 0 ? (
            <Card className="bg-card-bg border-border-custom p-12 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-lg font-bold text-foreground">Fila de Moderação Limpa!</h3>
                <p className="text-xs text-foreground/60">
                  Não existem novos perfis de fornecedores pendentes de validação no momento. Todos os cadastros estão aprovados ou regulares.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('catalogo')}
                className="mt-2"
              >
                Ver Catálogo de Fornecedores Cadastrados
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingVendors.map(vendor => {
                const isProcessing = updatingId === vendor.id;

                return (
                  <Card
                    key={vendor.id}
                    className="bg-card-bg border-border-custom p-5 flex flex-col justify-between hover:border-amber-500/30 transition-all shadow-sm"
                  >
                    <div className="space-y-4">
                      {/* Top: Logo & Title */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-foreground/5 border border-border-custom flex items-center justify-center font-bold text-sm text-primary overflow-hidden shrink-0">
                            {vendor.logo_url ? (
                              <img src={vendor.logo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              vendor.company_name?.charAt(0).toUpperCase() || 'F'
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground text-base leading-tight">
                              {vendor.company_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                                {vendor.category || 'Prestador'}
                              </span>
                              <span className="text-xs text-foreground/50 flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                {vendor.province || 'Angola'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Badge variant="warning">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      </div>

                      {/* Business & Legal Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-foreground/[0.02] p-3 rounded-lg border border-border-custom/50">
                        <div>
                          <span className="text-foreground/40 block text-[11px]">NIF Fiscal</span>
                          <span className="font-mono font-medium text-foreground">{vendor.nif || 'Não informado'}</span>
                        </div>
                        <div>
                          <span className="text-foreground/40 block text-[11px]">IBAN Bancário</span>
                          <span className="font-mono font-medium text-foreground truncate block">{vendor.iban || 'Não informado'}</span>
                        </div>
                        <div>
                          <span className="text-foreground/40 block text-[11px]">Telefone</span>
                          <span className="font-medium text-foreground">{vendor.phone || 'Não informado'}</span>
                        </div>
                        <div>
                          <span className="text-foreground/40 block text-[11px]">Email</span>
                          <span className="font-medium text-foreground truncate block">{vendor.email || 'Não informado'}</span>
                        </div>
                      </div>

                      {/* Description */}
                      {vendor.description && (
                        <div className="text-xs text-foreground/70 bg-background/50 p-3 rounded-lg border border-border-custom/50">
                          <span className="text-foreground/40 block text-[10px] uppercase font-bold tracking-wider mb-1">
                            Descrição da Atividade
                          </span>
                          <p className="line-clamp-3 leading-relaxed">{vendor.description}</p>
                        </div>
                      )}

                      <div className="text-[11px] text-foreground/40">
                        Cadastrado a {new Date(vendor.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Moderation Actions */}
                    <div className="pt-4 mt-4 border-t border-border-custom flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedVendor(vendor)}
                        className="text-xs h-8 border-border-custom hover:bg-foreground/5"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver Detalhes
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(vendor.id, 'Suspenso')}
                          disabled={isProcessing}
                          className="border-error/30 text-error hover:bg-error/10 text-xs h-8 flex items-center gap-1.5"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Recusar</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleUpdateStatus(vendor.id, 'Aprovado')}
                          disabled={isProcessing}
                          className="bg-emerald-600 text-white hover:bg-emerald-500 text-xs h-8 font-semibold flex items-center gap-1.5 shadow-sm"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>Aprovar Perfil</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CATÁLOGO COMPLETO */}
      {activeTab === 'catalogo' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="bg-card-bg border-border-custom p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  placeholder="Pesquisar empresa, email, telefone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-background/50 border-border-custom"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-foreground/40" />
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border-custom text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border-custom text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Todos os Estados</option>
                  <option value="Aprovado">Aprovados</option>
                  <option value="Pendente">Pendentes</option>
                  <option value="Suspenso">Suspensos</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Vendors Table */}
          <Card className="bg-card-bg border-border-custom overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="text-center p-12 space-y-2">
                <Store className="h-10 w-10 text-foreground/20 mx-auto" />
                <p className="text-foreground/50 text-sm">Nenhum fornecedor encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border-custom bg-foreground/[0.02] text-foreground/60 text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Empresa / Fornecedor</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4">Localização</th>
                      <th className="py-3 px-4">Contactos</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom/50">
                    {filteredVendors.map(v => (
                      <tr key={v.id} className="hover:bg-foreground/[0.015] transition-colors">
                        {/* Company */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-lg bg-foreground/5 border border-border-custom flex items-center justify-center font-bold text-xs text-primary shrink-0 overflow-hidden">
                              {v.logo_url ? (
                                <img src={v.logo_url} alt={v.company_name} className="h-full w-full object-cover" />
                              ) : (
                                v.company_name?.charAt(0).toUpperCase() || 'F'
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{v.company_name}</div>
                              {v.nif && (
                                <div className="text-[10px] text-foreground/40 font-mono">NIF: {v.nif}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 border border-border-custom font-medium text-foreground/80">
                            {v.category || 'Geral'}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-foreground/70">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-foreground/40" />
                            <span>{v.province || 'Angola'}</span>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 text-xs text-foreground/70">
                          {v.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-foreground/40" />
                              <span>{v.phone}</span>
                            </div>
                          )}
                          {v.email && (
                            <div className="flex items-center gap-1 text-[11px] text-foreground/50">
                              <Mail className="h-3 w-3 text-foreground/40" />
                              <span>{v.email}</span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {v.status === 'Aprovado' ? (
                            <Badge variant="success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Aprovado
                            </Badge>
                          ) : v.status === 'Pendente' ? (
                            <Badge variant="warning">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          ) : (
                            <Badge variant="error">
                              <XCircle className="h-3 w-3 mr-1" />
                              Suspenso
                            </Badge>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedVendor(v)}
                              className="h-7 text-xs px-2.5 border-border-custom hover:bg-foreground/5"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Detalhes
                            </Button>

                            {v.status !== 'Aprovado' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(v.id, 'Aprovado')}
                                disabled={updatingId === v.id}
                                className="h-7 text-xs px-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                                title="Aprovar fornecedor"
                              >
                                Aprovar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(v.id, 'Suspenso')}
                                disabled={updatingId === v.id}
                                className="h-7 text-xs px-2 border-error/30 text-error hover:bg-error/10"
                                title="Suspender fornecedor"
                              >
                                Suspender
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* VENDOR DETAILS MODAL */}
      <Dialog
        isOpen={!!selectedVendor}
        onClose={() => setSelectedVendor(null)}
        title={selectedVendor ? selectedVendor.company_name : 'Detalhes do Fornecedor'}
        size="lg"
      >
        {selectedVendor && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-border-custom pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-foreground/5 border border-border-custom flex items-center justify-center font-bold text-sm text-primary overflow-hidden shrink-0">
                  {selectedVendor.logo_url ? (
                    <img src={selectedVendor.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    selectedVendor.company_name?.charAt(0).toUpperCase() || 'F'
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg leading-tight">
                    {selectedVendor.company_name}
                  </h3>
                  <p className="text-xs text-foreground/50">{selectedVendor.category}</p>
                </div>
              </div>

              <div>
                {selectedVendor.status === 'Aprovado' ? (
                  <Badge variant="success">Aprovado</Badge>
                ) : selectedVendor.status === 'Pendente' ? (
                  <Badge variant="warning">Pendente</Badge>
                ) : (
                  <Badge variant="error">Suspenso</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-foreground/[0.02] border border-border-custom/50 space-y-1">
                <span className="text-foreground/40 block">Email Comercial</span>
                <span className="font-semibold text-foreground">{selectedVendor.email || 'Não informado'}</span>
              </div>
              <div className="p-3 rounded-lg bg-foreground/[0.02] border border-border-custom/50 space-y-1">
                <span className="text-foreground/40 block">Telefone / WhatsApp</span>
                <span className="font-semibold text-foreground">{selectedVendor.phone || 'Não informado'}</span>
              </div>
              <div className="p-3 rounded-lg bg-foreground/[0.02] border border-border-custom/50 space-y-1">
                <span className="text-foreground/40 block">NIF Fiscal</span>
                <span className="font-mono font-semibold text-foreground">{selectedVendor.nif || 'Não informado'}</span>
              </div>
              <div className="p-3 rounded-lg bg-foreground/[0.02] border border-border-custom/50 space-y-1">
                <span className="text-foreground/40 block">IBAN Bancário</span>
                <span className="font-mono font-semibold text-foreground truncate block">{selectedVendor.iban || 'Não informado'}</span>
              </div>
              <div className="p-3 rounded-lg bg-foreground/[0.02] border border-border-custom/50 space-y-1">
                <span className="text-foreground/40 block">Província</span>
                <span className="font-semibold text-foreground">{selectedVendor.province || 'Angola'}</span>
              </div>
              <div className="p-3 rounded-lg bg-foreground/[0.02] border border-border-custom/50 space-y-1">
                <span className="text-foreground/40 block">Website</span>
                {selectedVendor.website ? (
                  <a href={selectedVendor.website} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 font-semibold truncate">
                    {selectedVendor.website} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-foreground/50">Não informado</span>
                )}
              </div>
            </div>

            {selectedVendor.description && (
              <div className="p-3 rounded-lg bg-foreground/[0.02] border border-border-custom/50 space-y-1 text-xs">
                <span className="text-foreground/40 block font-semibold">Descrição e Especialidades</span>
                <p className="text-foreground/80 leading-relaxed">{selectedVendor.description}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border-custom text-xs">
              <span className="text-foreground/40">
                Registo criado em {new Date(selectedVendor.created_at).toLocaleDateString('pt-PT')}
              </span>

              <div className="flex items-center gap-2">
                {selectedVendor.status !== 'Aprovado' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleUpdateStatus(selectedVendor.id, 'Aprovado')}
                    disabled={updatingId === selectedVendor.id}
                    className="bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold"
                  >
                    Aprovar Fornecedor
                  </Button>
                )}

                {selectedVendor.status !== 'Suspenso' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedVendor.id, 'Suspenso')}
                    disabled={updatingId === selectedVendor.id}
                    className="border-error/30 text-error hover:bg-error/10 text-xs"
                  >
                    Suspender Perfil
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedVendor(null)}
                  className="text-xs"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* SQL CONFIG MODAL */}
      <Dialog
        isOpen={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
        title="Configuração de Políticas no Supabase"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-foreground/70">
            Para garantir que a aprovação e suspensão de fornecedores seja refletida diretamente na tabela <code>vendor_profiles</code> do Supabase por qualquer administrador, execute o script SQL abaixo no <strong>SQL Editor</strong> do painel Supabase:
          </p>

          <div className="relative">
            <pre className="p-3 bg-black/60 border border-border-custom rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-56 leading-relaxed select-all">
{`-- 1. Função auxiliar de Administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
         OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
         OR (SELECT email FROM auth.users WHERE id = auth.uid()) ILIKE '%amota%'
         OR (SELECT email FROM auth.users WHERE id = auth.uid()) ILIKE '%admin%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Permitir que Administradores façam gestão de qualquer perfil de fornecedor
DROP POLICY IF EXISTS "Admins can manage all vendor profiles" ON public.vendor_profiles;
CREATE POLICY "Admins can manage all vendor profiles" ON public.vendor_profiles
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Função RPC com SECURITY DEFINER para atualização garantida de estado
CREATE OR REPLACE FUNCTION public.admin_update_vendor_status(
  target_vendor_id UUID,
  new_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required.';
  END IF;

  UPDATE public.vendor_profiles
  SET status = new_status
  WHERE id = target_vendor_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
            </pre>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const sql = `-- 1. Função auxiliar de Administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
         OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
         OR (SELECT email FROM auth.users WHERE id = auth.uid()) ILIKE '%amota%'
         OR (SELECT email FROM auth.users WHERE id = auth.uid()) ILIKE '%admin%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Permitir que Administradores façam gestão de qualquer perfil de fornecedor
DROP POLICY IF EXISTS "Admins can manage all vendor profiles" ON public.vendor_profiles;
CREATE POLICY "Admins can manage all vendor profiles" ON public.vendor_profiles
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Função RPC com SECURITY DEFINER para atualização garantida de estado
CREATE OR REPLACE FUNCTION public.admin_update_vendor_status(
  target_vendor_id UUID,
  new_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required.';
  END IF;

  UPDATE public.vendor_profiles
  SET status = new_status
  WHERE id = target_vendor_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;
                navigator.clipboard.writeText(sql);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 2500);
              }}
              className="absolute top-2 right-2 text-xs bg-background/80 border-border-custom flex items-center gap-1.5"
            >
              {copiedSql ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar SQL</span>
                </>
              )}
            </Button>
          </div>

          <p className="text-[11px] text-foreground/50">
            Enquanto este comando não for executado na base de dados global, as suspensões e aprovações continuam guardadas e ativas no navegador com persistência imediata.
          </p>
        </div>
      </Dialog>
    </div>
  );
}

export default function SuperAdminFornecedoresPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[55vh] items-center justify-center text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      </div>
    }>
      <FornecedoresContent />
    </Suspense>
  );
}
