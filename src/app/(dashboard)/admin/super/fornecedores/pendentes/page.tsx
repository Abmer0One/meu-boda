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
import { Badge } from '@/components/ui/Badge';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  FileText,
  ShieldAlert,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function SuperAdminFornecedoresPendentesPage() {
  const { user } = useAuth();
  const [pendingVendors, setPendingVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isAdmin = user?.app_metadata?.role === 'admin'
    || user?.email === 'amota@example.com';

  const loadPending = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const all = await SuperAdminRepository.getVendors();
      setPendingVendors(all.filter(v => v.status === 'Pendente'));
    } catch (err) {
      console.error('Error fetching pending vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, [isAdmin]);

  const handleDecision = async (vendorId: string, decision: 'Aprovado' | 'Suspenso') => {
    setProcessingId(vendorId);
    try {
      const success = await SuperAdminRepository.updateVendorStatus(vendorId, decision);
      if (success) {
        setPendingVendors(prev => prev.filter(v => v.id !== vendorId));
      }
    } catch (err) {
      console.error('Failed to process vendor moderation:', err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/super/fornecedores"
              className="text-xs text-foreground/50 hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao Catálogo de Fornecedores
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-amber-500" />
              Fila de Moderação de Fornecedores
            </h1>
            <Badge variant="warning">{pendingVendors.length} Pendentes</Badge>
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            Validação prévia de perfis comerciais, categorias e documentação antes de publicação no Marketplace.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadPending}
          disabled={loading}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Fila
        </Button>
      </div>

      {/* Content */}
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
              Não existem novos perfis de fornecedores pendentes de validação no momento. Todos os cadastros estão processados.
            </p>
          </div>
          <Link href="/admin/super/fornecedores">
            <Button variant="outline" size="sm" className="mt-2">
              Ver Todos os Fornecedores Cadastrados
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingVendors.map(vendor => {
            const isProcessing = processingId === vendor.id;

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
                <div className="pt-4 mt-4 border-t border-border-custom flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecision(vendor.id, 'Suspenso')}
                    disabled={isProcessing}
                    className="border-error/30 text-error hover:bg-error/10 text-xs flex items-center gap-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Recusar</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleDecision(vendor.id, 'Aprovado')}
                    disabled={isProcessing}
                    className="bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    <span>Aprovar Perfil</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
