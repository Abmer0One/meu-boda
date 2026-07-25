'use client';

import React, { useEffect, useState } from 'react';
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
  Loader2 
} from 'lucide-react';

const CATEGORIES = ['Fotografia', 'Decoração', 'Buffet', 'DJ', 'Espaço', 'Vestuário', 'Outro'];

export default function VendorProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [nif, setNif] = useState('');
  const [iban, setIban] = useState('');
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
          setCategory(fetched.category);
          setNif(fetched.nif || '');
          setIban(fetched.iban || '');
          setDescription(fetched.description || '');
          setDailyLimit(fetched.daily_limit || 1);
          setBlockedDates(fetched.blocked_dates || []);
        } else {
          // Create default profile
          const defaultProf = await VendorProfileRepository.create({
            id: user.id,
            company_name: 'Minha Empresa de Serviços',
            category: 'Fotografia',
            nif: null,
            iban: null,
            logo_url: null,
            description: null,
            daily_limit: 1,
            blocked_dates: [],
            status: 'Aprovado'
          });
          if (defaultProf) {
            setProfile(defaultProf);
            setCompanyName(defaultProf.company_name);
            setCategory(defaultProf.category);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage(null);
    try {
      const updated = await VendorProfileRepository.update(profile.id, {
        company_name: companyName,
        category,
        nif: nif || null,
        iban: iban || null,
        description: description || null,
        daily_limit: Number(dailyLimit),
        blocked_dates: blockedDates
      });

      if (updated) {
        setProfile(updated);
        setMessage({ type: 'success', text: 'Perfil comercial atualizado com sucesso!' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao guardar dados do perfil.' });
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
              <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-bold text-primary mb-3">
                {companyName ? companyName.substring(0, 2).toUpperCase() : 'FO'}
              </div>
              <h3 className="font-bold text-base">{companyName || 'Empresa de Serviços'}</h3>
              <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-full mt-1.5">
                {category}
              </span>
              <p className="text-[10px] text-foreground/50 mt-3">Estado de Moderação: <span className="font-extrabold text-success">{profile?.status}</span></p>
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
