'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, Lock, Phone, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PerfilPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form with user metadata
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setPhone(user.user_metadata?.phone || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    // Validate passwords if user wants to change password
    if (password) {
      if (password.length < 6) {
        setErrorMessage('A nova senha deve ter pelo menos 6 caracteres.');
        setIsSaving(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As senhas não coincidem.');
        setIsSaving(false);
        return;
      }
    }

    try {
      // Build update payload
      const updateData: any = {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        }
      };

      if (password) {
        updateData.password = password;
      }

      const { data, error } = await supabase.auth.updateUser(updateData);

      if (error) throw error;

      setSuccessMessage('Perfil atualizado com sucesso!');
      setPassword('');
      setConfirmPassword('');
      
      // Update local storage/state if needed
      if (data.user) {
        setFullName(data.user.user_metadata?.full_name || '');
        setPhone(data.user.user_metadata?.phone || '');
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setErrorMessage(err.message || 'Erro ao atualizar dados do perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Get user initials for premium avatar look
  const getInitials = () => {
    if (fullName) {
      const names = fullName.trim().split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return user.email ? user.email[0].toUpperCase() : 'U';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> O Meu Perfil
        </h1>
        <p className="text-sm text-foreground/60">
          Gerencie suas credenciais de acesso, informações de contacto e dados de conta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Side: Avatar and Quick Stats */}
        <div className="md:col-span-4 space-y-4">
          <Card className="bg-card-bg text-center py-8">
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary font-bold text-3xl shadow-sm">
                  {getInitials()}
                </div>
                <span className="absolute bottom-1 right-1 flex h-4 w-4 rounded-full bg-success ring-2 ring-background" />
              </div>

              <div>
                <h3 className="font-bold text-base text-foreground leading-tight">
                  {fullName || 'Utilizador do Meu Boda'}
                </h3>
                <p className="text-xs text-foreground/50 mt-1">{user.email}</p>
                <Badge variant="primary" className="mt-2 text-[10px]">Organizador</Badge>
              </div>

              <div className="w-full border-t border-border-custom/50 pt-4 flex justify-around text-center">
                <div>
                  <span className="block text-xs font-bold text-foreground/40 uppercase tracking-wider">Conta</span>
                  <span className="text-xs font-semibold text-foreground/80 mt-0.5 block">Ativa</span>
                </div>
                <div className="border-l border-border-custom/50 h-8" />
                <div>
                  <span className="block text-xs font-bold text-foreground/40 uppercase tracking-wider">Perfil</span>
                  <span className="text-xs font-semibold text-foreground/80 mt-0.5 block">
                    {fullName ? 'Completo' : 'Incompleto'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Edit Form */}
        <div className="md:col-span-8">
          <Card className="bg-card-bg">
            <CardHeader>
              <CardTitle>Editar Meus Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {successMessage && (
                  <div className="rounded-xl bg-success/15 p-3.5 text-xs text-success font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}
                {errorMessage && (
                  <div className="rounded-xl bg-error/15 p-3.5 text-xs text-error font-medium flex items-center gap-2">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Name */}
                <Input
                  label="Nome Completo"
                  placeholder="Ex: Ana Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <Input
                    label="Telefone / Telemóvel"
                    placeholder="Ex: +244 923 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                  />

                  {/* Email (Disabled) */}
                  <Input
                    label="Email de Acesso"
                    value={user.email || ''}
                    disabled
                    className="opacity-60 cursor-not-allowed bg-secondary/10"
                    helperText="O email não pode ser alterado por razões de segurança."
                  />
                </div>

                <div className="border-t border-border-custom pt-5 mt-2 space-y-4">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Alterar Senha de Acesso
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nova Senha"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                    />
                    <Input
                      label="Confirmar Nova Senha"
                      placeholder="Digite novamente"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      type="password"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-border-custom">
                  <Button type="submit" isLoading={isSaving}>
                    Guardar Perfil
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Simple Helper Badge component inline for page styling consistency
function Badge({ children, variant = 'primary', className = '' }: { children: React.ReactNode; variant?: 'primary' | 'secondary'; className?: string }) {
  const baseStyle = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none";
  const variants = {
    primary: "bg-primary/10 text-primary hover:bg-primary/20",
    secondary: "bg-secondary text-foreground/80 hover:bg-secondary/80",
  };
  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
