'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { TableRepository } from '@/repositories/table.repository';
import { GuestRepository } from '@/repositories/guest.repository';
import { Table, Guest } from '@/types';
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
  CalendarRange,
  Plus,
  Trash2,
  Users,
  AlertCircle,
  Loader2,
  CheckCircle,
  Edit2,
  Download,
} from 'lucide-react';

export default function MesasPage() {
  const { currentEvent } = useEvent();
  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableToEdit, setTableToEdit] = useState<Table | null>(null);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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
      const tableGuests = guests.filter((g) => g.table_id === table.id);

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
      
      const seatedCount = tableGuests.reduce((sum, g) => sum + 1 + (g.companions || 0), 0);
      doc.text(`${cleanStr(table.name)} (Capacidade: ${table.capacity} pax | Ocupado: ${seatedCount} pax)`, 18, yPos + 6);
      
      yPos += 12;

      // Draw table columns for guests
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Convidado', 20, yPos);
      doc.text('Acompanhantes', 100, yPos);
      doc.text('Estado RSVP', 140, yPos);
      doc.line(18, yPos + 1.5, 192, yPos + 1.5);
      
      yPos += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      if (tableGuests.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.text('Nenhum convidado sentado nesta mesa.', 20, yPos);
        yPos += 8;
      } else {
        tableGuests.forEach((guest) => {
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

          doc.text(cleanStr(guest.name), 20, yPos);
          doc.text(guest.companions ? `+${guest.companions}` : '0', 100, yPos);
          doc.text(normalizeStatus(guest.status), 140, yPos);
          
          yPos += 5.5;
        });
        
        yPos += 4; // gap
      }
    });

    // Add unassigned guests section at the end if there are any
    const unassignedGuests = guests.filter((g) => !g.table_id);
    if (unassignedGuests.length > 0) {
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
      
      const unseatedCount = unassignedGuests.reduce((sum, g) => sum + 1 + (g.companions || 0), 0);
      doc.text(`Convidados sem mesa organizada (Total: ${unassignedGuests.length} convites | ${unseatedCount} pax)`, 18, yPos + 6);
      
      yPos += 12;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Convidado', 20, yPos);
      doc.text('Acompanhantes', 100, yPos);
      doc.text('Estado RSVP', 140, yPos);
      doc.line(18, yPos + 1.5, 192, yPos + 1.5);
      
      yPos += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);

      unassignedGuests.forEach((guest) => {
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

        doc.text(cleanStr(guest.name), 20, yPos);
        doc.text(guest.companions ? `+${guest.companions}` : '0', 100, yPos);
        doc.text(normalizeStatus(guest.status), 140, yPos);
        
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

  // NATIVE HTML5 DRAG & DROP HANDLERS
  const handleDragStart = (e: React.DragEvent, guestId: string) => {
    e.dataTransfer.setData('text/plain', guestId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnTable = async (e: React.DragEvent, tableId: string) => {
    e.preventDefault();
    const guestId = e.dataTransfer.getData('text/plain');
    if (!guestId) return;

    const guest = guests.find((g) => g.id === guestId);
    if (!guest) return;

    // Check table capacity limits
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const companionsCount = guest.companions || 0;
    const guestGroupSize = 1 + companionsCount;

    const currentSeatedCount = guests
      .filter((g) => g.table_id === tableId)
      .reduce((sum, g) => sum + 1 + (g.companions || 0), 0);

    if (currentSeatedCount + guestGroupSize > table.capacity) {
      alert(`Aviso: A mesa '${table.name}' ultrapassará a capacidade máxima!`);
    }

    try {
      await GuestRepository.update(guestId, { table_id: tableId });
      // Update local state instantly for UI fluid response
      setGuests((prev) =>
        prev.map((g) => (g.id === guestId ? { ...g, table_id: tableId } : g))
      );
    } catch (err) {
      console.error('Error placing guest in table:', err);
    }
  };

  const handleDropOnUnseated = async (e: React.DragEvent) => {
    e.preventDefault();
    const guestId = e.dataTransfer.getData('text/plain');
    if (!guestId) return;

    try {
      await GuestRepository.update(guestId, { table_id: null });
      setGuests((prev) =>
        prev.map((g) => (g.id === guestId ? { ...g, table_id: null } : g))
      );
    } catch (err) {
      console.error('Error unseating guest:', err);
    }
  };

  // Seating Stats
  const unseatedGuests = guests.filter((g) => g.table_id === null);

  const getTableGuests = (tableId: string) => {
    return guests.filter((g) => g.table_id === tableId);
  };

  const getTableOccupiedCount = (tableId: string) => {
    return getTableGuests(tableId).reduce((sum, g) => sum + 1 + (g.companions || 0), 0);
  };

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-primary" /> Distribuição de Mesas (Seating Chart)
          </h1>
          <p className="text-sm text-foreground/60">
            Arraste e solte os convidados nas mesas correspondentes para gerenciar a ocupação do salão.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {loading ? (
        <div className="flex h-40 w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left panel: Unseated Guests */}
          <Card
            className="lg:col-span-4 bg-card-bg max-h-[75vh] flex flex-col p-4 border border-border-custom"
            onDragOver={handleDragOver}
            onDrop={handleDropOnUnseated}
          >
            <div className="mb-4">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" /> Convidados Sem Mesa ({unseatedGuests.length})
              </h3>
              <p className="text-xs text-foreground/50 mt-1">Arraste para uma mesa para acomodar.</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[250px]">
              {unseatedGuests.length > 0 ? (
                unseatedGuests.map((guest) => (
                  <div
                    key={guest.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, guest.id)}
                    className="p-3 border border-border-custom rounded-xl bg-background hover:border-primary active:scale-[0.98] transition-all cursor-grab flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold">{guest.name}</p>
                      {guest.family_group && (
                        <p className="text-[10px] text-foreground/50 font-medium">Grupo: {guest.family_group}</p>
                      )}
                    </div>
                    {guest.companions > 0 && (
                      <Badge variant="secondary">+{guest.companions}</Badge>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-10 text-foreground/40 border border-dashed border-border-custom rounded-xl">
                  <CheckCircle className="h-8 w-8 text-success mb-2" />
                  <p className="text-xs font-semibold">Tudo organizado!</p>
                  <p className="text-[10px] text-foreground/50 mt-0.5">Todos os convidados têm mesa.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Right panel: Tables Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.length > 0 ? (
              tables.map((table) => {
                const seatedCount = getTableOccupiedCount(table.id);
                const tableGuests = getTableGuests(table.id);
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

                    {/* Table Content (Seated Guests) */}
                    <CardContent className="flex-1 overflow-y-auto space-y-1.5 max-h-[160px] pr-1">
                      {tableGuests.length > 0 ? (
                        tableGuests.map((guest) => (
                          <div
                            key={guest.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, guest.id)}
                            className="px-2.5 py-1.5 border border-border-custom/50 rounded-lg bg-background/70 hover:border-primary active:scale-[0.98] transition-all cursor-grab flex items-center justify-between text-xs"
                          >
                            <span className="font-medium truncate max-w-[150px]">{guest.name}</span>
                            <span className="text-[10px] text-foreground/50 flex items-center gap-1">
                              {guest.companions > 0 && <span className="font-bold text-primary">+{guest.companions}</span>}
                              <span>({1 + guest.companions}p)</span>
                            </span>
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
        </div>
      )}

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
    </div>
  );
}
