'use client';

import React, { useEffect, useState, useRef, use, Suspense } from 'react';
import { PortariaRepository } from '@/repositories/portaria.repository';
import { EventRepository } from '@/repositories/event.repository';
import { GuestRepository } from '@/repositories/guest.repository';
import { TableRepository } from '@/repositories/table.repository';
import { StaffPassRepository } from '@/repositories/staff-pass.repository';
import { getGuestCheckinStats, GuestCheckinStats } from '@/repositories/checkin.repository';
import { supabase } from '@/lib/supabase';
import { Event, Guest, CheckIn, PortariaConfig, Table, StaffPass, StaffCheckin } from '@/types';
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
  Award,
} from 'lucide-react';

import GlobalBroadcastBanner from '@/components/common/GlobalBroadcastBanner';

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
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Clear, unmistakable error buzz for invalid / already used QR code
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    // Non-fatal if browser audio policy blocks autoplay
  }
};

/**
 * Robustly parses and extracts candidate tokens, IDs and event metadata from raw QR code input
 * Supports: JSON format (PDF / convite screen), direct URLs (/convite/[token]#mapas), plain tokens, UUIDs
 */
function extractScanPayload(rawText: string): {
  tokenCandidate?: string;
  guestIdCandidate?: string;
  eventIdCandidate?: string;
  isStaffCandidate?: boolean;
  staffPayload?: any;
} {
  const text = (rawText || '').trim();
  if (!text) return {};

  // 1. Check for JSON inside the scanned string
  let parsedJson: any = null;
  if (text.includes('{') && text.includes('}')) {
    try {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (lastBrace > firstBrace) {
        const jsonSub = text.substring(firstBrace, lastBrace + 1);
        parsedJson = JSON.parse(jsonSub);
      }
    } catch (e) {}
  }

  if (parsedJson && typeof parsedJson === 'object') {
    const isStaff =
      Boolean(parsedJson.staffPassId) ||
      Boolean(parsedJson.role) ||
      Boolean(parsedJson.role_title) ||
      (parsedJson.token && String(parsedJson.token).toLowerCase().includes('stf_')) ||
      text.toLowerCase().includes('staff') ||
      text.toLowerCase().includes('stf_');

    return {
      tokenCandidate: parsedJson.token || parsedJson.qr_token || parsedJson.qrToken || parsedJson.staffPassId || parsedJson.id,
      guestIdCandidate: parsedJson.guestId || parsedJson.guest_id || parsedJson.id,
      eventIdCandidate: parsedJson.eventId || parsedJson.event_id,
      isStaffCandidate: isStaff,
      staffPayload: parsedJson,
    };
  }

  // 2. Check for URL structure like /convite/TOKEN or /convite/TOKEN#mapas
  const urlMatch = text.match(/\/convite\/([a-zA-Z0-9_\-]+)/i);
  if (urlMatch && urlMatch[1]) {
    return {
      tokenCandidate: urlMatch[1],
      guestIdCandidate: urlMatch[1],
    };
  }

  // 3. Check for raw staff token (starts with stf_ or pass_)
  const isStaff = text.toLowerCase().includes('stf_') || text.toLowerCase().startsWith('pass_');

  // 4. Fallback: treat the clean string itself as token candidate and guestId candidate
  return {
    tokenCandidate: text,
    guestIdCandidate: text,
    isStaffCandidate: isStaff,
  };
}

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
  const [staffPasses, setStaffPasses] = useState<StaffPass[]>([]);
  const [staffCheckins, setStaffCheckins] = useState<StaffCheckin[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'guests' | 'staff'>('guests');
  const [loadingData, setLoadingData] = useState(false);

  // Scanning & Search UI state
  const [activeTab, setActiveTab] = useState<'scanner' | 'search' | 'history'>('scanner');
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualQrInput, setManualQrInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'warning' | 'error' | 'staff' | 'partial';
    title: string;
    message: string;
    guest?: Guest;
    table?: Table;
    previousCheckin?: CheckIn;
    allPreviousCheckins?: CheckIn[];
    staffPass?: StaffPass;
    previousStaffCheckin?: StaffCheckin;
    checkedCount?: number;
    remainingSlots?: number;
  } | null>(null);

  // Partial checkin modal state
  const [partialModalGuest, setPartialModalGuest] = useState<Guest | null>(null);
  const [isExecutingCheckin, setIsExecutingCheckin] = useState(false);

  // High-visibility green/red/blue visual alert state
  const [scanVisualAlert, setScanVisualAlert] = useState<'success' | 'error' | 'staff' | null>(null);
  const visualAlertTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerVisualAlert = (type: 'success' | 'error' | 'staff') => {
    setScanVisualAlert(type);
    if (visualAlertTimerRef.current) {
      clearTimeout(visualAlertTimerRef.current);
    }
    visualAlertTimerRef.current = setTimeout(() => {
      setScanVisualAlert(null);
    }, 4500);
  };

  // Prevent duplicate rapid processing in scanner & UI
  const isScanningBusyRef = useRef(false);
  const lastScannedTokenRef = useRef<string | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const processingGuestIdsRef = useRef<Set<string>>(new Set());

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

  // Load guest list, checkins, tables, and staff credentials
  const loadEventData = async (eventId: string) => {
    setLoadingData(true);
    try {
      const [g, ci, t, sp, sc] = await Promise.all([
        PortariaRepository.getGuests(eventId),
        PortariaRepository.getCheckins(eventId),
        TableRepository.getAll(eventId),
        StaffPassRepository.getAll(eventId),
        StaffPassRepository.getCheckins(eventId),
      ]);
      setGuests(g);
      setCheckins(ci);
      setTables(t);
      setStaffPasses(sp);
      setStaffCheckins(sc);
    } catch (err) {
      console.error('Erro ao carregar dados da portaria:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Realtime synchronization for checkins and deletions across stations (Guests & Staff)
  useEffect(() => {
    if (!event?.id) return;

    const streamChannel = supabase
      .channel('portaria-live-stream')
      .on('broadcast', { event: 'new-checkin' }, (payload) => {
        const p = payload?.payload;
        if (!p) return;
        if (!p.event_id || p.event_id === event.id) {
          setCheckins((prev) => {
            if (p.id && prev.some((c) => c.id === p.id)) return prev;
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
        if (!p.event_id || p.event_id === event.id) {
          setCheckins((prev) => {
            if (p.id && !p.all) {
              return prev.filter((c) => c.id !== p.id);
            }
            return prev.filter((c) => c.guest_id !== p.guest_id);
          });
          if (typeof window !== 'undefined') {
            try {
              const cacheKey = `portaria_checkins_cache_${event.id}`;
              const raw = localStorage.getItem(cacheKey);
              if (raw) {
                const list: CheckIn[] = JSON.parse(raw);
                const updated = p.id && !p.all
                  ? list.filter((x) => x.id !== p.id)
                  : list.filter((x) => x.guest_id !== p.guest_id);
                localStorage.setItem(cacheKey, JSON.stringify(updated));
              }
            } catch {}
          }
        }
      })
      .on('broadcast', { event: 'staff-checkin' }, (payload) => {
        const p = payload?.payload as StaffCheckin | undefined;
        if (!p) return;
        if (!p.event_id || p.event_id === event.id) {
          setStaffCheckins((prev) => {
            if (prev.some((c) => c.pass_id === p.pass_id)) return prev;
            return [p, ...prev];
          });
        }
      })
      .on('broadcast', { event: 'delete-staff-checkin' }, (payload) => {
        const p = payload?.payload;
        if (!p) return;
        if (!p.event_id || p.event_id === event.id) {
          setStaffCheckins((prev) => prev.filter((c) => c.pass_id !== (p.pass_id || p.staff_pass_id)));
        }
      })
      .subscribe();

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === `portaria_checkins_cache_${event.id}` ||
        e.key === 'meuboda_live_checkins_cache' ||
        e.key === `portaria_staff_checkins_cache_${event.id}` ||
        e.key === `portaria_staff_passes_cache_${event.id}`
      ) {
        loadEventData(event.id);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      try {
        supabase.removeChannel(streamChannel);
      } catch {}
      window.removeEventListener('storage', handleStorage);
    };
  }, [event?.id]);

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

  // Perform Check-in (supports single instant entry or partial entry for multi-person invitations)
  const handleProcessCheckin = async (guest: Guest, countOverride?: number) => {
    if (!event) return;

    const stats = getGuestCheckinStats(guest, checkins);

    // 1. If invitation is fully exhausted (all allowed entries are in)
    if (stats.isFullyCheckedIn) {
      playFeedbackSound('error');
      triggerVisualAlert('error');
      const table = tables.find((t) => t.id === guest.table_id);
      setScanResult({
        type: 'error',
        title: 'CONVITE TOTALMENTE ESGOTADO!',
        message: `Todas as ${stats.maxAllowed} vagas autorizadas para o convite de '${guest.name}' já deram entrada no evento.`,
        guest,
        table,
        previousCheckin: stats.entries[stats.entries.length - 1],
        allPreviousCheckins: stats.entries,
      });
      return;
    }

    // 2. If invitation has companions and operator hasn't selected the quantity yet, open the partial modal
    if (guest.companions > 0 && countOverride === undefined) {
      setIsScanning(false);
      setPartialModalGuest(guest);
      return;
    }

    // 3. Determine quantity to admit (default to 1 or countOverride, capped by remaining slots)
    const countToEnter = countOverride !== undefined
      ? Math.min(countOverride, stats.remainingSlots)
      : Math.min(1, stats.remainingSlots);

    if (countToEnter <= 0) return;

    // Mutex: Check if check-in is already in-flight for this guest
    if (processingGuestIdsRef.current.has(guest.id)) {
      return;
    }
    processingGuestIdsRef.current.add(guest.id);
    setIsExecutingCheckin(true);

    try {
      const newCi = await PortariaRepository.performCheckin(guest.id, activeOperator, {
        guestName: guest.name,
        companions: guest.companions,
        eventId: event.id,
        eventTitle: event.title,
        checked_count: countToEnter,
      });

      if (newCi) {
        // Optimistically add to local checkins state so "Presentes" count increments IMMEDIATELY!
        setCheckins((prev) => [newCi, ...prev]);

        const updatedTotalEntered = stats.totalEntered + countToEnter;
        const newRemaining = Math.max(0, stats.maxAllowed - updatedTotalEntered);
        const isComplete = newRemaining === 0;

        playFeedbackSound('success');
        triggerVisualAlert('success');
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#D4AF37', '#ffffff'],
        });

        const table = tables.find((t) => t.id === guest.table_id);
        setScanResult({
          type: isComplete ? 'success' : 'partial',
          title: isComplete
            ? (stats.maxAllowed > 1 ? `ENTRADA COMPLETA (${stats.maxAllowed} de ${stats.maxAllowed})!` : 'ENTRADA AUTORIZADA!')
            : `ENTRADA PARCIAL REGISTADA (${updatedTotalEntered} de ${stats.maxAllowed})!`,
          message: isComplete
            ? (stats.maxAllowed > 1
                ? `Todas as ${stats.maxAllowed} vagas do convite de '${guest.name}' deram entrada.`
                : `Bem-vindo(a), ${guest.name}! Acesso validado com sucesso.`)
            : `Entrada autorizada para ${countToEnter} pessoa(s). Resta ${newRemaining} vaga guardada para quando o acompanhante chegar.`,
          guest,
          table,
          checkedCount: countToEnter,
          remainingSlots: newRemaining,
        });

        setPartialModalGuest(null);

        // Background sync to ensure all stations have latest data
        loadEventData(event.id);
      } else {
        // Returned null because it was already checked in (in DB or concurrent request)
        playFeedbackSound('error');
        triggerVisualAlert('error');
        const table = tables.find((t) => t.id === guest.table_id);
        setScanResult({
          type: 'error',
          title: 'CONVITE JÁ UTILIZADO ANTERIORMENTE!',
          message: `Não foi possível validar entrada para '${guest.name}'. As vagas deste convite já se encontram esgotadas.`,
          guest,
          table,
        });
        setPartialModalGuest(null);
        loadEventData(event.id);
      }
    } catch (err) {
      playFeedbackSound('error');
      triggerVisualAlert('error');
      setScanResult({
        type: 'error',
        title: 'ERRO AO REGISTAR ENTRADA',
        message: 'Ocorreu um erro no servidor ao tentar registar a entrada. Tente novamente.',
      });
    } finally {
      setIsExecutingCheckin(false);
      setTimeout(() => {
        processingGuestIdsRef.current.delete(guest.id);
      }, 2000);
    }
  };

  // Perform Staff Check-in
  const handleProcessStaffScan = async (tokenCandidate?: string, staffPayload?: any) => {
    if (!event) return;

    const rawToken = (tokenCandidate || staffPayload?.token || staffPayload?.qrToken || '').trim();
    const passId = (staffPayload?.staffPassId || staffPayload?.id || '').trim();

    // 1. Find staff pass in local state
    let matchedPass = staffPasses.find((sp) => {
      if (passId && sp.id === passId) return true;
      const spTok = ((sp as any).token || sp.qr_token || '').toLowerCase();
      if (rawToken && spTok === rawToken.toLowerCase()) return true;
      return false;
    });

    // 2. Fallback: query repository in case it was created recently or belongs to linked event
    if (!matchedPass && (rawToken || passId)) {
      try {
        if (rawToken) {
          matchedPass = (await StaffPassRepository.getByToken(rawToken, event.id)) || undefined;
        }
        if (!matchedPass && passId) {
          const all = await StaffPassRepository.getAll(event.id);
          matchedPass = all.find((p) => p.id === passId);
        }
        if (!matchedPass && rawToken) {
          matchedPass = (await StaffPassRepository.getByToken(rawToken)) || undefined;
        }
        if (!matchedPass && passId) {
          matchedPass = (await StaffPassRepository.getByToken(passId)) || undefined;
        }
        if (matchedPass) {
          setStaffPasses((prev) => [...prev.filter((p) => p.id !== matchedPass!.id), matchedPass!]);
        }
      } catch (e) {
        console.warn('Erro ao pesquisar credencial de staff:', e);
      }
    }

    if (!matchedPass) {
      playFeedbackSound('error');
      triggerVisualAlert('error');
      setScanResult({
        type: 'error',
        title: 'CREDENCIAL NÃO ENCONTRADA!',
        message: 'Esta credencial de serviço/staff não pertence à lista autorizada deste evento.',
      });
      return;
    }

    // 3. Check if already checked in
    const existingCheckin = staffCheckins.find((sc) => sc.pass_id === matchedPass!.id);
    if (existingCheckin) {
      playFeedbackSound('error');
      triggerVisualAlert('error');
      setScanResult({
        type: 'error',
        title: 'CREDENCIAL JÁ REGISTADA ANTERIORMENTE!',
        message: `A credencial '${matchedPass.role_title}' (${matchedPass.holder_name || matchedPass.company_name || 'Serviço'}) já efetuou entrada no evento.`,
        staffPass: matchedPass,
        previousStaffCheckin: existingCheckin,
      });
      return;
    }

    // 4. Perform check-in
    try {
      const newStaffCi = await StaffPassRepository.performCheckin(
        matchedPass,
        activeOperator
      );

      if (newStaffCi) {
        setStaffCheckins((prev) => [newStaffCi, ...prev.filter((c) => c.pass_id !== matchedPass!.id)]);
        playFeedbackSound('success');
        triggerVisualAlert('staff');
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#4F46E5', '#6366F1', '#38BDF8', '#D4AF37'],
        });

        setScanResult({
          type: 'staff',
          title: 'STAFF AUTORIZADO • ENTRADA DE SERVIÇO',
          message: `Bem-vindo(a)! Credencial autorizada para ${matchedPass.role_title} • ${matchedPass.company_name || 'Prestador de Serviço'}.`,
          staffPass: matchedPass,
        });

        loadEventData(event.id);
      }
    } catch (err) {
      playFeedbackSound('error');
      triggerVisualAlert('error');
      setScanResult({
        type: 'error',
        title: 'ERRO AO REGISTAR STAFF',
        message: 'Ocorreu uma falha ao tentar registar a entrada do prestador de serviço.',
      });
    }
  };

  // Revert a Staff Check-in
  const handleRevertStaff = async (passId: string) => {
    if (!confirm('Deseja anular o registo de entrada desta credencial de staff?')) return;
    if (!event) return;

    setStaffCheckins((prev) => prev.filter((ci) => ci.pass_id !== passId));
    setScanResult(null);
    setScanVisualAlert(null);

    try {
      await StaffPassRepository.revertCheckin(passId, event.id);
    } catch (err) {
      console.warn('Erro ao anular entrada de staff:', err);
    }

    loadEventData(event.id);
  };

  // Handle successful camera QR scan
  const handleScanSuccess = async (decodedText: string) => {
    const { tokenCandidate, guestIdCandidate, eventIdCandidate, isStaffCandidate, staffPayload } =
      extractScanPayload(decodedText);

    // If QR is recognized as a staff credential
    const isStaff =
      isStaffCandidate ||
      (tokenCandidate && tokenCandidate.toLowerCase().includes('stf_')) ||
      decodedText.includes('staffPassId') ||
      decodedText.includes('__event_staff_passes__') ||
      decodedText.includes('stf_') ||
      decodedText.includes('pass_') ||
      decodedText.toLowerCase().includes('staff');

    if (isStaff) {
      await handleProcessStaffScan(tokenCandidate, staffPayload);
      return;
    }

    // If QR payload contains an eventId that belongs to a different event, check if it's staff first before rejecting
    if (eventIdCandidate && event && eventIdCandidate !== event.id) {
      try {
        const possibleStaff = await StaffPassRepository.getByToken(tokenCandidate || decodedText);
        if (possibleStaff) {
          await handleProcessStaffScan(tokenCandidate, possibleStaff);
          return;
        }
      } catch (e) {}

      playFeedbackSound('error');
      triggerVisualAlert('error');
      setScanResult({
        type: 'error',
        title: 'CONVITE DE OUTRO EVENTO!',
        message: 'Este código QR pertence a um evento diferente e não é válido para este casamento.',
      });
      return;
    }

    // Match guest in local list
    let matchedGuest = guests.find((g) => {
      const gToken = (g.qr_token || '').trim().toLowerCase();
      const gId = (g.id || '').trim().toLowerCase();
      const candToken = (tokenCandidate || '').trim().toLowerCase();
      const candId = (guestIdCandidate || '').trim().toLowerCase();

      return (
        (candToken && gToken && gToken === candToken) ||
        (candId && gId && gId === candId) ||
        (candToken && gId && gId === candToken) ||
        (candId && gToken && gToken === candId)
      );
    });

    // Fallback: Check Supabase directly if guest was recently added after portaria opened
    if (!matchedGuest && event) {
      try {
        if (tokenCandidate) {
          matchedGuest = (await GuestRepository.getByToken(tokenCandidate)) || undefined;
        }
        if (!matchedGuest && guestIdCandidate) {
          matchedGuest = (await GuestRepository.getById(guestIdCandidate)) || undefined;
        }
        if (matchedGuest && matchedGuest.event_id === event.id) {
          setGuests((prev) => [...prev.filter((x) => x.id !== matchedGuest!.id), matchedGuest!]);
        } else {
          matchedGuest = undefined;
        }
      } catch (e) {}
    }

    if (matchedGuest) {
      await handleProcessCheckin(matchedGuest);
    } else {
      playFeedbackSound('error');
      triggerVisualAlert('error');
      setScanResult({
        type: 'error',
        title: 'CÓDIGO QR INVÁLIDO OU NÃO ENCONTRADO!',
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
              const now = Date.now();
              const text = decodedText.trim();

              // 1. If currently busy processing a scan, drop frame immediately
              if (isScanningBusyRef.current) return;

              // 2. Debounce identical QR code within 4 seconds
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
                // Keep scanner lock for 2 seconds to let operator move to next guest
                setTimeout(() => {
                  isScanningBusyRef.current = false;
                }, 2000);
              }
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

  // Revert a Check-in (supports single partial entry reversion)
  const handleRevert = async (checkinId: string, guestId: string) => {
    if (!confirm('Deseja anular este registo de entrada?')) return;
    if (!event) return;

    // Optimistically remove from state so counter and list decrement immediately
    setCheckins((prev) => prev.filter((ci) => ci.id !== checkinId));
    setScanResult(null);
    setScanVisualAlert(null);

    try {
      await PortariaRepository.revertSingleCheckin(checkinId, guestId, event.id);
    } catch (err) {
      console.warn('Erro ao anular entrada:', err);
    }

    loadEventData(event.id);
  };

  // Filter guests for search
  const filteredGuests = guests.filter((g) => {
    const match = g.name.toLowerCase().includes(searchTerm.toLowerCase());
    return match;
  });

  // Physical people presence and slots metrics
  const totalInvitedPeople = guests.reduce((sum, g) => sum + 1 + (Number(g.companions) || 0), 0);
  const checkedInCount = checkins.reduce((sum, ci) => sum + (Number(ci.checked_count) || 1), 0);
  const totalGuests = totalInvitedPeople > 0 ? totalInvitedPeople : guests.length;
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
          <GlobalBroadcastBanner className="mb-4" />
          {/* Logo & Brand Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-1">
              <img
                src="/logo_meu_boda.png"
                alt="Meu Boda"
                className="h-16 w-auto object-contain drop-shadow-xl"
              />
            </div>
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

        <footer className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 py-2">
          <img
            src="/logo_meu_boda.png"
            alt="Meu Boda"
            className="h-3.5 w-auto object-contain opacity-60"
          />
          <span>• Tecnologia para Eventos de Luxo</span>
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
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo_meu_boda.png"
              alt="Meu Boda"
              className="h-8 sm:h-9 w-auto object-contain shrink-0"
            />
            <div className="h-6 w-px bg-[#2D2A3E] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate max-w-[160px] sm:max-w-xs">
                {event?.title || 'Portaria do Evento'}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-[#D4AF37] font-semibold truncate">
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
        <GlobalBroadcastBanner />

        {/* Metric Cards Bar */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#1A1926] border border-[#2D2A3E] p-2.5 rounded-2xl">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Total</p>
            <p className="text-lg font-black text-white">{totalGuests}</p>
          </div>
          <div
            className={`p-2.5 rounded-2xl border transition-all duration-300 ${
              scanVisualAlert === 'success'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-xl shadow-emerald-500/50 scale-105'
                : 'bg-emerald-950/20 border-emerald-500/30'
            }`}
          >
            <p
              className={`text-[10px] uppercase tracking-wider font-semibold ${
                scanVisualAlert === 'success' ? 'text-emerald-100 font-bold' : 'text-emerald-400'
              }`}
            >
              Presentes
            </p>
            <p
              className={`text-lg font-black ${
                scanVisualAlert === 'success' ? 'text-white' : 'text-emerald-400'
              }`}
            >
              {checkedInCount}
            </p>
          </div>
          <div className="bg-[#1A1926] border border-[#2D2A3E] p-2.5 rounded-2xl">
            <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">Por Chegar</p>
            <p className="text-lg font-black text-amber-400">{pendingCount}</p>
          </div>
        </div>

        {/* Staff Team Summary Strip */}
        {staffPasses.length > 0 && (
          <div
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 text-xs ${
              scanVisualAlert === 'staff'
                ? 'bg-indigo-600/30 border-indigo-400 shadow-lg shadow-indigo-500/30'
                : 'bg-[#1A1926] border-indigo-500/30'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shrink-0">
                <Award className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold">
                  Equipa de Serviço / Staff
                </p>
                <p className="text-xs font-black text-white truncate">
                  {staffCheckins.length} presentes de {staffPasses.length} credenciais
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {Math.round((staffCheckins.length / (staffPasses.length || 1)) * 100)}% em serviço
              </span>
            </div>
          </div>
        )}

        {/* Scan Result Feedback Card (High-Impact Dynamic Alert - Green for Guests, Indigo for Staff, Red for Error) */}
        {scanResult && (
          <div
            className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all shadow-2xl animate-in zoom-in-95 w-full overflow-hidden ${
              scanResult.type === 'success'
                ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-300 text-white shadow-emerald-950/70'
                : scanResult.type === 'partial'
                ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 border-amber-300 text-white shadow-amber-950/70'
                : scanResult.type === 'staff'
                ? 'bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 border-indigo-300 text-white shadow-indigo-950/70'
                : 'bg-gradient-to-br from-red-600 to-red-700 border-red-300 text-white shadow-red-950/70'
            }`}
          >
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="flex items-start gap-2.5 sm:gap-3.5 flex-1 min-w-0">
                {scanResult.type === 'success' ? (
                  <div className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-white/20 shrink-0 mt-0.5">
                    <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                ) : scanResult.type === 'partial' ? (
                  <div className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-amber-950/40 border border-amber-300/40 shrink-0 mt-0.5">
                    <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-amber-200" />
                  </div>
                ) : scanResult.type === 'staff' ? (
                  <div className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-indigo-500/30 border border-indigo-400/40 shrink-0 mt-0.5">
                    <Award className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-200" />
                  </div>
                ) : (
                  <div className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-white/20 shrink-0 mt-0.5">
                    <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white animate-pulse" />
                  </div>
                )}
                <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span
                      className={`inline-block px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        scanResult.type === 'success'
                          ? 'bg-emerald-950/40 text-emerald-100 border border-emerald-300/40'
                          : scanResult.type === 'partial'
                          ? 'bg-amber-950/50 text-amber-100 border border-amber-300/50'
                          : scanResult.type === 'staff'
                          ? 'bg-indigo-950/60 text-indigo-200 border border-indigo-300/40'
                          : 'bg-red-950/40 text-red-100 border border-red-300/40'
                      }`}
                    >
                      {scanResult.type === 'success'
                        ? 'Entrada Concluída'
                        : scanResult.type === 'partial'
                        ? 'Entrada Parcial Autorizada'
                        : scanResult.type === 'staff'
                        ? 'Prestador de Serviço'
                        : 'Acesso Recusado'}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-black tracking-tight text-white break-words leading-snug">
                    {scanResult.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium break-words">
                    {scanResult.message}
                  </p>

                  {/* Staff Detailed Card */}
                  {scanResult.staffPass && (
                    <div className="mt-2.5 sm:mt-3 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-black/40 border border-white/20 text-xs space-y-1.5 sm:space-y-2 backdrop-blur-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                        <span className="font-black text-white text-sm sm:text-base break-words">
                          {scanResult.staffPass.holder_name
                            ? `${scanResult.staffPass.holder_name} (${scanResult.staffPass.role_title})`
                            : scanResult.staffPass.role_title}
                        </span>
                        {scanResult.staffPass.company_name && (
                          <span className="self-start sm:self-auto px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-[10px] sm:text-[11px] font-bold text-indigo-200 shrink-0">
                            {scanResult.staffPass.company_name}
                          </span>
                        )}
                      </div>

                      {scanResult.staffPass.access_level && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-indigo-200 font-semibold text-xs pt-0.5">
                          <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span className="break-words">Acesso: {scanResult.staffPass.access_level}</span>
                        </div>
                      )}

                      <div className="text-[10px] text-zinc-300 font-mono">
                        ID: {scanResult.staffPass.qr_token}
                      </div>

                      {scanResult.previousStaffCheckin && (
                        <div className="text-[10px] sm:text-[11px] text-red-100 bg-red-950/70 p-2 sm:p-2.5 rounded-xl border border-red-400/40 mt-1.5 sm:mt-2 font-medium break-words leading-relaxed">
                          ⚠️ Entrada anterior registada às{' '}
                          <strong className="text-white underline">
                            {new Date(scanResult.previousStaffCheckin.checked_at).toLocaleTimeString('pt-PT', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </strong>{' '}
                          pelo operador: <strong>{scanResult.previousStaffCheckin.operator || 'Portaria'}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Guest Detailed Card on Successful/Partial/Duplicate Scan */}
                  {scanResult.guest && (
                    <div className="mt-2.5 sm:mt-3 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-black/40 border border-white/20 text-xs space-y-1.5 sm:space-y-2 backdrop-blur-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                        <span className="font-black text-white text-sm sm:text-base break-words">
                          {scanResult.guest.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] sm:text-[11px] font-bold text-white">
                            +{scanResult.guest.companions} acomp. (Total: {1 + scanResult.guest.companions} pax)
                          </span>
                          {scanResult.remainingSlots !== undefined && scanResult.remainingSlots > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-200 border border-amber-300/40 text-[10px] sm:text-[11px] font-bold">
                              Resta {scanResult.remainingSlots} vaga
                            </span>
                          )}
                        </div>
                      </div>

                      {scanResult.table && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[#FFE082] font-bold text-xs pt-0.5">
                          <UtensilsCrossed className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span className="break-words">Mesa: {scanResult.table.name}</span>
                        </div>
                      )}

                      {scanResult.guest.family_group && (
                        <p className="text-[10px] sm:text-[11px] text-zinc-300 break-words">
                          Grupo: {scanResult.guest.family_group}
                        </p>
                      )}

                      {/* Multi-entry History for Exhausted Invitation */}
                      {scanResult.allPreviousCheckins && scanResult.allPreviousCheckins.length > 0 ? (
                        <div className="text-[10px] sm:text-[11px] text-red-100 bg-red-950/70 p-2.5 rounded-xl border border-red-400/40 mt-1.5 sm:mt-2 space-y-1">
                          <div className="font-bold text-white flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-300" />
                            <span>Entradas já efetuadas neste convite:</span>
                          </div>
                          {scanResult.allPreviousCheckins.map((entry, idx) => (
                            <div key={entry.id || idx} className="flex items-center justify-between pl-3 text-zinc-300">
                              <span>
                                • {idx + 1}ª Entrada ({entry.checked_count || 1} pax) às{' '}
                                <strong className="text-white underline">
                                  {new Date(entry.checked_at).toLocaleTimeString('pt-PT', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </strong>
                              </span>
                              <span className="text-[10px] text-zinc-400">Posto: {entry.operator || 'Portaria'}</span>
                            </div>
                          ))}
                        </div>
                      ) : scanResult.previousCheckin ? (
                        <div className="text-[10px] sm:text-[11px] text-red-100 bg-red-950/70 p-2 sm:p-2.5 rounded-xl border border-red-400/40 mt-1.5 sm:mt-2 font-medium break-words leading-relaxed">
                          ⚠️ Primeira entrada registada às{' '}
                          <strong className="text-white underline">
                            {new Date(scanResult.previousCheckin.checked_at).toLocaleTimeString('pt-PT', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </strong>{' '}
                          pelo operador: <strong>{scanResult.previousCheckin.operator || 'Portaria'}</strong>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setScanResult(null);
                  setScanVisualAlert(null);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
                title="Fechar alerta"
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
            <div
              className={`relative rounded-3xl overflow-hidden bg-black aspect-square max-w-sm mx-auto w-full transition-all duration-300 flex flex-col items-center justify-center shadow-2xl ${
                scanVisualAlert === 'success'
                  ? 'ring-8 ring-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.85)] scale-[1.02]'
                  : scanVisualAlert === 'staff'
                  ? 'ring-8 ring-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.85)] scale-[1.02]'
                  : scanVisualAlert === 'error'
                  ? 'ring-8 ring-red-600 shadow-[0_0_50px_rgba(239,68,68,0.95)] scale-[1.02]'
                  : 'border-2 border-[#D4AF37]/40 shadow-inner'
              }`}
            >
              {/* Immediate High-Visibility Status Pill Overlay */}
              {scanVisualAlert === 'success' && (
                <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-3 z-30 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-emerald-600 border-2 border-emerald-300 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 sm:gap-2 shadow-2xl animate-in zoom-in-95">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white animate-bounce shrink-0" />
                  <span className="truncate">VÁLIDO • ENTRADA AUTORIZADA</span>
                </div>
              )}
              {scanVisualAlert === 'staff' && (
                <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-3 z-30 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-indigo-600 border-2 border-indigo-300 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 sm:gap-2 shadow-2xl animate-in zoom-in-95">
                  <Award className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-200 animate-bounce shrink-0" />
                  <span className="truncate">STAFF AUTORIZADO • ENTRADA DE SERVIÇO</span>
                </div>
              )}
              {scanVisualAlert === 'error' && (
                <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-3 z-30 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-red-600 border-2 border-red-300 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 sm:gap-2 shadow-2xl animate-in zoom-in-95">
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white animate-pulse shrink-0" />
                  <span className="truncate">CÓDIGO RECUSADO / JÁ UTILIZADO</span>
                </div>
              )}

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
                  const stats = getGuestCheckinStats(guest, checkins);
                  const table = tables.find((t) => t.id === guest.table_id);

                  return (
                    <div
                      key={guest.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        stats.isFullyCheckedIn
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : stats.isPartiallyCheckedIn
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-[#0F0E17] border-[#2D2A3E] hover:border-[#D4AF37]/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">{guest.name}</p>
                          {stats.isFullyCheckedIn && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Presente ({stats.totalEntered}/{stats.maxAllowed})
                            </span>
                          )}
                          {stats.isPartiallyCheckedIn && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Parcial ({stats.totalEntered}/{stats.maxAllowed})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span>+{guest.companions} acomp. ({stats.maxAllowed} pax)</span>
                          {stats.isPartiallyCheckedIn && (
                            <>
                              <span>•</span>
                              <span className="text-amber-300 font-semibold">{stats.remainingSlots} vaga(s) restante(s)</span>
                            </>
                          )}
                          {table && (
                            <>
                              <span>•</span>
                              <span className="text-[#D4AF37] font-medium truncate">{table.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {stats.isFullyCheckedIn ? (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 shrink-0">
                          <CheckCircle className="h-4 w-4" /> Entrou
                        </span>
                      ) : stats.isPartiallyCheckedIn ? (
                        <button
                          type="button"
                          onClick={() => handleProcessCheckin(guest)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shrink-0 active:scale-95 transition-all cursor-pointer shadow flex items-center gap-1"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>+ 1 Vaga</span>
                          <span className="text-[10px] opacity-75">({stats.remainingSlots} rest.)</span>
                        </button>
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
                <h3 className="text-sm font-bold text-white">Histórico de Entradas</h3>
                <p className="text-xs text-zinc-400">Registo de validações na portaria em tempo real.</p>
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

            {/* Sub-filter: Convidados vs Staff */}
            <div className="flex p-1 bg-[#0F0E17] rounded-xl border border-[#2D2A3E] text-xs">
              <button
                type="button"
                onClick={() => setHistoryFilter('guests')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  historyFilter === 'guests'
                    ? 'bg-zinc-800 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Convidados ({checkins.length} check-ins • {checkedInCount} pax)
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('staff')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  historyFilter === 'staff'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                <span>Staff & Serviço ({staffCheckins.length})</span>
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {historyFilter === 'guests' ? (
                checkins.length > 0 ? (
                  checkins.map((ci) => {
                    const guest = guests.find((g) => g.id === ci.guest_id);
                    const table = guest ? tables.find((t) => t.id === guest.table_id) : null;

                    return (
                      <div
                        key={ci.id}
                        className="p-3 rounded-xl bg-[#0F0E17] border border-[#2D2A3E] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white truncate">{guest?.name || 'Convidado'}</p>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                              {ci.checked_count && ci.checked_count > 1 ? `${ci.checked_count} pax` : '1 pax'}
                            </span>
                          </div>
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
                          onClick={() => handleRevert(ci.id, ci.guest_id)}
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
                    Ainda não foi registada nenhuma entrada de convidado neste evento.
                  </div>
                )
              ) : (
                staffCheckins.length > 0 ? (
                  staffCheckins.map((sc) => {
                    const pass = staffPasses.find((p) => p.id === sc.pass_id);
                    return (
                      <div
                        key={sc.id}
                        className="p-3 rounded-xl bg-[#0F0E17] border border-indigo-500/30 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                              <Award className="h-3.5 w-3.5" />
                            </span>
                            <p className="font-bold text-white truncate">
                              {pass?.holder_name ? `${pass.holder_name} • ` : ''}{pass?.role_title || sc.role_title || 'Staff de Serviço'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1 pl-6">
                            <span className="text-indigo-400 font-semibold">
                              {new Date(sc.checked_at).toLocaleTimeString('pt-PT', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                            <span>•</span>
                            <span className="text-zinc-500">{sc.operator || 'Portaria'}</span>
                            {(pass?.company_name || sc.company_name) && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-300 font-medium truncate">{pass?.company_name || sc.company_name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRevertStaff(sc.pass_id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                          title="Anular Entrada de Staff"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-zinc-500 text-xs italic">
                    Ainda não foi registada nenhuma entrada de prestador de serviço/staff.
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* MODAL DE GESTÃO DE ENTRADA PARCIAL / VAGAS POR CONVITE */}
        {partialModalGuest && (() => {
          const modalStats = getGuestCheckinStats(partialModalGuest, checkins);
          const modalTable = tables.find((t) => t.id === partialModalGuest.table_id);
          const isCompanionArrival = modalStats.totalEntered > 0 && modalStats.remainingSlots > 0;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
              <div className="w-full max-w-md bg-[#1A1926] border border-[#2D2A3E] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-left relative overflow-hidden">
                {/* Glow Header Accent */}
                <div
                  className={`absolute top-0 inset-x-0 h-1.5 ${
                    isCompanionArrival
                      ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300'
                      : 'bg-gradient-to-r from-[#D4AF37] via-[#FFE082] to-[#B89742]'
                  }`}
                />

                {/* Modal Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                        isCompanionArrival
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {isCompanionArrival ? 'Chegada de Acompanhante' : 'Controlo de Vagas do Convite'}
                    </span>
                    <h3 className="text-xl font-black text-white tracking-tight break-words">
                      {partialModalGuest.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span className="font-semibold text-white">
                        Total do convite: {modalStats.maxAllowed} pessoas
                      </span>
                      {modalTable && (
                        <>
                          <span>•</span>
                          <span className="text-[#D4AF37] font-medium flex items-center gap-1">
                            <UtensilsCrossed className="h-3 w-3" /> Mesa {modalTable.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPartialModalGuest(null);
                      setIsScanning(true);
                    }}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Scenario 1: Companion Arrival (2nd scan, remaining slots exist) */}
                {isCompanionArrival ? (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>Entrada Anterior Registada</span>
                      </div>
                      <p className="text-zinc-300 leading-relaxed">
                        Já entrou <strong className="text-white">{modalStats.totalEntered} pessoa(s)</strong> deste convite
                        {modalStats.entries[0] && (
                          <>
                            {' '}às{' '}
                            <strong className="text-white underline">
                              {new Date(modalStats.entries[0].checked_at).toLocaleTimeString('pt-PT', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </strong>{' '}
                            pelo posto <strong>{modalStats.entries[0].operator || 'Portaria'}</strong>
                          </>
                        )}.
                      </p>
                      <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-300 border-t border-amber-500/20">
                        <span>Vagas restantes agora:</span>
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black">
                          {modalStats.remainingSlots} {modalStats.remainingSlots === 1 ? 'vaga disponível' : 'vagas disponíveis'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      O parceiro/acompanhante que chegou agora está a apresentar o mesmo código QR para ocupar a vaga restante. Confirma a sua entrada?
                    </p>

                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        disabled={isExecutingCheckin}
                        onClick={() => handleProcessCheckin(partialModalGuest, modalStats.remainingSlots)}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
                      >
                        {isExecutingCheckin ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-white" />
                        )}
                        <span>
                          Confirmar Entrada do Acompanhante ({modalStats.remainingSlots === 1 ? 'Última vaga' : modalStats.remainingSlots + ' vagas'})
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPartialModalGuest(null);
                          setIsScanning(true);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-semibold transition-colors text-center cursor-pointer"
                      >
                        Cancelar / Não Validar Agora
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Scenario 2: 1st Scan of a Multi-Person Invitation */
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-[#0F0E17] border border-[#2D2A3E] space-y-1.5 text-xs">
                      <p className="text-zinc-300">
                        Este convite dá direito a <strong className="text-[#D4AF37]">{modalStats.maxAllowed} pessoas</strong>.
                      </p>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        Se os convidados não chegaram juntos, pode registar apenas 1 pessoa agora. O parceiro poderá entrar mais tarde com o mesmo convite.
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {/* Option A: Only 1 person arrives */}
                      <button
                        type="button"
                        disabled={isExecutingCheckin}
                        onClick={() => handleProcessCheckin(partialModalGuest, 1)}
                        className="w-full p-4 rounded-2xl bg-[#0F0E17] hover:bg-zinc-800/80 border-2 border-[#D4AF37]/50 hover:border-[#D4AF37] text-left transition-all active:scale-[0.99] cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] group-hover:scale-105 transition-transform">
                              <UserCheck className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white flex items-center gap-2">
                                <span>👤 Só 1 Pessoa Chegou</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-semibold">
                                  Recomendado
                                </span>
                              </p>
                              <p className="text-[11px] text-zinc-400 mt-0.5">
                                Regista 1 entrada. Guarda {modalStats.maxAllowed - 1} vaga para o parceiro entrar depois.
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-[#D4AF37] shrink-0" />
                        </div>
                      </button>

                      {/* Option B: All people arrive together */}
                      <button
                        type="button"
                        disabled={isExecutingCheckin}
                        onClick={() => handleProcessCheckin(partialModalGuest, modalStats.maxAllowed)}
                        className="w-full p-4 rounded-2xl bg-[#0F0E17] hover:bg-zinc-800/80 border border-[#2D2A3E] hover:border-emerald-500/60 text-left transition-all active:scale-[0.99] cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
                              <Users className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">
                                👥 Entram Todos ({modalStats.maxAllowed} Pessoas)
                              </p>
                              <p className="text-[11px] text-zinc-400 mt-0.5">
                                Todos os convidados deste convite chegaram juntos agora.
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-emerald-400 shrink-0" />
                        </div>
                      </button>

                      {/* Cancel */}
                      <button
                        type="button"
                        onClick={() => {
                          setPartialModalGuest(null);
                          setIsScanning(true);
                        }}
                        className="w-full py-2 text-zinc-400 hover:text-white text-xs font-semibold transition-colors text-center cursor-pointer"
                      >
                        Cancelar Leitura
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 py-3 border-t border-[#2D2A3E]/40">
        <img
          src="/logo_meu_boda.png"
          alt="Meu Boda"
          className="h-3.5 w-auto object-contain opacity-60"
        />
        <span>• Sistema de Portaria e Controlo de Acesso</span>
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
