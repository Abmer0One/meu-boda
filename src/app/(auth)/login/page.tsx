'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/validations/schemas';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { FadeInUp } from '@/components/animations/FramerAnimations';

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setErrorMessage(error.message === 'Invalid login credentials' ? 'Credenciais inválidas. Verifique o e-mail e a senha.' : error.message);
      setIsLoading(false);
    } else {
      router.push('/admin/dashboard');
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
              <CardTitle className="text-center text-lg">Entrar na Conta</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {errorMessage && (
                  <div className="rounded-xl bg-error/10 p-3 text-xs text-error font-medium">
                    {errorMessage}
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

                <Button type="submit" className="w-full justify-center mt-2" isLoading={isLoading}>
                  Entrar
                </Button>
              </form>

              <div className="mt-5 text-center text-xs text-foreground/60">
                Não tem uma conta?{' '}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Criar conta
                </Link>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>
    </div>
  );
}
