'use client';

import React, { useEffect, useState } from 'react';
import { SuperAdminRepository } from '@/repositories/superadmin.repository';
import { SystemBroadcast } from '@/types';
import { Megaphone, X } from 'lucide-react';

interface GlobalBroadcastBannerProps {
  className?: string;
}

export default function GlobalBroadcastBanner({ className = '' }: GlobalBroadcastBannerProps) {
  const [broadcast, setBroadcast] = useState<SystemBroadcast | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    SuperAdminRepository.getActiveBroadcasts().then((broadcasts) => {
      if (broadcasts && broadcasts.length > 0) {
        setBroadcast(broadcasts[0]);
      }
    });
  }, []);

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
              className="underline font-bold ml-1 hover:opacity-80 inline-flex items-center"
            >
              Saber mais &rarr;
            </a>
          )}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        title="Fechar aviso"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
