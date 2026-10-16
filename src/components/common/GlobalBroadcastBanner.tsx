'use client';

import React, { useEffect, useState } from 'react';
import { SuperAdminRepository } from '@/repositories/superadmin.repository';
import { NotificationRepository } from '@/repositories/notification.repository';
import { SystemBroadcast } from '@/types';
import { Megaphone, X } from 'lucide-react';

interface GlobalBroadcastBannerProps {
  className?: string;
}

export default function GlobalBroadcastBanner({ className = '' }: GlobalBroadcastBannerProps) {
  const [broadcast, setBroadcast] = useState<SystemBroadcast | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const getDismissedKeys = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('meuboda_dismissed_broadcasts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const isBroadcastDismissed = (b: SystemBroadcast): boolean => {
    const list = getDismissedKeys();
    if (!list || list.length === 0) return false;
    const bTitle = (b.title || '').trim().toLowerCase();
    const bMsg = (b.message || '').trim().toLowerCase();
    const sig1 = `${bTitle}:${bMsg}`;
    const sig2 = `${bTitle}:::${bMsg}`;
    return list.some((k) => {
      const cleanK = (k || '').trim().toLowerCase();
      return (
        cleanK === b.id.toLowerCase() ||
        cleanK === bTitle ||
        cleanK === sig1 ||
        cleanK === sig2
      );
    });
  };

  useEffect(() => {
    SuperAdminRepository.getActiveBroadcasts().then((broadcasts) => {
      if (broadcasts && broadcasts.length > 0) {
        // Pick first broadcast that hasn't been dismissed by the user
        const undismissed = broadcasts.find((b) => !isBroadcastDismissed(b));
        if (undismissed) {
          setBroadcast(undismissed);
        }
      }
    });

    const handleDismissedEvent = () => {
      setDismissed(true);
    };
    window.addEventListener('meuboda_broadcast_dismissed', handleDismissedEvent);
    return () => {
      window.removeEventListener('meuboda_broadcast_dismissed', handleDismissedEvent);
    };
  }, []);

  const handleDismiss = async () => {
    if (!broadcast) return;
    try {
      const list = getDismissedKeys();
      const updated = Array.from(
        new Set([
          ...list,
          broadcast.id,
          broadcast.title,
          `${broadcast.title}:${broadcast.message}`,
          `${broadcast.title}:::${broadcast.message}`,
        ])
      );
      localStorage.setItem('meuboda_dismissed_broadcasts', JSON.stringify(updated));
      window.dispatchEvent(new Event('meuboda_broadcast_dismissed'));

      // If broadcast corresponds to a notification row, mark as read in DB
      if (broadcast.id && !broadcast.id.startsWith('bc-')) {
        await NotificationRepository.markAsRead(broadcast.id);
      }
    } catch (e) {
      console.warn('Error saving dismissed broadcast:', e);
    }
    setDismissed(true);
  };

  if (!broadcast || dismissed) return null;

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-sm animate-in fade-in transition-all ${
        broadcast.type === 'urgent'
          ? 'bg-error/15 border-error/30 text-error'
          : broadcast.type === 'warning'
          ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
          : broadcast.type === 'success'
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          : 'bg-primary/10 border-primary/25 text-primary'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Megaphone className="h-4 w-4 shrink-0" />
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="font-bold">{broadcast.title}:</span>
          <span className="opacity-90">{broadcast.message}</span>
          {broadcast.link && (
            <a
              href={broadcast.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleDismiss}
              className="underline font-bold ml-1 hover:opacity-80 inline-flex items-center"
            >
              Saber mais &rarr;
            </a>
          )}
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        title="Fechar aviso"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
