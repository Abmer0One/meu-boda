'use client';

import React, { useEffect, useState } from 'react';
import { VendorProfile, VendorService, Event } from '@/types';
import { VendorProfileRepository, VendorServiceRepository, ChatRepository, ContractRepository } from '@/repositories/marketplace.repository';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Sparkles,
  Loader2,
  ChevronRight
} from 'lucide-react';

interface MarketplaceTabProps {
  currentEvent: Event;
  onStartChat: (roomId: string) => void;
}

const CATEGORIES = ['Todos', 'Fotografia', 'Decoração', 'Buffet', 'DJ', 'Espaço', 'Vestuário', 'Outro'];

export default function MarketplaceTab({ currentEvent, onStartChat }: MarketplaceTabProps) {
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detail Modal
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [vendorServices, setVendorServices] = useState<VendorService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [vendorAvailability, setVendorAvailability] = useState<{
    isAvailable: boolean;
    reason?: string;
  }>({ isAvailable: true });

  const loadVendors = async () => {
    setLoading(true);
    try {
      const fetched = await VendorProfileRepository.list(selectedCategory);
      setVendors(fetched);
    } catch (err) {
      console.error('Error loading marketplace vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const handleOpenDetails = async (vendor: VendorProfile) => {
    setSelectedVendor(vendor);
    setLoadingServices(true);
    
    try {
      // 1. Fetch services
      const services = await VendorServiceRepository.getAll(vendor.id);
      setVendorServices(services);

      // 2. Check availability for current wedding date
      const weddingDateStr = new Date(currentEvent.date).toISOString().split('T')[0];
      
      // Check manually blocked dates
      const isBlockedDate = vendor.blocked_dates?.includes(weddingDateStr);
      if (isBlockedDate) {
        setVendorAvailability({
          isAvailable: false,
          reason: 'O fornecedor marcou esta data como indisponível/folga.'
        });
      } else {
        // Check active contracts count on this date
        const activeContractsCount = await ContractRepository.getContractsCountForVendorOnDate(vendor.id, weddingDateStr);
        const dailyLimit = vendor.daily_limit || 1;
        
        if (activeContractsCount >= dailyLimit) {
          setVendorAvailability({
            isAvailable: false,
            reason: `Lotação máxima atingida (${activeContractsCount}/${dailyLimit} casamentos agendados).`
          });
        } else {
          setVendorAvailability({
            isAvailable: true
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleContactVendor = async (vendorId: string) => {
    try {
      const room = await ChatRepository.getOrCreateRoom(currentEvent.id, vendorId);
      if (room) {
        setSelectedVendor(null);
        onStartChat(room.id);
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  // Filtered list
  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.company_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search & Category Pills */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-foreground/45" />
          <Input
            placeholder="Pesquise fornecedores por nome ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 py-6 bg-card-bg border border-border-custom rounded-xl"
          />
        </div>

        {/* Categories Carousel */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                    : 'bg-card-bg text-foreground/60 border border-border-custom hover:bg-secondary/40'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of vendors */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredVendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vendor) => (
            <Card
              key={vendor.id}
              className="bg-card-bg border border-border-custom hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              hoverEffect
              onClick={() => handleOpenDetails(vendor)}
            >
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-foreground">{vendor.company_name}</h3>
                      <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                        {vendor.category}
                      </span>
                    </div>
                    {/* Tiny logo indicator */}
                    <div className="h-10 w-10 rounded-full bg-secondary/30 flex items-center justify-center text-primary font-bold overflow-hidden border border-border-custom shrink-0">
                      {vendor.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={vendor.logo_url} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        vendor.company_name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-foreground/60 line-clamp-3 leading-relaxed">
                    {vendor.description || 'Nenhuma descrição fornecida pelo fornecedor.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border-custom flex items-center justify-between">
                  <div className="text-[10px] text-foreground/45 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Limite: {vendor.daily_limit} evento(s)/dia</span>
                  </div>
                  <span className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    Ver Portfólio <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-border-custom rounded-xl bg-card-bg">
          <Sparkles className="h-10 w-10 text-foreground/25 mb-2" />
          <p className="text-sm font-semibold text-foreground/75">Nenhum fornecedor disponível</p>
          <p className="text-xs text-foreground/50 mt-1">
            Tente mudar de categoria ou redefinir os seus termos de pesquisa.
          </p>
        </div>
      )}

      {/* DETAIL MODAL */}
      <Dialog
        isOpen={selectedVendor !== null}
        onClose={() => setSelectedVendor(null)}
        title={selectedVendor?.company_name || 'Detalhes do Fornecedor'}
        size="lg"
      >
        {selectedVendor && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center gap-4 bg-secondary/15 p-4 rounded-xl border border-border-custom/50">
              <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0 overflow-hidden">
                {selectedVendor.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedVendor.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  selectedVendor.company_name.substring(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">{selectedVendor.company_name}</h3>
                <p className="text-xs text-foreground/50 flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold uppercase tracking-wider text-[10px] bg-primary/10 px-2 py-0.5 rounded-full text-primary">
                    {selectedVendor.category}
                  </span>
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Sobre o Fornecedor</h4>
              <p className="text-xs text-foreground/75 leading-relaxed bg-card-bg p-3 rounded-xl border border-border-custom/50">
                {selectedVendor.description || 'Nenhuma descrição detalhada disponível.'}
              </p>
            </div>

            {/* Contacts Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-foreground/75">
              <div className="flex items-center gap-2 bg-card-bg p-3 rounded-xl border border-border-custom/50">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span>{selectedVendor.nif ? `NIF: ${selectedVendor.nif}` : 'NIF não fornecido'}</span>
              </div>
              <div className="flex items-center gap-2 bg-card-bg p-3 rounded-xl border border-border-custom/50">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <span>IBAN configurado para transferências</span>
              </div>
            </div>

            {/* Services / Portfolio packages */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Serviços & Pacotes Públicos</h4>
              {loadingServices ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : vendorServices.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {vendorServices.map((service) => (
                    <div 
                      key={service.id} 
                      className="p-4 rounded-xl border border-border-custom bg-card-bg flex justify-between items-start gap-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <h5 className="font-bold text-sm text-foreground">{service.title}</h5>
                        <p className="text-xs text-foreground/60 leading-relaxed">
                          {service.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-foreground/45 block font-medium">Preço Base</span>
                        <span className="text-sm font-bold text-primary">{service.price.toLocaleString('pt-AO')} Kz</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-foreground/50 italic bg-card-bg p-3 rounded-xl border border-border-custom/50 text-center">
                  Nenhum pacote específico publicado no portfólio ainda.
                </p>
              )}
            </div>

            {/* Availability & Action Button */}
            <div className="pt-3 border-t border-border-custom flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                {vendorAvailability.isAvailable ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <div>
                      <p className="font-bold text-success">Disponível para a sua data</p>
                      <p className="text-[10px] text-foreground/50">Data do evento: {new Date(currentEvent.date).toLocaleDateString('pt-AO')}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-error shrink-0" />
                    <div>
                      <p className="font-bold text-error">Indisponível para a sua data</p>
                      <p className="text-[10px] text-error/80">{vendorAvailability.reason}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedVendor(null)}>
                  Fechar
                </Button>
                <Button 
                  onClick={() => handleContactVendor(selectedVendor.id)}
                  disabled={!vendorAvailability.isAvailable}
                  leftIcon={<MessageSquare className="h-4 w-4" />}
                >
                  Iniciar Negociação
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

// Add simple style for scrollbar hiding
const style = document.createElement('style');
style.textContent = `
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;
document.head.append(style);
