'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  SuperAdminRepository,
} from '@/repositories/superadmin.repository';
import { SystemBroadcast } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  Megaphone,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Power,
  ExternalLink,
  Sparkles,
  Eye,
} from 'lucide-react';

export default function SuperAdminAvisosPage() {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<SystemBroadcast[]>([]);
  const [loading, setLoading] = useState(true);

  // New broadcast modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'urgent'>('info');
  const [link, setLink] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const isAdmin = user?.app_metadata?.role === 'admin'
    || user?.email === 'amota@example.com';

  const loadBroadcasts = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await SuperAdminRepository.getBroadcasts();
      setBroadcasts(data);
    } catch (err) {
      console.error('Error fetching broadcasts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBroadcasts();
  }, [isAdmin]);

  const handleToggle = async (broadcast: SystemBroadcast) => {
    setTogglingId(broadcast.id);
    const newStatus = !broadcast.is_active;
    try {
      const ok = await SuperAdminRepository.toggleBroadcast(broadcast.id, newStatus);
      if (ok) {
        setBroadcasts(prev =>
          prev.map(b => (b.id === broadcast.id ? { ...b, is_active: newStatus } : b))
        );
      }
    } catch (err) {
      console.error('Failed to toggle broadcast:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza de que deseja eliminar permanentemente este aviso?')) return;
    try {
      const ok = await SuperAdminRepository.deleteBroadcast(id);
      if (ok) {
        setBroadcasts(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete broadcast:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const created = await SuperAdminRepository.createBroadcast({
        title: title.trim(),
        message: message.trim(),
        type,
        link: link.trim() || null,
        is_active: isActive,
      });

      if (created) {
        setBroadcasts(prev => [created, ...prev]);
        setCreateModalOpen(false);
        setTitle('');
        setMessage('');
        setType('info');
        setLink('');
        setIsActive(true);
      }
    } catch (err) {
      console.error('Failed to create broadcast:', err);
    } finally {
      setSubmitting(false);
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

  const activeCount = broadcasts.filter(b => b.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" />
              Avisos Globais & Comunicados
            </h1>
            <Badge variant="primary">{broadcasts.length} Registados</Badge>
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            Envio de comunicados em tempo real na barra de topo para todos os noivos, convidados e fornecedores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBroadcasts}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary text-black hover:bg-primary-hover font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Criar Novo Aviso
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Total de Avisos Históricos</p>
          <p className="text-2xl font-bold text-foreground mt-1">{broadcasts.length}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Avisos Ativos Visíveis</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{activeCount}</p>
        </Card>
        <Card className="bg-card-bg border-border-custom p-4">
          <p className="text-xs font-medium text-foreground/60">Alcance de Audiência</p>
          <p className="text-2xl font-bold text-primary mt-1">100% dos Utilizadores</p>
        </Card>
      </div>

      {/* Live Preview Box when active broadcasts exist */}
      {activeCount > 0 && (
        <div className="p-4 rounded-xl bg-foreground/[0.02] border border-border-custom space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/70 uppercase tracking-wider">
            <Eye className="h-4 w-4 text-primary" />
            Pré-visualização do Banner Ativo na Plataforma
          </div>
          {broadcasts.filter(b => b.is_active).map(b => (
            <div
              key={b.id}
              className={`p-3 rounded-lg border flex items-center justify-between text-xs gap-3 ${
                b.type === 'urgent'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : b.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : b.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-primary/10 border-primary/30 text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-black/20">
                  {b.type}
                </span>
                <span className="font-semibold text-foreground">{b.title}:</span>
                <span className="text-foreground/80">{b.message}</span>
              </div>
              {b.link && (
                <a href={b.link} target="_blank" rel="noopener noreferrer" className="underline font-semibold shrink-0">
                  Saber mais &rarr;
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Broadcasts List */}
      <Card className="bg-card-bg border-border-custom overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center p-12 space-y-2">
            <Megaphone className="h-10 w-10 text-foreground/20 mx-auto" />
            <p className="text-foreground/50 text-sm">Nenhum aviso configurado até ao momento.</p>
            <p className="text-xs text-foreground/40">
              Crie comunicados para alertar sobre atualizações, novidades ou manutenções na plataforma.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateModalOpen(true)}
              className="mt-2"
            >
              Criar Primeiro Aviso
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-foreground/[0.02] text-foreground/60 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Aviso & Conteúdo</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Link de Ação</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4">Data Criação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50">
                {broadcasts.map(b => (
                  <tr key={b.id} className="hover:bg-foreground/[0.015] transition-colors">
                    {/* Content */}
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <span>{b.title}</span>
                      </div>
                      <p className="text-xs text-foreground/60 mt-0.5 line-clamp-2">{b.message}</p>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {b.type === 'urgent' ? (
                        <Badge variant="error">Urgente / Alerta</Badge>
                      ) : b.type === 'warning' ? (
                        <Badge variant="warning">Aviso</Badge>
                      ) : b.type === 'success' ? (
                        <Badge variant="success">Sucesso</Badge>
                      ) : (
                        <Badge variant="primary">Informativo</Badge>
                      )}
                    </td>

                    {/* Link */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-foreground/60">
                      {b.link ? (
                        <a href={b.link} target="_blank" rel="noopener noreferrer" className="font-mono text-primary flex items-center gap-1 hover:underline">
                          Abrir Link
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-foreground/30">—</span>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggle(b)}
                        disabled={togglingId === b.id}
                        className="inline-flex items-center gap-1.5 cursor-pointer"
                        title="Clique para ligar ou desligar este aviso"
                      >
                        {b.is_active ? (
                          <Badge variant="success">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="default">
                            <Power className="h-3 w-3 mr-1 text-foreground/40" />
                            Inativo
                          </Badge>
                        )}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-foreground/50">
                      {new Date(b.created_at).toLocaleDateString('pt-PT')}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(b.id)}
                        className="h-7 w-7 p-0 border-border-custom hover:border-error/40 hover:text-error ml-auto"
                        title="Eliminar aviso"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE BROADCAST MODAL */}
      <Dialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Novo Aviso Global de Sistema"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-xs text-foreground/60">
            Este banner será transmitido imediatamente no topo de todas as páginas da aplicação para todos os utilizadores autenticados.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">Título do Comunicado</label>
            <Input
              required
              placeholder="Ex: Atualização Programada dos Servidores"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-background/50 border-border-custom"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">Mensagem</label>
            <textarea
              required
              rows={3}
              placeholder="Ex: No próximo domingo às 02:00 realizaremos melhorias na infraestrutura do Meu Boda..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border-custom text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">Nível de Importância</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border-custom text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="info">Informativo (Dourado / Padrão)</option>
                <option value="warning">Atenção (Amarelo)</option>
                <option value="urgent">Urgente / Alerta (Vermelho)</option>
                <option value="success">Novidade / Sucesso (Verde)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">Link de Ação (Opcional)</label>
              <Input
                placeholder="Ex: /novidades ou https://..."
                value={link}
                onChange={e => setLink(e.target.value)}
                className="bg-background/50 border-border-custom"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded border-border-custom text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="isActiveToggle" className="text-xs text-foreground/80 font-medium cursor-pointer">
              Ativar e publicar imediatamente este aviso
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-custom">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !title.trim() || !message.trim()}
              className="bg-primary text-black hover:bg-primary-hover font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  A publicar...
                </>
              ) : (
                'Publicar Aviso Global'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
