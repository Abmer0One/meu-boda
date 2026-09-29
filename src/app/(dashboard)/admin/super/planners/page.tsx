'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SuperAdminPlannersRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/super/utilizadores?tab=planners');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <p className="text-sm text-foreground/60">A redirecionar para Gestão de Wedding Planners B2B...</p>
    </div>
  );
}
