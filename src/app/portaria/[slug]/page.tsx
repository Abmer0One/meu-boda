'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import { PortariaRepository } from '@/repositories/portaria.repository';
import { EventRepository } from '@/repositories/event.repository';
import { TableRepository } from '@/repositories/table.repository';
import { Event, Guest, CheckIn, PortariaConfig, Table } from '@/types';
import confetti from 'canvas-confetti';
import {
  QrCode,
  Users,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Trash2,
  Camera,
  KeyRound,
  LogOut,
  UserCheck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  UtensilsCrossed,
} from 'lucide-react';

interface PortariaPageProps {
  params: Promise<{ slug: string }>;
}

// Synthesize pleasant, instant feedback audio chimes using Web Audio API
const playFeedbackSound = (type: 'success' | 'warning' | 'error') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'warning') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.setValueAtTime(349.23, ctx.currentTime + 0.15); // F4
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Non-fatal if browser audio policy blocks autoplay
  }
};

function PortariaContent({ slug }: { slug: string }) {
  // Auth & Event state
  const [event, setEvent] = useState<Event | null>(null);
  const [config, setConfig] = useState<PortariaConfig | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeOperator, setActiveOperator] = useState('Portão Principal');
  const [isCustomOperator, setIsCustomOperator] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Portaria Data state
  const [guests, setGuests] = useState<Guest[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Scanning & Search UI state
  const [activeTab, setActiveTab] = useState<'scanner' | 'search' | 'history'>('scanner');
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualQrInput, setManualQrInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    guest?: Guest;
    table?: Table;
    previousCheckin?: CheckIn;
  } | null>(null);

  // Load event details & portaria config on mount so the PIN screen has the event title & operator stations
  useEffect(() => {
    EventRepository.getBySlug(slug).then(async (evt) => {
      if (evt) {
        setEvent(evt);
        const cfg = await PortariaRepository.getConfig(evt.id);
        if (cfg) {
          setConfig(cfg);
          if (cfg.operators && cfg.operators.length > 0) {
            setActiveOperator(cfg.operators[0]);
          }
        }
      }
    });
  }, [slug]);

  // Handle Authentication with PIN
  const handleAuthenticate = async (pinOrTokenToVerify?: string, opName?: string) => {
    const code = (pinOrTokenToVerify || pinInput).trim();
    if (!code) {
      setAuthError('Por favor, introduza o código PIN de acesso.');
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      const res = await PortariaRepository.validateAccess(slug, code);
      if (!res.valid || !res.event || !res.config) {
        setAuthError(res.error || 'Código PIN incorreto.');
        setIsAuthenticated(false);
        return;
      }

      setEvent(res.event);
      setConfig(res.config);
      setIsAuthenticated(true);
      const chosenOp = opName || activeOperator || res.config.operators?.[0] || 'Portão Principal';
      setActiveOperator(chosenOp);

      // Persist in session
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          `portaria_session_${slug}`,
          JSON.stringify({
            authenticated: true,
            pin: code,
            operator: chosenOp,
          })
        );
      }

      // Load event guests & tables
      loadEventData(res.event.id);
    } catch (err: any) {
      setAuthError('Erro ao validar acesso: ' + (err.message || 'Falha de ligação'));
    } finally {
      setIsVerifying(false);
    }
  };

  // Load guest list, checkins and tables
  const loadEventData = async (eventId: string) => {
    setLoadingData(true);
    try {
      const [g, ci, t] = await Promise.all([
        PortariaRepository.getGuests(eventId),
        PortariaRepository.getCheckins(eventId),
        TableRepository.getAll(eventId),
      ]);
      setGuests(g);
      setCheckins(ci);
      setTables(t);
    } catch (err) {
      console.error('Erro ao carregar dados da portaria:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Logout / Switch Operator
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`portaria_session_${slug}`);
    }
    setIsAuthenticated(false);
    setIsScanning(false);
    setScanResult(null);
    setPinInput('');
  };

  // Perform Check-in
  const handleProcessCheckin = async (guest: Guest) => {
    if (!event) return;

    // Check if already checked in
    const existingCi = checkins.find((ci) => ci.guest_id === guest.id);
    if (existingCi) {
      playFeedbackSound('warning');
      const table = tables.find((t) => t.id === guest.table_id);
      setScanResult({
        type: 'warning',
        title: 'Entrada Já Registada!',
        message: `O convidado '${guest.name}' já efetuou a entrada anteriormente.`,
        guest,
        table,
        previousCheckin: existingCi,
      });
      return;
    }

    try {
      const newCi = await PortariaRepository.performCheckin(guest.id, activeOperator);
      if (newCi) {
        playFeedbackSound('success');
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#10B981', '#ffffff', '#E86C64'],
        });

        const table = tables.find((t) => t.id === guest.table_id);
        setScanResult({
          type: 'success',
          title: 'Entrada Autorizada!',
          message: `Bem-vindo(a), ${guest.name}! Acesso validado com sucesso.`,
          guest,
          table,
        });

        // Refresh data
        loadEventData(event.id);
      }
    } catch (err) {
      playFeedbackSound('error');
      setScanResult({
        type: 'error',
        title: 'Erro ao Registar Entrada',
        message: 'Ocorreu um erro no servidor ao tentar registar a entrada.',
      });
    }
  };

  // Handle successful camera QR scan
  const handleScanSuccess = async (decodedText: string) => {
    let token = decodedText.trim();
    try {
      if (token.startsWith('{') && token.endsWith('}')) {
        const parsed = JSON.parse(token);
        if (parsed.token) {
          token = parsed.token;
        }
      }
    } catch (e) {}

    const matchedGuest = guests.find((g) => g.qr_token === token);
    if (matchedGuest) {
      await handleProcessCheckin(matchedGuest);
    } else {
      playFeedbackSound('error');
      setScanResult({
        type: 'error',
        title: 'QR Code Não Reconhecido',
        message: 'Este código QR não pertence à lista oficial de convidados deste evento.',
      });
    }
  };

  // Setup camera QR scanner
  useEffect(() => {
    if (!isScanning || !isAuthenticated) return;

    let html5QrCode: any;

    import('html5-qrcode')
      .then(({ Html5Qrcode }) => {
        html5QrCode = new Html5Qrcode('portaria-reader');
        html5QrCode
          .start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            async (decodedText: string) => {
              await handleScanSuccess(decodedText);
            },
            () => {}
          )
          .catch((err: any) => {
            console.error('Camera access failed:', err);
            setIsScanning(false);
            setScanResult({
              type: 'error',
              title: 'Erro de Câmara',
              message: 'Não foi possível aceder à câmara do telemóvel. Verifique as permissões do seu navegador.',
            });
          });
      })
      .catch((err: any) => {
        console.error('Failed to load html5-qrcode:', err);
        setIsScanning(false);
      });

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode
          .stop()
          .then(() => html5QrCode.clear())
          .catch((err: any) => console.error('Error stopping scanner:', err));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning, isAuthenticated, guests]);

  // Handle Manual QR Input Submit (for external handheld barcode scanners)
  const handleManualQrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQrInput.trim()) return;
    await handleScanSuccess(manualQrInput.trim());
    setManualQrInput('');
  };

  // Revert a Check-in
  const handleRevert = async (guestId: string) => {
    if (!confirm('Deseja anular o registo de entrada deste convidado?')) return;
    if (!event) return;
    await PortariaRepository.revertCheckin(guestId);
    setScanResult(null);
    loadEventData(event.id);
  };

  // Filter guests for search
  const filteredGuests = guests.filter((g) => {
    const match = g.name.toLowerCase().includes(searchTerm.toLowerCase());
    return match;
  });

  const checkedInCount = checkins.length;
  const totalGuests = guests.length;
  const pendingCount = Math.max(0, totalGuests - checkedInCount);

  const availableOperators =
    config?.operators && config.operators.length > 0
      ? config.operators
      : ['Portão Principal', 'Entrada VIP', 'Protocolo 1', 'Protocolo 2'];

  // -------------------------------------------------------------
  // ECRÃ 1: AUTENTICAÇÃO COM CÓDIGO PIN (QUANDO NÃO AUTENTICADO)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0F0E17] text-white flex flex-col justify-between p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full mx-auto my-auto space-y-6 animate-in fade-in">
          {/* Logo & Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8A7348] text-black shadow-xl shadow-[#D4AF37]/20 mb-2">
              <QrCode className="h-9 w-9 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Meu Boda</h1>
            <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold">
              Portaria & Controlo de Acesso
            </p>
            {event?.title ? (
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs font-bold text-[#D4AF37]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{event.title}</span>
                </span>
              </div>
            ) : (
              <div className="pt-1">
                <span className="inline-block px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-[11px] text-zinc-400 font-mono">
                  /{slug}
                </span>
              </div>
            )}
          </div>

          {/* Login Card */}
          <div className="bg-[#1A1926] border border-[#2D2A3E] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-white">Introduza o PIN da Portaria</h2>
              <p className="text-xs text-zinc-400">
                Solicite o código PIN de 6 dígitos ao organizador do evento para aceder ao leitor de convites.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAuthenticate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 text-center">
                  Código PIN de Acesso
                </label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="••••••"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setAuthError(null);
                    }}
                    autoFocus
                    className="w-full bg-[#0F0E17] border-2 border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-2xl py-3 px-4 text-center font-mono font-bold text-2xl tracking-[0.3em] text-[#D4AF37] focus:outline-none transition-all placeholder:text-zinc-600"
                  />
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 text-center">
                  Posto de Leitura / Nome do Operador
                </label>
                <div className="space-y-2">
                  <select
                    value={isCustomOperator ? '__custom__' : activeOperator}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomOperator(true);
                        setActiveOperator('');
                      } else {
                        setIsCustomOperator(false);
                        setActiveOperator(e.target.value);
                      }
                    }}
                    className="w-full bg-[#0F0E17] border border-[#2D2A3E] focus:border-[#D4AF37] rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none transition-all cursor-pointer text-center"
                  >
                    {availableOperators.map((op) => (
                      <option key={op} value={op} className="bg-[#1A1926] text-white">
                        {op}
                      </option>
                    ))}
                    <option value="__custom__" className="bg-[#1A1926] text-white">
                      ✍️ Outro Posto / Nome personalizado...
                    </option>
                  </select>

                  {isCustomOperator && (
                    <input
                      type="text"
                      placeholder="Ex: Portão Traseiro, Sala VIP..."
                      value={activeOperator}
                      onChange={(e) => setActiveOperator(e.target.value)}
                      autoFocus
                      className="w-full bg-[#0F0E17] border border-[#D4AF37]/60 focus:border-[#D4AF37] rounded-xl py-2 px-3 text-xs text-center text-white focus:outline-none transition-all placeholder:text-zinc-600 animate-in fade-in"
                    />
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying || !pinInput.trim()}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89742] hover:brightness-110 active:scale-[0.99] text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#D4AF37]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>A verificar código...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar na Portaria</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center text-[11px] text-zinc-500">
            Acesso reservado exclusivamente à equipa de receção e protocolo.
          </div>
        </div>

        <footer className="text-center text-[10px] text-zinc-600 py-2">
          Meu Boda • Tecnologia para Eventos de Luxo
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ECRÃ 2: PORTARIA ATIVA (AUTENTICADO COM SUCESSO)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0F0E17] text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#1A1926]/95 backdrop-blur-md border-b border-[#2D2A3E] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8A7348] text-black flex items-center justify-center shrink-0 shadow-md">
              <QrCode className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                {event?.title || 'Portaria do Evento'}
              </h2>
              <div className="flex items-center gap-1 text-[10px] text-[#D4AF37] font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activeOperator}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors cursor-pointer shrink-0"
            title="Sair da Portaria"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4">
        {/* Metric Cards Bar */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#1A1926] border border-[#2D2A3E] p-2.5 rounded-2xl">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Total</p>
            <p className="text-lg font-black text-white">{totalGuests}</p>
          </div>
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded-2xl">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Presentes</p>
            <p className="text-lg font-black text-emerald-400">{checkedInCount}</p>
          </div>
          <div className="bg-[#1A1926] border border-[#2D2A3E] p-2.5 rounded-2xl">
            <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">Por Chegar</p>
            <p className="text-lg font-black text-amber-400">{pendingCount}</p>
          </div>
        </div>

        {/* Scan Result Feedback Card (Dynamic Alert) */}
        {scanResult && (
          <div
            className={`p-4 rounded-2xl border-2 transition-all shadow-xl animate-in zoom-in-95 ${
              scanResult.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                : scanResult.type === 'warning'
                ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                : 'bg-red-950/40 border-red-500 text-red-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {scanResult.type === 'success' ? (
                  <CheckCircle className="h-7 w-7 text-emerald-400 shrink-0 mt-0.5" />
                ) : scanResult.type === 'warning' ? (
                  <AlertTriangle className="h-7 w-7 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-7 w-7 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">{scanResult.title}</h3>
                  <p className="text-xs opacity-90 leading-relaxed">{scanResult.message}</p>

                  {/* Guest Detailed Card on Successful/Duplicate Scan */}
                  {scanResult.guest && (
                    <div className="mt-2 p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-sm">{scanResult.guest.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-white">
                          +{scanResult.guest.companions} acomp. (Total: {1 + scanResult.guest.companions} pax)
                        </span>
                      </div>

                      {scanResult.table && (
                        <div className="flex items-center gap-1.5 text-[#D4AF37] font-semibold text-[11px] pt-0.5">
                          <UtensilsCrossed className="h-3.5 w-3.5" />
                          <span>Mesa: {scanResult.table.name}</span>
                        </div>
                      )}

                      {scanResult.guest.family_group && (
                        <p className="text-[10px] text-zinc-400">
                          Grupo: {scanResult.guest.family_group}
                        </p>
                      )}

                      {scanResult.previousCheckin && (
                        <div className="text-[10px] text-amber-300/90 pt-1 border-t border-white/10 mt-1">
                          Entrada anterior às{' '}
                          {new Date(scanResult.previousCheckin.checked_at).toLocaleTimeString('pt-PT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          por <strong>{scanResult.previousCheckin.operator || 'Portaria'}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setScanResult(null)}
                className="text-white/60 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex p-1 bg-[#1A1926] rounded-2xl border border-[#2D2A3E]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('scanner');
              setIsScanning(true);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#B89742] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>Câmara QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('search');
              setIsScanning(false);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'search'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#B89742] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Pesquisar Nome</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              setIsScanning(false);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#B89742] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Entradas ({checkins.length})</span>
          </button>
        </div>

        {/* TAB 1: CÂMARA QR CODE SCANNER */}
        {activeTab === 'scanner' && (
          <div className="bg-[#1A1926] border border-[#2D2A3E] rounded-3xl p-5 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-white">Leitor de QR Code em Tempo Real</h3>
              <p className="text-xs text-zinc-400">
                Aponte a câmara do telemóvel diretamente para o código QR do convite do convidado.
              </p>
            </div>

            {/* Video Scanner Container */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-sm mx-auto w-full border-2 border-[#D4AF37]/30 flex flex-col items-center justify-center shadow-inner">
              {isScanning ? (
                <>
                  <div id="portaria-reader" className="w-full h-full" />
                  {/* Targeting Laser Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-[#D4AF37] border-dashed rounded-2xl relative overflow-hidden">
                      <div className="absolute top-0 inset-x-0 h-1 bg-[#D4AF37] animate-[bounce_2s_infinite] shadow-[0_0_10px_#D4AF37]" />
                    </div>
                  </div>
                </>
              ) : (
                <div
                  onClick={() => setIsScanning(true)}
                  className="p-8 flex flex-col items-center justify-center text-center cursor-pointer group w-full h-full hover:bg-white/5 transition-colors"
                >
                  <Camera className="h-16 w-16 text-[#D4AF37] group-hover:scale-110 transition-transform mb-3" />
                  <p className="text-sm font-bold text-white">Toque para Ativar a Câmara</p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Abrirá o scanner contínuo com câmara traseira
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              {isScanning ? (
                <button
                  type="button"
                  onClick={() => setIsScanning(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
                >
                  Pausar Câmara
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsScanning(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#B89742] text-black text-xs font-bold transition-all shadow-md"
                >
                  Ativar Câmara
                </button>
              )}
            </div>

            {/* Manual token input fallback (for testing or handheld laser scanners) */}
            <form onSubmit={handleManualQrSubmit} className="pt-2 border-t border-[#2D2A3E] flex gap-2">
              <input
                type="text"
                placeholder="Introduzir código QR manualmente..."
                value={manualQrInput}
                onChange={(e) => setManualQrInput(e.target.value)}
                className="flex-1 bg-[#0F0E17] border border-[#2D2A3E] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
              >
                Validar
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: PESQUISA MANUAL DE CONVIDADOS */}
        {activeTab === 'search' && (
          <div className="bg-[#1A1926] border border-[#2D2A3E] rounded-3xl p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Pesquisa Manual de Convidados</h3>
              <p className="text-xs text-zinc-400">
                Se o convidado não tiver o convite ou ficou sem bateria, procure pelo nome abaixo.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Digitar nome do convidado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0F0E17] border border-[#2D2A3E] focus:border-[#D4AF37] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                autoFocus
              />
            </div>

            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
              {loadingData ? (
                <div className="py-10 text-center text-zinc-500 text-xs">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#D4AF37] mb-2" />
                  A carregar convidados...
                </div>
              ) : filteredGuests.length > 0 ? (
                filteredGuests.map((guest) => {
                  const isChecked = checkins.some((ci) => ci.guest_id === guest.id);
                  const table = tables.find((t) => t.id === guest.table_id);

                  return (
                    <div
                      key={guest.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-[#0F0E17] border-[#2D2A3E] hover:border-[#D4AF37]/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">{guest.name}</p>
                          {isChecked && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                              Presente
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span>+{guest.companions} acomp. ({1 + guest.companions} pax)</span>
                          {table && (
                            <>
                              <span>•</span>
                              <span className="text-[#D4AF37] font-medium truncate">{table.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {isChecked ? (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 shrink-0">
                          <CheckCircle className="h-4 w-4" /> Entrou
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleProcessCheckin(guest)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89742] text-black font-bold text-xs shrink-0 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow"
                        >
                          Dar Entrada
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-zinc-500 text-xs italic">
                  Nenhum convidado encontrado com esse nome.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: HISTÓRICO DE ENTRADAS REGISTADAS */}
        {activeTab === 'history' && (
          <div className="bg-[#1A1926] border border-[#2D2A3E] rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Histórico de Entradas ({checkins.length})</h3>
                <p className="text-xs text-zinc-400">Lista dos convidados com entrada confirmada.</p>
              </div>
              <button
                type="button"
                onClick={() => event && loadEventData(event.id)}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Atualizar lista"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {checkins.length > 0 ? (
                checkins.map((ci) => {
                  const guest = guests.find((g) => g.id === ci.guest_id);
                  const table = guest ? tables.find((t) => t.id === guest.table_id) : null;

                  return (
                    <div
                      key={ci.id}
                      className="p-3 rounded-xl bg-[#0F0E17] border border-[#2D2A3E] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{guest?.name || 'Convidado'}</p>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                          <span className="text-emerald-400 font-semibold">
                            {new Date(ci.checked_at).toLocaleTimeString('pt-PT', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span className="text-zinc-500">{ci.operator || 'Portaria'}</span>
                          {table && (
                            <>
                              <span>•</span>
                              <span className="text-[#D4AF37] truncate">{table.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevert(ci.guest_id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                        title="Anular Entrada"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-zinc-500 text-xs italic">
                  Ainda não foi registada nenhuma entrada neste evento.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-[10px] text-zinc-600 py-3 border-t border-[#2D2A3E]/40">
        Meu Boda • Sistema de Portaria e Controlo de Acesso
      </footer>
    </div>
  );
}

export default function PublicPortariaPage({ params }: PortariaPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F0E17] flex items-center justify-center text-white text-xs">
          <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
        </div>
      }
    >
      <PortariaContent slug={slug} />
    </Suspense>
  );
}
