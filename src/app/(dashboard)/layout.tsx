'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/contexts/EventContext';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { EventRepository } from '@/repositories/event.repository';
import NotificationBell from '@/components/notifications/NotificationBell';
import {
  LayoutDashboard,
  Heart,
  Users,
  MailOpen,
  CalendarRange,
  CheckSquare,
  DollarSign,
  Briefcase,
  FileText,
  FileSpreadsheet,
  QrCode,
  LogOut,
  Menu,
  X,
  Plus,
  ChevronDown,
  Loader2,
  Camera,
  User,
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

const menuItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'O Evento', href: '/admin/eventos', icon: Heart },
  { name: 'Convidados', href: '/admin/convidados', icon: Users },
  { name: 'Convites & QRs', href: '/admin/convites', icon: MailOpen },
  { name: 'Galeria Foto', href: '/admin/galeria', icon: Camera },
  { name: 'Mesas (Seating)', href: '/admin/mesas', icon: CalendarRange },
  { name: 'Tarefas', href: '/admin/tarefas', icon: CheckSquare },
  { name: 'Orçamento', href: '/admin/orcamento', icon: DollarSign },
  { name: 'Fornecedores', href: '/admin/fornecedores', icon: Briefcase },
  { name: 'Documentos', href: '/admin/documentos', icon: FileText },
  { name: 'Relatórios', href: '/admin/relatorios', icon: FileSpreadsheet },
  { name: 'Portaria (Check-in)', href: '/admin/checkin', icon: QrCode },
  { name: 'Meu Perfil', href: '/admin/perfil', icon: User },
  { name: 'Consola Admin', href: '/admin/super', icon: ShieldAlert },
];

const vendorMenuItems: SidebarItem[] = [
  { name: 'Meu Perfil', href: '/admin/fornecedores/perfil', icon: User },
  { name: 'Portfólio', href: '/admin/fornecedores/portfolio', icon: Briefcase },
  { name: 'Mensagens e Pedidos', href: '/admin/fornecedores/mensagens', icon: MailOpen },
  { name: 'Meus Contratos', href: '/admin/fornecedores/contratos', icon: FileText },
];

