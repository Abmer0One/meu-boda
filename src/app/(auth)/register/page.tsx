'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@/validations/schemas';
import { supabase } from '@/lib/supabase';
import { AuthRepository } from '@/repositories/auth.repository';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { FadeInUp } from '@/components/animations/FramerAnimations';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [phoneStatus, setPhoneStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'client' as 'client' | 'vendor',
    },
  });

  const selectedRole = watch('role');
  const watchedEmail = watch('email');
  const watchedPhone = watch('phone');

  // Real-time email availability check with debounce
  useEffect(() => {
    const cleanEmail = watchedEmail?.trim().toLowerCase();
    if (!cleanEmail || cleanEmail.length < 5 || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailStatus('idle');
      return;
    }

    setEmailStatus('checking');
    const timer = setTimeout(async () => {
      const res = await AuthRepository.checkAvailability(cleanEmail, null);
      setEmailStatus(res.emailAvailable ? 'available' : 'taken');
    }, 400);

    return () => clearTimeout(timer);
  }, [watchedEmail]);

  // Real-time phone availability check with debounce
  useEffect(() => {
    const rawDigits = watchedPhone?.replace(/\D/g, '') || '';
    if (rawDigits.length < 9) {
      setPhoneStatus('idle');
      return;
    }

    setPhoneStatus('checking');
    const timer = setTimeout(async () => {
      const res = await AuthRepository.checkAvailability(null, watchedPhone);
      setPhoneStatus(res.phoneAvailable ? 'available' : 'taken');
    }, 400);

    return () => clearTimeout(timer);
  }, [watchedPhone]);

  const onSubmit = async (data: any) => {
    if (emailStatus === 'taken' || phoneStatus === 'taken') {
      setErrorMessage('O e-mail ou número de telefone introduzido já está registado na base de dados. Por favor altere para prosseguir.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Final availability check before submission
    const availability = await AuthRepository.checkAvailability(data.email, data.phone);
    if (!availability.emailAvailable) {
      setEmailStatus('taken');
      setErrorMessage(`O e-mail "${data.email}" já está registado na base de dados. Por favor utilize outro e-mail.`);
      setIsLoading(false);
      return;
    }
    if (!availability.phoneAvailable) {
      setPhoneStatus('taken');
      setErrorMessage(`O número de telefone "${data.phone}" já está registado na base de dados. Por favor utilize outro número.`);
      setIsLoading(false);
      return;
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.name,
          phone: data.phone,
          role: data.role,
        },
      },
    });

    if (error) {
      if (
        error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already exists') ||
        (error as any).code === 'user_already_exists'
      ) {
        setEmailStatus('taken');
        setErrorMessage(`O e-mail "${data.email}" já possui uma conta registada. Por favor tente iniciar sessão.`);
      } else {
        setErrorMessage(error.message);
      }
      setIsLoading(false);
    } else {
      if (data.role === 'vendor' && signUpData?.user) {
        const { error: profileError } = await supabase.from('vendor_profiles').insert({
          id: signUpData.user.id,
          company_name: 'Minha Empresa de Serviços',
          category: 'Fotografia',
          status: 'Aprovado',
          email: data.email,
          phone: data.phone,
        });
        if (profileError) {
          console.error('Error creating vendor profile:', profileError);
        }
      }

      setSuccessMessage('Conta criada com sucesso! Redirecionando...');
      setTimeout(() => {
        if (data.role === 'vendor') {
          router.push('/admin/fornecedores/perfil');
        } else {
          router.push('/admin/dashboard');
        }
      }, 1500);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center p-4 bg-gradient-to-tr from-secondary/50 via-background to-secondary/30">
      <div className="w-full max-w-md">
        <FadeInUp>
          <div className="text-center mb-6 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_meu_boda.png" alt="Logo Meu Boda" className="h-20 w-auto object-contain" />
            <h1 className="text-2xl font-serif font-extrabold text-foreground tracking-tight mt-3">Meu Boda</h1>
            <p className="text-xs text-foreground/60 mt-1 font-semibold">Painel de Organização de Eventos</p>
          </div>

          <Card className="shadow-lg p-6 bg-card-bg">
            <CardHeader className="mb-4">
              <CardTitle className="text-center text-lg">Criar Nova Conta</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {errorMessage && (
                  <div className="rounded-xl bg-error/10 p-3 text-xs text-error font-medium">
                    {errorMessage}
                  </div>
                )}
                {successMessage && (
                  <div className="rounded-xl bg-success/10 p-3 text-xs text-success font-medium">
                    {successMessage}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground/75 block">Tipo de Conta</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setValue('role', 'client')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedRole === 'client'
                          ? 'border-primary bg-primary/5 text-primary font-semibold'
                          : 'border-border-custom bg-secondary/10 text-foreground/60'
                      }`}
                    >
                      <span className="text-sm">💍 Noivos/Planner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('role', 'vendor')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedRole === 'vendor'
                          ? 'border-primary bg-primary/5 text-primary font-semibold'
                          : 'border-border-custom bg-secondary/10 text-foreground/60'
                      }`}
                    >
                      <span className="text-sm">💼 Fornecedor</span>
                    </button>
                  </div>
                </div>

                <Input
                  label="Nome Completo"
                  placeholder="Seu Nome"
                  error={errors.name?.message}
                  {...register('name')}
                />

                <div>
                  <Input
                    label="Telefone (+244...)"
                    placeholder="+244 912 345 678"
                    error={phoneStatus === 'taken' ? 'Este número de telefone já está em uso na base de dados' : errors.phone?.message}
                    {...register('phone')}
                  />
                  {phoneStatus === 'checking' && (
                    <div className="flex items-center gap-1.5 text-xs text-foreground/55 mt-1.5 animate-pulse">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span>A verificar disponibilidade do telefone...</span>
                    </div>
                  )}
                  {phoneStatus === 'taken' && (
                    <div className="rounded-xl bg-error/10 border border-error/25 p-2.5 mt-1.5 text-xs text-error flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-error" />
                      <div className="flex-1">
                        <p className="font-bold">Telefone já existente na base de dados</p>
                        <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                          Este número de telefone já está associado a outra conta. Por favor utilize outro número ou faça login.
                        </p>
                      </div>
                    </div>
                  )}
                  {phoneStatus === 'available' && watchedPhone && watchedPhone.replace(/\D/g, '').length >= 9 && (
                    <div className="rounded-xl bg-success/10 border border-success/25 p-2 mt-1.5 text-xs text-success flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      <span>Telefone disponível para registo</span>
                    </div>
                  )}
                </div>

                <div>
                  <Input
                    label="E-mail"
                    type="email"
                    placeholder="exemplo@email.com"
                    error={emailStatus === 'taken' ? 'Este e-mail já está registado na base de dados' : errors.email?.message}
                    {...register('email')}
                  />
                  {emailStatus === 'checking' && (
                    <div className="flex items-center gap-1.5 text-xs text-foreground/55 mt-1.5 animate-pulse">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span>A verificar disponibilidade do e-mail...</span>
                    </div>
                  )}
                  {emailStatus === 'taken' && (
                    <div className="rounded-xl bg-error/10 border border-error/25 p-2.5 mt-1.5 text-xs text-error flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-error" />
                      <div className="flex-1">
                        <p className="font-bold">E-mail já existente na base de dados</p>
                        <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                          Já existe uma conta com o e-mail <strong>"{watchedEmail}"</strong>. Por favor utilize outro e-mail ou{' '}
                          <Link href="/login" className="font-bold underline text-error hover:opacity-80">
                            faça login aqui
                          </Link>.
                        </p>
                      </div>
                    </div>
                  )}
                  {emailStatus === 'available' && watchedEmail && watchedEmail.includes('@') && (
                    <div className="rounded-xl bg-success/10 border border-success/25 p-2 mt-1.5 text-xs text-success flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      <span>E-mail disponível para registo</span>
                    </div>
                  )}
                </div>

                <Input
                  label="Senha"
                  type="password"
                  placeholder="******"
                  error={errors.password?.message}
                  {...register('password')}
                />

                <Input
                  label="Confirmar Senha"
                  type="password"
                  placeholder="******"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                <Button
                  type="submit"
                  className="w-full justify-center mt-2"
                  isLoading={isLoading}
                  disabled={isLoading || emailStatus === 'taken' || phoneStatus === 'taken' || emailStatus === 'checking' || phoneStatus === 'checking'}
                >
                  Registrar
                </Button>
              </form>

              <div className="mt-5 text-center text-xs text-foreground/60">
                Já tem uma conta?{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Entrar na conta
                </Link>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>
    </div>
  );
}
