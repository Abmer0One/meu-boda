'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VendorProfile, VendorService, Event, VendorReview } from '@/types';
import {
  VendorProfileRepository,
  VendorServiceRepository,
  ChatRepository,
  ContractRepository,
} from '@/repositories/marketplace.repository';
import { ReviewRepository } from '@/repositories/review.repository';
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
  ChevronRight,
  Star,
  Send,
  SlidersHorizontal,
} from 'lucide-react';

interface MarketplaceTabProps {
  currentEvent: Event;
  onStartChat: (roomId: string) => void;
}

const CATEGORIES = ['Todos', 'Fotografia', 'Decoração', 'Buffet', 'DJ', 'Espaço', 'Vestuário', 'Outro'];

const PROVINCES = [
  'Todas',
  'Luanda',
  'Benguela',
  'Huíla',
  'Huambo',
  'Cabinda',
  'Cuanza Sul',
  'Namibe',
  'Uíge',
];

export default function MarketplaceTab({ currentEvent, onStartChat }: MarketplaceTabProps) {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedProvince, setSelectedProvince] = useState('Todas');
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'name'>('recommended');
  const [searchQuery, setSearchQuery] = useState('');

  // Rating stats cache for all vendors: { [vendorId]: { average, count } }
  const [vendorRatings, setVendorRatings] = useState<Record<string, { average: number; count: number }>>({});

  // Detail Modal
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [vendorServices, setVendorServices] = useState<VendorService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [vendorAvailability, setVendorAvailability] = useState<{
    isAvailable: boolean;
    reason?: string;
  }>({ isAvailable: true });

  // Reviews in Modal
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const fetched = await VendorProfileRepository.list(selectedCategory);
      setVendors(fetched);

      // Fetch reviews statistics for each vendor in background
      const statsMap: Record<string, { average: number; count: number }> = {};
      await Promise.all(
        fetched.map(async (v) => {
          try {
            const stats = await ReviewRepository.getVendorStats(v.id);
            statsMap[v.id] = stats;
          } catch (err) {
            statsMap[v.id] = { average: 5.0, count: 0 };
          }
        })
      );
      setVendorRatings(statsMap);
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
    setLoadingReviews(true);
    setReviewComment('');
    setReviewRating(5);

    try {
      // 1. Fetch services
      const services = await VendorServiceRepository.getAll(vendor.id);
      setVendorServices(services);

      // 2. Fetch reviews
      const fetchedReviews = await ReviewRepository.getByVendor(vendor.id);
      setReviews(fetchedReviews);

      // 3. Check availability for current wedding date
      const weddingDateStr = new Date(currentEvent.date).toISOString().split('T')[0];

      // Check manually blocked dates
      const isBlockedDate = vendor.blocked_dates?.includes(weddingDateStr);
      if (isBlockedDate) {
        setVendorAvailability({
          isAvailable: false,
          reason: 'O fornecedor marcou esta data como indisponível/folga.',
        });
      } else {
        // Check active contracts count on this date
        const activeContractsCount = await ContractRepository.getContractsCountForVendorOnDate(
          vendor.id,
          weddingDateStr
        );
        const dailyLimit = vendor.daily_limit || 1;

        if (activeContractsCount >= dailyLimit) {
          setVendorAvailability({
            isAvailable: false,
            reason: `Lotação máxima atingida (${activeContractsCount}/${dailyLimit} casamentos agendados).`,
          });
        } else {
          setVendorAvailability({
            isAvailable: true,
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingServices(false);
      setLoadingReviews(false);
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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !user) return;
    setIsSubmittingReview(true);

    try {
      const clientName = currentEvent.title || user.email?.split('@')[0] || 'Cliente Meu Boda';
      const created = await ReviewRepository.create({
        vendor_id: selectedVendor.id,
        client_id: user.id,
        event_id: currentEvent.id,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
        client_name: clientName,
      });

      if (created) {
        setReviews((prev) => [created, ...prev]);
        setReviewComment('');
        // Update ratings summary
        const newStats = await ReviewRepository.getVendorStats(selectedVendor.id);
        setVendorRatings((prev) => ({
          ...prev,
          [selectedVendor.id]: newStats,
        }));
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao submeter avaliação. Certifique-se de preencher os dados.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filter and sort vendors
  const filteredVendors = vendors
    .filter((v) => {
      const matchesSearch =
        v.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const vendorProv = v.province || 'Luanda';
      const matchesProvince = selectedProvince === 'Todas' || vendorProv === selectedProvince;

      return matchesSearch && matchesProvince;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') {
        const ratingA = vendorRatings[a.id]?.average || 0;
        const ratingB = vendorRatings[b.id]?.average || 0;
        return ratingB - ratingA;
      }
      if (sortBy === 'name') {
        return a.company_name.localeCompare(b.company_name);
      }
      return 0; // recommended
    });

  return (
    <div className="space-y-6">
      {/* Search & Filters Bar */}
      <div className="flex flex-col gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-foreground/45" />
          <Input
            placeholder="Pesquise fornecedores por nome ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 py-6 bg-card-bg border border-border-custom rounded-xl text-sm"
          />
        </div>

        {/* Categories Carousel */}
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
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

        {/* Secondary Filter Row: Province & Sort Order */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/15 p-3 rounded-xl border border-border-custom/50 text-xs">
          {/* Province Filter */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground/60">Província:</span>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="bg-card-bg border border-border-custom rounded-lg px-2.5 py-1 font-medium text-foreground focus:outline-none focus:border-primary"
            >
              {PROVINCES.map((prov) => (
                <option key={prov} value={prov}>
                  {prov === 'Todas' ? 'Todas as Províncias' : prov}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-foreground/50 shrink-0" />
            <span className="font-semibold text-foreground/60">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-card-bg border border-border-custom rounded-lg px-2.5 py-1 font-medium text-foreground focus:outline-none focus:border-primary"
            >
              <option value="recommended">Recomendados</option>
              <option value="rating">Melhor Avaliados (★)</option>
              <option value="name">Nome (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of vendors */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredVendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vendor) => {
            const stats = vendorRatings[vendor.id] || { average: 5.0, count: 0 };
            const vendorProv = vendor.province || 'Luanda';

            return (
              <Card
                key={vendor.id}
                className="bg-card-bg border border-border-custom hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer"
                hoverEffect
                onClick={() => handleOpenDetails(vendor)}
              >
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h3 className="font-bold text-base text-foreground leading-tight">
                          {vendor.company_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                            {vendor.category}
                          </span>
                          <span className="text-[10px] font-medium text-foreground/60 flex items-center gap-0.5 bg-secondary px-2 py-0.5 rounded-full">
                            <MapPin className="h-2.5 w-2.5 text-foreground/45" />
                            {vendorProv}
                          </span>
                        </div>
                      </div>

                      {/* Vendor Avatar / Logo */}
                      <div className="h-11 w-11 rounded-full bg-secondary/30 flex items-center justify-center text-primary font-bold overflow-hidden border border-border-custom shrink-0">
                        {vendor.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={vendor.logo_url} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          vendor.company_name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="flex items-center text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-amber-500" />
                      </div>
                      <span className="font-bold text-foreground">
                        {stats.count > 0 ? stats.average.toFixed(1) : '5.0'}
                      </span>
                      <span className="text-[10px] text-foreground/45">
                        {stats.count > 0 ? `(${stats.count} avaliações)` : '(Novo Parceiro)'}
                      </span>
                    </div>

                    <p className="text-xs text-foreground/60 line-clamp-3 leading-relaxed">
                      {vendor.description || 'Fornecedor credenciado para casamentos e eventos.'}
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
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-border-custom rounded-xl bg-card-bg">
          <Sparkles className="h-10 w-10 text-foreground/25 mb-2" />
          <p className="text-sm font-semibold text-foreground/75">Nenhum fornecedor disponível</p>
          <p className="text-xs text-foreground/50 mt-1">
            Tente mudar a província, categoria ou redefinir os seus termos de pesquisa.
          </p>
        </div>
      )}

      {/* DETAIL & REVIEWS MODAL */}
      <Dialog
        isOpen={selectedVendor !== null}
        onClose={() => setSelectedVendor(null)}
        title={selectedVendor?.company_name || 'Detalhes do Fornecedor'}
        size="lg"
      >
        {selectedVendor && (
          <div className="space-y-6 max-h-[78vh] overflow-y-auto pr-1">
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
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-foreground">{selectedVendor.company_name}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] bg-primary/10 px-2 py-0.5 rounded-full text-primary">
                    {selectedVendor.category}
                  </span>
                  <span className="text-[11px] text-foreground/60 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-foreground/40" />
                    {selectedVendor.province || 'Luanda'}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                    <Star className="h-3.5 w-3.5 fill-amber-500" />
                    <span>
                      {vendorRatings[selectedVendor.id]?.count
                        ? `${vendorRatings[selectedVendor.id].average.toFixed(1)} (${vendorRatings[selectedVendor.id].count})`
                        : '5.0 (Novo)'}
                    </span>
                  </div>
                </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-foreground/75">
              {selectedVendor.phone ? (
                <div className="flex items-center gap-2 bg-card-bg p-3 rounded-xl border border-border-custom/50">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <a href={`tel:${selectedVendor.phone}`} className="hover:text-primary transition-colors truncate">
                    {selectedVendor.phone}
                  </a>
                </div>
              ) : null}

              {selectedVendor.email ? (
                <div className="flex items-center gap-2 bg-card-bg p-3 rounded-xl border border-border-custom/50">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <a href={`mailto:${selectedVendor.email}`} className="hover:text-primary transition-colors truncate">
                    {selectedVendor.email}
                  </a>
                </div>
              ) : null}

              {selectedVendor.website ? (
                <div className="flex items-center gap-2 bg-card-bg p-3 rounded-xl border border-border-custom/50">
                  <Globe className="h-4 w-4 text-primary shrink-0" />
                  <a
                    href={
                      selectedVendor.website.startsWith('http')
                        ? selectedVendor.website
                        : `https://${selectedVendor.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary transition-colors truncate"
                  >
                    {selectedVendor.website}
                  </a>
                </div>
              ) : null}

              {selectedVendor.nif ? (
                <div className="flex items-center gap-2 bg-card-bg p-3 rounded-xl border border-border-custom/50">
                  <span className="font-bold text-[10px] text-primary">NIF:</span>
                  <span>{selectedVendor.nif}</span>
                </div>
              ) : null}
            </div>

            {/* Services / Portfolio packages */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
                Serviços & Pacotes Públicos
              </h4>
              {loadingServices ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : vendorServices.length > 0 ? (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {vendorServices.map((service) => (
                    <div
                      key={service.id}
                      className="p-3.5 rounded-xl border border-border-custom bg-card-bg flex justify-between items-start gap-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <h5 className="font-bold text-sm text-foreground">{service.title}</h5>
                        <p className="text-xs text-foreground/60 leading-relaxed">{service.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-foreground/45 block font-medium">Preço Base</span>
                        <span className="text-sm font-bold text-primary">
                          {service.price.toLocaleString('pt-AO')} Kz
                        </span>
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

            {/* REVIEWS SECTION */}
            <div className="space-y-3 pt-2 border-t border-border-custom">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Avaliações & Comentários (
                  {reviews.length})
                </h4>
              </div>

              {/* Review list */}
              {loadingReviews ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3 rounded-xl border border-border-custom/50 bg-secondary/10 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{rev.client_name}</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= rev.rating ? 'text-amber-500 fill-amber-500' : 'text-foreground/20'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {rev.comment && (
                        <p className="text-xs text-foreground/75 leading-relaxed italic">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      )}
                      <span className="text-[10px] text-foreground/45 block">
                        {new Date(rev.created_at).toLocaleDateString('pt-AO')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-foreground/50 italic bg-card-bg p-3 rounded-xl border border-border-custom/50 text-center">
                  Ainda não existem avaliações para este fornecedor.
                </p>
              )}

              {/* Leave a review form */}
              {user && (
                <form
                  onSubmit={handleSubmitReview}
                  className="bg-secondary/20 p-3.5 rounded-xl border border-border-custom/60 space-y-3 mt-3"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">Deixar Avaliação</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-0.5 text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              star <= reviewRating ? 'fill-amber-500' : 'text-foreground/30'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Partilhe a sua experiência com este fornecedor (opcional)..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full text-xs rounded-xl border border-border-custom p-2.5 bg-card-bg text-foreground focus:outline-none focus:border-primary"
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      isLoading={isSubmittingReview}
                      leftIcon={<Send className="h-3.5 w-3.5" />}
                      className="text-xs h-8"
                    >
                      Enviar Avaliação
                    </Button>
                  </div>
                </form>
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
                      <p className="text-[10px] text-foreground/50">
                        Data do evento: {new Date(currentEvent.date).toLocaleDateString('pt-AO')}
                      </p>
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
