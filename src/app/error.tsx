'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erro global capturado pelo ErrorBoundary:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-6 text-center bg-background">
      <div className="rounded-2xl bg-primary/10 p-4 text-primary mb-4 border border-primary/20">
        <AlertCircle className="h-10 w-10" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">
        Pedimos desculpa, algo correu mal
      </h2>
      <p className="text-sm text-foreground/65 max-w-md mb-6 leading-relaxed">
        Ocorreu uma falha no processamento da página. Pode tentar recarregar ou voltar à página inicial.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Tentar Novamente
        </Button>
        <Link href="/">
          <Button variant="outline" leftIcon={<Home className="h-4 w-4" />}>
            Página Inicial
          </Button>
        </Link>
      </div>
    </div>
  );
}