const mobileTabItems = [
  { name: 'Painel', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Convidados', href: '/admin/convidados', icon: Users },
  { name: 'Galeria', href: '/admin/galeria', icon: Camera },
  { name: 'Check-in', href: '/admin/checkin', icon: QrCode },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { currentEvent, events, loading: eventLoading, setCurrentEvent, refreshEvents } = useEvent();
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin = user?.app_metadata?.role === 'admin'
    || user?.email?.includes('admin')
    || user?.email === 'amota@example.com';

  const isVendor = user?.app_metadata?.role === 'vendor' || user?.user_metadata?.role === 'vendor';

  const visibleMenuItems = isAdmin
    ? menuItems.filter(item => item.href === '/admin/super' || item.href === '/admin/perfil')
    : isVendor
    ? vendorMenuItems
    : menuItems.filter(item => item.href !== '/admin/super');

  const visibleMobileTabItems = isAdmin
    ? [
        { name: 'Consola', href: '/admin/super', icon: ShieldAlert },
        { name: 'Perfil', href: '/admin/perfil', icon: User },
      ]
    : isVendor
    ? [
        { name: 'Perfil', href: '/admin/fornecedores/perfil', icon: User },
        { name: 'Portfólio', href: '/admin/fornecedores/portfolio', icon: Briefcase },
        { name: 'Mensagens', href: '/admin/fornecedores/mensagens', icon: MailOpen },
        { name: 'Contratos', href: '/admin/fornecedores/contratos', icon: FileText },
      ]
    : mobileTabItems;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newEventModalOpen, setNewEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventSlug, setEventSlug] = useState('');
  const [eventType, setEventType] = useState<'casamento' | 'aniversario' | 'pedido' | 'outro'>('casamento');
  const [eventDate, setEventDate] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [formError, setFormError] = useState<string | null>(null);

  // Authentication guard redirect
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (isAdmin && (pathname === '/admin/dashboard' || pathname === '/admin')) {
        router.push('/admin/super');
      } else if (isVendor && (pathname === '/admin/dashboard' || pathname === '/admin' || !pathname.startsWith('/admin/fornecedores'))) {
        router.push('/admin/fornecedores/perfil');
      }
    }
  }, [user, authLoading, router, isAdmin, isVendor, pathname]);

  // Real-time slug availability check with debounce
  useEffect(() => {
    const cleanSlug = eventSlug.trim().toLowerCase();
    if (!cleanSlug || cleanSlug.length < 2) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      const isAvail = await EventRepository.isSlugAvailable(cleanSlug);
      setSlugStatus(isAvail ? 'available' : 'taken');
    }, 400);

    return () => clearTimeout(timer);
  }, [eventSlug]);

  // Sync slug on title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEventTitle(val);
    setEventSlug(
      val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9\s-]/g, '') // remove special chars
        .replace(/\s+/g, '-') // replace spaces with hyphens
        .replace(/-+/g, '-') // collapse consecutive hyphens
    );
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !eventTitle || !eventDate || !eventSlug) return;

    if (events.length >= 1) {
      alert("Cada utilizador apenas pode gerir um único evento.");
      return;
    }

    setFormError(null);

    // If marked as taken, prevent submit with explicit alert message
    if (slugStatus === 'taken') {
      setFormError(`O link "${eventSlug}" já existe na base de dados. Por favor, escolha outro link antes de continuar.`);
      return;
    }

    setIsCreatingEvent(true);
    try {
      // Re-verify right before inserting to guarantee no race condition
      const isAvail = await EventRepository.isSlugAvailable(eventSlug);
      if (!isAvail) {
        setSlugStatus('taken');
        setFormError(`O link "${eventSlug}" já existe na base de dados. Por favor, escolha outro link.`);
        setIsCreatingEvent(false);
        return;
      }

      const { event: newEvent, error } = await EventRepository.create({
        user_id: user.id,
        title: eventTitle,
        slug: eventSlug,
        type: eventType,
        date: new Date(eventDate).toISOString(),
        description: '',
        ceremony_location: '',
        party_location: '',
        theme: '',
        cover_image: null,
      });

      if (error) {
        setFormError(error);
        if (error.includes('já existe') || error.includes('em uso')) {
          setSlugStatus('taken');
        }
        return;
      }

      if (newEvent) {
        await refreshEvents();
        setCurrentEvent(newEvent);
        setNewEventModalOpen(false);
        // Reset fields
        setEventTitle('');
        setEventSlug('');
        setEventType('casamento');
        setEventDate('');
        setSlugStatus('idle');
        setFormError(null);
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Ocorreu um erro ao criar o evento.');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  if (authLoading || (user && eventLoading)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground/75">A carregar painel...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border-custom md:bg-card-bg">
        {/* LOGO */}
        <div className="flex h-20 items-center justify-start px-6 border-b border-border-custom bg-card-bg/50">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_meu_boda.png" alt="Logo Meu Boda" className="h-9 w-auto object-contain" />
            <span className="font-serif font-extrabold text-lg tracking-tight text-foreground">
              Meu Boda
            </span>
          </Link>
        </div>

        {/* EVENT SELECTOR */}
        {!isAdmin && (
          <div className="p-4 border-b border-border-custom">
            {events.length > 0 ? (
              <div>
                <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider block mb-1">
                  Evento Ativo
                </label>
                <div className="flex items-center gap-2 w-full rounded-xl border border-border-custom/50 bg-secondary/20 px-3 py-2 text-xs font-bold text-foreground/80">
                  <span className="truncate">{currentEvent?.title}</span>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center text-xs"
                leftIcon={<Plus className="h-3 w-3" />}
                onClick={() => setNewEventModalOpen(true)}
              >
                Criar Evento
              </Button>
            )}
          </div>
        )}

        {/* NAV LINKS */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                    : 'text-foreground/75 hover:bg-secondary hover:text-primary'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-foreground/50 group-hover:text-primary'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* FOOTER USER / LOGOUT */}
        <div className="border-t border-border-custom p-4 flex items-center justify-between gap-3 bg-secondary/20">
          <div className="truncate flex-1">
            <p className="text-xs font-semibold truncate">{user?.email || 'Minha Conta'}</p>
            <p className="text-[10px] text-foreground/50">
              {isAdmin ? 'Administrador' : isVendor ? 'Fornecedor' : 'Organizador'}
            </p>
          </div>
          <button
            onClick={() => signOut().then(() => router.push('/login'))}
            className="rounded-full p-2 text-foreground/50 hover:bg-error/10 hover:text-error transition-colors cursor-pointer"
            title="Terminar Sessão"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* CONTENT CONTAINER WITH TOPBAR */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* DESKTOP TOPBAR */}
        <header className="hidden md:flex h-16 shrink-0 items-center justify-between border-b border-border-custom bg-card-bg/70 backdrop-blur-md px-8 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-foreground/60">
              {isAdmin
                ? 'Consola de Super Administrador'
                : isVendor
                ? 'Painel do Fornecedor Credenciado'
                : currentEvent
                ? currentEvent.title
                : 'Meu Boda'}
            </span>
            {currentEvent?.date && !isNaN(new Date(currentEvent.date).getTime()) && !isAdmin && !isVendor && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-primary border border-border-custom/50">
                <Heart className="h-3 w-3 fill-primary text-primary" />
                {new Date(currentEvent.date).toLocaleDateString('pt-AO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="h-5 w-px bg-border-custom" />
            <Link
              href={isVendor ? '/admin/fornecedores/perfil' : '/admin/perfil'}
              className="flex items-center gap-2 text-xs font-semibold text-foreground/75 hover:text-primary transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden lg:inline">{user?.email || 'Minha Conta'}</span>
            </Link>
          </div>
        </header>

        {/* MOBILE HEADER */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-custom bg-card-bg px-4 md:hidden">
          <Link href={isAdmin ? '/admin/super' : '/admin/dashboard'} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_meu_boda.png" alt="Logo Meu Boda" className="h-8 w-auto object-contain" />
            <span className="font-serif font-bold text-base tracking-tight text-foreground">
              Meu Boda
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <button
              onClick={() => signOut().then(() => router.push('/login'))}
              className="rounded-full p-2 text-foreground/50 hover:text-error cursor-pointer"
              title="Terminar Sessão"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-full p-2 text-foreground/50 hover:bg-secondary cursor-pointer"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* MAIN PAGE BODY */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 bg-background relative">
          {events.length === 0 && !eventLoading && !isAdmin && !isVendor ? (
            <div className="flex h-[70vh] flex-col items-center justify-center text-center max-w-md mx-auto">
              <Heart className="h-16 w-16 text-accent animate-pulse mb-4" />
              <h2 className="text-xl font-bold mb-2">Bem-vindo ao Meu Boda!</h2>
              <p className="text-sm text-foreground/60 mb-6">
                Para começar a organizar e usufruir de todas as funcionalidades, crie o seu primeiro casamento ou evento.
              </p>
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setNewEventModalOpen(true)}>
                Criar Primeiro Casamento
              </Button>
            </div>
          ) : (
            children
          )}
        </main>

        {/* MOBILE BOTTOM NAVIGATION */}
        <nav className="fixed bottom-0 inset-x-0 h-16 bg-card-bg border-t border-border-custom flex items-center justify-around z-40 md:hidden pb-safe">
          {visibleMobileTabItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-1 text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-primary' : 'text-foreground/50 hover:text-primary/85'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-foreground/45'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* MOBILE MENU DRAWER */}
      <Dialog isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} title="Menu Principal">
        <div className="space-y-4">
          {/* Active Event Selector */}
          {events.length > 0 && (
            <div className="rounded-xl border border-border-custom/50 bg-secondary/30 p-3">
              <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider block mb-1">
                Evento Ativo
              </label>
              <p className="text-xs font-bold text-foreground/80 truncate">
                {currentEvent?.title}
              </p>
            </div>
          )}

          <nav className="flex flex-col gap-1.5">
            {visibleMenuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-foreground/75 hover:bg-secondary hover:text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {events.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center mt-4 border-dashed"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setMobileMenuOpen(false);
                setNewEventModalOpen(true);
              }}
            >
              Adicionar Novo Evento
            </Button>
          )}
        </div>
      </Dialog>

      {/* NEW EVENT DIALOG */}
      <Dialog
        isOpen={newEventModalOpen}
        onClose={() => {
          setNewEventModalOpen(false);
          setFormError(null);
          setSlugStatus('idle');
        }}
        title={`Novo Evento - ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`}
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-error/10 border border-error/25 p-3.5 text-xs text-error flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-error" />
              <div className="flex-1">
                <p className="font-bold">Aviso de Validação</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">{formError}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground/75 tracking-wide">Tipo de Evento</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as any)}
              className="w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            >
              <option value="casamento">Casamento</option>
              <option value="aniversario">Aniversário</option>
              <option value="pedido">Pedido de Casamento / Noivado</option>
              <option value="outro">Outro Evento</option>
            </select>
          </div>

          <Input
            label={
              eventType === 'casamento'
                ? 'Nome do Casamento (ex: Maria & João)'
                : eventType === 'aniversario'
                ? 'Nome do Aniversário (ex: Sofia - 30 Anos)'
                : eventType === 'pedido'
                ? 'Nome do Pedido / Noivado (ex: Carlos & Clara)'
                : 'Nome do Evento (ex: Gala Anual)'
            }
            value={eventTitle}
            onChange={handleTitleChange}
            placeholder={
              eventType === 'casamento'
                ? 'Noiva & Noivo'
                : eventType === 'aniversario'
                ? 'Sofia - 30 Anos'
                : eventType === 'pedido'
                ? 'Carlos & Clara'
                : 'Nome do Evento'
            }
            required
          />

          <div>
            <Input
              label="Slug da Rota Pública (Link do Convite)"
              value={eventSlug}
              onChange={(e) => setEventSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-'))}
              placeholder="ex: meu-casamento-2026"
              error={slugStatus === 'taken' ? 'Este link já está em uso na base de dados' : undefined}
              required
            />
            {/* Real-time slug availability feedback */}
            {slugStatus === 'checking' && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/55 mt-1.5 animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>A verificar disponibilidade na base de dados...</span>
              </div>
            )}
            {slugStatus === 'taken' && (
              <div className="rounded-xl bg-error/10 border border-error/25 p-3 mt-1.5 text-xs text-error flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-error" />
                <div className="flex-1">
                  <p className="font-bold">Link já existente na base de dados</p>
                  <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                    O link <strong>"{eventSlug}"</strong> já pertence a outro evento. Por favor, adicione um número, ano ou altere o texto para poder criar o seu evento.
                  </p>
                </div>
              </div>
            )}
            {slugStatus === 'available' && eventSlug.length >= 2 && (
              <div className="rounded-xl bg-success/10 border border-success/25 p-2 mt-1.5 text-xs text-success flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                <span>Link disponível: <strong>meuboda.ao/convite/{eventSlug}</strong></span>
              </div>
            )}
          </div>

          <Input
            label={
              eventType === 'casamento'
                ? 'Data e Hora do Casamento'
                : eventType === 'aniversario'
                ? 'Data e Hora do Aniversário'
                : eventType === 'pedido'
                ? 'Data e Hora do Pedido'
                : 'Data e Hora do Evento'
            }
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setNewEventModalOpen(false);
                setFormError(null);
                setSlugStatus('idle');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={isCreatingEvent}
              disabled={isCreatingEvent || slugStatus === 'taken' || slugStatus === 'checking'}
            >
              Criar Evento
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
