'use client';

import React, { useEffect, useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { VendorRepository } from '@/repositories/vendor.repository';
import { Vendor } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vendorSchema } from '@/validations/schemas';
import {
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Globe,
  AlertCircle,
  Loader2,
  DollarSign,
} from 'lucide-react';

export default function FornecedoresPage() {
  const { currentEvent } = useEvent();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

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
      const fetchedVendors = await VendorRepository.getAll(currentEvent.id);
      setVendors(fetchedVendors);
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
            Registe contactos, links de sites e valores contratados com prestadores de serviços.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Card className="bg-card-bg px-4 py-2 flex items-center gap-3 border border-border-custom shadow-none">
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">Total Contratado</p>
              <h4 className="text-sm font-bold">{totalContractedValue.toLocaleString('pt-AO')} Kz</h4>
            </div>
          </Card>

          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleNewVendorClick} size="sm">
            Adicionar Fornecedor
          </Button>
        </div>
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
                  {vendor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-foreground/45 shrink-0" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-foreground/45 shrink-0" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                  {vendor.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-foreground/45 shrink-0" />
                      <a
                        href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {vendor.website}
                      </a>
                    </div>
                  )}
                </div>
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
    </div>
  );
}
