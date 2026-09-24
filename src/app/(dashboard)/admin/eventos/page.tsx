'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventSchema } from '@/validations/schemas';
import { EventRepository } from '@/repositories/event.repository';
import { ScheduleRepository } from '@/repositories/schedule.repository';
import { InfoBlockRepository } from '@/repositories/infoblock.repository';
import { supabase } from '@/lib/supabase';
import { EventSchedule, EventInfoBlock } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Heart, MapPin, Calendar, Palette, Loader2, Plus, Trash2, Clock, Users, Gift, Link2, Shirt, Info, Pencil, Sparkles, Upload, Sliders, CheckCircle2, RotateCcw, QrCode, FileText, AlertCircle } from 'lucide-react';
import { resolveCanvaConfig, persistCanvaConfig, CANVA_CONFIG_BLOCK_TITLE, isMarinelaAbiudEvent, isCleanCanvaUrl } from '@/utils/canvaConfig';
import { parseEventInitials } from '@/utils/eventHelpers';

export default function EventosPage() {
  const { currentEvent, refreshEvents, setCurrentEvent } = useEvent();
  const isMarinela = isMarinelaAbiudEvent(currentEvent);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Canva Template States
  const [templateSource, setTemplateSource] = useState<'basic' | 'custom'>('basic');
  const [pdfMode, setPdfMode] = useState<'double_page' | 'single_page'>('double_page');
  const [showLocationsQr, setShowLocationsQr] = useState(true);
  const [showAccessQr, setShowAccessQr] = useState(true);
  const [canvaCoverUrl, setCanvaCoverUrl] = useState<string>('');
  const [canvaInfoUrl, setCanvaInfoUrl] = useState<string>('');
  const [qrLocCoords, setQrLocCoords] = useState<{ left: number; top: number; width: number; height: number }>({
    left: 8.76,
    top: 69.56,
    width: 11.85,
    height: 16.76,
  });
  const [qrAccessCoords, setQrAccessCoords] = useState<{ left: number; top: number; width: number; height: number }>({
    left: 80.99,
    top: 54.14,
    width: 13.10,
    height: 18.52,
  });
  const [isUploadingCanvaCover, setIsUploadingCanvaCover] = useState(false);
  const [isUploadingCanvaInfo, setIsUploadingCanvaInfo] = useState(false);
  const [isSavingCanva, setIsSavingCanva] = useState(false);
  const [canvaSuccessMessage, setCanvaSuccessMessage] = useState<string | null>(null);
  const [showQrFineTuning, setShowQrFineTuning] = useState(false);

  // Timeline / Schedules States
  const [schedules, setSchedules] = useState<EventSchedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);

  // Info Blocks States
  const [infoBlocks, setInfoBlocks] = useState<EventInfoBlock[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [infoBlockModalOpen, setInfoBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<EventInfoBlock | null>(null);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockContent, setBlockContent] = useState('');
  const [isSavingBlock, setIsSavingBlock] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(eventSchema),
  });

  const coverImageUrl = watch('cover_image');
  const backgroundImage = watch('background_image');
  const watchedSlug = watch('slug');
  const watchedType = watch('type') || currentEvent?.type || 'casamento';

  // Real-time slug availability check with debounce
  useEffect(() => {
    if (!watchedSlug || !currentEvent) {
      setSlugStatus('idle');
      return;
    }

    const cleanSlug = watchedSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // If unchanged from current event's slug, it's valid
    if (cleanSlug === currentEvent.slug) {
      setSlugStatus('idle');
      return;
    }

    if (cleanSlug.length < 2) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      const isAvail = await EventRepository.isSlugAvailable(cleanSlug, currentEvent.id);
      setSlugStatus(isAvail ? 'available' : 'taken');
    }, 400);

    return () => clearTimeout(timer);
  }, [watchedSlug, currentEvent]);

  // Reset form when active event changes
  useEffect(() => {
    if (currentEvent) {
      // Format ISO string to datetime-local compatible string (YYYY-MM-DDTHH:MM)
      const dateObj = new Date(currentEvent.date);
      const tzOffset = dateObj.getTimezoneOffset() * 60000;
      const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);

      reset({
        type: (currentEvent.type as any) || 'casamento',
        title: currentEvent.title,
        slug: currentEvent.slug,
        date: localISOTime,
        ceremony_location: currentEvent.ceremony_location || '',
        party_location: currentEvent.party_location || '',
        theme: currentEvent.theme || '',
        cover_image: currentEvent.cover_image || '',
        background_image: currentEvent.background_image || '',
        description: currentEvent.description || '',
        ceremony_time: currentEvent.ceremony_time || '',
        ceremony_maps_url: currentEvent.ceremony_maps_url || '',
        party_time: currentEvent.party_time || '',
        party_maps_url: currentEvent.party_maps_url || '',
        // Guest Manual & Important Info
        dress_code_style: currentEvent.dress_code_style || '',
        dress_code_colors: currentEvent.dress_code_colors || '',
        gift_suggestions: currentEvent.gift_suggestions || '',
        kids_restriction_note: currentEvent.kids_restriction_note || '',
        instagram_host_1: currentEvent.instagram_host_1 || '',
        instagram_host_2: currentEvent.instagram_host_2 || '',
        rsvp_deadline: currentEvent.rsvp_deadline || '',
      });

      const resolved = resolveCanvaConfig(currentEvent.id, currentEvent.template_config, null, null, currentEvent);
      setTemplateSource(resolved.template_source || (resolved.canva_cover_url || resolved.canva_info_url || isMarinela ? 'custom' : 'basic'));
      setCanvaCoverUrl(resolved.canva_cover_url || '');
      setCanvaInfoUrl(resolved.canva_info_url || '');
      setPdfMode(resolved.pdf_mode || 'double_page');
      setShowLocationsQr(resolved.show_locations_qr !== false);
      setShowAccessQr(resolved.show_access_qr !== false);
      if (resolved.qr_locations_coords) {
        setQrLocCoords(resolved.qr_locations_coords);
      } else {
        setQrLocCoords({ left: 8.76, top: 69.56, width: 11.85, height: 16.76 });
      }
      if (resolved.qr_access_coords) {
        setQrAccessCoords(resolved.qr_access_coords);
      } else {
        setQrAccessCoords({ left: 80.99, top: 54.14, width: 13.10, height: 18.52 });
      }
    }
  }, [currentEvent, reset]);

  // Load schedules
  const loadSchedules = async () => {
    if (!currentEvent) return;
    setIsLoadingSchedules(true);
    try {
      const data = await ScheduleRepository.getAll(currentEvent.id);
      setSchedules(data);
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  // Load info blocks
  const loadInfoBlocks = async () => {
    if (!currentEvent) return;
    setIsLoadingBlocks(true);
    try {
      const data = await InfoBlockRepository.getAll(currentEvent.id);
      // Filter out internal canva config block so user only sees their real custom blocks
      const realBlocks = data.filter((b) => b.title !== CANVA_CONFIG_BLOCK_TITLE);
      setInfoBlocks(realBlocks);

      // Check if there is an internal canva config block to restore values
      const canvaBlock = data.find((b) => b.title === CANVA_CONFIG_BLOCK_TITLE);
      if (canvaBlock?.content) {
        try {
          const parsed = JSON.parse(canvaBlock.content);
          if (parsed.template_source) setTemplateSource(parsed.template_source);
          if (parsed.canva_cover_url && isCleanCanvaUrl(parsed.canva_cover_url, isMarinela)) {
            setCanvaCoverUrl(parsed.canva_cover_url);
          } else if (!isMarinela) {
            setCanvaCoverUrl('');
          }
          if (parsed.canva_info_url && isCleanCanvaUrl(parsed.canva_info_url, isMarinela)) {
            setCanvaInfoUrl(parsed.canva_info_url);
          } else if (!isMarinela) {
            setCanvaInfoUrl('');
          }
          if (parsed.qr_locations_coords) setQrLocCoords(parsed.qr_locations_coords);
          if (parsed.qr_access_coords) setQrAccessCoords(parsed.qr_access_coords);
          if (parsed.pdf_mode) setPdfMode(parsed.pdf_mode);
          if (parsed.show_locations_qr !== undefined) setShowLocationsQr(parsed.show_locations_qr);
          if (parsed.show_access_qr !== undefined) setShowAccessQr(parsed.show_access_qr);
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error loading info blocks:', err);
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  useEffect(() => {
    loadSchedules();
    loadInfoBlocks();
  }, [currentEvent]);

  // Handle Cover Image Upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentEvent) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentEvent.id}/capa_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('invitations')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('invitations')
        .getPublicUrl(fileName);

      setValue('cover_image', publicUrl);
    } catch (err: any) {
      alert('Erro ao carregar a imagem: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Background Image Upload
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentEvent) return;

    setIsUploadingBg(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentEvent.id}/fundo_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('invitations')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('invitations')
        .getPublicUrl(fileName);

      setValue('background_image', publicUrl);
    } catch (err: any) {
      alert('Erro ao carregar a imagem de fundo: ' + err.message);
    } finally {
      setIsUploadingBg(false);
    }
  };

  // Handle Canva Cover Image Upload
  const handleCanvaCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentEvent) return;

    setIsUploadingCanvaCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentEvent.id}/canva_capa_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('invitations')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('invitations')
        .getPublicUrl(fileName);

      setCanvaCoverUrl(publicUrl);
      setTemplateSource('custom');

      // Auto-save across all storage layers
      const updatedConfig = {
        ...(currentEvent.template_config || {}),
        template_source: 'custom' as const,
        canva_cover_url: publicUrl,
        canva_info_url: canvaInfoUrl || null,
        qr_locations_coords: qrLocCoords,
        qr_access_coords: qrAccessCoords,
        pdf_mode: pdfMode,
        show_locations_qr: showLocationsQr,
        show_access_qr: showAccessQr,
      };
      await persistCanvaConfig(currentEvent.id, updatedConfig);

      setCurrentEvent({
        ...currentEvent,
        template_config: updatedConfig,
      });

      setCanvaSuccessMessage('Capa do Canva carregada e modelo personalizado ativado!');
      setTimeout(() => setCanvaSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Erro ao carregar a imagem da capa do Canva: ' + err.message);
    } finally {
      setIsUploadingCanvaCover(false);
    }
  };

  // Handle Canva Info Image Upload
  const handleCanvaInfoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentEvent) return;

    setIsUploadingCanvaInfo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentEvent.id}/canva_verso_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('invitations')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('invitations')
        .getPublicUrl(fileName);

      setCanvaInfoUrl(publicUrl);
      setTemplateSource('custom');

      // Auto-save across all storage layers
      const updatedConfig = {
        ...(currentEvent.template_config || {}),
        template_source: 'custom' as const,
        canva_cover_url: canvaCoverUrl || null,
        canva_info_url: publicUrl,
        qr_locations_coords: qrLocCoords,
        qr_access_coords: qrAccessCoords,
        pdf_mode: pdfMode,
        show_locations_qr: showLocationsQr,
        show_access_qr: showAccessQr,
      };
      await persistCanvaConfig(currentEvent.id, updatedConfig);

      setCurrentEvent({
        ...currentEvent,
        template_config: updatedConfig,
      });

      setCanvaSuccessMessage('Verso do Canva carregado e modelo personalizado ativado!');
      setTimeout(() => setCanvaSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Erro ao carregar a imagem do verso do Canva: ' + err.message);
    } finally {
      setIsUploadingCanvaInfo(false);
    }
  };

  // Remove Canva Cover
  const handleRemoveCanvaCover = async () => {
    if (!currentEvent) return;
    setCanvaCoverUrl('');
    const newSource: 'basic' | 'custom' = canvaInfoUrl ? 'custom' : 'basic';
    setTemplateSource(newSource);
    try {
      const updatedConfig = {
        ...(currentEvent.template_config || {}),
        template_source: newSource,
        canva_cover_url: null,
        canva_info_url: canvaInfoUrl || null,
        qr_locations_coords: qrLocCoords,
        qr_access_coords: qrAccessCoords,
        pdf_mode: pdfMode,
        show_locations_qr: showLocationsQr,
        show_access_qr: showAccessQr,
      };
      await persistCanvaConfig(currentEvent.id, updatedConfig);
      setCurrentEvent({
        ...currentEvent,
        template_config: updatedConfig,
      });
      setCanvaSuccessMessage(isMarinela ? 'Capa reposta para o modelo oficial de Marinela & Abiúd.' : 'Capa reposta para o Template Básico Padrão.');
      setTimeout(() => setCanvaSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Erro ao remover capa do Canva: ' + err.message);
    }
  };

  // Remove Canva Info
  const handleRemoveCanvaInfo = async () => {
    if (!currentEvent) return;
    setCanvaInfoUrl('');
    const newSource: 'basic' | 'custom' = canvaCoverUrl ? 'custom' : 'basic';
    setTemplateSource(newSource);
    try {
      const updatedConfig = {
        ...(currentEvent.template_config || {}),
        template_source: newSource,
        canva_cover_url: canvaCoverUrl || null,
        canva_info_url: null,
        qr_locations_coords: qrLocCoords,
        qr_access_coords: qrAccessCoords,
        pdf_mode: pdfMode,
        show_locations_qr: showLocationsQr,
        show_access_qr: showAccessQr,
      };
      await persistCanvaConfig(currentEvent.id, updatedConfig);
      setCurrentEvent({
        ...currentEvent,
        template_config: updatedConfig,
      });
      setCanvaSuccessMessage(isMarinela ? 'Verso reposto para o modelo oficial de Marinela & Abiúd.' : 'Verso reposto para o Template Básico Padrão.');
      setTimeout(() => setCanvaSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Erro ao remover verso do Canva: ' + err.message);
    }
  };

  // Save Canva Template Configuration (including QR coordinates)
  const handleSaveCanvaConfig = async () => {
    if (!currentEvent) return;
    setIsSavingCanva(true);
    setCanvaSuccessMessage(null);
    try {
      const updatedConfig = {
        ...(currentEvent.template_config || {}),
        template_source: templateSource,
        canva_cover_url: canvaCoverUrl || null,
        canva_info_url: canvaInfoUrl || null,
        qr_locations_coords: qrLocCoords,
        qr_access_coords: qrAccessCoords,
        pdf_mode: pdfMode,
        show_locations_qr: showLocationsQr,
        show_access_qr: showAccessQr,
      };
      await persistCanvaConfig(currentEvent.id, updatedConfig);
      setCurrentEvent({
        ...currentEvent,
        template_config: updatedConfig,
      });
      setCanvaSuccessMessage('Configurações do Template Canva guardadas com sucesso!');
      setTimeout(() => setCanvaSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Erro ao guardar configurações do Canva: ' + err.message);
    } finally {
      setIsSavingCanva(false);
    }
  };

  // Reset QR Coordinates to default Canva dimensions
  const handleResetCanvaDefaults = () => {
    if (pdfMode === 'single_page') {
      if (!confirm('Deseja repor as posições padrão dos códigos QR para Página Única?')) return;
      setQrLocCoords({ left: 10, top: 76, width: 14, height: 18 });
      setQrAccessCoords({ left: 76, top: 76, width: 14, height: 18 });
    } else {
      if (!confirm('Deseja repor as posições padrão dos códigos QR para Frente e Verso (Tríptico)?')) return;
      setQrLocCoords({ left: 8.76, top: 69.56, width: 11.85, height: 16.76 });
      setQrAccessCoords({ left: 80.99, top: 54.14, width: 13.10, height: 18.52 });
    }
  };

  // Add Schedule Item
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent || !newTime || !newTitle || !newLocation) return;

    setIsAddingSchedule(true);
    try {
      const newSched = await ScheduleRepository.create({
        event_id: currentEvent.id,
        time: newTime,
        title: newTitle,
        location: newLocation,
      });
      if (newSched) {
        setNewTime('');
        setNewTitle('');
        setNewLocation('');
        loadSchedules();
      }
    } catch (err: any) {
      alert('Erro ao criar item na agenda: ' + err.message);
    } finally {
      setIsAddingSchedule(false);
    }
  };

  // Delete Schedule Item
  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Deseja realmente eliminar este item da agenda?')) return;
    try {
      const success = await ScheduleRepository.delete(id);
      if (success) {
        loadSchedules();
      }
    } catch (err: any) {
      alert('Erro ao eliminar item da agenda: ' + err.message);
    }
  };

  // Info Block CRUD
  const openAddBlockModal = () => {
    setEditingBlock(null);
    setBlockTitle('');
    setBlockContent('');
    setInfoBlockModalOpen(true);
  };

  const openEditBlockModal = (block: EventInfoBlock) => {
    setEditingBlock(block);
    setBlockTitle(block.title);
    setBlockContent(block.content);
    setInfoBlockModalOpen(true);
  };

  const handleSaveBlock = async () => {
    if (!currentEvent || !blockTitle.trim() || !blockContent.trim()) return;
    setIsSavingBlock(true);
    try {
      if (editingBlock) {
        await InfoBlockRepository.update(editingBlock.id, {
          title: blockTitle.trim(),
          content: blockContent.trim(),
        });
      } else {
        await InfoBlockRepository.create({
          event_id: currentEvent.id,
          title: blockTitle.trim(),
          content: blockContent.trim(),
          sort_order: infoBlocks.length,
        });
      }
      setInfoBlockModalOpen(false);
      loadInfoBlocks();
    } catch (err: any) {
      alert('Erro ao guardar bloco: ' + err.message);
    } finally {
      setIsSavingBlock(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm('Deseja eliminar esta informação?')) return;
    try {
      await InfoBlockRepository.delete(id);
      loadInfoBlocks();
    } catch (err: any) {
      alert('Erro ao eliminar: ' + err.message);
    }
  };

  const onSubmit = async (data: any) => {
    if (!currentEvent) return;

    setSuccessMessage(null);
    setErrorMessage(null);

    const cleanSlug = (data.slug || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Block if slug is already marked as taken
    if (slugStatus === 'taken') {
      setErrorMessage(`O link "${cleanSlug}" já está em uso por outro evento na base de dados. Por favor escolha um link diferente.`);
      return;
    }

    if (cleanSlug && cleanSlug !== currentEvent.slug) {
      const isAvail = await EventRepository.isSlugAvailable(cleanSlug, currentEvent.id);
      if (!isAvail) {
        setSlugStatus('taken');
        setErrorMessage(`O link "${cleanSlug}" já está em uso por outro evento na base de dados. Por favor escolha um link diferente.`);
        return;
      }
    }

    setIsSaving(true);

    try {
      const updatedConfig = {
        ...(currentEvent.template_config || {}),
        template_source: templateSource,
        canva_cover_url: canvaCoverUrl || null,
        canva_info_url: canvaInfoUrl || null,
        qr_locations_coords: qrLocCoords,
        qr_access_coords: qrAccessCoords,
        pdf_mode: pdfMode,
        show_locations_qr: showLocationsQr,
        show_access_qr: showAccessQr,
      };

      await persistCanvaConfig(currentEvent.id, updatedConfig);

      const updatedEvent = await EventRepository.update(currentEvent.id, {
        type: data.type,
        title: data.title,
        slug: cleanSlug || data.slug,
        date: new Date(data.date).toISOString(),
        ceremony_location: data.ceremony_location || null,
        party_location: data.party_location || null,
        theme: data.theme || null,
        cover_image: data.cover_image || null,
        background_image: data.background_image || null,
        description: data.description || null,
        ceremony_time: data.ceremony_time || null,
        ceremony_maps_url: data.ceremony_maps_url || null,
        party_time: data.party_time || null,
        party_maps_url: data.party_maps_url || null,
        // Guest Manual & Important Info
        dress_code_style: data.dress_code_style || null,
        dress_code_colors: data.dress_code_colors || null,
        gift_suggestions: data.gift_suggestions || null,
        kids_restriction_note: data.kids_restriction_note || null,
        instagram_host_1: data.instagram_host_1 || null,
        instagram_host_2: data.instagram_host_2 || null,
        rsvp_deadline: data.rsvp_deadline || null,
        template_config: updatedConfig,
      });

      if (updatedEvent) {
        setSuccessMessage('Configurações do evento guardadas com sucesso!');
        await refreshEvents();
        setCurrentEvent({
          ...updatedEvent,
          template_config: updatedConfig,
        });
      } else {
        setErrorMessage('Não foi possível guardar as alterações. Verifique se o link da URL já se encontra registado.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro ao guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentEvent) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <p className="text-foreground/50 text-sm">Nenhum evento selecionado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" /> O Evento
        </h1>
        <p className="text-sm text-foreground/60">
          Gerencie as informações principais do seu evento, datas, locais e detalhes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Form */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-card-bg">
            <CardHeader>
              <CardTitle>Editar Detalhes do Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <form id="event-main-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {successMessage && (
                  <div className="rounded-xl bg-success/15 p-3 text-xs text-success font-medium">
                    {successMessage}
                  </div>
                )}
                {errorMessage && (
                  <div className="rounded-xl bg-error/15 p-3 text-xs text-error font-medium">
                    {errorMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground/75 tracking-wide">Tipo de Evento</label>
                    <select
                      {...register('type')}
                      className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    >
                      <option value="casamento">Casamento</option>
                      <option value="casamento_tradicional">Casamento Tradicional</option>
                      <option value="noivado">Noivado</option>
                      <option value="aniversario">Aniversário</option>
                      <option value="outro">Outro Evento</option>
                    </select>
                  </div>
                  <Input
                    label="Título do Evento"
                    placeholder="Ana & Pedro"
                    error={errors.title?.message}
                    {...register('title')}
                  />
                  <div>
                    <Input
                      label="Slug da URL"
                      placeholder="ana-pedro"
                      error={slugStatus === 'taken' ? 'Este link já está em uso na base de dados' : (errors.slug?.message as string | undefined)}
                      {...register('slug')}
                    />
                    {slugStatus === 'checking' && (
                      <div className="flex items-center gap-1.5 text-xs text-foreground/55 mt-1.5 animate-pulse">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        <span>A verificar disponibilidade na base de dados...</span>
                      </div>
                    )}
                    {slugStatus === 'taken' && (
                      <div className="rounded-xl bg-error/10 border border-error/25 p-3 mt-1.5 text-xs text-error flex items-start gap-2.5 animate-in fade-in">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-error" />
                        <div className="flex-1">
                          <p className="font-bold">Link já existente na base de dados</p>
                          <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                            O link <strong>"{watchedSlug}"</strong> já pertence a outro evento. Por favor escolha um link diferente.
                          </p>
                        </div>
                      </div>
                    )}
                    {slugStatus === 'available' && watchedSlug && watchedSlug !== currentEvent.slug && (
                      <div className="rounded-xl bg-success/10 border border-success/25 p-2 mt-1.5 text-xs text-success flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        <span>Link disponível: <strong>meuboda.ao/convite/{watchedSlug}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Data e Hora"
                    type="datetime-local"
                    error={errors.date?.message}
                    {...register('date')}
                  />
                  <Input
                    label="Tema do Evento (ex: Rústico, Boho)"
                    placeholder="Minimalista Elegante"
                    error={errors.theme?.message}
                    {...register('theme')}
                  />
                </div>

                {/* Localização Principal & Coordenadas GPS (Para todos os tipos de eventos) */}
                <div className="border-t border-border-custom pt-4 mt-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-primary">
                      {watchedType === 'casamento'
                        ? 'Cerimónia / Igreja'
                        : watchedType === 'casamento_tradicional'
                        ? 'Local do Casamento Tradicional'
                        : watchedType === 'noivado'
                        ? 'Local do Noivado'
                        : watchedType === 'aniversario'
                        ? 'Local do Aniversário / Festa Principal'
                        : 'Local Principal do Evento'}
                    </h4>
                    <span className="text-[10px] text-foreground/50">Localização e Coordenadas GPS</span>
                  </div>
                  <Input
                    label={watchedType === 'casamento' ? 'Igreja / Local da Cerimónia' : 'Nome do Local Principal'}
                    placeholder={watchedType === 'casamento' ? 'Igreja de Nossa Senhora de Fátima, Luanda' : 'ex: Salão Lookal, Ilha de Luanda'}
                    error={errors.ceremony_location?.message}
                    {...register('ceremony_location')}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label={watchedType === 'casamento' ? 'Hora da Cerimónia' : 'Hora de Início'}
                      placeholder="Ex: 15:30"
                      error={errors.ceremony_time?.message}
                      {...register('ceremony_time')}
                    />
                    <Input
                      label="Link Google Maps / Endereço / Coordenadas"
                      placeholder="Ex: -8.8159,13.2306 ou link maps"
                      error={errors.ceremony_maps_url?.message}
                      {...register('ceremony_maps_url')}
                      helperText="Cole coordenadas (latitude, longitude), link do Google Maps ou endereço."
                    />
                  </div>
                </div>

                {/* Localização Secundária / Festa / Recepção (Para todos os tipos de eventos) */}
                <div className="border-t border-border-custom pt-4 mt-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-primary">
                      {watchedType === 'casamento'
                        ? "Copo d'Água / Festa"
                        : "Local Secundário / Recepção / Festa (Opcional)"}
                    </h4>
                    <span className="text-[10px] text-foreground/50">Opcional</span>
                  </div>
                  <Input
                    label={watchedType === 'casamento' ? "Local do Copo d'Água / Festa" : "Nome do Local Secundário / Festa"}
                    placeholder={watchedType === 'casamento' ? 'Salão de Festas Lookal, Ilha de Luanda' : 'Local secundário de celebração'}
                    error={errors.party_location?.message}
                    {...register('party_location')}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Hora da Festa"
                      placeholder="Ex: 18:00"
                      error={errors.party_time?.message}
                      {...register('party_time')}
                    />
                    <Input
                      label="Link Google Maps / Endereço / Coordenadas"
                      placeholder="Ex: -8.7992,13.2185 ou link maps"
                      error={errors.party_maps_url?.message}
                      {...register('party_maps_url')}
                      helperText="Cole coordenadas (latitude, longitude), link do Google Maps ou endereço."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/75 tracking-wide block">
                    Imagem de Capa / Convite
                  </label>
                  
                  {coverImageUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-border-custom bg-secondary/10 h-40 w-full mb-3 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverImageUrl}
                        alt="Preview da Capa"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setValue('cover_image', '')}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors shadow-md text-xs font-bold"
                      >
                        Remover
                      </button>
                    </div>
                  )}

                  <div className="flex gap-4 items-center">
                    <Input
                      placeholder="Cole o URL da imagem ou carregue um ficheiro..."
                      error={errors.cover_image?.message}
                      className="flex-1"
                      {...register('cover_image')}
                    />
                    <label className="shrink-0">
                      <div className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all cursor-pointer shadow-md">
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Carregar Ficheiro'
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border-custom pt-4">
                  <label className="text-xs font-semibold text-foreground/75 tracking-wide block">
                    Foto de Fundo / Galeria do Evento (Website)
                  </label>
                  <p className="text-[11px] text-foreground/60">
                    Foto do casal ou textura para o fundo do website. Para o design do convite em PDF / impressão, configure na secção &quot;Template Canva&quot; mais abaixo.
                  </p>
                  
                  {backgroundImage && (
                    <div className="relative rounded-xl overflow-hidden border border-border-custom bg-secondary/10 h-40 w-full mb-3 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={backgroundImage}
                        alt="Preview do Fundo"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setValue('background_image', '')}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors shadow-md text-xs font-bold"
                      >
                        Remover
                      </button>
                    </div>
                  )}

                  <div className="flex gap-4 items-center">
                    <Input
                      placeholder="Cole o URL da imagem de fundo ou carregue um ficheiro..."
                      error={errors.background_image?.message}
                      className="flex-1"
                      {...register('background_image')}
                    />
                    <label className="shrink-0">
                      <div className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all cursor-pointer shadow-md">
                        {isUploadingBg ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Carregar Ficheiro'
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBgUpload}
                        disabled={isUploadingBg}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-foreground/50">
                    *Esta imagem de fundo será usada nas outras páginas do PDF do convite (como a página do QR Code, agenda, etc.).
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground/75 tracking-wide">
                    Descrição do Evento
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Escreva uma mensagem de boas-vindas aos convidados..."
                    className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('description')}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    isLoading={isSaving}
                    disabled={isSaving || slugStatus === 'taken' || slugStatus === 'checking'}
                  >
                    Guardar Alterações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Template Canva para Convite Impresso / PDF */}
          <Card className="bg-card-bg border border-border-custom overflow-hidden">
            <CardHeader className="border-b border-border-custom bg-secondary/5 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-amber-500" /> Template Canva do Convite (PDF / Impressão)
                  </CardTitle>
                  <p className="text-xs text-foreground/60 mt-1">
                    Por padrão, os eventos usam o <strong>Template Básico Dinâmico</strong> com códigos QR. Para personalizar o convite impresso/PDF, faça o upload das artes desenhadas no Canva.
                  </p>
                </div>
                <Badge variant="default" className="self-start sm:self-center border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                  {templateSource === 'basic'
                    ? (pdfMode === 'single_page' ? 'Template Básico (1 Página)' : 'Template Básico (2 Páginas)')
                    : canvaCoverUrl || canvaInfoUrl
                    ? (pdfMode === 'single_page' ? 'Canva Personalizado (1 Página)' : 'Canva Personalizado (2 Páginas)')
                    : isMarinela
                    ? 'Canva Oficial (Marinela & Abiúd)'
                    : 'Template Personalizado (Sem Ficheiros)'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {canvaSuccessMessage && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{canvaSuccessMessage}</span>
                </div>
              )}

              {/* Seletor de Modelo: Básico vs Canva Personalizado */}
              <div className="bg-secondary/15 p-4 rounded-2xl border border-border-custom space-y-3">
                <div>
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    Modelo do Convite (PDF / Impressão)
                  </label>
                  <p className="text-[11px] text-foreground/60">
                    Selecione se deseja usar o template padrão do sistema com monograma e códigos QR automáticos, ou se prefere utilizar as suas artes personalizadas desenhadas no Canva.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTemplateSource('basic')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      templateSource === 'basic'
                        ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                        : 'border-border-custom bg-card-bg/60 hover:bg-secondary/30 text-foreground/75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        ✨ Template Básico do Sistema (Padrão)
                      </span>
                      {templateSource === 'basic' && (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-foreground/60 mt-1 leading-relaxed">
                      Design elegante gerado pelo Meu Boda com selo monograma, dados do evento e códigos QR dinâmicos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateSource('custom')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      templateSource === 'custom'
                        ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                        : 'border-border-custom bg-card-bg/60 hover:bg-secondary/30 text-foreground/75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        🎨 Template Personalizado do Canva
                      </span>
                      {templateSource === 'custom' && (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-foreground/60 mt-1 leading-relaxed">
                      Carregue as suas artes desenhadas no Canva. Os códigos QR serão sobrepostos com precisão milimétrica.
                    </p>
                  </button>
                </div>
              </div>

              {/* Seletor de Formato do PDF / Template */}
              <div className="bg-secondary/15 p-4 rounded-2xl border border-border-custom space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      Formato do Convite / PDF
                    </label>
                    <p className="text-[11px] text-foreground/60">
                      Escolha se o seu convite possui frente e verso (2 páginas dobráveis) ou apenas 1 página única.
                    </p>
                  </div>
                  <div className="inline-flex p-1 bg-secondary/30 rounded-xl border border-border-custom shrink-0">
                    <button
                      type="button"
                      onClick={() => setPdfMode('double_page')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        pdfMode === 'double_page'
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      📖 Frente e Verso (2 Páginas)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfMode('single_page')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        pdfMode === 'single_page'
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      📄 Página Única (1 Página)
                    </button>
                  </div>
                </div>

                {/* Opções de QR para Página Única */}
                {pdfMode === 'single_page' && (
                  <div className="pt-2 border-t border-border-custom/50 flex flex-wrap items-center gap-4 text-xs animate-in fade-in">
                    <span className="text-[11px] font-semibold text-foreground/70">Códigos QR a sobrepor na página:</span>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showAccessQr}
                        onChange={(e) => setShowAccessQr(e.target.checked)}
                        className="rounded border-border-custom text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="text-foreground">QR de Acesso / Portaria</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showLocationsQr}
                        onChange={(e) => setShowLocationsQr(e.target.checked)}
                        className="rounded border-border-custom text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="text-foreground">QR de Localização (Mapas)</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Frente do Convite (Capa ou Página Única) */}
                <div className="space-y-3 bg-secondary/5 p-4 rounded-2xl border border-border-custom flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        {pdfMode === 'single_page' ? '1. Página Única do Convite' : '1. Frente / Capa'}
                      </label>
                      <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {pdfMode === 'single_page' ? 'PDF (1 Página)' : 'Página 1 do PDF'}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/60">
                      {pdfMode === 'single_page'
                        ? 'Arte do convite em folha única desenhada no Canva.'
                        : 'Arte da capa dobrável desenhada no Canva.'}
                    </p>

                    {/* Preview da Capa / Página Única */}
                    <div className="relative aspect-[16/11.3] w-full rounded-xl overflow-hidden border border-border-custom bg-black/5 shadow-inner flex items-center justify-center group">
                      {templateSource === 'custom' && canvaCoverUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={canvaCoverUrl}
                          alt="Pré-visualização da Capa Canva"
                          className="w-full h-full object-cover"
                        />
                      ) : templateSource === 'custom' && isMarinela ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src="/templates/canva/page_1.png"
                          alt="Pré-visualização da Capa Oficial Marinela & Abiúd"
                          className="w-full h-full object-cover"
                        />
                      ) : templateSource === 'custom' ? (
                        /* Placeholder para Template Personalizado sem upload */
                        <div className="w-full h-full bg-secondary/15 p-4 flex flex-col justify-center items-center text-center">
                          <Upload className="h-8 w-8 text-foreground/40 mb-2" />
                          <p className="text-xs font-semibold text-foreground/80">Nenhuma arte carregada</p>
                          <p className="text-[10px] text-foreground/50 max-w-[220px] mt-0.5">
                            Carregue a imagem da {pdfMode === 'single_page' ? 'página única' : 'capa'} do convite no campo abaixo.
                          </p>
                        </div>
                      ) : (
                        /* Template Básico Dinâmico (Padrão para outros eventos) */
                        <div className="w-full h-full bg-[#FAF8F5] p-3 flex flex-col justify-between items-center text-center font-serif text-[#1c1c1e] border-2 border-[#D4AF37] relative">
                          <div className="absolute inset-1 border border-[#E8D49E] pointer-events-none" />
                          <div className="my-auto space-y-1 relative z-10">
                            <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] mx-auto flex items-center justify-center text-[#B89742] text-sm font-bold bg-[#FAF8F5]">
                              {parseEventInitials(currentEvent?.title).initials || 'MB'}
                            </div>
                            <p className="text-[9px] uppercase tracking-widest text-[#8A7348] font-semibold">
                              {pdfMode === 'single_page' ? 'Página Única' : 'Capa do Convite'}
                            </p>
                            <h3 className="text-sm font-bold text-[#1A1A1A] line-clamp-1 max-w-[220px]">{currentEvent?.title || 'Título do Evento'}</h3>
                            <p className="text-[10px] text-[#2D241E]">
                              {currentEvent?.date ? new Date(currentEvent.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Data do Evento'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Se for Página Única e Arte Personalizada, sobrepor os códigos QR configurados */}
                      {pdfMode === 'single_page' && templateSource === 'custom' && (canvaCoverUrl || isMarinela) && (
                        <>
                          {showLocationsQr && (
                            <div
                              className="absolute border-2 border-emerald-500 bg-white/95 text-emerald-900 rounded-sm flex flex-col items-center justify-center p-0.5 shadow-md select-none transition-all z-20"
                              style={{
                                left: `${qrLocCoords.left}%`,
                                top: `${qrLocCoords.top}%`,
                                width: `${qrLocCoords.width}%`,
                                height: `${qrLocCoords.height}%`,
                              }}
                              title="Posição do Código QR de Localizações"
                            >
                              <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-[8px] font-bold text-emerald-800 leading-tight text-center truncate w-full px-0.5">
                                QR Mapa
                              </span>
                            </div>
                          )}
                          {showAccessQr && (
                            <div
                              className="absolute border-2 border-indigo-500 bg-white/95 text-indigo-900 rounded-sm flex flex-col items-center justify-center p-0.5 shadow-md select-none transition-all z-20"
                              style={{
                                left: `${qrAccessCoords.left}%`,
                                top: `${qrAccessCoords.top}%`,
                                width: `${qrAccessCoords.width}%`,
                                height: `${qrAccessCoords.height}%`,
                              }}
                              title="Posição do Código QR de Acesso à Portaria"
                            >
                              <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                              <span className="text-[8px] font-bold text-indigo-800 leading-tight text-center truncate w-full px-0.5">
                                QR Acesso
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded text-[10px] font-medium z-30">
                        {templateSource === 'basic'
                          ? (pdfMode === 'single_page' ? 'Página Única (Template Básico)' : 'Capa (Template Básico)')
                          : canvaCoverUrl 
                          ? (pdfMode === 'single_page' ? 'Página Única Personalizada' : 'Capa Personalizada') 
                          : isMarinela
                          ? (pdfMode === 'single_page' ? 'Página Única Oficial (Marinela & Abiúd)' : 'Capa Oficial (Marinela & Abiúd)')
                          : (pdfMode === 'single_page' ? 'Página Única (Sem Arte)' : 'Capa (Sem Arte)')}
                      </div>
                      {canvaCoverUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveCanvaCover}
                          className="absolute top-2 right-2 bg-red-600/90 text-white rounded-lg px-2 py-1 text-[11px] font-medium hover:bg-red-700 transition-colors shadow-md z-30"
                        >
                          Repor Padrão
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload Controls */}
                  <div className="space-y-2 pt-2">
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="URL da imagem da frente..."
                        value={canvaCoverUrl}
                        onChange={(e) => setCanvaCoverUrl(e.target.value)}
                        className="text-xs h-9"
                      />
                      <label className="shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all cursor-pointer shadow-sm">
                          {isUploadingCanvaCover ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5" />
                              <span>Carregar</span>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCanvaCoverUpload}
                          disabled={isUploadingCanvaCover}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. Verso do Convite (Informações e Códigos QR ou Aviso de Página Única) */}
                {pdfMode === 'single_page' ? (
                  <div className="space-y-3 bg-secondary/5 p-6 rounded-2xl border border-dashed border-border-custom flex flex-col justify-center items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center text-foreground/40 mb-2">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground">Verso Desativado</h4>
                      <span className="text-[10px] font-medium bg-secondary text-foreground/70 px-2.5 py-0.5 rounded-full inline-block">
                        Modo Página Única Ativo
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/60 max-w-xs leading-relaxed mt-1">
                      O PDF do convite será gerado com apenas 1 página, omitindo o verso. Todos os códigos QR configurados estão sobrepostos diretamente na página frontal.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPdfMode('double_page')}
                      className="text-xs text-primary underline font-semibold hover:text-primary/80 pt-2 cursor-pointer"
                    >
                      Mudar para Frente e Verso (2 Páginas)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 bg-secondary/5 p-4 rounded-2xl border border-border-custom flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                          2. Verso / Miolo
                        </label>
                        <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Página 2 do PDF
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground/60">
                        Arte com os 3 painéis (Localização, Mensagem e Acesso).
                      </p>

                      {/* Preview Interativo do Verso com sobreposição dos Códigos QR */}
                      <div className="relative aspect-[16/11.3] w-full rounded-xl overflow-hidden border border-border-custom bg-black/5 shadow-inner group">
                        {templateSource === 'custom' && canvaInfoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={canvaInfoUrl}
                            alt="Pré-visualização do Verso Canva"
                            className="w-full h-full object-cover"
                          />
                        ) : templateSource === 'custom' && isMarinela ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src="/templates/canva/page_2_clean.png"
                            alt="Pré-visualização do Verso Oficial Marinela & Abiúd"
                            className="w-full h-full object-cover"
                          />
                        ) : templateSource === 'custom' ? (
                          /* Placeholder para Verso Personalizado sem upload */
                          <div className="w-full h-full bg-secondary/15 p-4 flex flex-col justify-center items-center text-center">
                            <Upload className="h-8 w-8 text-foreground/40 mb-2" />
                            <p className="text-xs font-semibold text-foreground/80">Nenhum verso carregado</p>
                            <p className="text-[10px] text-foreground/50 max-w-[220px] mt-0.5">
                              Carregue a imagem do verso do convite no campo abaixo.
                            </p>
                          </div>
                        ) : (
                          /* Template Básico Dinâmico Verso (3 Painéis) */
                          <div className="w-full h-full bg-[#FAF8F5] p-2 flex font-serif text-[#1c1c1e] border-2 border-[#D4AF37] relative">
                            <div className="absolute inset-1 border border-[#E8D49E] pointer-events-none" />
                            {/* Painel 1: Localizações */}
                            <div className="flex-1 border-r border-[#E8D49E]/70 p-1 flex flex-col justify-between items-center text-center">
                              <div>
                                <p className="text-[8px] font-bold text-[#B89742] uppercase">Localizações</p>
                                <p className="text-[7px] text-zinc-600 line-clamp-1 mt-0.5">{currentEvent?.ceremony_location || 'Cerimónia'}</p>
                                <p className="text-[7px] text-zinc-600 line-clamp-1">{currentEvent?.party_location || 'Copos-de-Água'}</p>
                              </div>
                              <div className="bg-white border border-[#E8D49E] rounded p-1 flex flex-col items-center">
                                <QrCode className="h-4 w-4 text-emerald-600" />
                                <span className="text-[6px] text-zinc-600 font-bold">QR Mapa</span>
                              </div>
                            </div>
                            {/* Painel 2: Celebração */}
                            <div className="flex-1 border-r border-[#E8D49E]/70 p-1 flex flex-col justify-between items-center text-center">
                              <div>
                                <p className="text-[8px] font-bold text-[#B89742] uppercase">Celebração</p>
                                <p className="text-[7px] text-zinc-600 line-clamp-2 mt-0.5">
                                  {currentEvent?.description || 'Esperamos por si para celebrar o nosso amor e união.'}
                                </p>
                              </div>
                              <p className="text-[7px] text-[#8A7348] italic">Meu Boda</p>
                            </div>
                            {/* Painel 3: Passe Entrada */}
                            <div className="flex-1 p-1 flex flex-col justify-between items-center text-center">
                              <div>
                                <p className="text-[8px] font-bold text-[#B89742] uppercase">Passe Entrada</p>
                                <p className="text-[7px] font-bold text-zinc-800 mt-0.5">Convidado</p>
                                <p className="text-[6px] text-zinc-600">Mesa Designada</p>
                              </div>
                              <div className="bg-white border border-[#E8D49E] rounded p-1 flex flex-col items-center">
                                <QrCode className="h-4 w-4 text-indigo-600" />
                                <span className="text-[6px] text-zinc-600 font-bold">QR Acesso</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Caixas de Posição de QR para artes Canva ou Marinela em modo Personalizado */}
                        {templateSource === 'custom' && (canvaInfoUrl || isMarinela) && (
                          <>
                            {/* Caixa 1: Código QR de Localizações (Aba Esquerda) */}
                            <div
                              className="absolute border-2 border-emerald-500 bg-white/95 text-emerald-900 rounded-sm flex flex-col items-center justify-center p-0.5 shadow-md select-none transition-all z-20"
                              style={{
                                left: `${qrLocCoords.left}%`,
                                top: `${qrLocCoords.top}%`,
                                width: `${qrLocCoords.width}%`,
                                height: `${qrLocCoords.height}%`,
                              }}
                              title="Posição do Código QR de Localizações"
                            >
                              <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-[8px] font-bold text-emerald-800 leading-tight text-center truncate w-full px-0.5">
                                QR Mapa
                              </span>
                            </div>

                            {/* Caixa 2: Código QR de Acesso / Portaria (Aba Direita) */}
                            <div
                              className="absolute border-2 border-indigo-500 bg-white/95 text-indigo-900 rounded-sm flex flex-col items-center justify-center p-0.5 shadow-md select-none transition-all z-20"
                              style={{
                                left: `${qrAccessCoords.left}%`,
                                top: `${qrAccessCoords.top}%`,
                                width: `${qrAccessCoords.width}%`,
                                height: `${qrAccessCoords.height}%`,
                              }}
                              title="Posição do Código QR de Acesso à Portaria"
                            >
                              <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                              <span className="text-[8px] font-bold text-indigo-800 leading-tight text-center truncate w-full px-0.5">
                                QR Acesso
                              </span>
                            </div>
                          </>
                        )}

                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded text-[10px] font-medium z-30">
                          {templateSource === 'basic'
                            ? 'Verso (Template Básico)'
                            : canvaInfoUrl 
                            ? 'Verso Personalizado' 
                            : isMarinela 
                            ? 'Verso Oficial (Marinela & Abiúd)' 
                            : 'Verso (Sem Arte)'}
                        </div>
                        {canvaInfoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveCanvaInfo}
                            className="absolute top-2 right-2 bg-red-600/90 text-white rounded-lg px-2 py-1 text-[11px] font-medium hover:bg-red-700 transition-colors shadow-md z-30"
                          >
                            Repor Padrão
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Upload Controls */}
                    <div className="space-y-2 pt-2">
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="URL da imagem do verso..."
                          value={canvaInfoUrl}
                          onChange={(e) => setCanvaInfoUrl(e.target.value)}
                          className="text-xs h-9"
                        />
                        <label className="shrink-0">
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all cursor-pointer shadow-sm">
                            {isUploadingCanvaInfo ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Upload className="h-3.5 w-3.5" />
                                <span>Carregar</span>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCanvaInfoUpload}
                            disabled={isUploadingCanvaInfo}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Ajustes Finos de Posição dos Códigos QR (Opcional / Retrátil) */}
              <div className="border border-border-custom rounded-xl p-4 bg-secondary/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQrFineTuning(!showQrFineTuning)}
                    className="flex items-center gap-2 text-xs font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <Sliders className="h-4 w-4 text-primary" />
                    <span>
                      {showQrFineTuning
                        ? 'Ocultar Ajuste Fino dos Códigos QR'
                        : pdfMode === 'single_page'
                        ? 'Ajustar Posição dos Códigos QR na Página Única (Opcional)'
                        : 'Ajustar Posição dos Códigos QR no Verso (Opcional)'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setQrLocCoords({ left: 10, top: 76, width: 14, height: 18 });
                        setQrAccessCoords({ left: 76, top: 76, width: 14, height: 18 });
                      }}
                      className="text-[11px] bg-secondary/40 hover:bg-secondary px-2.5 py-1 rounded-lg text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
                      title="Aplicar coordenadas ideais para página única"
                    >
                      Padrão Página Única
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQrLocCoords({ left: 8.76, top: 69.56, width: 11.85, height: 16.76 });
                        setQrAccessCoords({ left: 80.99, top: 54.14, width: 13.10, height: 18.52 });
                      }}
                      className="text-[11px] bg-secondary/40 hover:bg-secondary px-2.5 py-1 rounded-lg text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
                      title="Aplicar coordenadas ideais para tríptico"
                    >
                      Padrão Tríptico
                    </button>
                    <button
                      type="button"
                      onClick={handleResetCanvaDefaults}
                      className="flex items-center gap-1 text-[11px] text-foreground/50 hover:text-foreground transition-colors cursor-pointer ml-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Repor</span>
                    </button>
                  </div>
                </div>

                {showQrFineTuning && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border-custom/60 animate-in fade-in">
                    {/* QR Localizações */}
                    <div className="p-3 bg-card-bg rounded-xl border border-emerald-500/20 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Código QR de Localização {pdfMode === 'single_page' ? '(Página Única)' : '(Aba Esquerda)'}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-foreground/60 block mb-1">Posição X (%):</label>
                          <input
                            type="number"
                            step="0.1"
                            value={qrLocCoords.left}
                            onChange={(e) => setQrLocCoords({ ...qrLocCoords, left: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-secondary/10 border border-border-custom rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-foreground/60 block mb-1">Posição Y (%):</label>
                          <input
                            type="number"
                            step="0.1"
                            value={qrLocCoords.top}
                            onChange={(e) => setQrLocCoords({ ...qrLocCoords, top: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-secondary/10 border border-border-custom rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-foreground/60 block mb-1">Largura (%):</label>
                          <input
                            type="number"
                            step="0.1"
                            value={qrLocCoords.width}
                            onChange={(e) => setQrLocCoords({ ...qrLocCoords, width: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-secondary/10 border border-border-custom rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-foreground/60 block mb-1">Altura (%):</label>
                          <input
                            type="number"
                            step="0.1"
                            value={qrLocCoords.height}
                            onChange={(e) => setQrLocCoords({ ...qrLocCoords, height: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-secondary/10 border border-border-custom rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* QR Acesso */}
                    <div className="p-3 bg-card-bg rounded-xl border border-indigo-500/20 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        Código QR de Acesso {pdfMode === 'single_page' ? '(Página Única)' : '(Aba Direita)'}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-foreground/60 block mb-1">Posição X (%):</label>
                          <input
                            type="number"
                            step="0.1"
                            value={qrAccessCoords.left}
                            onChange={(e) => setQrAccessCoords({ ...qrAccessCoords, left: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-secondary/10 border border-border-custom rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-foreground/60 block mb-1">Posição Y (%):</label>
                          <input
                            type="number"
                            step="0.1"
                            value={qrAccessCoords.top}
                            onChange={(e) => setQrAccessCoords({ ...qrAccessCoords, top: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-secondary/10 border border-border-custom rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-foreground/60 block mb-1">Largura (%):</label>
                          <input
                            type="number"
                            step="0.1"
                            value={qrAccessCoords.width}
                            onChange={(e) => setQrAccessCoords({ ...qrAccessCoords, width: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-secondary/10 border border-border-custom rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-foreground/60 block mb-1">Altura (%):</label>
                          <input
                            type="number"
                            step="0.1"
                            value={qrAccessCoords.height}
                            onChange={(e) => setQrAccessCoords({ ...qrAccessCoords, height: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-secondary/10 border border-border-custom rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Guardar Configuração do Template Canva */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border-custom">
                <p className="text-[11px] text-foreground/50">
                  *As alterações de imagens e posições serão aplicadas a todos os PDFs descarregados na página de Convites.
                </p>
                <Button
                  type="button"
                  onClick={handleSaveCanvaConfig}
                  isLoading={isSavingCanva}
                  className="rounded-xl px-5 w-full sm:w-auto"
                >
                  Guardar Template Canva
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Agenda do Dia Card */}
          <Card className="bg-card-bg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Agenda do Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-foreground/60">
                Crie um cronograma dos principais acontecimentos do dia. Isso aparecerá no convite e no ambiente dos convidados.
              </p>

              {/* Form to Add Schedule Item */}
              <form onSubmit={handleAddSchedule} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-secondary/10 p-3 rounded-xl border border-border-custom">
                <Input
                  label="Hora (ex: 16:30)"
                  placeholder="16:30"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  required
                />
                <Input
                  label="O que vai acontecer"
                  placeholder="Cerimónia Religiosa"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="Onde vai acontecer"
                      placeholder="Igreja de Fátima"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    className="h-10 px-3 flex items-center justify-center shrink-0 rounded-xl"
                    isLoading={isAddingSchedule}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </form>

              {/* Schedules List */}
              {isLoadingSchedules ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : schedules.length > 0 ? (
                <div className="relative border-l-2 border-primary/30 ml-3 pl-6 space-y-4 py-2">
                  {schedules.map((sched) => (
                    <div key={sched.id} className="relative group">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-background">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>

                      <div className="flex items-start justify-between bg-card-bg hover:bg-secondary/10 border border-border-custom/50 rounded-xl p-3 shadow-sm transition-all">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary uppercase tracking-wide">
                            <Clock className="h-3 w-3" /> {sched.time}
                          </span>
                          <h4 className="text-sm font-semibold text-foreground">{sched.title}</h4>
                          <span className="text-xs text-foreground/60 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 opacity-70" /> {sched.location}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(sched.id)}
                          className="text-foreground/40 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-border-custom rounded-xl">
                  <Clock className="h-8 w-8 text-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-foreground/50">Nenhum evento adicionado à agenda do dia.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual do Convidado & Informações Importantes Card */}
          <Card className="bg-card-bg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> Manual do Convidado & Informações Importantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-foreground/60 mb-4">
                Estas informações aparecerão no convite digital do convidado. Preencha apenas o que for relevante para o seu evento.
              </p>
              <div className="space-y-6">

                {/* Dress Code */}
                <div className="space-y-3 border-t border-border-custom pt-4">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Shirt className="h-4 w-4" /> Dress Code
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Estilo (ex: Formal, Esporte Fino)"
                      placeholder="Formal"
                      {...register('dress_code_style')}
                    />
                    <Input
                      label="Restrições de Cores"
                      placeholder="Não usar a cor branca"
                      {...register('dress_code_colors')}
                    />
                  </div>
                </div>

                {/* RSVP Deadline */}
                <div className="space-y-3 border-t border-border-custom pt-4">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Data Limite de RSVP
                  </h4>
                  <Input
                    label="Confirmar Presença até (Data Limite)"
                    type="date"
                    helperText="Aparecerá no formulário de confirmação de presença do convidado."
                    {...register('rsvp_deadline')}
                  />
                </div>

                {/* Kids */}
                <div className="space-y-3 border-t border-border-custom pt-4">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Users className="h-4 w-4" /> Nota sobre Crianças (Opcional)
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground/75 tracking-wide">
                      Mensagem sobre Crianças
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Esta é uma celebração reservada a adultos. Com os mais novos celebraremos noutro momento especial."
                      className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      {...register('kids_restriction_note')}
                    />
                  </div>
                </div>

                {/* Instagram */}
                <div className="space-y-3 border-t border-border-custom pt-4">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Link2 className="h-4 w-4" /> Redes Sociais (Instagram)
                  </h4>
                  <p className="text-xs text-foreground/50">Apenas o nome de utilizador sem o @. Os convidados verão botões que abrem diretamente a app do Instagram.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Instagram Anfitrião 1"
                      placeholder="vivalda.tito"
                      {...register('instagram_host_1')}
                    />
                    <Input
                      label="Instagram Anfitrião 2 (Opcional)"
                      placeholder="typsichvivi"
                      {...register('instagram_host_2')}
                    />
                  </div>
                </div>

                {/* Gifts */}
                <div className="space-y-3 border-t border-border-custom pt-4">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Gift className="h-4 w-4" /> Sugestões de Presente
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground/75 tracking-wide">
                      Mensagem e sugestões (uma por linha)
                    </label>
                    <textarea
                      rows={4}
                      placeholder={`A sua presença já é um presente inestimável, mas caso queira presentear:\nPerfume\nCosméticos\nVale-presente\nAcessórios`}
                      className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      {...register('gift_suggestions')}
                    />
                  </div>
                </div>

              </div>

              <div className="flex justify-end pt-4 border-t border-border-custom mt-6">
                <Button type="submit" form="event-main-form" isLoading={isSaving}>
                  Guardar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Informações Extra (Blocos Dinâmicos) */}
          <Card className="bg-card-bg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Informações Extra
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={openAddBlockModal}
              >
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-foreground/60">
                Adicione informações personalizadas que aparecerão no convite do convidado. Ex: IBAN, dados de transporte, estacionamento, alojamento, etc.
              </p>

              {isLoadingBlocks ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : infoBlocks.length > 0 ? (
                <div className="space-y-3">
                  {infoBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-start justify-between gap-3 bg-secondary/10 border border-border-custom/50 rounded-xl p-4 hover:bg-secondary/20 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-foreground">{block.title}</h4>
                        <p className="text-xs text-foreground/70 mt-1 whitespace-pre-line">{block.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditBlockModal(block)}
                          className="text-foreground/40 hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-all"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBlock(block.id)}
                          className="text-foreground/40 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-border-custom rounded-xl">
                  <Info className="h-8 w-8 text-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-foreground/50">Nenhuma informação extra adicionada.</p>
                  <p className="text-[10px] text-foreground/40 mt-1">Use o botão &quot;Adicionar&quot; para criar blocos personalizados.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Preview Card */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-card-bg overflow-hidden p-0 border border-border-custom lg:sticky lg:top-8">
            <div className="h-32 bg-primary/20 relative">
              {currentEvent.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentEvent.cover_image}
                  alt="Capa"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary/30">
                  <Heart className="h-10 w-10 fill-current" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge variant="primary">Ativo</Badge>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-lg font-bold truncate">{currentEvent.title}</h3>
                <p className="text-xs text-primary font-medium tracking-wide">/convite/{currentEvent.slug}</p>
              </div>

              <div className="space-y-2 text-xs text-foreground/70">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 shrink-0 text-foreground/50" />
                  <span>
                    {new Date(currentEvent.date).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {currentEvent.ceremony_location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-foreground/50" />
                    <span className="line-clamp-2">Local: {currentEvent.ceremony_location}</span>
                  </div>
                )}

                {currentEvent.theme && (
                  <div className="flex items-start gap-2">
                    <Palette className="h-4 w-4 shrink-0 text-foreground/50" />
                    <span>Tema: {currentEvent.theme}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Info Block Add/Edit Dialog */}
      <Dialog
        isOpen={infoBlockModalOpen}
        onClose={() => setInfoBlockModalOpen(false)}
        title={editingBlock ? 'Editar Informação Extra' : 'Adicionar Informação Extra'}
      >
        <div className="space-y-4">
          <Input
            label="Título"
            placeholder="Ex: Transferência Bancária, Estacionamento, Alojamento..."
            value={blockTitle}
            onChange={(e) => setBlockTitle(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground/75 tracking-wide">
              Conteúdo
            </label>
            <textarea
              rows={5}
              placeholder={`Escreva aqui as informações que deseja partilhar com os convidados.\n\nEx:\nIBAN: AO06 0040 0000 1234 5678 1016 7\nTitular: Ana Silva`}
              value={blockContent}
              onChange={(e) => setBlockContent(e.target.value)}
              className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setInfoBlockModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveBlock}
              isLoading={isSavingBlock}
              disabled={!blockTitle.trim() || !blockContent.trim()}
            >
              {editingBlock ? 'Guardar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
