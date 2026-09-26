'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';

export default function SuperAdminFornecedoresPage() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Details modal
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = user?.app_metadata?.role === 'admin'
    || user?.email === 'amota@example.com';

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
      const success = await SuperAdminRepository.updateVendorStatus(vendorId, newStatus);
      if (success) {
        setVendors(prev =>
          prev.map(v => (v.id === vendorId ? { ...v, status: newStatus } : v))
        );
        if (selectedVendor?.id === vendorId) {
          setSelectedVendor({ ...selectedVendor, status: newStatus });
        }
      }
    } catch (err) {
      console.error('Error updating vendor status:', err);
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

  // Filter vendors
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

  const pendingCount = vendors.filter(v => v.status === 'Pendente').length;
  const approvedCount = vendors.filter(v => v.status === 'Aprovado').length;
  const suspendedCount = vendors.filter(v => v.status === 'Suspenso').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              Catálogo de Fornecedores
            </h1>
            <Badge variant="primary">{vendors.length} Parceiros</Badge>
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            Gestão integral dos profissionais e empresas prestadoras de serviços do marketplace.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Pending moderation banner alert if any */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                Existem {pendingCount} {pendingCount === 1 ? 'fornecedor pendente' : 'fornecedores pendentes'} de validação
              </p>
              <p className="text-xs text-foreground/60">
                Novos prestadores de serviço aguardam a sua aprovação para surgirem no marketplace público.
              </p>
            </div>
          </div>
          <Link href="/admin/super/fornecedores/pendentes">
            <Button size="sm" variant="primary" className="bg-amber-500 text-black hover:bg-amber-400 shrink-0 font-semibold">
              Ir para Fila de Moderação ({pendingCount})
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
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
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Pendentes de Revisão</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCount}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Suspensos</p>
          <p className="text-2xl font-bold text-error mt-1">{suspendedCount}</p>
        </Card>
      </div>

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

      {/* VENDOR DETAILS MODAL */}
      <Dialog
        isOpen={!!selectedVendor}
        onClose={() => setSelectedVendor(null)}
        title={selectedVendor ? selectedVendor.company_name : 'Fornecedor'}
        size="md"
      >
        {selectedVendor && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-foreground/5 border border-border-custom">
              <div className="h-12 w-12 rounded-xl bg-foreground/10 border border-border-custom flex items-center justify-center font-bold text-sm text-primary overflow-hidden shrink-0">
                {selectedVendor.logo_url ? (
                  <img src={selectedVendor.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  selectedVendor.company_name?.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">{selectedVendor.company_name}</h3>
                <span className="text-xs text-primary font-medium">{selectedVendor.category}</span>
                <span className="text-xs text-foreground/40 ml-2">({selectedVendor.province || 'Angola'})</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-background/50 border border-border-custom">
                <span className="text-foreground/40 block">NIF da Empresa</span>
                <span className="font-mono font-medium text-foreground">{selectedVendor.nif || 'Não informado'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-background/50 border border-border-custom">
                <span className="text-foreground/40 block">IBAN de Liquidação</span>
                <span className="font-mono font-medium text-foreground">{selectedVendor.iban || 'Não informado'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-background/50 border border-border-custom">
                <span className="text-foreground/40 block">Telefone</span>
                <span className="font-medium text-foreground">{selectedVendor.phone || 'Não informado'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-background/50 border border-border-custom">
                <span className="text-foreground/40 block">Email Oficial</span>
                <span className="font-medium text-foreground">{selectedVendor.email || 'Não informado'}</span>
              </div>
            </div>

            {selectedVendor.description && (
              <div className="text-xs p-3 rounded-lg bg-background/50 border border-border-custom">
                <span className="text-foreground/40 block mb-1">Apresentação / Descrição dos Serviços</span>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{selectedVendor.description}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border-custom">
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground/60">Estado Atual:</span>
                <Badge
                  variant={
                    selectedVendor.status === 'Aprovado'
                      ? 'success'
                      : selectedVendor.status === 'Pendente'
                      ? 'warning'
                      : 'error'
                  }
                >
                  {selectedVendor.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {selectedVendor.status !== 'Aprovado' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleUpdateStatus(selectedVendor.id, 'Aprovado')}
                    disabled={updatingId === selectedVendor.id}
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
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
                    className="border-error/30 text-error hover:bg-error/10"
                  >
                    Suspender
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
