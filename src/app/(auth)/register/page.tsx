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
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    } else {
      setSuccessMessage('Conta criada com sucesso! Redirecionando para o painel...');
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 1500);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center p-4 bg-gradient-to-tr from-secondary/50 via-background to-secondary/30">
      <div className="w-full max-w-md">
        <FadeInUp>
          <div className="text-center mb-6 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo Meu Boda" className="h-32 w-auto object-contain" />
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
