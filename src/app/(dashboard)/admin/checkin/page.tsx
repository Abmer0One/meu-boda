'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { GuestRepository } from '@/repositories/guest.repository';
import { CheckInRepository } from '@/repositories/checkin.repository';
import { Guest, CheckIn } from '@/types';
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
} from 'lucide-react';

export default function CheckinPage() {
  const { currentEvent } = useEvent();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  // QR Input state (for scanners that type characters + Enter)
  const [qrInput, setQrInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Alerts state
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

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
          await handleScanSuccess(decodedText);
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
      const [g, ci] = await Promise.all([
        GuestRepository.getAll(currentEvent.id),
        CheckInRepository.getAll(currentEvent.id),
      ]);
      setGuests(g);
      setCheckins(ci);
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

  // Trigger celebration on successful entry
  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#B76E79', '#D8A7B1', '#F8EDEB', '#22C55E'],
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

    try {
      const newCheckin = await CheckInRepository.create({
        guest_id: guest.id,
        operator: 'Portaria Principal',
      });

      if (newCheckin) {
        setAlertMessage({
          type: 'success',
          text: `Entrada autorizada! Bem-vindo, ${guest.name} (${1 + guest.companions} pax).`,
        });
        triggerConfetti();
        loadData();
      }
    } catch (err) {
      console.error(err);
      setAlertMessage({ type: 'error', text: 'Ocorreu um erro ao processar a entrada.' });
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
    return isSeated && !isCheckedIn && g.status === 'Confirmed';
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
