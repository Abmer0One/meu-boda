'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VendorProfile } from '@/types';
import { VendorProfileRepository } from '@/repositories/marketplace.repository';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { 
  User, 
  Building, 
  CreditCard, 
  Calendar, 
  Plus, 
  X, 
  CheckCircle2,
  Loader2,
  Phone,
  Mail,
  Globe,
  Camera,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Image as ImageIcon
} from 'lucide-react';

const CATEGORIES = ['Fotografia', 'Decoração', 'Buffet', 'DJ', 'Espaço', 'Vestuário', 'Outro'];

export default function VendorProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [nif, setNif] = useState('');
  const [iban, setIban] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [dailyLimit, setDailyLimit] = useState(1);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const fetched = await VendorProfileRepository.get(user.id);
        if (fetched) {
          setProfile(fetched);
          setCompanyName(fetched.company_name);
          setCategory(fetched.category || 'Fotografia');
          setLogoUrl(fetched.logo_url || '');
          setNif(fetched.nif || '');
          setIban(fetched.iban || '');
          setPhone(fetched.phone || user.user_metadata?.phone || '');
          setEmail(fetched.email || user.email || '');
          setWebsite(fetched.website || '');
          setDescription(fetched.description || '');
          setDailyLimit(fetched.daily_limit || 1);
          setBlockedDates(fetched.blocked_dates || []);
        } else {
          // Initialize defaults in form state without failing
          setCompanyName(user.user_metadata?.full_name || 'Minha Empresa de Serviços');
          setCategory('Fotografia');
          setLogoUrl('');
          setPhone(user.user_metadata?.phone || '');
          setEmail(user.email || '');
          setWebsite('');
          setDailyLimit(1);
          setBlockedDates([]);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Por favor selecione um ficheiro de imagem válido (PNG, JPG, WebP).' });
      return;
    }

    setUploadingLogo(true);
    setMessage(null);
    try {
      const url = await VendorProfileRepository.uploadLogo(user.id, file);
      if (url) {
        setLogoUrl(url);
        setProfile(prev => prev ? { ...prev, logo_url: url } : null);
        setMessage({ type: 'success', text: 'Logotipo atualizado e gravado na base de dados com sucesso!' });
      } else {
        setMessage({ type: 'error', text: 'Não foi possível carregar o logotipo. Tente novamente.' });
      }
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      setMessage({ type: 'error', text: err?.message || 'Erro no upload do logotipo.' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage({ type: 'error', text: 'Sessão inválida. Por favor volte a iniciar sessão.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const saved = await VendorProfileRepository.upsert({
        id: user.id,
        company_name: companyName || 'Minha Empresa de Serviços',
        category: category || 'Outro',
        logo_url: logoUrl || profile?.logo_url || null,
        nif: nif || null,
        iban: iban || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        description: description || null,
        daily_limit: Number(dailyLimit) || 1,
        blocked_dates: blockedDates,
        status: profile?.status || 'Pendente',
      });

      if (saved) {
        setProfile(saved);
        setMessage({ type: 'success', text: 'Perfil comercial guardado com sucesso!' });
      }
    } catch (err: any) {
      console.error('Erro ao guardar perfil:', err);
      setMessage({ 
        type: 'error', 
        text: err?.message || 'Erro ao guardar dados do perfil.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlockedDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedDate) return;
    if (blockedDates.includes(newBlockedDate)) return;

    setBlockedDates([...blockedDates, newBlockedDate].sort());
    setNewBlockedDate('');
  };

  const handleRemoveBlockedDate = (dateToRemove: string) => {
    setBlockedDates(blockedDates.filter(d => d !== dateToRemove));
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> Perfil Comercial do Fornecedor
        </h1>
        <p className="text-sm text-foreground/60">
          Gira as informações públicas do seu negócio, dados de pagamento e a sua capacidade de atendimento.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          message.type === 'success' 
            ? 'bg-success/10 border-success/20 text-success' 
            : 'bg-error/10 border-error/20 text-error'
        }`}>
          {message.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card & Limits (Left column) */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-card-bg border border-border-custom text-center p-5">
            <div className="flex flex-col items-center">
              {/* Logo / Avatar with Upload Button */}
              <div className="relative group mb-3">
                <div className="h-20 w-20 rounded-2xl bg-foreground/5 border-2 border-border-custom flex items-center justify-center overflow-hidden shadow-inner">
                  {logoUrl ? (
                    <img src={logoUrl} alt={companyName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {companyName ? companyName.substring(0, 2).toUpperCase() : 'FO'}
                    </span>
                  )}
                </div>

                {/* Upload Trigger Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-xl bg-primary text-black hover:bg-primary-hover shadow-md transition-transform hover:scale-105 cursor-pointer disabled:opacity-50"
                  title="Alterar Logotipo da Empresa"
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 mb-2 cursor-pointer"
              >
                <Upload className="h-3 w-3" />
                {logoUrl ? 'Substituir Logotipo' : 'Carregar Logotipo'}
              </button>

              <h3 className="font-bold text-base">{companyName || 'Empresa de Serviços'}</h3>
              <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-full mt-1.5">
                {category}
              </span>

              {/* Status Badge */}
              <div className="mt-3 pt-3 border-t border-border-custom/50 w-full flex flex-col items-center gap-1">
                <span className="text-[10px] text-foreground/50 uppercase font-bold tracking-wider">Estado da Conta:</span>
                {profile?.status === 'Aprovado' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-success/15 text-success border border-success/30">
                    <ShieldCheck className="h-3.5 w-3.5" /> Aprovado & Ativo
                  </span>
                ) : profile?.status === 'Suspenso' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-error/15 text-error border border-error/30">
                    <AlertTriangle className="h-3.5 w-3.5" /> Conta Suspensa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Clock className="h-3.5 w-3.5" /> Aguarda Aprovação
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card className="bg-card-bg border border-border-custom p-5">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-primary" /> Agenda & Lotação
            </h4>
            <div className="space-y-4 text-xs">
              <div>
                <Input
                  label="Casamentos Simultâneos/Dia"
                  type="number"
                  min={1}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                />
                <span className="text-[10px] text-foreground/50 mt-1 block">
                  Número de eventos que consegue atender no mesmo dia.
                </span>
              </div>

              {/* Blocked dates */}
              <div className="space-y-2 pt-2 border-t border-border-custom/50">
                <label className="font-bold text-foreground/75 block">Bloquear Datas Específicas</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={newBlockedDate}
                    onChange={(e) => setNewBlockedDate(e.target.value)}
                  />
                  <Button size="sm" type="button" onClick={handleAddBlockedDate} className="p-3">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* List of blocked dates */}
                {blockedDates.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {blockedDates.map(date => (
                      <span 
                        key={date} 
                        className="bg-secondary/20 border border-border-custom/50 rounded-full px-2 py-0.5 text-[10px] font-medium text-foreground/80 flex items-center gap-1"
                      >
                        {new Date(date).toLocaleDateString('pt-AO')}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveBlockedDate(date)} 
                          className="hover:text-error shrink-0 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-foreground/50 italic pt-1">Nenhuma data bloqueada.</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Administrative Profile fields (Right column) */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card-bg border border-border-custom">
            <CardHeader className="p-5 border-b border-border-custom/50">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" /> Informações do Negócio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nome da Marca / Empresa"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
                <Select
                  label="Categoria de Serviço"
                  options={CATEGORIES.map(c => ({ value: c, label: c }))}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="NIF Comercial"
                  placeholder="5000xxxxxx"
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                />
                <Input
                  label="Telefone / WhatsApp Comercial"
                  placeholder="+244 9xx xxx xxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email Comercial de Contacto"
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Website ou Link das Redes Sociais"
                  placeholder="https://instagram.com/minhaempresa"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground/75">Descrição / Apresentação do Negócio</label>
                <textarea
                  className="w-full text-xs p-3 rounded-xl border border-border-custom bg-secondary/5 focus:outline-none focus:border-primary min-h-[100px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Conte um pouco sobre a história, especialidades e o diferencial dos seus serviços..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card-bg border border-border-custom">
            <CardHeader className="p-5 border-b border-border-custom/50">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Detalhes Financeiros (Para Recebimentos)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <Input
                label="IBAN Bancário Angolano (AO06...)"
                placeholder="AO06 0000 0000 0000 0000 0"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
              />
              <p className="text-[10px] text-foreground/50">
                ⚠️ Este IBAN será apresentado nas propostas de contrato aos noivos para que possam efetuar os pagamentos de sinais e parcelas diretamente por transferência.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" isLoading={saving}>
              Guardar Perfil Comercial
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
