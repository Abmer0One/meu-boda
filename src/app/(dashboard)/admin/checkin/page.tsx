'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { GuestRepository } from '@/repositories/guest.repository';
import { CheckInRepository } from '@/repositories/checkin.repository';
import {
  PortariaRepository,
  generatePortariaPin,
} from '@/repositories/portaria.repository';
import { Guest, CheckIn, PortariaConfig } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import confetti from 'canvas-confetti';
import {
  QrCode,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Camera,
  KeyRound,
  Share2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  ShieldOff,
  Edit2,
  MessageCircle,
} from 'lucide-react';

export default function CheckinPage() {
  const { currentEvent } = useEvent();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  // Portaria Team & Access State
  const [portariaConfig, setPortariaConfig] = useState<PortariaConfig | null>(null);
  const [isSavingPortaria, setIsSavingPortaria] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [customPinInput, setCustomPinInput] = useState('');
  const [adminOperatorName, setAdminOperatorName] = useState('Gestor / Painel');

  // QR Input state (for scanners that type characters + Enter)
  const [qrInput, setQrInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Alerts state
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Prevent duplicate rapid processing in scanner & UI
  const isScanningBusyRef = useRef(false);
  const lastScannedTokenRef = useRef<string | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const processingGuestIdsRef = useRef<Set<string>>(new Set());

  // Handle successful camera QR scan
  const handleScanSuccess = async (decodedText: string) => {
    let token = decodedText.trim();

    // Parse JSON if needed
    try {
      if (token.startsWith('{') && token.endsWith('}')) {
        const parsed = JSON.parse(token);
        if (parsed.token) {
          token = parsed.token;
        }
      }
    } catch (err) {}

    const matchedGuest = guests.find((g) => g.qr_token === token);
    if (matchedGuest) {
      setIsScanning(false);
      await handleCheckin(matchedGuest);
    } else {
      setIsScanning(false);
      setAlertMessage({
        type: 'error',
        text: 'QR Code inválido ou não pertencente a este casamento.',
      });
    }
  };

  // Setup camera QR scanner when isScanning is toggled
  useEffect(() => {
    if (!isScanning) return;

    let html5QrCode: any;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText: string) => {
          const now = Date.now();
          const text = decodedText.trim();

          if (isScanningBusyRef.current) return;
          if (
            lastScannedTokenRef.current === text &&
            now - lastScanTimestampRef.current < 4000
          ) {
            return;
          }

          isScanningBusyRef.current = true;
          lastScannedTokenRef.current = text;
          lastScanTimestampRef.current = now;

          try {
            await handleScanSuccess(text);
          } finally {
            setTimeout(() => {
              isScanningBusyRef.current = false;
            }, 2000);
          }
        },
        () => {} // Quiet frame errors
      ).catch((err: any) => {
        console.error("Camera access failed:", err);
        setAlertMessage({
          type: 'error',
          text: 'Erro ao abrir a câmara. Verifique as permissões de acesso do seu navegador.',
        });
        setIsScanning(false);
      });
    }).catch((err: any) => {
      console.error("Failed to load html5-qrcode dynamically:", err);
      setIsScanning(false);
    });

    return () => {
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
          }).catch((err: any) => console.error("Error stopping scanner:", err));
        }
      }
    };
  }, [isScanning, guests]);

  const loadData = async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      const [g, ci, pConfig] = await Promise.all([
        GuestRepository.getAll(currentEvent.id),
        CheckInRepository.getAll(currentEvent.id),
        PortariaRepository.getConfig(currentEvent.id),
      ]);
      setGuests(g);
      setCheckins(ci);
      setPortariaConfig(pConfig);
      setCustomPinInput(pConfig.pin);
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

  // Portaria Handlers
  const handleTogglePortaria = async () => {
    if (!currentEvent || !portariaConfig) return;
    setIsSavingPortaria(true);
    const updated = {
      ...portariaConfig,
      enabled: !portariaConfig.enabled,
    };
    await PortariaRepository.saveConfig(currentEvent.id, updated);
    setPortariaConfig(updated);
    setIsSavingPortaria(false);
  };

  const handleGenerateNewPin = async () => {
    if (!currentEvent || !portariaConfig) return;
    if (!confirm('Deseja gerar um novo código PIN? O PIN anterior deixará de funcionar imediatamente na portaria.')) return;
    setIsSavingPortaria(true);
    const newPin = generatePortariaPin();
    const updated = {
      ...portariaConfig,
      pin: newPin,
    };
    await PortariaRepository.saveConfig(currentEvent.id, updated);
    setPortariaConfig(updated);
    setCustomPinInput(newPin);
    setIsSavingPortaria(false);
  };

  const handleSaveCustomPin = async () => {
    if (!currentEvent || !portariaConfig) return;
    const clean = customPinInput.trim();
    if (!clean || clean.length < 4) {
      alert('O código PIN deve ter no mínimo 4 dígitos.');
      return;
    }
    setIsSavingPortaria(true);
    const updated = {
      ...portariaConfig,
      pin: clean,
    };
    await PortariaRepository.saveConfig(currentEvent.id, updated);
    setPortariaConfig(updated);
    setIsEditingPin(false);
    setIsSavingPortaria(false);
  };

  const getPortariaUrl = () => {
    if (!currentEvent) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/portaria/${currentEvent.slug}`;
  };

  const handleCopyLink = () => {
    const url = getPortariaUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!currentEvent || !portariaConfig) return;
    const url = getPortariaUrl();
    const message = `🎉 *Acesso à Portaria & Check-in*\nEvento: *${currentEvent.title}*\n\n👉 *Link do Leitor:* ${url}\n🔑 *Código PIN:* *${portariaConfig.pin}*\n\nAbre o link no teu telemóvel e introduz o código PIN para começares a ler os QR Codes dos convites!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Trigger celebration on successful entry
  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#E86C64', '#4D2046', '#F8EDEF', '#10B981'],
    });
  };

  // Perform checkin logic
  const handleCheckin = async (guest: Guest) => {
    if (!currentEvent) return;

    // Check if already checked in
    const isAlreadyCheckedIn = checkins.some((ci) => ci.guest_id === guest.id);
    if (isAlreadyCheckedIn) {
      setAlertMessage({
        type: 'error',
        text: `O convidado '${guest.name}' já efetuou a entrada!`,
      });
      return;
    }

    // Check if check-in is already in-flight for this guest
    if (processingGuestIdsRef.current.has(guest.id)) {
      return;
    }
    processingGuestIdsRef.current.add(guest.id);

    try {
      const newCheckin = await CheckInRepository.create({
        guest_id: guest.id,
        operator: adminOperatorName || 'Gestor / Painel',
      });

      if (newCheckin) {
        // Optimistic state update
        setCheckins((prev) => [newCheckin, ...prev]);

        setAlertMessage({
          type: 'success',
          text: `Entrada autorizada! Bem-vindo, ${guest.name} (${1 + guest.companions} pax).`,
        });
        triggerConfetti();
        loadData();
      } else {
        setAlertMessage({
          type: 'error',
          text: `O convidado '${guest.name}' já efetuou a entrada!`,
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
      setAlertMessage({ type: 'error', text: 'Ocorreu um erro ao processar a entrada.' });
    } finally {
      setTimeout(() => {
        processingGuestIdsRef.current.delete(guest.id);
      }, 2500);
    }
  };

  // Parse simulated QR Code scanner input
  const handleQrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;

    let token = qrInput.trim();

    // Check if input is a JSON string (scanned from our generated QR code structure)
    try {
      if (token.startsWith('{') && token.endsWith('}')) {
        const parsed = JSON.parse(token);
        if (parsed.token) {
          token = parsed.token;
        }
      }
    } catch (err) {
      // Not a JSON, assume it is direct token
    }

    const matchedGuest = guests.find((g) => g.qr_token === token);

    if (matchedGuest) {
      await handleCheckin(matchedGuest);
    } else {
      setAlertMessage({
        type: 'error',
        text: 'QR Code inválido ou não pertencente a este casamento.',
      });
    }

    setQrInput('');
  };

  const handleRemoveCheckin = async (guestId: string) => {
    try {
      await CheckInRepository.deleteByGuestId(guestId);
      setAlertMessage(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filters for quick manual search
  const filteredGuests = guests.filter((g) => {
    const isSeated = g.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isCheckedIn = checkins.some((ci) => ci.guest_id === g.id);
    const s = g.status?.toLowerCase() || '';
    const isConfirmed = s === 'confirmed' || s === 'confirmado' || s === 'sim' || s === 'yes';
    return isSeated && !isCheckedIn && isConfirmed;
  });

  if (!currentEvent) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <p className="text-foreground/50 text-sm">Selecione um casamento para gerir o check-in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <QrCode className="h-6 w-6 text-primary" /> Portaria & Check-in Digital
        </h1>
        <p className="text-sm text-foreground/60">
          Aponte o leitor de QR Code para os convites ou procure nomes manualmente para validar as entradas no salão.
        </p>
      </div>

      {/* Card de Configuração & Partilha de Acesso da Portaria (Protocolo & Segurança) */}
      <Card className="bg-card-bg border-border-custom overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b border-border-custom">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    Acesso da Equipa de Portaria (Protocolo & Seguranças)
                  </h3>
                  <p className="text-xs text-foreground/60">
                    Permita que os porteiros usem os seus próprios telemóveis para ler QR codes sem terem acesso à sua conta, orçamentos ou dados confidenciais.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <Badge
                variant="default"
                className={
                  portariaConfig?.enabled
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
                }
              >
                {portariaConfig?.enabled ? (
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Portaria Ativa
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <ShieldOff className="h-3.5 w-3.5 text-zinc-400" /> Acesso Desativado
                  </span>
                )}
              </Badge>

              <button
                type="button"
                onClick={handleTogglePortaria}
                disabled={isSavingPortaria || !portariaConfig}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  portariaConfig?.enabled ? 'bg-primary' : 'bg-secondary/60'
                }`}
                title={portariaConfig?.enabled ? 'Desativar acesso da portaria' : 'Ativar acesso da portaria'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    portariaConfig?.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <CardContent className="p-5">
          {!portariaConfig?.enabled ? (
            <div className="p-4 bg-secondary/15 rounded-xl border border-dashed border-border-custom flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground/80">O acesso rápido da portaria está desativado</p>
                <p className="text-[11px] text-foreground/50">
                  Nenhum operador externo conseguirá ler convites ou autenticar-se enquanto estiver desativado.
                </p>
              </div>
              <Button size="sm" onClick={handleTogglePortaria} isLoading={isSavingPortaria}>
                Ativar Acesso da Portaria
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Código PIN */}
              <div className="md:col-span-4 bg-secondary/15 p-4 rounded-xl border border-border-custom flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-primary" /> Código PIN de Acesso
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateNewPin}
                    disabled={isSavingPortaria}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    title="Gerar outro código aleatório"
                  >
                    <RefreshCw className="h-3 w-3" /> Gerar Novo
                  </button>
                </div>

                <div className="py-1">
                  {isEditingPin ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={8}
                        value={customPinInput}
                        onChange={(e) => setCustomPinInput(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                        className="w-full bg-card-bg border border-primary rounded-lg px-3 py-1.5 text-center font-mono font-bold text-lg tracking-widest text-primary focus:outline-none"
                        placeholder="Ex: 849201"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleSaveCustomPin} isLoading={isSavingPortaria}>
                        Gravar
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingPin(false);
                          setCustomPinInput(portariaConfig.pin);
                        }}
                        className="text-xs text-foreground/50 hover:text-foreground p-1"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-card-bg px-4 py-2.5 rounded-xl border border-border-custom">
                      <span className="font-mono text-2xl font-black tracking-[0.25em] text-primary">
                        {portariaConfig.pin}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingPin(true)}
                        className="p-1.5 rounded-lg text-foreground/50 hover:bg-secondary/40 hover:text-foreground transition-colors cursor-pointer"
                        title="Personalizar PIN"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-foreground/50 leading-relaxed">
                  O porteiro digita este código para abrir o leitor de QR Code no seu próprio telemóvel.
                </p>
              </div>

              {/* Link Rápido e Ações de Partilha */}
              <div className="md:col-span-8 bg-secondary/15 p-4 rounded-xl border border-border-custom flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                    <Share2 className="h-3.5 w-3.5 text-primary" /> Link de Acesso para a Equipa
                  </span>
                  <p className="text-[11px] text-foreground/60 mt-0.5">
                    Envie este link aos porteiros. Ao acederem, deverão introduzir o código PIN para iniciar a validação dos convites.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-card-bg border border-border-custom rounded-xl p-1.5 pl-3">
                  <span className="text-xs font-mono text-foreground/80 truncate flex-1 select-all">
                    {getPortariaUrl()}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-secondary/40 hover:bg-secondary/70 text-foreground text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                  <a
                    href={getPortariaUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1.5 rounded-lg text-foreground/60 hover:bg-secondary/40 hover:text-foreground transition-colors"
                    title="Abrir ecrã da portaria numa nova aba"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-foreground/60">Operador no Painel:</span>
                    <select
                      value={adminOperatorName}
                      onChange={(e) => setAdminOperatorName(e.target.value)}
                      className="text-xs bg-card-bg border border-border-custom rounded-lg px-2 py-1 text-foreground"
                    >
                      <option value="Gestor / Painel">Gestor / Painel</option>
                      {portariaConfig.operators?.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4 fill-white" />
                    <span>Enviar Acesso por WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Scan Area */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-card-bg">
            <CardHeader>
              <CardTitle>Leitor de Convites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Camera Scanner or Simulation Card */}
              {isScanning ? (
                <div className="relative overflow-hidden rounded-xl bg-black aspect-square flex flex-col items-center justify-center border border-border-custom min-h-[260px] max-w-sm mx-auto w-full">
                  <div id="reader" className="w-full h-full" />
                  
                  {/* Scanner overlay laser animation */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-primary border-dashed rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 inset-x-0 h-0.5 bg-primary animate-[bounce_2s_infinite]" />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute bottom-3 z-10 bg-black/70 text-white border-white/20 hover:bg-black/90 hover:text-white"
                    onClick={() => setIsScanning(false)}
                  >
                    Cancelar Leitura
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => setIsScanning(true)}
                  className="border border-border-custom hover:border-primary/50 cursor-pointer rounded-xl p-8 bg-secondary/10 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[220px] transition-all hover:bg-secondary/20 group"
                >
                  <QrCode className="h-14 w-14 text-primary group-hover:scale-105 transition-transform mb-3" />
                  <p className="text-sm font-semibold flex items-center gap-1.5 text-foreground justify-center">
                    <Camera className="h-4 w-4 text-primary" /> Iniciar Leitor de Câmara
                  </p>
                  <p className="text-[11px] text-foreground/50 max-w-[200px] mt-1">
                    Clique neste cartão para abrir a câmara e ler o código QR do convite.
                  </p>
                </div>
              )}

              {/* QR Code form */}
              <form onSubmit={handleQrSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Introduza o Token ou JSON do QR Code..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="flex-1 rounded-xl border border-border-custom bg-background/50 px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  autoFocus
                />
                <Button type="submit">Validar</Button>
              </form>

              {/* Alert Feedback Banner */}
              {alertMessage && (
                <div
                  className={`rounded-xl p-3 text-xs flex items-start gap-2.5 font-medium ${
                    alertMessage.type === 'success' ? 'bg-success/15 text-success' : 'bg-error/15 text-error'
                  }`}
                >
                  {alertMessage.type === 'success' ? (
                    <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  )}
                  <span>{alertMessage.text}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Manual Lookup & Checked-in list */}
        <div className="lg:col-span-7 space-y-6">
          {/* Manual Entry */}
          <Card className="bg-card-bg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Entrada Manual (Confirmados)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-foreground/45" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-border-custom bg-background/50 pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* List of guest results */}
              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 border border-border-custom/50 rounded-xl p-2 bg-secondary/5 min-h-[140px]">
                {loading ? (
                  <div className="flex h-20 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : filteredGuests.length > 0 ? (
                  filteredGuests.map((guest) => (
                    <div
                      key={guest.id}
                      className="flex items-center justify-between p-2.5 border border-border-custom/50 rounded-lg bg-background hover:bg-secondary/15 transition-all text-xs"
                    >
                      <div>
                        <span className="font-semibold text-foreground/90">{guest.name}</span>
                        <span className="text-[10px] text-foreground/45 ml-2 font-medium">
                          (+{guest.companions} acomp.)
                        </span>
                      </div>
                      <Button size="sm" className="text-[11px] py-1 px-3" onClick={() => handleCheckin(guest)}>
                        Dar Entrada
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-[10px] text-foreground/40 py-8 italic">
                    Nenhum convidado confirmado pendente de entrada.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Checked-in List log */}
          <Card className="bg-card-bg">
            <CardHeader>
              <CardTitle>Histórico de Entradas ({checkins.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-20 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : checkins.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border-custom">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-secondary/30 text-foreground/70 font-semibold border-b border-border-custom">
                        <th className="p-3">Convidado</th>
                        <th className="p-3">Hora Entrada</th>
                        <th className="p-3">Operador / Posto</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {checkins.map((ci) => (
                        <tr key={ci.id} className="hover:bg-secondary/15 transition-colors">
                          <td className="p-3 font-medium">{ci.guest?.name || 'Convidado'}</td>
                          <td className="p-3">
                            {new Date(ci.checked_at).toLocaleTimeString('pt-PT', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-secondary/60 font-medium text-foreground/80">
                              {ci.operator || 'Portaria'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRemoveCheckin(ci.guest_id)}
                              className="p-1 rounded-lg text-foreground/50 hover:bg-error/10 hover:text-error transition-colors cursor-pointer"
                              title="Anular Entrada"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-[10px] text-foreground/40 py-6 italic">
                  Nenhum check-in efetuado hoje.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
