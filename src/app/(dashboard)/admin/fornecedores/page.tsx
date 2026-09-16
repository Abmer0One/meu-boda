'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { VendorRepository } from '@/repositories/vendor.repository';
import { Vendor, VendorContract } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vendorSchema } from '@/validations/schemas';
import MarketplaceTab from '@/components/marketplace/MarketplaceTab';
import ChatTab from '@/components/marketplace/ChatTab';
import { ContractRepository } from '@/repositories/marketplace.repository';
import { downloadReceiptPDF } from '@/utils/receipt-pdf';
import { supabase } from '@/lib/supabase';
import {
  Briefcase,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Globe,
  AlertCircle,
  Loader2,
  DollarSign,
  Search,
  MessageSquare,
  Sparkles,
  Paperclip,
  ExternalLink,
  Upload,
  CreditCard,
  CheckCircle2
} from 'lucide-react';

export default function FornecedoresPage() {
  const { currentEvent } = useEvent();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contratos' | 'explorar' | 'mensagens'>('contratos');
  const [preselectedRoomId, setPreselectedRoomId] = useState<string | null>(null);

  // Modals state
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

  // Receipt Modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<VendorContract | null>(null);
  const [selectedInstallmentIndex, setSelectedInstallmentIndex] = useState<number>(0);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(vendorSchema),
  });

  const loadData = async () => {
    if (!currentEvent) return;
    setLoading(true);
    try {
      const [fetchedVendors, fetchedContracts] = await Promise.all([
        VendorRepository.getAll(currentEvent.id),
        ContractRepository.getContractsForEvent(currentEvent.id)
      ]);

      setContracts(fetchedContracts);

      // Auto-enrich contacts from vendor_profiles if missing (e.g. for already contracted vendors)
      const enrichedVendors = await Promise.all(
        fetchedVendors.map(async (v) => {
          if (!v.phone || !v.email || !v.website) {
            const { data: vp } = await supabase
              .from('vendor_profiles')
              .select('phone, email, website')
              .eq('company_name', v.name)
              .maybeSingle();

            if (vp && (vp.phone || vp.email || vp.website)) {
              const updated = {
                ...v,
                phone: v.phone || vp.phone || null,
                email: v.email || vp.email || null,
                website: v.website || vp.website || null,
              };

              // Asynchronously persist to database so it stays saved
              if (
                (vp.phone && !v.phone) ||
                (vp.email && !v.email) ||
                (vp.website && !v.website)
              ) {
                supabase
                  .from('vendors')
                  .update({
                    phone: updated.phone,
                    email: updated.email,
                    website: updated.website
                  })
                  .eq('id', v.id)
                  .then(() => {});
              }

              return updated;
            }
          }
          return v;
        })
      );

      setVendors(enrichedVendors);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReceiptModal = (contract: VendorContract, index: number) => {
    setSelectedContract(contract);
    setSelectedInstallmentIndex(index);
    setReceiptFile(null);
    setReceiptNotes('');
    setReceiptModalOpen(true);
  };

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract || !receiptFile || !currentEvent) return;
    setIsUploadingReceipt(true);
    try {
      const cleanFileName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${currentEvent.id}/${selectedContract.id}_inst${selectedInstallmentIndex}_${Date.now()}_${cleanFileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) {
        console.error('Error uploading receipt to storage:', uploadErr);
        alert('Erro ao carregar o comprovativo. Verifique se o bucket "receipts" foi configurado no Supabase.');
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      await ContractRepository.submitReceipt(
        selectedContract.id,
        selectedInstallmentIndex,
        publicUrlData.publicUrl,
        receiptFile.name,
        receiptNotes
      );

      // Send chat message in room if room exists
      const myUid = (await supabase.auth.getUser()).data.user?.id;
      if (myUid && selectedContract.room_id) {
        const amount = selectedContract.payment_installments?.[selectedInstallmentIndex]?.amount || 0;
        await supabase.from('chat_messages').insert({
          room_id: selectedContract.room_id,
          sender_id: myUid,
          content: `📎 Comprovativo de pagamento submetido para a prestação #${selectedInstallmentIndex + 1} (${amount.toLocaleString('pt-AO')} Kz). Aguarda validação do fornecedor.`
        });
      }

      setReceiptModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erro ao submeter comprovativo.');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent]);

  const handleNewVendorClick = () => {
    setEditingVendor(null);
    reset({
      name: '',
      category: '',
      phone: '',
      email: '',
      website: '',
      contract_value: 0,
      status: 'Pendente',
    });
    setVendorModalOpen(true);
  };

  const handleEditVendorClick = (vendor: Vendor) => {
    setEditingVendor(vendor);
    reset({
      name: vendor.name,
      category: vendor.category,
      phone: vendor.phone || '',
      email: vendor.email || '',
      website: vendor.website || '',
      contract_value: Number(vendor.contract_value),
      status: vendor.status,
    });
    setVendorModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (!currentEvent) return;

    const payload = {
      event_id: currentEvent.id,
      name: data.name,
      category: data.category,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      contract_value: Number(data.contract_value),
      status: data.status,
    };

    try {
      if (editingVendor) {
        await VendorRepository.update(editingVendor.id, payload);
      } else {
        await VendorRepository.create(payload);
      }
      setVendorModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClick = (vendor: Vendor) => {
    setVendorToDelete(vendor);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!vendorToDelete) return;
    try {
      await VendorRepository.delete(vendorToDelete.id);
      setDeleteConfirmOpen(false);
      setVendorToDelete(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations
  const totalContractedValue = vendors.reduce((sum, v) => sum + Number(v.contract_value), 0);

  if (!currentEvent) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <p className="text-foreground/50 text-sm">Selecione um casamento para gerir fornecedores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" /> Fornecedores & Contratos
          </h1>
          <p className="text-sm text-foreground/60">
            Contrate fornecedores oficiais, converse em tempo real e controle o seu orçamento.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-secondary/15 p-1 rounded-xl border border-border-custom/50 self-start sm:self-center">
          <button
            onClick={() => setActiveTab('contratos')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'contratos'
                ? 'bg-card-bg text-primary shadow-sm font-bold border border-border-custom/50'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Os Meus Contratos
          </button>
          <button
            onClick={() => setActiveTab('explorar')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'explorar'
                ? 'bg-card-bg text-primary shadow-sm font-bold border border-border-custom/50'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Explorar Marketplace
          </button>
          <button
            onClick={() => setActiveTab('mensagens')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'mensagens'
                ? 'bg-card-bg text-primary shadow-sm font-bold border border-border-custom/50'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Mensagens & Pedidos
          </button>
        </div>
      </div>

      {/* Tab Render */}
      {activeTab === 'contratos' && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="flex justify-between items-center bg-card-bg border border-border-custom p-5 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Total Adjudicado / Contratado</p>
                <h3 className="text-xl font-extrabold text-foreground">{totalContractedValue.toLocaleString('pt-AO')} Kz</h3>
              </div>
            </div>

            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleNewVendorClick} size="sm">
              Adicionar Fornecedor
            </Button>
          </div>

          {/* Grid of vendors */}
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : vendors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors.map((vendor) => (
                <Card key={vendor.id} className="bg-card-bg border border-border-custom flex flex-col justify-between" hoverEffect>
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-border-custom pb-3 mb-3">
                      <div>
                        <h3 className="font-bold text-base truncate max-w-[160px]">{vendor.name}</h3>
                        <span className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">{vendor.category}</span>
                      </div>
                      <Badge variant={vendor.status === 'Ativo' ? 'success' : vendor.status === 'Cancelado' ? 'error' : 'warning'}>
                        {vendor.status}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-xs text-foreground/75 py-2">
                      {vendor.phone ? (
                        <div className="flex items-center justify-between gap-2">
                          <a 
                            href={`tel:${vendor.phone}`}
                            className="flex items-center gap-2 hover:text-primary transition-colors truncate"
                            title="Ligar"
                          >
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-medium truncate">{vendor.phone}</span>
                          </a>
                          <a
                            href={`https://wa.me/${vendor.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full hover:bg-emerald-500/20 transition-all shrink-0"
                            title="Conversar no WhatsApp"
                          >
                            WhatsApp
                          </a>
                        </div>
                      ) : null}

                      {vendor.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                          <a 
                            href={`mailto:${vendor.email}`}
                            className="truncate hover:text-primary transition-colors"
                            title="Enviar Email"
                          >
                            {vendor.email}
                          </a>
                        </div>
                      )}

                      {vendor.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                          <a
                            href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline truncate"
                            title="Visitar Website / Portfólio"
                          >
                            {vendor.website}
                          </a>
                        </div>
                      )}

                      {!vendor.phone && !vendor.email && !vendor.website && (
                        <div className="text-[11px] text-foreground/40 italic py-1 flex items-center gap-1.5">
                          <AlertCircle className="h-3 w-3" />
                          <span>Sem contactos adicionais registados.</span>
                        </div>
                      )}
                    </div>

                    {/* Matched Contract Installments & Receipts */}
                    {(() => {
                      const matchedContract = contracts.find(c => 
                        c.status === 'Ativo' && 
                        (c.room?.vendor_profile?.company_name?.toLowerCase() === vendor.name.toLowerCase() ||
                         c.service_title?.toLowerCase().includes(vendor.name.toLowerCase()))
                      );

                      if (!matchedContract || !matchedContract.payment_installments || matchedContract.payment_installments.length === 0) {
                        return null;
                      }

                      return (
                        <div className="mt-3 pt-3 border-t border-border-custom/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider flex items-center gap-1">
                              <CreditCard className="h-3 w-3 text-primary" /> Parcelas do Contrato
                            </span>
                            {matchedContract.room_id && (
                              <button
                                onClick={() => {
                                  setPreselectedRoomId(matchedContract.room_id);
                                  setActiveTab('mensagens');
                                }}
                                className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <MessageSquare className="h-3 w-3" /> Abrir Chat
                              </button>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            {matchedContract.payment_installments.map((inst, idx) => {
                              const isPaid = inst.status === 'Paid';
                              const isUnderReview = inst.status === 'UnderReview';
                              const isRejected = inst.status === 'Rejected';
                              const isPending = !inst.status || inst.status === 'Pending';

                              return (
                                <div 
                                  key={idx} 
                                  className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                                    isPaid 
                                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                      : isUnderReview
                                      ? 'bg-blue-500/5 border-blue-500/30 text-blue-800 dark:text-blue-300'
                                      : isRejected
                                      ? 'bg-rose-500/5 border-rose-500/30 text-rose-800 dark:text-rose-300'
                                      : 'bg-secondary/10 border-border-custom/50 text-foreground'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-xs">
                                      Parcela {idx + 1} ({inst.percentage}%): {inst.amount.toLocaleString('pt-AO')} Kz
                                    </span>
                                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${
                                      isPaid
                                        ? 'bg-emerald-600 text-white'
                                        : isUnderReview
                                        ? 'bg-blue-600 text-white animate-pulse'
                                        : isRejected
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                    }`}>
                                      {isPaid ? 'Pago' : isUnderReview ? 'Em Análise' : isRejected ? 'Recusado' : 'Pendente'}
                                    </span>
                                  </div>

                                  {inst.receipt_url && (
                                    <div className="flex items-center justify-between text-[10px] bg-background/60 p-1 rounded">
                                      <a
                                        href={inst.receipt_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary hover:underline flex items-center gap-1 truncate max-w-[170px]"
                                      >
                                        <Paperclip className="h-2.5 w-2.5 shrink-0" />
                                        <span className="truncate">{inst.receipt_name || 'Comprovativo'}</span>
                                      </a>
                                      <a
                                        href={inst.receipt_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-foreground/40 hover:text-foreground"
                                      >
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                    </div>
                                  )}

                                  {isRejected && inst.rejection_reason && (
                                    <p className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-500/10 p-1 rounded">
                                      <strong>Motivo da recusa:</strong> {inst.rejection_reason}
                                    </p>
                                  )}

                                  {isPaid && (
                                    <div className="flex justify-end pt-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-[10px] h-6 px-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 font-medium"
                                        onClick={() => downloadReceiptPDF(matchedContract, idx, matchedContract.vendor_profile, currentEvent?.title)}
                                        title="Descarregar Recibo Oficial de Quitação em PDF"
                                      >
                                        <FileText className="h-2.5 w-2.5 mr-1 text-emerald-600" />
                                        Recibo Oficial (PDF)
                                      </Button>
                                    </div>
                                  )}

                                  {(isPending || isRejected) && (
                                    <div className="flex justify-end pt-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-[10px] h-6 px-2 text-primary border-primary/30 hover:bg-primary/10"
                                        onClick={() => handleOpenReceiptModal(matchedContract, idx)}
                                      >
                                        <Upload className="h-2.5 w-2.5 mr-1" />
                                        {isRejected ? 'Reenviar Comprovativo' : 'Submeter Comprovativo'}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Card Footer */}
                  <div className="border-t border-border-custom pt-3 mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-foreground/50 uppercase tracking-wider font-semibold">Valor Contrato</p>
                      <p className="text-sm font-bold text-foreground">{Number(vendor.contract_value).toLocaleString('pt-AO')} Kz</p>
                    </div>

                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditVendorClick(vendor)} className="p-1 rounded-lg">
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(vendor)} className="p-1 text-error hover:bg-error/10 rounded-lg">
                        Remover
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-border-custom rounded-xl bg-card-bg">
              <Briefcase className="h-10 w-10 text-foreground/25 mb-2" />
              <p className="text-sm font-semibold text-foreground/75">Nenhum fornecedor registado</p>
              <p className="text-xs text-foreground/50 mt-1">
                Adicione os seus fornecedores para manter os seus contratos centralizados.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'explorar' && (
        <MarketplaceTab 
          currentEvent={currentEvent} 
          onStartChat={(roomId) => {
            setPreselectedRoomId(roomId);
            setActiveTab('mensagens');
          }}
        />
      )}

      {activeTab === 'mensagens' && (
        <ChatTab 
          userRole="client" 
          eventId={currentEvent.id} 
          preselectedRoomId={preselectedRoomId}
          onRoomSelected={(roomId) => setPreselectedRoomId(roomId)}
        />
      )}

      {/* ADD/EDIT VENDOR DIALOG */}
      <Dialog
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
        title={editingVendor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <Input
            label="Nome do Fornecedor / Empresa"
            placeholder="Catering Quinta das Flores"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Categoria (ex: Buffet, Flores, Vídeo)"
              placeholder="Buffet"
              error={errors.category?.message}
              {...register('category')}
            />
            <Input
              label="Telefone"
              placeholder="+244 912 345 678"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="fornecedor@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Site"
              placeholder="www.fornecedor.com"
              error={errors.website?.message}
              {...register('website')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Valor Contratado (Kz)"
              type="number"
              step="0.01"
              error={errors.contract_value?.message}
              {...register('contract_value')}
            />

            <Select
              label="Estado de Contratação"
              options={[
                { value: 'Pendente', label: 'Pendente' },
                { value: 'Ativo', label: 'Ativo' },
                { value: 'Cancelado', label: 'Cancelado' },
              ]}
              error={errors.status?.message}
              {...register('status')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setVendorModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Fornecedor</Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Eliminar Fornecedor">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-error shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Remover este fornecedor?</p>
              <p className="text-xs text-foreground/60 mt-1">
                Ao remover <span className="font-semibold">{vendorToDelete?.name}</span>, a informação de contacto e o valor do contrato serão perdidos. Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Eliminar Fornecedor
            </Button>
          </div>
        </div>
      </Dialog>

      {/* SUBMIT RECEIPT MODAL (Client) */}
      <Dialog
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title={`Submeter Comprovativo de Pagamento`}
      >
        <form onSubmit={handleUploadReceipt} className="space-y-4">
          <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 text-xs">
            <p className="font-bold text-foreground">{selectedContract?.service_title}</p>
            <div className="flex justify-between items-center mt-1">
              <span className="text-foreground/60">Parcela #{selectedInstallmentIndex + 1}:</span>
              <span className="font-extrabold text-primary text-sm">
                {selectedContract?.payment_installments?.[selectedInstallmentIndex]?.amount.toLocaleString('pt-AO')} Kz
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Ficheiro do Comprovativo (PDF, JPG, PNG) *
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              required
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer border border-border-custom rounded-xl p-2 bg-secondary/5"
            />
            {receiptFile && (
              <p className="text-[11px] text-foreground/60 mt-1 flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {receiptFile.name} ({(receiptFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Observações adicionais (opcional)
            </label>
            <Input
              placeholder="ex: Transferência via BAI Directo, ref: 123456"
              value={receiptNotes}
              onChange={(e) => setReceiptNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setReceiptModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isUploadingReceipt} disabled={!receiptFile}>
              <Upload className="h-4 w-4 mr-1.5" /> Enviar Comprovativo
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
