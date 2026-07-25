'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@/validations/schemas';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { FadeInUp } from '@/components/animations/FramerAnimations';

export default function RegisterPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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
      setErrorMessage(error.message);
      setIsLoading(false);
    } else {
      if (data.role === 'vendor' && signUpData?.user) {
        const { error: profileError } = await supabase.from('vendor_profiles').insert({
          id: signUpData.user.id,
          company_name: 'Minha Empresa de Serviços',
          category: 'Fotografia',
          status: 'Aprovado',
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
            <img src="/meu_boda_hybrid-removebg-preview.png" alt="Logo Meu Boda" className="h-32 w-auto object-contain" />
            <p className="text-sm text-foreground/60 mt-3 font-semibold">Painel de Organização de Eventos</p>
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

                <Input
                  label="Telefone (+244...)"
                  placeholder="+244 912 345 678"
                  error={errors.phone?.message}
                  {...register('phone')}
                />

                <Input
                  label="E-mail"
                  type="email"
                  placeholder="exemplo@email.com"
                  error={errors.email?.message}
                  {...register('email')}
                />

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

                <Button type="submit" className="w-full justify-center mt-2" isLoading={isLoading}>
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
