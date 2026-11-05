'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { TableRepository } from '@/repositories/table.repository';
import { GuestRepository } from '@/repositories/guest.repository';
import { Table, Guest, CompanionSeating } from '@/types';
import { jsPDF } from 'jspdf';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tableSchema } from '@/validations/schemas';
import {
  getDefaultCompanionName,
  isGuestSeatingSeparated,
  getGuestSeatingUnits,
  SeatingUnit,
} from '@/lib/seating';
import {
  CalendarRange,
  Plus,
  Trash2,
  Users,
  AlertCircle,
  Loader2,
  CheckCircle,
  Edit2,
  Download,
  Map,
  LayoutGrid,
  Sparkles,
  UserMinus,
  X,
  Scissors,
  Link2,
  UserCheck,
  PenLine,
} from 'lucide-react';

export default function MesasPage() {
  const { currentEvent } = useEvent();
  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'visual' | 'list'>('visual');
  const [selectedTableForDetails, setSelectedTableForDetails] = useState<Table | null>(null);

  // Modals state
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableToEdit, setTableToEdit] = useState<Table | null>(null);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Companion Name Edit Modal state
  const [companionModalOpen, setCompanionModalOpen] = useState(false);
  const [editingCompanion, setEditingCompanion] = useState<{
    guestId: string;
    companionIndex: number;
    currentName: string;
    titularName: string;
  } | null>(null);
  const [companionNameInput, setCompanionNameInput] = useState('');
  const [isSavingCompanion, setIsSavingCompanion] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      name: '',
      capacity: 8,
    },
  });

  const loadData = async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      const [fetchedTables, fetchedGuests] = await Promise.all([
        TableRepository.getAll(currentEvent.id),
        GuestRepository.getAll(currentEvent.id),
      ]);
      setTables(fetchedTables);
      setGuests(fetchedGuests);
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

  const exportTablesPDF = () => {
    if (!currentEvent) return;

    const doc = new jsPDF();
    const cleanStr = (text: string | null | undefined): string => {
      if (!text) return '';
      return text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2000-\u2BFF]|\uD83E[\uDC00-\uDFFF]/g, '');
    };

    // Draw border decoration
    doc.setDrawColor(183, 110, 121);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 194, 281);

    // Header Banner
    doc.setFillColor(248, 237, 235);
    doc.rect(9, 9, 192, 25, 'F');

    doc.setTextColor(183, 110, 121);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('MEU BODA', 15, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Evento: ${cleanStr(currentEvent.title)} | Mapa de Distribuição de Mesas`, 15, 27);

    // Report Title
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório do Planeamento de Mesas e Acomodação', 15, 45);

    let yPos = 55;

    // Loop through tables
    tables.forEach((table) => {
      const tableUnits = allSeatingUnits.filter((u) => u.tableId === table.id);

      if (yPos > 240) {
        doc.addPage();
        doc.rect(8, 8, 194, 281);
        yPos = 20;
      }

      // Draw table section header
      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPos, 180, 8, 'F');
      
      doc.setTextColor(183, 110, 121);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      
      const seatedCount = tableUnits.length;
      doc.text(`${cleanStr(table.name)} (Capacidade: ${table.capacity} pax | Ocupado: ${seatedCount} pax)`, 18, yPos + 6);
      
      yPos += 12;

      // Draw table columns for guests
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Pessoa / Convidado', 20, yPos);
      doc.text('Tipo / Relação', 100, yPos);
      doc.text('Estado RSVP', 140, yPos);
      doc.line(18, yPos + 1.5, 192, yPos + 1.5);
      
      yPos += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      if (tableUnits.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.text('Nenhum convidado sentado nesta mesa.', 20, yPos);
        yPos += 8;
      } else {
        tableUnits.forEach((unit) => {
          if (yPos > 265) {
            doc.addPage();
            doc.rect(8, 8, 194, 281);
            yPos = 20;
          }

          const normalizeStatus = (status: string) => {
            const s = status?.toLowerCase() || '';
            if (s === 'confirmed' || s === 'confirmado' || s === 'sim' || s === 'yes') return 'Confirmado';
            if (s === 'declined' || s === 'recusado' || s === 'recusada' || s === 'não' || s === 'no') return 'Recusado';
            return 'Pendente';
          };

          const roleText = unit.isCompanion ? `Acomp. de ${unit.titularName}` : 'Titular';

          doc.text(cleanStr(unit.displayName), 20, yPos);
          doc.text(cleanStr(roleText), 100, yPos);
          doc.text(normalizeStatus(unit.status), 140, yPos);
          
          yPos += 5.5;
        });
        
        yPos += 4; // gap
      }
    });

    // Add unassigned guests section at the end if there are any
    const unseatedUnitsList = allSeatingUnits.filter((u) => u.tableId === null);
    if (unseatedUnitsList.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        doc.rect(8, 8, 194, 281);
        yPos = 20;
      }

      doc.setFillColor(250, 240, 240);
      doc.rect(15, yPos, 180, 8, 'F');
      
      doc.setTextColor(150, 80, 80);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      
      doc.text(`Convidados sem mesa organizada (Total: ${unseatedUnitsList.length} lugares pendentes)`, 18, yPos + 6);
      
      yPos += 12;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Pessoa / Convidado', 20, yPos);
      doc.text('Tipo / Relação', 100, yPos);
      doc.text('Estado RSVP', 140, yPos);
      doc.line(18, yPos + 1.5, 192, yPos + 1.5);
      
      yPos += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      unseatedUnitsList.forEach((unit) => {
        if (yPos > 265) {
          doc.addPage();
          doc.rect(8, 8, 194, 281);
          yPos = 20;
        }

        const normalizeStatus = (status: string) => {
          const s = status?.toLowerCase() || '';
          if (s === 'confirmed' || s === 'confirmado' || s === 'sim' || s === 'yes') return 'Confirmado';
          if (s === 'declined' || s === 'recusado' || s === 'recusada' || s === 'não' || s === 'no') return 'Recusado';
          return 'Pendente';
        };

        const roleText = unit.isCompanion ? `Acomp. de ${unit.titularName}` : 'Titular';

        doc.text(cleanStr(unit.displayName), 20, yPos);
        doc.text(cleanStr(roleText), 100, yPos);
        doc.text(normalizeStatus(unit.status), 140, yPos);
        
        yPos += 5.5;
      });
    }

    doc.save(`mapa_mesas_${currentEvent.slug}.pdf`);
  };

  const handleAddTableClick = () => {
    setTableToEdit(null);
    reset({
      name: '',
      capacity: 8,
    });
    setTableModalOpen(true);
  };

  const handleEditTableClick = (table: Table) => {
    setTableToEdit(table);
    reset({
      name: table.name,
      capacity: table.capacity,
    });
    setTableModalOpen(true);
  };

  const handleSaveTable = async (data: any) => {
    if (!currentEvent) return;
    try {
      if (tableToEdit) {
        await TableRepository.update(tableToEdit.id, {
          name: data.name,
          capacity: Number(data.capacity),
        });
      } else {
        await TableRepository.create({
          event_id: currentEvent.id,
          name: data.name,
          capacity: Number(data.capacity),
        });
      }
      setTableModalOpen(false);
      setTableToEdit(null);
      reset({ name: '', capacity: 8 });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTableClick = (table: Table) => {
    setTableToDelete(table);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTable = async () => {
    if (!tableToDelete) return;
    try {
      await TableRepository.delete(tableToDelete.id);
      setDeleteConfirmOpen(false);
      setTableToDelete(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // NATIVE HTML5 DRAG & DROP HANDLERS (Supports both individual titulars and separate companions)
  interface DragUnitPayload {
    guestId: string;
    unitKey: string;
    isCompanion: boolean;
    companionIndex?: number;
  }

  const handleDragStart = (e: React.DragEvent, unitOrId: SeatingUnit | string) => {
    let payload: DragUnitPayload;
    if (typeof unitOrId === 'string') {
      payload = { guestId: unitOrId, unitKey: `${unitOrId}_main`, isCompanion: false };
    } else {
      payload = {
        guestId: unitOrId.guestId,
        unitKey: unitOrId.key,
        isCompanion: unitOrId.isCompanion,
        companionIndex: unitOrId.companionIndex,
      };
    }
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnTable = async (e: React.DragEvent, tableId: string) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;

    let payload: DragUnitPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { guestId: raw, unitKey: `${raw}_main`, isCompanion: false };
    }

    const guest = guests.find((g) => g.id === payload.guestId);
    if (!guest) return;

    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const currentSeatedCount = getTableOccupiedCount(tableId);

    // If dragging a separated companion:
    if (payload.isCompanion && payload.companionIndex) {
      if (currentSeatedCount + 1 > table.capacity) {
        alert(`Aviso: A mesa '${table.name}' ultrapassará a capacidade máxima!`);
      }

      const existingSeating: CompanionSeating[] = guest.companion_seating && guest.companion_seating.length > 0
        ? [...guest.companion_seating]
        : Array.from({ length: guest.companions || 0 }, (_, i) => ({
            index: i + 1,
            name: getDefaultCompanionName(guest.name, i + 1, guest.companions),
            table_id: null,
          }));

      const compIdx = existingSeating.findIndex((s) => s.index === payload.companionIndex);
      if (compIdx >= 0) {
        existingSeating[compIdx] = { ...existingSeating[compIdx], table_id: tableId };
      } else {
        existingSeating.push({
          index: payload.companionIndex,
          name: getDefaultCompanionName(guest.name, payload.companionIndex, guest.companions),
          table_id: tableId,
        });
      }

      try {
        await GuestRepository.updateCompanionSeating(guest.id, existingSeating);
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guest.id ? { ...g, companion_seating: existingSeating } : g
          )
        );
      } catch (err) {
        console.error('Error placing companion in table:', err);
      }
      return;
    }

    // Otherwise, titular guest
    const isSeparated = isGuestSeatingSeparated(guest);
    const groupSize = isSeparated ? 1 : 1 + (guest.companions || 0);

    if (currentSeatedCount + groupSize > table.capacity) {
      alert(`Aviso: A mesa '${table.name}' ultrapassará a capacidade máxima!`);
    }

    try {
      await GuestRepository.update(guest.id, { table_id: tableId });
      setGuests((prev) =>
        prev.map((g) => (g.id === guest.id ? { ...g, table_id: tableId } : g))
      );
    } catch (err) {
      console.error('Error placing guest in table:', err);
    }
  };

  const handleDropOnUnseated = async (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;

    let payload: DragUnitPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { guestId: raw, unitKey: `${raw}_main`, isCompanion: false };
    }

    const guest = guests.find((g) => g.id === payload.guestId);
    if (!guest) return;

    if (payload.isCompanion && payload.companionIndex) {
      const existingSeating = guest.companion_seating ? [...guest.companion_seating] : [];
      const compIdx = existingSeating.findIndex((s) => s.index === payload.companionIndex);
      if (compIdx >= 0) {
        existingSeating[compIdx] = { ...existingSeating[compIdx], table_id: null };
        try {
          await GuestRepository.updateCompanionSeating(guest.id, existingSeating);
          setGuests((prev) =>
            prev.map((g) =>
              g.id === guest.id ? { ...g, companion_seating: existingSeating } : g
            )
          );
        } catch (err) {
          console.error('Error unseating companion:', err);
        }
      }
      return;
    }

    // Titular unseated
    try {
      await GuestRepository.update(guest.id, { table_id: null });
      setGuests((prev) =>
        prev.map((g) => (g.id === guest.id ? { ...g, table_id: null } : g))
      );
    } catch (err) {
      console.error('Error unseating guest:', err);
    }
  };

  // Companion split & join methods
  const handleSplitGuestSeating = async (guest: Guest) => {
    const count = guest.companions || 0;
    if (count <= 0) return;

    const initialSeating: CompanionSeating[] = [];
    for (let c = 1; c <= count; c++) {
      initialSeating.push({
        index: c,
        name: getDefaultCompanionName(guest.name, c, count),
        table_id: null,
      });
    }

    try {
      await GuestRepository.updateCompanionSeating(guest.id, initialSeating);
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guest.id ? { ...g, companion_seating: initialSeating } : g
        )
      );
    } catch (err) {
      console.error('Error splitting guest seating:', err);
    }
  };

  const handleJoinGuestSeating = async (guest: Guest) => {
    try {
      await GuestRepository.updateCompanionSeating(guest.id, null);
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guest.id ? { ...g, companion_seating: null } : g
        )
      );
    } catch (err) {
      console.error('Error joining guest seating:', err);
    }
  };

  const handleOpenEditCompanion = (unit: SeatingUnit) => {
    if (!unit.isCompanion || !unit.companionIndex) return;
    setEditingCompanion({
      guestId: unit.guestId,
      companionIndex: unit.companionIndex,
      currentName: unit.displayName,
      titularName: unit.titularName,
    });
    setCompanionNameInput(unit.displayName);
    setCompanionModalOpen(true);
  };

  const handleSaveCompanionName = async () => {
    if (!editingCompanion) return;
    const clean = companionNameInput.trim();
    if (!clean) return;

    setIsSavingCompanion(true);
    try {
      const guest = guests.find((g) => g.id === editingCompanion.guestId);
      if (guest) {
        const existingSeating: CompanionSeating[] = guest.companion_seating && guest.companion_seating.length > 0
          ? [...guest.companion_seating]
          : Array.from({ length: guest.companions || 0 }, (_, i) => ({
              index: i + 1,
              name: getDefaultCompanionName(guest.name, i + 1, guest.companions),
              table_id: null,
            }));

        const compIdx = existingSeating.findIndex((s) => s.index === editingCompanion.companionIndex);
        if (compIdx >= 0) {
          existingSeating[compIdx] = { ...existingSeating[compIdx], name: clean };
        } else {
          existingSeating.push({
            index: editingCompanion.companionIndex,
            name: clean,
            table_id: null,
          });
        }

        await GuestRepository.updateCompanionSeating(guest.id, existingSeating);
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guest.id ? { ...g, companion_seating: existingSeating } : g
          )
        );
      }
      setCompanionModalOpen(false);
      setEditingCompanion(null);
    } catch (err) {
      console.error('Error saving companion name:', err);
    } finally {
      setIsSavingCompanion(false);
    }
  };

  const handleUnseatUnit = async (unit: SeatingUnit) => {
    const guest = guests.find((g) => g.id === unit.guestId);
    if (!guest) return;

    if (unit.isCompanion && unit.companionIndex) {
      const existingSeating = guest.companion_seating ? [...guest.companion_seating] : [];
      const compIdx = existingSeating.findIndex((s) => s.index === unit.companionIndex);
      if (compIdx >= 0) {
        existingSeating[compIdx] = { ...existingSeating[compIdx], table_id: null };
        try {
          await GuestRepository.updateCompanionSeating(guest.id, existingSeating);
          setGuests((prev) =>
            prev.map((g) =>
              g.id === guest.id ? { ...g, companion_seating: existingSeating } : g
            )
          );
        } catch (err) {
          console.error('Error unseating companion:', err);
        }
      }
      return;
    }

    // Titular
    try {
      await GuestRepository.update(guest.id, { table_id: null });
      setGuests((prev) =>
        prev.map((g) => (g.id === guest.id ? { ...g, table_id: null } : g))
      );
    } catch (err) {
      console.error('Error unseating guest:', err);
    }
  };

  // Seating Stats & Units
  const allSeatingUnits: SeatingUnit[] = guests.flatMap((g) => getGuestSeatingUnits(g, tables));
  const getTableUnits = (tableId: string): SeatingUnit[] => allSeatingUnits.filter((u) => u.tableId === tableId);
  const getTableOccupiedCount = (tableId: string): number => getTableUnits(tableId).length;
  const unseatedUnits = allSeatingUnits.filter((u) => u.tableId === null);

  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
  const totalSeated = allSeatingUnits.filter((u) => u.tableId !== null).length;
  const occupancyPercentage =
    totalCapacity > 0 ? Math.min(100, Math.round((totalSeated / totalCapacity) * 100)) : 0;

  if (!currentEvent) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <p className="text-foreground/50 text-sm">Selecione um casamento para gerir o mapa de mesas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-primary" /> Distribuição de Mesas & Planta do Salão
          </h1>
          <p className="text-sm text-foreground/60">
            Organize os convidados graficamente na planta do salão ou no modo lista detalhado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex border border-border-custom rounded-xl overflow-hidden text-xs bg-card-bg">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1.5 font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'visual'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground/70 hover:bg-secondary/40'
              }`}
            >
              <Map className="h-3.5 w-3.5" />
              Planta do Salão
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground/70 hover:bg-secondary/40'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Modo Lista
            </button>
          </div>

          <Button 
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />} 
            onClick={exportTablesPDF} 
            size="sm"
          >
            Exportar PDF
          </Button>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleAddTableClick} size="sm">
            Adicionar Mesa
          </Button>
        </div>
      </div>

      {/* Salon Floor Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card-bg p-3.5 rounded-2xl border border-border-custom text-xs">
        <div className="space-y-0.5">
          <span className="text-foreground/50 text-[11px] block">Total de Mesas</span>
          <span className="text-base font-extrabold text-foreground">{tables.length}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-foreground/50 text-[11px] block">Lotação Máxima</span>
          <span className="text-base font-extrabold text-foreground">{totalCapacity} pax</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-foreground/50 text-[11px] block">Convidados Sentados</span>
          <span className="text-base font-extrabold text-primary">{totalSeated} pax</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-foreground/50 text-[11px] block">Ocupação do Salão</span>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-foreground">{occupancyPercentage}%</span>
            <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  occupancyPercentage > 100
                    ? 'bg-error'
                    : occupancyPercentage === 100
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left panel: Unseated Guests */}
          <Card
            className="lg:col-span-4 bg-card-bg max-h-[78vh] flex flex-col p-4 border border-border-custom"
            onDragOver={handleDragOver}
            onDrop={handleDropOnUnseated}
          >
            <div className="mb-4">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" /> Convidados Sem Mesa ({unseatedUnits.length})
              </h3>
              <p className="text-xs text-foreground/50 mt-1">Arraste para uma mesa para acomodar.</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[250px]">
              {unseatedUnits.length > 0 ? (
                guests
                  .filter((g) => {
                    const isSep = isGuestSeatingSeparated(g);
                    if (!isSep) {
                      return g.table_id === null;
                    }
                    if (g.table_id === null) return true;
                    const compCount = g.companions || 0;
                    const seating = g.companion_seating || [];
                    for (let c = 1; c <= compCount; c++) {
                      const item = seating.find((s) => s.index === c);
                      if (!item || !item.table_id) return true;
                    }
                    return false;
                  })
                  .map((guest) => {
                    const isSep = isGuestSeatingSeparated(guest);
                    const compCount = guest.companions || 0;

                    // CASE 1: Joined seating (Titular + Companions together)
                    if (!isSep) {
                      return (
                        <div
                          key={guest.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, guest.id)}
                          className="p-3 border border-border-custom rounded-xl bg-background hover:border-primary active:scale-[0.98] transition-all cursor-grab flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold truncate">{guest.name}</p>
                            {guest.family_group && (
                              <p className="text-[10px] text-foreground/50 font-medium">
                                Grupo: {guest.family_group}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {compCount > 0 && (
                              <>
                                <Badge variant="secondary">+{compCount}</Badge>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSplitGuestSeating(guest);
                                  }}
                                  className="p-1 rounded-md text-foreground/50 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                                  title="Separar acompanhante em mesa diferente"
                                >
                                  <Scissors className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // CASE 2: Separated seating
                    const titularUnseated = guest.table_id === null;
                    const seating = guest.companion_seating || [];
                    const unseatedCompanions: { index: number; name: string }[] = [];
                    for (let c = 1; c <= compCount; c++) {
                      const item = seating.find((s) => s.index === c);
                      if (!item || !item.table_id) {
                        unseatedCompanions.push({
                          index: c,
                          name: item?.name || getDefaultCompanionName(guest.name, c, compCount),
                        });
                      }
                    }

                    return (
                      <div
                        key={guest.id}
                        className="p-2.5 border border-dashed border-primary/40 rounded-xl bg-primary/[0.02] space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-primary/80 border-b border-primary/10 pb-1 px-1">
                          <span className="flex items-center gap-1 truncate">
                            <Scissors className="h-3 w-3" /> Mesas Separadas ({guest.name})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleJoinGuestSeating(guest)}
                            className="text-[10px] text-foreground/60 hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                            title="Juntar novamente todos na mesma mesa"
                          >
                            <Link2 className="h-3 w-3" /> Juntar
                          </button>
                        </div>

                        {/* Titular if unseated */}
                        {titularUnseated && (
                          <div
                            draggable
                            onDragStart={(e) =>
                              handleDragStart(e, {
                                key: `${guest.id}_main`,
                                guestId: guest.id,
                                isCompanion: false,
                                displayName: guest.name,
                                titularName: guest.name,
                                tableId: null,
                                status: guest.status,
                              })
                            }
                            className="p-2 border border-border-custom rounded-lg bg-background hover:border-primary active:scale-[0.98] transition-all cursor-grab flex items-center justify-between"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-semibold truncate">{guest.name}</p>
                              <span className="text-[10px] text-foreground/50">Titular</span>
                            </div>
                            <Badge variant="secondary" className="text-[9px] py-0">1 pax</Badge>
                          </div>
                        )}

                        {/* Companions if unseated */}
                        {unseatedCompanions.map((comp) => {
                          const unit: SeatingUnit = {
                            key: `${guest.id}_comp_${comp.index}`,
                            guestId: guest.id,
                            isCompanion: true,
                            companionIndex: comp.index,
                            displayName: comp.name,
                            titularName: guest.name,
                            tableId: null,
                            status: guest.status,
                          };
                          return (
                            <div
                              key={unit.key}
                              draggable
                              onDragStart={(e) => handleDragStart(e, unit)}
                              className="p-2 border border-amber-500/30 rounded-lg bg-amber-500/[0.04] hover:border-amber-500 active:scale-[0.98] transition-all cursor-grab flex items-center justify-between"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 truncate">
                                  {comp.name}
                                </p>
                                <span className="text-[10px] text-foreground/50">
                                  Acomp. de {guest.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditCompanion(unit);
                                  }}
                                  className="p-1 rounded text-foreground/50 hover:text-amber-600 transition-colors cursor-pointer"
                                  title="Editar nome do acompanhante"
                                >
                                  <PenLine className="h-3 w-3" />
                                </button>
                                <Badge variant="warning" className="text-[9px] py-0">1 pax</Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-10 text-foreground/40 border border-dashed border-border-custom rounded-xl">
                  <CheckCircle className="h-8 w-8 text-success mb-2" />
                  <p className="text-xs font-semibold">Tudo organizado!</p>
                  <p className="text-[10px] text-foreground/50 mt-0.5">Todos os convidados têm mesa.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Right panel: Visual Floor Plan OR List View */}
          <div className="lg:col-span-8">
            {viewMode === 'visual' ? (
              /* 2D VISUAL FLOOR PLAN */
              <div className="bg-card-bg border border-border-custom rounded-2xl p-6 min-h-[78vh] flex flex-col shadow-sm">
                {/* Stage Area */}
                <div className="w-full bg-secondary/35 border border-border-custom/80 rounded-xl py-3 px-4 text-center mb-8 flex items-center justify-center gap-2 shadow-inner">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-foreground/80">
                    Palco dos Noivos & Pista de Dança
                  </span>
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>

                {tables.length > 0 ? (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10 justify-items-center items-center py-4 overflow-y-auto">
                    {tables.map((table) => {
                      const tableUnits = getTableUnits(table.id);
                      const seatedCount = tableUnits.length;
                      const isOverCap = seatedCount > table.capacity;
                      const isFull = seatedCount === table.capacity;
                      const displayCapacity = Math.max(table.capacity, tableUnits.length);

                      return (
                        <div
                          key={table.id}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDropOnTable(e, table.id)}
                          className="relative w-64 h-64 flex items-center justify-center select-none"
                        >
                          {/* Perimeter Chairs */}
                          {Array.from({ length: displayCapacity }).map((_, i) => {
                            const angle = (2 * Math.PI * i) / displayCapacity - Math.PI / 2;
                            const radius = 86; // px distance from table center
                            const x = 128 + radius * Math.cos(angle) - 14;
                            const y = 128 + radius * Math.sin(angle) - 14;
                            const unit = tableUnits[i];

                            return (
                              <div
                                key={i}
                                style={{ left: `${x}px`, top: `${y}px` }}
                                className="absolute w-7 h-7 rounded-full transition-all"
                                title={
                                  unit
                                    ? `${unit.displayName} (${unit.isCompanion ? `Acomp. de ${unit.titularName}` : 'Titular'}) • RSVP: ${unit.status}`
                                    : `Lugar ${i + 1} Livre`
                                }
                              >
                                {unit ? (
                                  <div
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, unit)}
                                    onClick={() => setSelectedTableForDetails(table)}
                                    className={`w-full h-full rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-md ring-2 ring-background cursor-grab active:cursor-grabbing hover:scale-115 transition-transform ${
                                      unit.isCompanion ? 'bg-amber-600' : 'bg-primary'
                                    }`}
                                  >
                                    {unit.displayName.substring(0, 2).toUpperCase()}
                                  </div>
                                ) : (
                                  <div className="w-full h-full rounded-full border border-dashed border-border-custom bg-background/70 text-[9px] font-semibold text-foreground/35 flex items-center justify-center">
                                    {i + 1}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Central Circular Table Plate */}
                          <div
                            onClick={() => setSelectedTableForDetails(table)}
                            className={`w-36 h-36 rounded-full border-4 shadow-lg flex flex-col items-center justify-center p-3 z-10 cursor-pointer transition-all duration-200 hover:scale-105 text-center ${
                              isOverCap
                                ? 'border-error bg-error/10'
                                : isFull
                                ? 'border-amber-500 bg-amber-500/10'
                                : 'border-emerald-500 bg-card-bg'
                            }`}
                          >
                            <span
                              className="font-bold text-xs text-foreground truncate max-w-[105px]"
                              title={table.name}
                            >
                              {table.name}
                            </span>
                            <div className="mt-1 flex items-center gap-1">
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  isOverCap
                                    ? 'bg-error text-white'
                                    : isFull
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                }`}
                              >
                                {seatedCount} / {table.capacity} pax
                              </span>
                            </div>
                            <span className="text-[9px] text-foreground/45 mt-1 hover:text-primary underline">
                              Ver Lugares
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16 border border-dashed border-border-custom rounded-xl">
                    <CalendarRange className="h-12 w-12 text-foreground/25 mb-3" />
                    <p className="text-sm font-semibold text-foreground/75">Nenhuma mesa no salão</p>
                    <p className="text-xs text-foreground/50 mt-1 max-w-sm">
                      Clique em &quot;Adicionar Mesa&quot; para desenhar a sua distribuição de lugares.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tables.length > 0 ? (
                  tables.map((table) => {
                    const tableUnits = getTableUnits(table.id);
                    const seatedCount = tableUnits.length;
                    const isOverCap = seatedCount > table.capacity;

                    return (
                      <Card
                        key={table.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnTable(e, table.id)}
                        className={`bg-card-bg flex flex-col min-h-[220px] transition-all border ${
                          isOverCap ? 'border-error/50 bg-error/5' : 'border-border-custom'
                        }`}
                      >
                        {/* Table Header */}
                        <CardHeader className="mb-2 pb-2 border-b border-border-custom flex flex-row items-center justify-between">
                          <div>
                            <CardTitle className="text-sm">{table.name}</CardTitle>
                            <p className="text-[10px] text-foreground/50 mt-0.5">
                              Capacidade: <span className="font-semibold">{table.capacity} lugares</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={isOverCap ? 'error' : seatedCount === table.capacity ? 'success' : 'primary'}>
                              {seatedCount} / {table.capacity}
                            </Badge>
                            <button
                              onClick={() => handleEditTableClick(table)}
                              className="p-1 rounded-full text-foreground/40 hover:bg-secondary hover:text-primary transition-colors cursor-pointer"
                              title="Editar Mesa"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTableClick(table)}
                              className="p-1 rounded-full text-foreground/40 hover:bg-error/15 hover:text-error transition-colors cursor-pointer"
                              title="Remover Mesa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </CardHeader>

                        {/* Table Content (Seated Units) */}
                        <CardContent className="flex-1 overflow-y-auto space-y-1.5 max-h-[160px] pr-1">
                          {tableUnits.length > 0 ? (
                            tableUnits.map((unit) => (
                              <div
                                key={unit.key}
                                draggable
                                onDragStart={(e) => handleDragStart(e, unit)}
                                className="px-2.5 py-1.5 border border-border-custom/50 rounded-lg bg-background/70 hover:border-primary active:scale-[0.98] transition-all cursor-grab flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                  <span className="font-medium truncate max-w-[130px]">{unit.displayName}</span>
                                  {unit.isCompanion ? (
                                    <Badge variant="warning" className="text-[9px] px-1.5 py-0 shrink-0">
                                      Acomp.
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">
                                      Titular
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {unit.isCompanion && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditCompanion(unit);
                                      }}
                                      className="p-1 rounded text-foreground/40 hover:text-amber-600 transition-colors cursor-pointer"
                                      title="Editar nome do acompanhante"
                                    >
                                      <PenLine className="h-3 w-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnseatUnit(unit);
                                    }}
                                    className="p-1 rounded text-foreground/40 hover:text-error transition-colors cursor-pointer"
                                    title="Remover da mesa"
                                  >
                                    <UserMinus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="flex h-full items-center justify-center text-center py-6 text-[10px] text-foreground/40 italic">
                              Mesa vazia. Arraste convidados para aqui.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="col-span-2 flex flex-col items-center justify-center text-center py-12 border border-dashed border-border-custom rounded-xl">
                    <CalendarRange className="h-10 w-10 text-foreground/25 mb-2" />
                    <p className="text-sm font-semibold text-foreground/75">Nenhuma mesa criada</p>
                    <p className="text-xs text-foreground/50 mt-1">
                      Adicione mesas clicando no botão &quot;Adicionar Mesa&quot; no canto superior.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TABLE DETAILS & SEATS DIALOG */}
      <Dialog
        isOpen={selectedTableForDetails !== null}
        onClose={() => setSelectedTableForDetails(null)}
        title={selectedTableForDetails?.name || 'Detalhes da Mesa'}
      >
        {selectedTableForDetails && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-secondary/20 p-3 rounded-xl border border-border-custom/60 text-xs">
              <div>
                <span className="text-foreground/50 text-[10px] block uppercase font-bold">Capacidade</span>
                <span className="font-extrabold text-foreground">
                  {getTableOccupiedCount(selectedTableForDetails.id)} de {selectedTableForDetails.capacity} lugares ocupados
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                  className="text-xs h-7"
                  onClick={() => {
                    handleEditTableClick(selectedTableForDetails);
                    setSelectedTableForDetails(null);
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  className="text-xs h-7 px-2"
                  onClick={() => {
                    handleDeleteTableClick(selectedTableForDetails);
                    setSelectedTableForDetails(null);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-wider">
                Convidados Alocados a esta Mesa
              </h4>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-border-custom rounded-xl border border-border-custom bg-card-bg">
                {getTableUnits(selectedTableForDetails.id).length > 0 ? (
                  getTableUnits(selectedTableForDetails.id).map((unit) => (
                    <div
                      key={unit.key}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-secondary/15 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground truncate">{unit.displayName}</p>
                          {unit.isCompanion ? (
                            <Badge variant="warning" className="text-[9px] py-0 px-1.5">
                              Acompanhante
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[9px] py-0 px-1.5">
                              Titular
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-foreground/50">
                          {unit.isCompanion ? `Acomp. de ${unit.titularName}` : 'Convidado Principal'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={
                            unit.status === 'Confirmed'
                              ? 'success'
                              : unit.status === 'Declined'
                              ? 'error'
                              : 'warning'
                          }
                        >
                          {unit.status === 'Confirmed'
                            ? 'Confirmado'
                            : unit.status === 'Declined'
                            ? 'Recusado'
                            : 'Pendente'}
                        </Badge>
                        {unit.isCompanion && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditCompanion(unit)}
                            className="p-1.5 rounded-lg text-foreground/50 hover:bg-amber-500/10 hover:text-amber-600 transition-colors cursor-pointer"
                            title="Editar nome do acompanhante"
                          >
                            <PenLine className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleUnseatUnit(unit)}
                          className="p-1.5 rounded-lg text-foreground/50 hover:bg-error/10 hover:text-error transition-colors cursor-pointer"
                          title="Tirar da mesa"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-foreground/45 italic">
                    Nenhum convidado sentado nesta mesa ainda.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedTableForDetails(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* CREATE TABLE DIALOG */}
      <Dialog isOpen={tableModalOpen} onClose={() => setTableModalOpen(false)} title={tableToEdit ? "Editar Mesa" : "Adicionar Mesa"}>
        <form onSubmit={handleSubmit(handleSaveTable)} className="space-y-4">
          <Input
            label="Identificação da Mesa (ex: Mesa 1, Mesa de Honra)"
            placeholder="Mesa 10"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Capacidade Máxima (Lugares)"
            type="number"
            error={errors.capacity?.message}
            {...register('capacity')}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setTableModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">{tableToEdit ? "Guardar Alterações" : "Criar Mesa"}</Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Eliminar Mesa">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-error shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Deseja eliminar esta mesa?</p>
              <p className="text-xs text-foreground/60 mt-1">
                Ao eliminar a mesa <span className="font-semibold">{tableToDelete?.name}</span>, todos os convidados a ela alocados voltarão para a lista de &quot;Sem Mesa&quot;. Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDeleteTable}>
              Eliminar Mesa
            </Button>
          </div>
        </div>
      </Dialog>

      {/* EDIT COMPANION NAME DIALOG */}
      <Dialog
        isOpen={companionModalOpen}
        onClose={() => setCompanionModalOpen(false)}
        title="Nome do Acompanhante"
      >
        <div className="space-y-4">
          <p className="text-xs text-foreground/60">
            Personalize o nome deste acompanhante de{' '}
            <strong className="text-foreground">{editingCompanion?.titularName}</strong>. Este nome será
            apresentado na distribuição de mesas, cartões e PDF do salão.
          </p>

          <Input
            label="Nome do Acompanhante"
            value={companionNameInput}
            onChange={(e) => setCompanionNameInput(e.target.value)}
            placeholder="Ex: Carlos Santos"
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setCompanionModalOpen(false)}
              disabled={isSavingCompanion}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveCompanionName}
              disabled={isSavingCompanion || !companionNameInput.trim()}
            >
              {isSavingCompanion ? 'A guardar...' : 'Guardar Nome'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
