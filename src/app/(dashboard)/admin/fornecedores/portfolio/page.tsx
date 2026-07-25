'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VendorService, VendorProfile } from '@/types';
import { VendorServiceRepository, VendorProfileRepository } from '@/repositories/marketplace.repository';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Briefcase, 
  Plus, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Sparkles,
  Loader2,
  AlertCircle 
} from 'lucide-react';

const serviceFormSchema = z.object({
  title: z.string().min(2, 'O título é obrigatório'),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres'),
  price: z.preprocess((val) => Number(val), z.number().min(0, 'O valor não pode ser negativo')),
});

export default function VendorPortfolioPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [services, setServices] = useState<VendorService[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<VendorService | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<VendorService | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(serviceFormSchema),
  });

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get profile
      const prof = await VendorProfileRepository.get(user.id);
      if (prof) {
        setProfile(prof);
        const fetchedServices = await VendorServiceRepository.getAll(prof.id);
        setServices(fetchedServices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleNewServiceClick = () => {
    setEditingService(null);
    reset({
      title: '',
      description: '',
      price: 0,
    });
    setServiceModalOpen(true);
  };

  const handleEditClick = (service: VendorService) => {
    setEditingService(service);
    reset({
      title: service.title,
      description: service.description || '',
      price: Number(service.price),
    });
    setServiceModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (!profile) return;

    const payload = {
      vendor_id: profile.id,
      title: data.title,
      description: data.description,
      price: Number(data.price),
      image_urls: []
    };

    try {
      if (editingService) {
        await VendorServiceRepository.update(editingService.id, payload);
      } else {
        await VendorServiceRepository.create(payload);
      }
      setServiceModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClick = (service: VendorService) => {
    setServiceToDelete(service);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;
    try {
      await VendorServiceRepository.delete(serviceToDelete.id);
      setDeleteConfirmOpen(false);
      setServiceToDelete(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" /> Portfólio & Pacotes de Serviços
          </h1>
          <p className="text-sm text-foreground/60">
            Registe os serviços que a sua empresa presta. Estes pacotes estarão visíveis no diretório para os noivos.
          </p>
        </div>

        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleNewServiceClick} size="sm">
          Adicionar Serviço
        </Button>
      </div>

      {/* Services Grid */}
      {services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="bg-card-bg border border-border-custom flex flex-col justify-between" hoverEffect>
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-border-custom pb-3">
                    <div>
                      <h3 className="font-bold text-base truncate max-w-[180px]">{service.title}</h3>
                      <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full mt-1.5">
                        Preço Base
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-primary">{Number(service.price).toLocaleString('pt-AO')} Kz</span>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/60 leading-relaxed min-h-[50px] line-clamp-4">
                    {service.description}
                  </p>
                </div>

                {/* Footer buttons */}
                <div className="border-t border-border-custom pt-3 mt-4 flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEditClick(service)} className="p-1.5 rounded-lg">
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(service)} className="p-1.5 text-error hover:bg-error/10 rounded-lg">
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-border-custom rounded-xl bg-card-bg">
          <Sparkles className="h-10 w-10 text-foreground/25 mb-2" />
          <p className="text-sm font-semibold text-foreground/75">Nenhum serviço registado</p>
          <p className="text-xs text-foreground/50 mt-1">
            Publique pacotes ou propostas de preços base para começar a atrair casamentos.
          </p>
        </div>
      )}

      {/* SERVICE MODAL */}
      <Dialog
        isOpen={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        title={editingService ? 'Editar Serviço/Pacote' : 'Novo Serviço/Pacote'}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <Input
            label="Título do Serviço ou Pacote"
            placeholder="ex: Cobertura Fotográfica Completa"
            error={errors.title?.message}
            {...register('title')}
          />

          <Input
            label="Preço Base (Kz)"
            type="number"
            error={errors.price?.message}
            {...register('price')}
          />

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground/75 block">Descrição Detalhada do Pacote</label>
            <textarea
              className="w-full text-xs p-3 rounded-xl border border-border-custom bg-secondary/5 focus:outline-none focus:border-primary min-h-[120px]"
              placeholder="Descreva detalhadamente o que está incluído neste preço base (equipamento, fotógrafos, álbum impresso, etc.)..."
              {...register('description')}
            />
            {errors.description?.message && (
              <span className="text-[10px] text-error font-medium">{String(errors.description.message)}</span>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setServiceModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Pacote</Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE SERVICE DIALOG */}
      <Dialog isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Eliminar Serviço">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-error shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Remover este pacote?</p>
              <p className="text-xs text-foreground/60 mt-1">
                Ao remover <span className="font-semibold">{serviceToDelete?.title}</span>, ele deixará de estar visível para novos clientes no catálogo. Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Eliminar Pacote
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
