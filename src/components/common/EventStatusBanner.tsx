'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformPaymentRepository, LicenseStatusResult } from '@/repositories/platformPayment.repository';
import EventActivationModal from '@/components/modals/EventActivationModal';
import { Sparkles, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EventStatusBannerProps {
  className?: string;
  onOpenModalOverride?: () => void;
}

export default function EventStatusBanner({ className = '' }: EventStatusBannerProps) {
  const { currentEvent } = useEvent();
  const { user } = useAuth();
  const [licenseInfo, setLicenseInfo] = useState<LicenseStatusResult>({
    isLicensed: true,
    status: 'licensed',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      const result = await PlatformPaymentRepository.isEventLicensed(currentEvent, user?.role);
      setLicenseInfo(result);
    } catch (err) {
      console.error('Error checking license status:', err);
    } finally {
      setLoading(false);
    }
  }, [currentEvent, user?.role]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  if (!currentEvent || licenseInfo.isLicensed) {
    return null; // Fully licensed or grandfathered VIP event: banner stays clean and hidden
  }

  const isPending = licenseInfo.status === 'pending';

  return (
    <>
      <div
        className={`w-full border-b transition-all ${
          isPending
            ? 'bg-amber-500/10 border-amber-500/25 text-amber-200'
            : 'bg-gradient-to-r from-[#181820] via-[#231e11] to-[#181820] border-[#d4af37]/30 text-white'
        } ${className}`}
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 text-xs text-center sm:text-left">
            {isPending ? (
              <>
                <Clock className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
                <span>
                  <strong>Comprovativo em Análise:</strong> O pagamento da licença deste evento está a ser validado pela equipa Meu Boda.
                </span>
              </>
            ) : (
              <>
                <div className="p-1 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/35 text-[#f3e0aa] shrink-0">
                  <Sparkles className="h-3 w-3" />
                </div>
                <span>
                  <strong>Modo Demonstração:</strong> Ative a licença oficial (45.000 Kz) para libertar passes QR ilimitados e o controlo de portaria.
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className={`rounded-full text-xs font-bold px-4 py-1.5 shadow-sm transition-transform hover:scale-105 active:scale-95 ${
                isPending
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  : 'bg-[#d4af37] hover:bg-[#b59226] text-black shadow-[#d4af37]/20'
              }`}
            >
              {isPending ? 'Ver Estado' : 'Ativar Licença'}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <EventActivationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={currentEvent}
        currentStatus={licenseInfo.status}
        onPaymentSubmitted={() => {
          checkStatus();
        }}
      />
    </>
  );
}
