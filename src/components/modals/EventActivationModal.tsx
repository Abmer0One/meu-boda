'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { Event } from '@/types';
import {
  PLATFORM_BANKING_CONFIG,
  buildPaymentRequestWhatsAppUrl,
} from '@/config/bankDetails';
import { PlatformPaymentRepository } from '@/repositories/platformPayment.repository';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  QrCode,
  Users,
  Camera,
} from 'lucide-react';

interface EventActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  currentStatus?: 'licensed' | 'pending' | 'trial';
  onPaymentSubmitted?: () => void;
}

export default function EventActivationModal({
  isOpen,
  onClose,
  event,
  currentStatus = 'trial',
  onPaymentSubmitted,
}: EventActivationModalProps) {
  const { user } = useAuth();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [referenceCode, setReferenceCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSubmitted, setSuccessSubmitted] = useState(false);
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  if (!event) return null;

  const whatsappUrl = buildPaymentRequestWhatsAppUrl(
    event.title,
    user?.email,
    'Plano Noivos (45.000 Kz)'
  );

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile || !user) {
      setErrorMessage('Por favor selecione o ficheiro do comprovativo de pagamento.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await PlatformPaymentRepository.submitPayment({
      userId: user.id,
      userEmail: user.email || '',
      eventId: event.id,
      eventTitle: event.title,
      planType: 'Plano Noivos (45.000 Kz)',
      amount: PLATFORM_BANKING_CONFIG.b2cWeddingPriceKz,
      file: receiptFile,
      referenceCode,
      notes,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Ocorreu um erro ao submeter o comprovativo.');
      return;
    }

    setSuccessSubmitted(true);
    if (onPaymentSubmitted) {
      onPaymentSubmitted();
    }
  };

  const isPendingReview = currentStatus === 'pending' || successSubmitted;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Ativação Oficial da Licença"
      size="lg"
    >
      <div className="relative p-6 sm:p-8">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-1/4 w-52 h-28 bg-[#d4af37]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[#f3e0aa] mb-2.5">
            <Sparkles className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>Licença Oficial do Evento</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif tracking-tight text-white">
            {event.title}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Ative o seu evento para libertar emissão ilimitada de passes QR e controlo de portaria.
          </p>
        </div>

        {/* State: Pending Review */}
        {isPendingReview ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-4 relative z-10">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Clock className="h-7 w-7 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300">
                Comprovativo em Validação
              </h3>
              <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed max-w-sm mx-auto">
                O seu comprovativo de <strong>{PLATFORM_BANKING_CONFIG.b2cWeddingPriceFormatted}</strong> foi recebido com sucesso e está a ser verificado pela equipa Meu Boda.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold px-5 py-2.5 shadow-md transition-all"
              >
                Avisar a Equipa no WhatsApp
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="rounded-full text-xs text-zinc-300 border-zinc-700"
              >
                Fechar e Aguardar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
            {/* Price & Features Card */}
            <div className="rounded-2xl border border-[#d4af37]/25 bg-gradient-to-br from-[#1a1a24] to-[#121218] p-5 shadow-lg">
              <div className="flex items-baseline justify-between border-b border-white/10 pb-3 mb-3.5">
                <div>
                  <span className="text-[10px] font-extrabold text-[#f3e0aa] uppercase tracking-wider block">
                    Taxa Única por Evento
                  </span>
                  <h4 className="text-sm font-bold text-white mt-0.5">Plano Noivos</h4>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-[#f3e0aa]">
                    {PLATFORM_BANKING_CONFIG.b2cWeddingPriceFormatted}
                  </span>
                  <span className="text-[10px] text-zinc-400 block font-medium">Sem mensalidades</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  Passes com QR Code ilimitados
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                  Portaria com PIN em tempo real
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                  Organizador de mesas 2D
                </span>
                <span className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  Galeria Live colaborativa
                </span>
              </div>
            </div>

            {/* Step 1: Request Banking Details */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3e0aa] text-[11px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Obter Coordenadas de Transferência (BAI / BFA / Express)
                </h4>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                Para sua comodidade e segurança, solicite as coordenadas bancárias atualizadas em 1 clique diretamente no nosso canal de atendimento:
              </p>

              <div className="pl-7 pt-1">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold py-3 shadow-lg shadow-[#25D366]/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Solicitar IBAN no WhatsApp ({PLATFORM_BANKING_CONFIG.whatsappDisplayPhone})
                </a>
              </div>

              {/* If any bank account is set to available, display it with copy button */}
              {PLATFORM_BANKING_CONFIG.accounts.some((a) => a.isAvailable) && (
                <div className="pl-7 pt-2 space-y-2">
                  {PLATFORM_BANKING_CONFIG.accounts
                    .filter((a) => a.isAvailable)
                    .map((acc, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#f3e0aa]">{acc.bankName}</span>
                          <p className="font-mono text-[11px] text-zinc-300 mt-0.5">{acc.iban}</p>
                          <span className="text-[10px] text-zinc-400">{acc.holderName}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyIban(acc.iban)}
                          className="text-xs text-[#d4af37] hover:bg-[#d4af37]/10"
                        >
                          {copiedIban === acc.iban ? (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <Check className="h-3.5 w-3.5" /> Copiado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Copy className="h-3.5 w-3.5" /> Copiar
                            </span>
                          )}
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Step 2: Upload Proof */}
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3e0aa] text-[11px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Já efetuou a transferência? Anexe o comprovativo
                </h4>
              </div>

              <div className="pl-7 space-y-3">
                {/* File picker */}
                <div className="relative">
                  <input
                    type="file"
                    id="receipt-file-upload"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReceiptFile(e.target.files[0]);
                        setErrorMessage(null);
                      }
                    }}
                  />
                  <label
                    htmlFor="receipt-file-upload"
                    className="flex flex-col items-center justify-center p-4 border border-dashed border-[#d4af37]/40 hover:border-[#d4af37] bg-white/5 hover:bg-[#d4af37]/5 rounded-2xl cursor-pointer transition-all text-center group"
                  >
                    <Upload className="h-6 w-6 text-[#d4af37] mb-1.5 group-hover:scale-110 transition-transform" />
                    {receiptFile ? (
                      <div className="flex items-center gap-1.5 text-xs text-white font-medium">
                        <FileText className="h-4 w-4 text-[#d4af37]" />
                        <span className="truncate max-w-xs">{receiptFile.name}</span>
                        <span className="text-[10px] text-emerald-400 font-bold ml-1">✓ Selecionado</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-zinc-300 font-medium">
                          Clique para carregar o comprovativo bancário
                        </span>
                        <span className="text-[10px] text-zinc-500 mt-0.5">
                          Formatos aceites: PDF, JPG ou PNG (máx. 10MB)
                        </span>
                      </>
                    )}
                  </label>
                </div>

                {/* Reference code (optional) */}
                <Input
                  type="text"
                  placeholder="Nº de Operação ou Referência da Transferência (Opcional)"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  className="bg-white/5 border-white/10 text-xs text-white placeholder:text-zinc-600 rounded-xl"
                />

                {/* Error alert */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={!receiptFile || isSubmitting}
                  className="w-full rounded-full bg-[#d4af37] hover:bg-[#b59226] text-black font-extrabold text-xs py-3 shadow-lg shadow-[#d4af37]/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A submeter comprovativo...
                    </span>
                  ) : (
                    <span>Submeter Comprovativo de Pagamento (45.000 Kz)</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Dialog>
  );
}
