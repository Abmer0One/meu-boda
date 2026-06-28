import type { Metadata } from 'next';
import './globals.css';
import NextQueryProvider from '@/providers/NextQueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { EventProvider } from '@/contexts/EventContext';

export const metadata: Metadata = {
  title: 'Meu Boda - Gestor de Casamentos',
  description: 'A plataforma definitiva para planeamento, organização e gestão do seu casamento.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className="h-full">
      <body className="h-full bg-background text-foreground antialiased">
        <NextQueryProvider>
          <AuthProvider>
            <EventProvider>
              {children}
            </EventProvider>
          </AuthProvider>
        </NextQueryProvider>
      </body>
    </html>
  );
}
