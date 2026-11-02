'use client';

import React, { useState, useEffect } from 'react';
import { StaffPass, Vendor, Event } from '@/types';
import { StaffPassRepository } from '@/repositories/staff-pass.repository';
import {
  downloadStaffPassesPDF,
  downloadSingleStaffPassPDF,
  downloadStaffPassDigitalCardPNG,
  getCategoryStyle,
} from '@/utils/staff-pass-pdf';
import { generateQRCode } from '@/utils/qr';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Award,
  Plus,
  Printer,
  Download,
  Trash2,
  Share2,
  Users,
  Building2,
  ShieldCheck,
  Search,
  Loader2,
  FileText,
  QrCode,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';

interface StaffPassTabProps {
  event: Event;
  vendors: Vendor[];
}

const DEFAULT_CATEGORIES = [
  'Catering / Buffet',
  'Bar / Cocktail',
  'Segurança Privada',
  'Fotografia / Vídeo',
  'Som / DJ / Iluminação',
  'Decoração & Flores',
  'Protocolo & Receção',
  'Limpeza & Manutenção',
  'Outro Serviço',
];

export default function StaffPassTab({ event, vendors }: StaffPassTabProps) {
  const [passes, setPasses] = useState<StaffPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form State
  const [mode, setMode] = useState<'single' | 'batch'>('batch');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('custom');
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [roleTitle, setRoleTitle] = useState('Garçom');
  const [holderName, setHolderName] = useState('');
  const [batchQuantity, setBatchQuantity] = useState(5);
  const [accessLevel, setAccessLevel] = useState('Zona de Serviço / Cozinha');

  // QR Preview Cache for Cards
  const [qrPreviews, setQrPreviews] = useState<Record<string, string>>({});

  const loadPasses = async () => {
    setLoading(true);
    try {
      const data = await StaffPassRepository.getAll(event.id);
      setPasses(data);

      // Pre-generate QR thumbnails for cards
      const map: Record<string, string> = {};
      await Promise.all(
        data.slice(0, 30).map(async (p) => {
          map[p.id] = await generateQRCode(
            JSON.stringify({
              token: p.qr_token,
              staffPassId: p.id,
              eventId: p.event_id,
              role: p.role_title,
              company: p.company_name,
            }),
            { width: 140, margin: 1 }
          );
        })
      );
      setQrPreviews(map);
    } catch (err) {
      console.error('Erro ao carregar passes de staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const handleOpenModal = () => {
    // If vendors exist, prefill with first vendor
    if (vendors.length > 0) {
      setSelectedVendorId(vendors[0].id);
      setCompanyName(vendors[0].name);
      setCategory(vendors[0].category || DEFAULT_CATEGORIES[0]);
    } else {
      setSelectedVendorId('custom');
      setCompanyName('');
      setCategory(DEFAULT_CATEGORIES[0]);
    }
    setMode('batch');
    setRoleTitle('Garçom');
    setHolderName('');
    setBatchQuantity(5);
    setAccessLevel('Zona de Serviço / Cozinha');
    setModalOpen(true);
  };

  const handleVendorSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVendorId(val);
    if (val === 'custom') {
      setCompanyName('');
    } else {
      const v = vendors.find((vend) => vend.id === val);
      if (v) {
        setCompanyName(v.name);
        if (v.category) setCategory(v.category);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !roleTitle.trim()) {
      alert('Por favor, preencha o nome da empresa e a função do colaborador.');
      return;
    }

    setIsSubmitting(true);
    try {
      const basePassData = {
        event_id: event.id,
        vendor_id: selectedVendorId !== 'custom' ? selectedVendorId : null,
        company_name: companyName.trim(),
        category,
        role_title: roleTitle.trim(),
        access_level: accessLevel,
      };

      if (mode === 'single') {
        await StaffPassRepository.create({
          ...basePassData,
          holder_name: holderName.trim() || 'Equipa de Serviço',
        });
      } else {
        const qty = Math.max(1, Math.min(50, Number(batchQuantity) || 1));
        const batch = Array.from({ length: qty }).map((_, i) => ({
          ...basePassData,
          holder_name: `${roleTitle.trim()} #${String(i + 1).padStart(2, '0')}`,
        }));
        await StaffPassRepository.createBatch(batch);
      }

      setModalOpen(false);
      await loadPasses();
    } catch (err) {
      console.error(err);
      alert('Erro ao emitir passes. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePass = async (passId: string) => {
    if (!confirm('Deseja anular e eliminar este passe de credenciamento?')) return;
    try {
      await StaffPassRepository.delete(passId, event.id);
      setPasses((prev) => prev.filter((p) => p.id !== passId));
    } catch (err) {
      console.error('Erro ao eliminar passe:', err);
    }
  };

  const handleDownloadAllPDF = async () => {
    if (passes.length === 0) return;
    setIsDownloadingAll(true);
    try {
      await downloadStaffPassesPDF(
        filteredPasses,
        event.title,
        event.date ? new Date(event.date).toLocaleDateString('pt-AO') : undefined,
        `crachas-staff-${event.slug || 'evento'}.pdf`
      );
    } catch (err) {
      console.error('Erro ao gerar PDF de passes:', err);
      alert('Ocorreu um erro ao gerar o PDF para impressão.');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleDownloadSinglePDF = async (pass: StaffPass) => {
    setActionLoadingId(`pdf_${pass.id}`);
    try {
      await downloadSingleStaffPassPDF(
        pass,
        event.title,
        event.date ? new Date(event.date).toLocaleDateString('pt-AO') : undefined
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadSinglePNG = async (pass: StaffPass) => {
    setActionLoadingId(`png_${pass.id}`);
    try {
      await downloadStaffPassDigitalCardPNG(
        pass,
        event.title,
        event.date ? new Date(event.date).toLocaleDateString('pt-AO') : undefined
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered passes
  const filteredPasses = passes.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch =
      search.trim() === '' ||
      p.company_name.toLowerCase().includes(search.toLowerCase()) ||
      p.role_title.toLowerCase().includes(search.toLowerCase()) ||
      (p.holder_name && p.holder_name.toLowerCase().includes(search.toLowerCase())) ||
      p.qr_token.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const uniqueCompanies = Array.from(new Set(passes.map((p) => p.company_name)));

  return (
    <div className="space-y-6">
      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card-bg border border-border-custom p-4 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
              Total de Passes Emitidos
            </p>
            <p className="text-2xl font-black text-foreground">{passes.length}</p>
          </div>
        </div>

        <div className="bg-card-bg border border-border-custom p-4 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
              Fornecedores Cobertos
            </p>
            <p className="text-2xl font-black text-foreground">{uniqueCompanies.length}</p>
          </div>
        </div>

        <div className="bg-card-bg border border-border-custom p-4 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
              Segurança & Portaria
            </p>
            <p className="text-xs font-semibold text-emerald-600 mt-1">
              ✓ Validação via QR ativa
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card-bg border border-border-custom p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <input
              type="text"
              placeholder="Pesquisar por empresa, função ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-secondary/15 border border-border-custom/60 rounded-xl focus:outline-none focus:border-primary text-foreground"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-2 px-3 text-xs bg-secondary/15 border border-border-custom/60 rounded-xl focus:outline-none focus:border-primary text-foreground cursor-pointer"
          >
            <option value="all">Todas as Categorias</option>
            {DEFAULT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {passes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={
                isDownloadingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )
              }
              disabled={isDownloadingAll}
              onClick={handleDownloadAllPDF}
              title="Baixar folha A4 pronta para imprimir e recortar"
            >
              Imprimir Todos (PDF)
            </Button>
          )}

          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenModal}
          >
            Emitir Credenciais
          </Button>
        </div>
      </div>

      {/* Passes Grid */}
      {loading ? (
        <div className="py-16 text-center text-foreground/50 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs">A carregar credenciais de staff...</p>
        </div>
      ) : filteredPasses.length === 0 ? (
        <div className="bg-card-bg border border-border-custom rounded-2xl p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {passes.length === 0
              ? 'Nenhuma credencial de staff emitida ainda'
              : 'Nenhum passe corresponde aos filtros aplicados'}
          </h3>
          <p className="text-xs text-foreground/60 max-w-md mx-auto">
            {passes.length === 0
              ? 'Emita crachás digitais e para impressão para os garçons, seguranças, barmen, fotógrafos e técnicos do casamento.'
              : 'Tente alterar os termos da sua pesquisa ou selecionar outra categoria.'}
          </p>
          {passes.length === 0 && (
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenModal}
              className="mt-2"
            >
              Emitir Primeiros Passes
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredPasses.map((pass) => {
            const qrThumb = qrPreviews[pass.id];
            const style = getCategoryStyle(pass.category, pass.role_title);
            const displayName = pass.holder_name?.trim() || pass.role_title;

            return (
              <div
                key={pass.id}
                className="bg-white border-2 border-zinc-200 dark:border-zinc-700/80 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all flex flex-col justify-between group relative"
              >
                {/* Delete button (hover) */}
                <button
                  type="button"
                  onClick={() => handleDeletePass(pass.id)}
                  className="absolute top-2.5 right-2.5 text-zinc-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
                  title="Eliminar passe"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {/* Badge Body (Authentic Lanyard Badge Look) */}
                <div className="p-4 flex flex-col items-center text-center space-y-2">
                  {/* Lanyard Slot Cutout Guide */}
                  <div className="w-12 h-2.5 rounded-full bg-zinc-100 border border-zinc-300 mx-auto" />

                  {/* Meu Boda Circular Logo Emblem */}
                  <div className="w-11 h-11 rounded-full border border-zinc-200 p-1 bg-white shadow-xs flex items-center justify-center">
                    <img
                      src="/logo_meu_boda.png"
                      alt="Meu Boda"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[8px] font-bold tracking-widest text-zinc-400 uppercase">
                    Meu Boda
                  </span>

                  {/* Person Name (Bold, Modern like reference 2c.jpeg) */}
                  <div className="space-y-0.5 pt-0.5 w-full px-1">
                    <h4 className="text-sm font-black text-zinc-900 truncate">
                      {displayName}
                    </h4>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight truncate">
                      {pass.role_title} • {pass.company_name}
                    </p>
                    <p className="text-[9px] text-zinc-400 truncate">
                      {event.title}
                    </p>
                  </div>

                  {/* Centered QR Code */}
                  <div className="p-2 bg-white rounded-xl border border-zinc-200 shadow-inner max-w-[130px] w-full aspect-square flex flex-col items-center justify-center my-1">
                    {qrThumb ? (
                      <img
                        src={qrThumb}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <QrCode className="h-10 w-10 text-zinc-300 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                    {pass.qr_token.substring(0, 10)}
                  </span>
                </div>

                {/* Bottom Sector Banner (Solid colored block with giant STAFF like 2c.jpeg) */}
                <div
                  style={{ backgroundColor: style.hex }}
                  className="px-3 py-2.5 text-white text-center rounded-b-2xl space-y-0.5 shadow-inner"
                >
                  <p className="text-base font-black tracking-widest uppercase leading-none">
                    STAFF
                  </p>
                  <p className="text-[9px] font-bold text-white/90 uppercase tracking-tight truncate">
                    {pass.category} • {pass.access_level || 'Acesso Autorizado'}
                  </p>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="p-2 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDownloadSinglePDF(pass)}
                    disabled={actionLoadingId === `pdf_${pass.id}`}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                    title="Baixar Crachá em PDF"
                  >
                    {actionLoadingId === `pdf_${pass.id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin text-zinc-600" />
                    ) : (
                      <FileText className="h-3 w-3 text-zinc-600" />
                    )}
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadSinglePNG(pass)}
                    disabled={actionLoadingId === `png_${pass.id}`}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                    title="Baixar Cartão Imagem PNG para enviar pelo WhatsApp"
                  >
                    {actionLoadingId === `png_${pass.id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                    ) : (
                      <Share2 className="h-3 w-3" />
                    )}
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Emitir Credenciais de Staff / Serviço"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Emission Mode Toggle */}
          <div className="flex p-1 bg-secondary/20 rounded-xl border border-border-custom/60">
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'batch'
                  ? 'bg-card-bg text-primary shadow-sm'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Em Lote por Quantidade (ex: 8 Garçons)
            </button>
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'single'
                  ? 'bg-card-bg text-primary shadow-sm'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Passe Nominal Individual
            </button>
          </div>

          {/* Vendor Picker / Company Name */}
          <div>
            <label className="text-xs font-bold text-foreground/80 block mb-1">
              Fornecedor / Empresa Prestadora
            </label>
            {vendors.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={selectedVendorId}
                  onChange={handleVendorSelectChange}
                  className="w-full text-xs p-2.5 rounded-xl bg-secondary/15 border border-border-custom/60 text-foreground focus:outline-none focus:border-primary"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.category})
                    </option>
                  ))}
                  <option value="custom">✍️ Outra Empresa / Fornecedor Não Listado...</option>
                </select>

                {selectedVendorId === 'custom' && (
                  <input
                    type="text"
                    placeholder="Nome da Empresa (ex: Cocktail Luanda, Som & Luz Lda)..."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-xl bg-secondary/15 border border-border-custom/60 text-foreground focus:outline-none focus:border-primary"
                  />
                )}
              </div>
            ) : (
              <input
                type="text"
                placeholder="Nome da Empresa (ex: Gourmet Angola, Segurança Alpha)..."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl bg-secondary/15 border border-border-custom/60 text-foreground focus:outline-none focus:border-primary"
              />
            )}
          </div>

          {/* Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground/80 block mb-1">
                Categoria / Área de Atuação
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-secondary/15 border border-border-custom/60 text-foreground focus:outline-none focus:border-primary"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground/80 block mb-1">
                Função no Evento
              </label>
              <input
                type="text"
                placeholder="Ex: Garçom, Barman, Segurança, DJ..."
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl bg-secondary/15 border border-border-custom/60 text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Mode specific fields */}
          {mode === 'single' ? (
            <div>
              <label className="text-xs font-bold text-foreground/80 block mb-1">
                Nome do Colaborador (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Carlos Alberto, DJ Malvado..."
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-secondary/15 border border-border-custom/60 text-foreground focus:outline-none focus:border-primary"
              />
              <p className="text-[10px] text-foreground/50 mt-1">
                Se deixar em branco, o passe terá o título da função.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-foreground/80 block mb-1">
                Quantidade de Passes a Emitir (1 a 50)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={batchQuantity}
                onChange={(e) => setBatchQuantity(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl bg-secondary/15 border border-border-custom/60 text-foreground focus:outline-none focus:border-primary"
              />
              <p className="text-[10px] text-foreground/50 mt-1">
                Serão gerados {batchQuantity} passes numerados (ex: {roleTitle} #01 a {roleTitle} #{String(batchQuantity).padStart(2, '0')}).
              </p>
            </div>
          )}

          {/* Access Level */}
          <div>
            <label className="text-xs font-bold text-foreground/80 block mb-1">
              Zona de Acesso Autorizada
            </label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl bg-secondary/15 border border-border-custom/60 text-foreground focus:outline-none focus:border-primary"
            >
              <option value="Zona de Serviço / Cozinha">Zona de Serviço / Cozinha</option>
              <option value="Acesso Geral de Serviço">Acesso Geral de Serviço</option>
              <option value="Palco / Cabine Técnica">Palco / Cabine Técnica</option>
              <option value="Área VIP / Salão Principal">Área VIP / Salão Principal</option>
              <option value="Portaria & Segurança Externa">Portaria & Segurança Externa</option>
            </select>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border-custom">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  A emitir...
                </>
              ) : (
                'Emitir Passes'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
