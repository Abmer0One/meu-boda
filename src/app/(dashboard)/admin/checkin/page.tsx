'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { GuestRepository } from '@/repositories/guest.repository';
import { CheckInRepository, getGuestCheckinStats } from '@/repositories/checkin.repository';
import {
  PortariaRepository,
  generatePortariaPin,
} from '@/repositories/portaria.repository';
import { StaffPassRepository } from '@/repositories/staff-pass.repository';
import { supabase } from '@/lib/supabase';
import { Guest, CheckIn, PortariaConfig, StaffPass, StaffCheckin } from '@/types';
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
  IdCard,
  Briefcase,
  UserCheck,
  ArrowRight,
  UtensilsCrossed,
} from 'lucide-react';

export default function CheckinPage() {
  const { currentEvent } = useEvent();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [staffPasses, setStaffPasses] = useState<StaffPass[]>([]);
  const [staffCheckins, setStaffCheckins] = useState<StaffCheckin[]>([]);
  const [historyTab, setHistoryTab] = useState<'guests' | 'staff'>('guests');
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
  const [partialModalGuest, setPartialModalGuest] = useState<Guest | null>(null);
  const [isExecutingCheckin, setIsExecutingCheckin] = useState(false);

  // Prevent duplicate rapid processing in scanner & UI
  const isScanningBusyRef = useRef(false);
  const lastScannedTokenRef = useRef<string | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const processingGuestIdsRef = useRef<Set<string>>(new Set());

  // Handle successful camera QR scan
  const handleScanSuccess = async (decodedText: string) => {
    await processScannedCode(decodedText);
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
  }, [isScanning, guests, staffPasses]);

  const loadData = async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      const [g, ci, pConfig, sp, sc] = await Promise.all([
        GuestRepository.getAll(currentEvent.id),
        CheckInRepository.getAll(currentEvent.id),
        PortariaRepository.getConfig(currentEvent.id),
        StaffPassRepository.getAll(currentEvent.id),
        StaffPassRepository.getCheckins(currentEvent.id),
      ]);
      setGuests(g);
      setCheckins(ci);
      setPortariaConfig(pConfig);
      setCustomPinInput(pConfig.pin);
      setStaffPasses(sp);
      setStaffCheckins(sc);
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

  // Realtime subscription: synchronize checkins and deletions with portaria stations (Guests & Staff)
  useEffect(() => {
    if (!currentEvent?.id) return;

    const streamChannel = supabase
      .channel('portaria-live-stream')
      .on('broadcast', { event: 'new-checkin' }, (payload) => {
        const p = payload?.payload;
        if (!p) return;
        if (!p.event_id || p.event_id === currentEvent.id) {
          setCheckins((prev) => {
            const existingIndex = prev.findIndex((c) => p.id && c.id === p.id);
            if (existingIndex >= 0) {
              const copy = [...prev];
              copy[existingIndex] = {
                ...copy[existingIndex],
                checked_count: Math.max(copy[existingIndex].checked_count || 1, Number(p.checked_count) || 1),
              };
              return copy;
            }
            return [
              {
                id: p.id || `ci_${p.guest_id}_${Date.now()}`,
                guest_id: p.guest_id,
                operator: p.operator || 'Portaria',
                checked_at: p.checked_at || new Date().toISOString(),
                checked_count: Number(p.checked_count) || 1,
              },
              ...prev,
            ];
          });
        }
      })
      .on('broadcast', { event: 'delete-checkin' }, (payload) => {
        const p = payload?.payload;
        if (!p) return;
        if (!p.event_id || p.event_id === currentEvent.id) {
          setCheckins((prev) => {
            if (p.id && !p.all) {
              return prev.filter((c) => c.id !== p.id);
            }
            return prev.filter((c) => c.guest_id !== p.guest_id);
          });
        }
      })
      .on('broadcast', { event: 'staff-checkin' }, (payload) => {
        const p = payload?.payload as StaffCheckin | undefined;
        if (!p) return;
        if (!p.event_id || p.event_id === currentEvent.id) {
          setStaffCheckins((prev) => {
            if (prev.some((c) => c.pass_id === p.pass_id)) return prev;
            return [p, ...prev];
          });
        }
      })
      .on('broadcast', { event: 'delete-staff-checkin' }, (payload) => {
        const p = payload?.payload;
        if (!p) return;
        if (!p.event_id || p.event_id === currentEvent.id) {
          setStaffCheckins((prev) => prev.filter((c) => c.pass_id !== (p.pass_id || p.staff_pass_id)));
        }
      })
      .subscribe();

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === `portaria_checkins_cache_${currentEvent.id}` ||
        e.key === 'meuboda_live_checkins_cache' ||
        e.key === `portaria_staff_checkins_cache_${currentEvent.id}` ||
        e.key === `staff_checkins_${currentEvent.id}`
      ) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      try {
        supabase.removeChannel(streamChannel);
      } catch {}
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentEvent?.id]);

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

  // Perform staff checkin logic
  const handleStaffCheckin = async (pass: StaffPass) => {
    if (!currentEvent) return;

    // Check if already checked in
    const isAlreadyCheckedIn = staffCheckins.some((sc) => sc.pass_id === pass.id);
    if (isAlreadyCheckedIn) {
      setAlertMessage({
        type: 'error',
        text: `A credencial de staff '${pass.role_title}' (${pass.holder_name || pass.company_name}) já efetuou entrada anteriormente!`,
      });
      return;
    }

    try {
      const newStaffCi = await StaffPassRepository.performCheckin(
        pass,
        adminOperatorName || 'Gestor / Painel'
      );

      if (newStaffCi) {
        setStaffCheckins((prev) => [newStaffCi, ...prev.filter((c) => c.pass_id !== pass.id)]);
        setAlertMessage({
          type: 'success',
          text: `STAFF AUTORIZADO! Entrada confirmada para ${pass.role_title} • ${pass.company_name} (${pass.holder_name || 'Serviço'}).`,
        });
        triggerConfetti();
        loadData();
      }
    } catch (err) {
      console.error(err);
      setAlertMessage({ type: 'error', text: 'Ocorreu um erro ao processar a entrada da equipa de serviço.' });
    }
  };

  const handleRemoveStaffCheckin = async (passId: string) => {
    if (!confirm('Deseja anular o registo de entrada desta credencial de staff?')) return;
    if (!currentEvent) return;

    setStaffCheckins((prev) => prev.filter((sc) => sc.pass_id !== passId));
    setAlertMessage(null);

    try {
      await StaffPassRepository.revertCheckin(passId, currentEvent.id);
      loadData();
    } catch (err) {
      console.error(err);
      setAlertMessage({ type: 'error', text: 'Erro ao anular entrada da equipa de serviço.' });
    }
  };

  // Process any scanned code or manual text input (Guests & Staff)
  const processScannedCode = async (decodedText: string) => {
    const raw = (decodedText || '').trim();
    if (!raw) return;

    let token = raw;
    let passId = '';

    // 1. Try parsing JSON format
    if (raw.includes('{') && raw.includes('}')) {
      try {
        const first = raw.indexOf('{');
        const last = raw.lastIndexOf('}');
        if (last > first) {
          const parsed = JSON.parse(raw.substring(first, last + 1));
          token = (parsed.token || parsed.qr_token || parsed.qrToken || parsed.staffPassId || parsed.id || token).trim();
          passId = (parsed.staffPassId || parsed.id || '').trim();
        }
      } catch (err) {}
    }

    const isStaff =
      token.toLowerCase().includes('stf_') ||
      raw.toLowerCase().includes('staff') ||
      raw.toLowerCase().includes('stf_') ||
      Boolean(passId);

    // 2. If recognized as a staff credential candidate
    if (isStaff) {
      let matchedPass = staffPasses.find(
        (sp) =>
          (passId && sp.id === passId) ||
          (token && sp.qr_token && sp.qr_token.toLowerCase() === token.toLowerCase()) ||
          (sp.id && sp.id === token)
      );

      if (!matchedPass) {
        matchedPass =
          (await StaffPassRepository.getByToken(token, currentEvent?.id)) ||
          (await StaffPassRepository.getByToken(token)) ||
          (passId ? await StaffPassRepository.getByToken(passId) : null) ||
          undefined;
      }

      if (matchedPass) {
        setIsScanning(false);
        await handleStaffCheckin(matchedPass);
        return;
      }
    }

    // 3. Match guest in local list
    const matchedGuest = guests.find(
      (g) =>
        (g.qr_token && g.qr_token.toLowerCase() === token.toLowerCase()) ||
        (g.id && g.id.toLowerCase() === token.toLowerCase())
    );

    if (matchedGuest) {
      setIsScanning(false);
      await handleCheckin(matchedGuest);
      return;
    }

    // 4. Fallback: Check if guest or staff exists in repository
    try {
      const guestFromDb = await GuestRepository.getByToken(token);
      if (guestFromDb && (!currentEvent || guestFromDb.event_id === currentEvent.id)) {
        setIsScanning(false);
        await handleCheckin(guestFromDb);
        return;
      }

      const staffFromDb = await StaffPassRepository.getByToken(token);
      if (staffFromDb) {
        setIsScanning(false);
        await handleStaffCheckin(staffFromDb);
        return;
      }
    } catch (e) {}

    setIsScanning(false);
    setAlertMessage({
      type: 'error',
      text: 'QR Code inválido ou não pertencente a este casamento.',
    });
  };

  // Perform checkin logic (supports full or partial entry)
  const handleCheckin = async (guest: Guest, countOverride?: number) => {
    if (!currentEvent) return;

    const stats = getGuestCheckinStats(guest, checkins);

    // 1. If all entries exhausted
    if (stats.isFullyCheckedIn) {
      setAlertMessage({
        type: 'error',
        text: `CONVITE ESGOTADO! Todas as ${stats.maxAllowed} vagas de '${guest.name}' já deram entrada no evento.`,
      });
      return;
    }

    // 2. If invitation has companions and operator hasn't selected quantity yet
    if (guest.companions > 0 && countOverride === undefined) {
      setIsScanning(false);
      setPartialModalGuest(guest);
      return;
    }

    // 3. Determine quantity to admit
    const countToEnter = countOverride !== undefined
      ? Math.min(countOverride, stats.remainingSlots)
      : Math.min(1, stats.remainingSlots);

    if (countToEnter <= 0) return;

    if (processingGuestIdsRef.current.has(guest.id)) {
      return;
    }
    processingGuestIdsRef.current.add(guest.id);
    setIsExecutingCheckin(true);

    try {
      const newCheckin = await CheckInRepository.create({
        guest_id: guest.id,
        operator: adminOperatorName || 'Gestor / Painel',
        checked_count: countToEnter,
      });

      if (newCheckin) {
        // Optimistic state update
        setCheckins((prev) => [newCheckin, ...prev.filter((c) => c.id !== newCheckin.id)]);

        const updatedTotal = stats.totalEntered + countToEnter;
        const newRemaining = Math.max(0, stats.maxAllowed - updatedTotal);
        const isComplete = newRemaining === 0;

        setAlertMessage({
          type: 'success',
          text: isComplete
            ? (stats.maxAllowed > 1
                ? `Entrada Completa! Todas as ${stats.maxAllowed} vagas de '${guest.name}' deram entrada.`
                : `Entrada autorizada! Bem-vindo(a), ${guest.name}.`)
            : `Entrada parcial autorizada (${updatedTotal}/${stats.maxAllowed})! Resta ${newRemaining} vaga guardada para chegada posterior.`,
        });
        triggerConfetti();
        setPartialModalGuest(null);
        loadData();
      } else {
        setAlertMessage({
          type: 'error',
          text: `Não foi possível registar entrada para '${guest.name}'. As vagas deste convite já se encontram esgotadas.`,
        });
        setPartialModalGuest(null);
        loadData();
      }
    } catch (err) {
      console.error(err);
      setAlertMessage({ type: 'error', text: 'Ocorreu um erro ao processar a entrada.' });
    } finally {
      setIsExecutingCheckin(false);
      setTimeout(() => {
        processingGuestIdsRef.current.delete(guest.id);
      }, 2000);
    }
  };

  // Parse simulated QR Code scanner input
  const handleQrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    await processScannedCode(qrInput.trim());
    setQrInput('');
  };

  const handleRemoveCheckin = async (checkinId: string, guestId: string) => {
    if (!confirm('Deseja anular este registo de entrada?')) return;
    if (!currentEvent) return;

    // Optimistically update checkins state immediately so table and counters update with zero latency
    setCheckins((prev) => prev.filter((ci) => ci.id !== checkinId));
    setAlertMessage(null);

    try {
      await PortariaRepository.revertSingleCheckin(checkinId, guestId, currentEvent.id);
      loadData();
    } catch (err) {
      console.error(err);
      setAlertMessage({ type: 'error', text: 'Erro ao remover registo de entrada.' });
    }
  };

  // Filters for quick manual search (show guests who still have remaining slots!)
  const filteredGuests = guests.filter((g) => {
    const isSeated = g.name.toLowerCase().includes(searchTerm.toLowerCase());
    const stats = getGuestCheckinStats(g, checkins);
    const s = g.status?.toLowerCase() || '';
    const isConfirmed = s === 'confirmed' || s === 'confirmado' || s === 'sim' || s === 'yes';
    return isSeated && !stats.isFullyCheckedIn && isConfirmed;
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
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" /> Leitor de Convites & Crachás de Staff
              </CardTitle>
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
                  <p className="text-[11px] text-foreground/50 max-w-[220px] mt-1">
                    Clique neste cartão para abrir a câmara e ler o código QR do convite ou do crachá de staff.
                  </p>
                </div>
              )}

              {/* QR Code form */}
              <form onSubmit={handleQrSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Introduza o código do Convite ou Crachá de Staff..."
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
                  filteredGuests.map((guest) => {
                    const stats = getGuestCheckinStats(guest, checkins);
                    return (
                      <div
                        key={guest.id}
                        className={`flex items-center justify-between p-2.5 border rounded-lg transition-all text-xs ${
                          stats.isPartiallyCheckedIn
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'border-border-custom/50 bg-background hover:bg-secondary/15'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground/90">{guest.name}</span>
                            {stats.isPartiallyCheckedIn && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                Parcial ({stats.totalEntered}/{stats.maxAllowed})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-foreground/45 font-medium block">
                            +{guest.companions} acomp. ({stats.maxAllowed} pax)
                            {stats.isPartiallyCheckedIn && (
                              <span className="ml-1 text-amber-600 dark:text-amber-400 font-semibold">
                                • Resta {stats.remainingSlots} vaga
                              </span>
                            )}
                          </span>
                        </div>
                        {stats.isPartiallyCheckedIn ? (
                          <Button
                            size="sm"
                            className="text-[11px] py-1 px-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold shrink-0 flex items-center gap-1 shadow-sm"
                            onClick={() => handleCheckin(guest)}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>+ Entrada ({stats.remainingSlots})</span>
                          </Button>
                        ) : (
                          <Button size="sm" className="text-[11px] py-1 px-3 shrink-0" onClick={() => handleCheckin(guest)}>
                            Dar Entrada
                          </Button>
                        )}
                      </div>
                    );
                  })
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
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border-custom">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-primary" /> Histórico de Entradas
              </CardTitle>

              {/* Sub-tabs: Convidados vs Staff */}
              <div className="flex items-center gap-1.5 p-1 bg-secondary/20 rounded-xl border border-border-custom text-xs">
                <button
                  type="button"
                  onClick={() => setHistoryTab('guests')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    historyTab === 'guests'
                      ? 'bg-card-bg text-primary shadow-sm'
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    Convidados ({checkins.length} check-ins • {checkins.reduce((s, c) => s + (Number(c.checked_count) || 1), 0)} pax)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab('staff')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    historyTab === 'staff'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  <IdCard className="h-3.5 w-3.5" />
                  <span>Staff ({staffCheckins.length}/{staffPasses.length})</span>
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex h-20 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : historyTab === 'guests' ? (
                checkins.length > 0 ? (
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
                            <td className="p-3 font-medium">
                              <div>{ci.guest?.name || 'Convidado'}</div>
                              <span className="text-[10px] font-bold text-primary">
                                {ci.checked_count && ci.checked_count > 1 ? `${ci.checked_count} pax` : '1 pax'}
                              </span>
                            </td>
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
                                onClick={() => handleRemoveCheckin(ci.id, ci.guest_id)}
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
                    Nenhum check-in de convidado efetuado hoje.
                  </div>
                )
              ) : (
                /* Staff Checkins Table */
                staffCheckins.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-border-custom">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-primary/10 text-primary font-semibold border-b border-border-custom">
                          <th className="p-3">Função / Cargo</th>
                          <th className="p-3">Empresa & Titular</th>
                          <th className="p-3">Hora Entrada</th>
                          <th className="p-3">Posto</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-custom">
                        {staffCheckins.map((sc) => (
                          <tr key={sc.id} className="hover:bg-secondary/15 transition-colors">
                            <td className="p-3 font-bold text-foreground">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                <span>{sc.role_title}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-foreground/90">{sc.company_name}</div>
                              {sc.holder_name && (
                                <div className="text-[10px] text-foreground/50">{sc.holder_name}</div>
                              )}
                            </td>
                            <td className="p-3">
                              {new Date(sc.checked_at).toLocaleTimeString('pt-PT', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 font-bold text-primary">
                                {sc.operator || 'Portaria'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleRemoveStaffCheckin(sc.pass_id)}
                                className="p-1 rounded-lg text-foreground/50 hover:bg-error/10 hover:text-error transition-colors cursor-pointer"
                                title="Anular Entrada de Staff"
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
                    Nenhum elemento da equipa de serviço / staff deu entrada ainda.
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL DE GESTÃO DE ENTRADA PARCIAL / VAGAS POR CONVITE */}
      {partialModalGuest && (() => {
        const modalStats = getGuestCheckinStats(partialModalGuest, checkins);
        const isCompanionArrival = modalStats.totalEntered > 0 && modalStats.remainingSlots > 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-card-bg border border-border-custom rounded-2xl p-6 shadow-2xl space-y-5 text-left relative overflow-hidden">
              {/* Header Accent Bar */}
              <div
                className={`absolute top-0 inset-x-0 h-1.5 ${
                  isCompanionArrival
                    ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                    : 'bg-gradient-to-r from-primary to-primary/60'
                }`}
              />

              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isCompanionArrival
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-primary/10 text-primary border border-primary/20'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    {isCompanionArrival ? 'Chegada de Acompanhante' : 'Controlo de Vagas do Convite'}
                  </span>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">
                    {partialModalGuest.name}
                  </h3>
                  <p className="text-xs text-foreground/60">
                    Total autorizado: <strong className="text-foreground">{modalStats.maxAllowed} pessoas</strong> ({1} titular + {partialModalGuest.companions} acomp.)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPartialModalGuest(null)}
                  className="p-1.5 rounded-lg text-foreground/50 hover:bg-secondary/40 hover:text-foreground transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scenario 1: Companion Arrival */}
              {isCompanionArrival ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                      <CheckCircle className="h-4 w-4" />
                      <span>Entrada Anterior Registada</span>
                    </div>
                    <p className="text-foreground/80 leading-relaxed">
                      Já entrou <strong>{modalStats.totalEntered} pessoa(s)</strong> deste convite
                      {modalStats.entries[0] && (
                        <>
                          {' '}às{' '}
                          <strong>
                            {new Date(modalStats.entries[0].checked_at).toLocaleTimeString('pt-PT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </strong>{' '}
                          por <strong>{modalStats.entries[0].operator || 'Portaria'}</strong>
                        </>
                      )}.
                    </p>
                    <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300 border-t border-amber-500/20">
                      <span>Vagas restantes agora:</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 font-black">
                        {modalStats.remainingSlots} {modalStats.remainingSlots === 1 ? 'vaga restante' : 'vagas restantes'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/70 leading-relaxed">
                    O acompanhante que chegou agora está a apresentar o mesmo código QR para ocupar a vaga restante. Confirma a sua entrada?
                  </p>

                  <div className="space-y-2 pt-1">
                    <Button
                      disabled={isExecutingCheckin}
                      onClick={() => handleCheckin(partialModalGuest, modalStats.remainingSlots)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2"
                    >
                      {isExecutingCheckin ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      <span>
                        Confirmar Entrada do Acompanhante ({modalStats.remainingSlots === 1 ? 'Última vaga' : modalStats.remainingSlots + ' vagas'})
                      </span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPartialModalGuest(null)}
                      className="w-full text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                /* Scenario 2: First arrival of a multi-guest invitation */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-secondary/15 border border-border-custom space-y-1 text-xs">
                    <p className="text-foreground/90 font-medium">
                      Este convite dá acesso a <strong>{modalStats.maxAllowed} pessoas</strong>.
                    </p>
                    <p className="text-foreground/60 text-[11px] leading-relaxed">
                      Se os convidados não chegaram juntos, registe apenas 1 pessoa. A outra vaga ficará guardada para quando o parceiro chegar.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {/* Option A: Only 1 Person */}
                    <div
                      onClick={() => !isExecutingCheckin && handleCheckin(partialModalGuest, 1)}
                      className="p-3.5 rounded-xl border-2 border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/15 text-primary group-hover:scale-105 transition-transform">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground flex items-center gap-2">
                            <span>👤 Só 1 Pessoa Chegou</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                              Recomendado
                            </span>
                          </p>
                          <p className="text-[11px] text-foreground/60 mt-0.5">
                            Regista 1 entrada. Guarda {modalStats.maxAllowed - 1} vaga para chegada posterior.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                    </div>

                    {/* Option B: All People Together */}
                    <div
                      onClick={() => !isExecutingCheckin && handleCheckin(partialModalGuest, modalStats.maxAllowed)}
                      className="p-3.5 rounded-xl border border-border-custom hover:border-emerald-500/60 bg-secondary/10 hover:bg-emerald-500/10 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            👥 Entram Todos ({modalStats.maxAllowed} Pessoas)
                          </p>
                          <p className="text-[11px] text-foreground/60 mt-0.5">
                            Todos os convidados chegaram juntos agora.
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-emerald-500 shrink-0" />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPartialModalGuest(null)}
                      className="w-full text-xs mt-2"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
