'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { MediaRepository, EventMedia } from '@/repositories/media.repository';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Camera,
  Play,
  Check,
  X,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Eye,
  Calendar,
} from 'lucide-react';

export default function AdminGaleriaPage() {
  const { currentEvent } = useEvent();
  const [mediaList, setMediaList] = useState<EventMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const loadData = async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      const data = await MediaRepository.getAll(currentEvent.id);
      setMediaList(data);
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

  const handleUpdateStatus = async (id: string, status: 'pending' | 'approved' | 'rejected') => {
    try {
      const updated = await MediaRepository.update(id, { status });
      if (updated) {
        setMediaList((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status } : item))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMedia = async (item: EventMedia) => {
    if (!confirm('Deseja realmente eliminar este arquivo permanentemente?')) return;

    try {
      // 1. Delete from storage bucket
      await MediaRepository.deleteFile(item.media_url);
      // 2. Delete database record
      const success = await MediaRepository.delete(item.id);
      if (success) {
        setMediaList((prev) => prev.filter((m) => m.id !== item.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMedia = mediaList.filter((m) => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const getPendingCount = () => mediaList.filter((m) => m.status === 'pending').length;

  if (!currentEvent) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <p className="text-foreground/50 text-sm">Selecione um casamento para gerir a galeria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" /> Galeria Colaborativa ("Live")
          </h1>
          <p className="text-sm text-foreground/60">
            Aprove, rejeite ou elimine fotos e vídeos partilhados pelos convidados no dia do evento.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={loadData}
            disabled={loading}
            size="sm"
          >
            Atualizar
          </Button>

          <a
            href={`/galeria-live/${currentEvent.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              leftIcon={<ExternalLink className="h-4 w-4" />}
              size="sm"
            >
              Projeção ao Vivo (Slideshow)
            </Button>
          </a>
        </div>
      </div>

      {/* Stats and Filter Controls */}
      <Card className="bg-card-bg">
        <CardContent className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Status Filters */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 rounded-xl font-medium transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-secondary/40 hover:bg-secondary text-foreground/80'
              }`}
            >
              Todos ({mediaList.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-2 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'pending'
                  ? 'bg-warning text-white'
                  : 'bg-secondary/40 hover:bg-secondary text-foreground/80'
              }`}
            >
              Pendentes ({getPendingCount()})
              {getPendingCount() > 0 && (
                <span className="h-2 w-2 rounded-full bg-error animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-2 rounded-xl font-medium transition-all cursor-pointer ${
                filter === 'approved'
                  ? 'bg-success text-white'
                  : 'bg-secondary/40 hover:bg-secondary text-foreground/80'
              }`}
            >
              Aprovados ({mediaList.filter((m) => m.status === 'approved').length})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-3 py-2 rounded-xl font-medium transition-all cursor-pointer ${
                filter === 'rejected'
                  ? 'bg-error text-white'
                  : 'bg-secondary/40 hover:bg-secondary text-foreground/80'
              }`}
            >
              Rejeitados ({mediaList.filter((m) => m.status === 'rejected').length})
            </button>
          </div>

          <div className="text-xs text-foreground/50 flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            <span>Os arquivos aprovados aparecem no ecrã de projeção e no portal dos convidados.</span>
          </div>
        </CardContent>
      </Card>

      {/* Media Grid */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredMedia.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredMedia.map((item) => (
            <Card
              key={item.id}
              className="bg-card-bg border border-border-custom overflow-hidden group flex flex-col justify-between"
            >
              {/* Media Preview Container */}
              <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
                {item.media_type === 'video' ? (
                  <div className="relative w-full h-full">
                    <video
                      src={item.media_url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="rounded-full bg-white/20 p-2.5 backdrop-blur-sm text-white">
                        <Play className="h-6 w-6 fill-current" />
                      </div>
                    </div>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.media_url}
                    alt={item.caption || 'Foto enviada'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {/* Status Badge overlay */}
                <div className="absolute top-2.5 left-2.5">
                  <Badge
                    variant={
                      item.status === 'approved'
                        ? 'success'
                        : item.status === 'rejected'
                        ? 'error'
                        : 'warning'
                    }
                  >
                    {item.status === 'approved'
                      ? 'Aprovado'
                      : item.status === 'rejected'
                      ? 'Rejeitado'
                      : 'Pendente'}
                  </Badge>
                </div>
              </div>

              {/* Caption and Guest Details */}
              <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground truncate">
                    Por: <span className="text-primary font-bold">{item.guest_name}</span>
                  </p>
                  <p className="text-xs text-foreground/70 italic line-clamp-2 mt-1">
                    {item.caption ? `"${item.caption}"` : 'Sem legenda'}
                  </p>
                </div>
                <div className="text-[10px] text-foreground/45 flex items-center gap-1 pt-1.5 border-t border-border-custom/40">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(item.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-border-custom bg-secondary/10 p-2.5 flex items-center justify-between gap-1">
                {item.status !== 'approved' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-success hover:bg-success/15 hover:text-success py-1 px-2 text-xs flex-1 justify-center"
                    leftIcon={<Check className="h-3.5 w-3.5" />}
                    onClick={() => handleUpdateStatus(item.id, 'approved')}
                  >
                    Aprovar
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-warning hover:bg-warning/10 hover:text-warning py-1 px-2 text-xs flex-1 justify-center"
                    leftIcon={<X className="h-3.5 w-3.5" />}
                    onClick={() => handleUpdateStatus(item.id, 'pending')}
                  >
                    Pender
                  </Button>
                )}

                {item.status !== 'rejected' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-error hover:bg-error/10 hover:text-error py-1 px-2 text-xs flex-1 justify-center"
                    leftIcon={<X className="h-3.5 w-3.5" />}
                    onClick={() => handleUpdateStatus(item.id, 'rejected')}
                  >
                    Rejeitar
                  </Button>
                )}

                <button
                  onClick={() => handleDeleteMedia(item)}
                  className="p-2 text-foreground/45 hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
                  title="Eliminar permanentemente"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-16 border border-dashed border-border-custom rounded-xl bg-card-bg">
          <Camera className="h-12 w-12 text-foreground/20 mb-3" />
          <p className="text-sm font-semibold text-foreground/75">Nenhum arquivo nesta categoria</p>
          <p className="text-xs text-foreground/50 mt-1 max-w-[280px]">
            Os arquivos enviados pelos convidados com este estado aparecerão aqui.
          </p>
        </div>
      )}
    </div>
  );
}
