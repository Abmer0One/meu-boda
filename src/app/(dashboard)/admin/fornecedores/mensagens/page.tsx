'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ChatTab from '@/components/marketplace/ChatTab';
import { MessageSquare } from 'lucide-react';

export default function VendorMessagesPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-foreground/50 text-sm">Carregando mensagens...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" /> Mensagens & Pedidos de Casamentos
        </h1>
        <p className="text-sm text-foreground/60">
          Responda a noivos em tempo real, tire dúvidas e envie propostas oficiais de contratação.
        </p>
      </div>

      <ChatTab userRole="vendor" vendorId={user.id} />
    </div>
  );
}
