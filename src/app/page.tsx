'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Users, 
  CheckCircle, 
  Camera, 
  ArrowRight, 
  Check, 
  Menu, 
  X, 
  Sparkles, 
  Coins, 
  Calendar,
  Lock,
  Smartphone,
  ShieldCheck,
  ChevronDown,
  QrCode,
  Sliders,
  ChevronRight,
  TrendingUp,
  Award,
  Search,
  BookOpen,
  LayoutDashboard,
  ShieldAlert,
  ArrowUpRight,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// Animation constants for clean, premium pacing
const fadeInUp = {
  initial: { opacity: 0, y: 25 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
} as any;

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } }
} as any;

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Navigation active dropdown (Stripe/WithJoy style)
  const [activeDropdown, setActiveDropdown] = useState<'features' | 'guest' | null>(null);
  
  // Showcase Simulator active tab selector
  const [activeSimTab, setActiveSimTab] = useState<'rsvp' | 'tables'>('rsvp');

  // Interactive Simulator 1: Guest RSVP & Pass Generator
  const [simName, setSimName] = useState('Dra. Ana Paula');
  const [simRole, setSimRole] = useState<'Padrinho' | 'Familiar' | 'Convidado'>('Padrinho');
  const [simStatus, setSimStatus] = useState<'Confirmado' | 'Pendente'>('Confirmado');
  
  // Interactive Simulator 2: Seating Chart Live Preview
  const [selectedTable, setSelectedTable] = useState<'Mesa 1 - Rosas' | 'Mesa 2 - Orquídeas' | 'Mesa 3 - Lírios'>('Mesa 1 - Rosas');
  const [guestsInTables, setGuestsInTables] = useState({
    'Mesa 1 - Rosas': ['Dra. Ana Paula', 'Dr. António Manuel', 'Marta Santos'],
    'Mesa 2 - Orquídeas': ['Carlos Silva', 'Cláudia Mendes', 'João Pires'],
    'Mesa 3 - Lírios': ['Nelson Costa', 'Sandra Ramos', 'Vítor Jorge']
  });
  const [newSimGuest, setNewSimGuest] = useState('');

  // Search Simulator Widget (WithJoy style)
  const [searchToken, setSearchToken] = useState('');
  const [searchState, setSearchState] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');

  // FAQ accordion open states
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Active challenge index for comparison widget
  const [activeChallenge, setActiveChallenge] = useState<number>(0);

  // Monitor scroll for premium navbar shrink & styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check login state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  // Add guest to simulated table helper
  const handleAddSimGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimGuest.trim()) return;
    setGuestsInTables(prev => ({
      ...prev,
      [selectedTable]: [...prev[selectedTable], newSimGuest.trim()]
    }));
    setNewSimGuest('');
  };

  const handleSimSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchToken.trim()) return;
    setSearchState('searching');
    setTimeout(() => {
      if (searchToken.toLowerCase().includes('marcos') || searchToken.toLowerCase().includes('alice')) {
        setSearchState('found');
      } else {
        setSearchState('not_found');
      }
    }, 1200);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col font-sans selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      
      {/* STRUCTURED JSON-LD SCHEMA FOR SAAS PRODUCT (SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            'name': 'Meu Boda',
            'applicationCategory': 'BusinessApplication',
            'operatingSystem': 'Web',
            'description': 'Plataforma SaaS premium para planeamento, organização e gestão de casamentos e eventos em Angola.',
            'offers': {
              '@type': 'AggregateOffer',
              'priceCurrency': 'AOA',
              'lowPrice': '20000',
              'highPrice': '45000',
              'offerCount': '3'
            }
          })
        }}
      />

      {/* FIXED NAVBAR WITH STRIPE/WITHJOY STYLE FLOATING DROPDOWNS */}
      <header 
        className={`fixed top-0 inset-x-0 z-50 w-full border-b border-border-custom/50 bg-background/90 backdrop-blur-lg transition-all duration-500 ${
          isScrolled ? 'h-20 shadow-md shadow-foreground/[0.015]' : 'h-28'
        }`}
        onMouseLeave={() => setActiveDropdown(null)}
      >
        <div className="mx-auto max-w-7xl px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer active:scale-95 transition-all">
            <img 
              src="/meu_boda_hybrid-removebg-preview.png" 
              alt="Meu Boda" 
              className={`w-auto object-contain transition-all duration-500 ${
                isScrolled ? 'h-16' : 'h-24'
              }`}
            />
          </Link>

          {/* Desktop Nav Links & Dropdowns */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-foreground/75 relative">
            
            {/* Features Dropdown Trigger */}
            <div 
              className="relative py-2"
              onMouseEnter={() => setActiveDropdown('features')}
            >
              <button className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer focus:outline-none">
                Funcionalidades <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${activeDropdown === 'features' ? 'rotate-180 text-primary' : ''}`} />
              </button>
            </div>

            {/* Guest Portal Trigger */}
            <div 
              className="relative py-2"
              onMouseEnter={() => setActiveDropdown('guest')}
            >
              <button className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer focus:outline-none">
                Área do Convidado <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${activeDropdown === 'guest' ? 'rotate-180 text-primary' : ''}`} />
              </button>
            </div>

            <a href="#precos" className="hover:text-primary transition-colors cursor-pointer relative group py-2">
              Planos e Valores
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#diferencial" className="hover:text-primary transition-colors cursor-pointer relative group py-2">
              Porquê Nós
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
          </nav>

          {/* Nav CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn === null ? (
              <span className="h-2 w-2 rounded-full bg-primary/30 animate-pulse" />
            ) : isLoggedIn ? (
              <Link 
                href="/admin/dashboard"
                className="rounded-full bg-primary px-6 py-3 text-xs font-bold text-white hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/15 cursor-pointer"
              >
                Ir para o Painel
              </Link>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="text-sm font-bold text-foreground/75 hover:text-primary transition-colors cursor-pointer"
                >
                  Entrar
                </Link>
                <Link 
                  href="/register"
                  className="rounded-full bg-primary px-6 py-3 text-xs font-bold text-white hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/15 cursor-pointer"
                >
                  Criar Conta
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-foreground/75 hover:text-primary cursor-pointer transition-colors"
            aria-label="Alternar Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* STRIPE/WITHJOY STYLE DROPDOWN PANELS */}
        <AnimatePresence>
          {activeDropdown === 'features' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute left-1/2 -translate-x-1/2 top-[100%] w-full max-w-3xl bg-card-bg/95 backdrop-blur-xl border border-border-custom rounded-3xl p-8 shadow-2xl grid grid-cols-2 gap-6 z-50 mt-1"
              onMouseEnter={() => setActiveDropdown('features')}
            >
              <div>
                <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-4">Gestão do Grande Dia</h4>
                <div className="space-y-4">
                  <a href="#experiencia" className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-secondary/40 transition-all group">
                    <QrCode className="h-5 w-5 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-xs font-bold text-foreground block">Passes QR Code e Portaria</span>
                      <span className="text-[10px] text-foreground/50 block font-medium mt-0.5">Leitura instantânea de passes digitais para controle de penetras.</span>
                    </div>
                  </a>
                  <a href="#simulador" className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-secondary/40 transition-all group">
                    <Users className="h-5 w-5 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-xs font-bold text-foreground block">Organizador de Mesas</span>
                      <span className="text-[10px] text-foreground/50 block font-medium mt-0.5">Distribuição visual de convidados e banquetes de forma descomplicada.</span>
                    </div>
                  </a>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-4">Planificação e Comunicação</h4>
                <div className="space-y-4">
                  <a href="#experiencia" className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-secondary/40 transition-all group">
                    <Camera className="h-5 w-5 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-xs font-bold text-foreground block">Galeria Live Colaborativa</span>
                      <span className="text-[10px] text-foreground/50 block font-medium mt-0.5">Partilha instantânea de fotos tiradas pelos convidados nas mesas.</span>
                    </div>
                  </a>
                  <div className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-secondary/40 transition-all group">
                    <Coins className="h-5 w-5 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-xs font-bold text-foreground block">Checklist e Controlo Financeiro</span>
                      <span className="text-[10px] text-foreground/50 block font-medium mt-0.5">Orçamento dinâmico e rastreamento de despesas e fornecedores locais.</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeDropdown === 'guest' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute left-1/2 -translate-x-1/2 top-[100%] w-full max-w-md bg-card-bg/95 backdrop-blur-xl border border-border-custom rounded-3xl p-6 shadow-2xl z-50 mt-1"
              onMouseEnter={() => setActiveDropdown('guest')}
            >
              <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-3">Encontrar Casamento</h4>
              <p className="text-[10px] text-foreground/50 font-medium mb-4">
                É convidado de um casamento? Introduza o token ou nome do casal para confirmar a sua presença ou aceder à galeria live.
              </p>
              
              <form onSubmit={handleSimSearch} className="flex gap-2">
                <input 
                  type="text" 
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                  placeholder="Ex: marcos-e-alice"
                  className="flex-1 rounded-xl border border-border-custom bg-background px-3 py-2 text-xs font-semibold focus:border-primary focus:outline-none"
                />
                <button 
                  type="submit"
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
                >
                  Procurar
                </button>
              </form>

              {/* Simulated Search Results */}
              <AnimatePresence mode="wait">
                {searchState === 'searching' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0 }}
                    className="mt-3 text-[10px] text-primary font-bold flex items-center gap-1.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                    Procurando casamento ativo...
                  </motion.div>
                )}
                {searchState === 'found' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 rounded-xl bg-success/15 border border-success/30 p-2.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-success animate-pulse" />
                      <span className="text-[10px] font-bold text-success">Marcos & Alice (Ativo)</span>
                    </div>
                    <a href="#simulador" onClick={() => setActiveDropdown(null)} className="text-[9px] font-extrabold uppercase text-success flex items-center gap-0.5 hover:underline">
                      Confirmar RSVP <ArrowRight className="h-3 w-3" />
                    </a>
                  </motion.div>
                )}
                {searchState === 'not_found' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 text-[10px] text-error font-bold flex items-center gap-1"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-error" />
                    Casamento não encontrado. Teste com "marcos" no campo.
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="md:hidden border-b border-border-custom bg-background/95 backdrop-blur-lg px-6 py-6 space-y-4"
            >
              <a 
                href="#experiencia" 
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-bold text-foreground/80 hover:text-primary py-1"
              >
                Experiência
              </a>
              <a 
                href="#simulador" 
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-bold text-foreground/80 hover:text-primary py-1"
              >
                Simulador
              </a>
              <a 
                href="#diferencial" 
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-bold text-foreground/80 hover:text-primary py-1"
              >
                Porquê Nós
              </a>
              <a 
                href="#precos" 
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-bold text-foreground/80 hover:text-primary py-1"
              >
                Planos
              </a>
              <hr className="border-border-custom" />
              <div className="flex flex-col gap-3 pt-2">
                {isLoggedIn ? (
                  <Link 
                    href="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center rounded-full bg-primary py-3 text-xs font-bold text-white hover:bg-primary-hover active:scale-95 transition-all"
                  >
                    Ir para o Painel
                  </Link>
                ) : (
                  <>
                    <Link 
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center text-sm font-bold text-foreground/80 py-2 hover:text-primary"
                    >
                      Entrar
                    </Link>
                    <Link 
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center rounded-full bg-primary py-3 text-xs font-bold text-white hover:bg-primary-hover active:scale-95 transition-all"
                    >
                      Criar Conta
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Animated accent border representing live system sync */}
        <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-pulse" />
      </header>

      {/* HERO SECTION - REFINED WITH EDITORIAL LUXURY TONE */}
      <section className="relative pt-36 pb-28 md:pt-48 md:pb-40 bg-gradient-to-b from-secondary/40 via-background to-background overflow-hidden">
        {/* Living Cinematic background video loop */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video 
            src="https://assets.mixkit.co/videos/preview/mixkit-bride-and-groom-holding-hands-44249-large.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-[0.14] scale-105 filter blur-[2px]"
          />
          {/* Dense luxury overlays to protect content visibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        </div>

        {/* Glow ambient lights */}
        <div className="absolute top-0 left-1/4 w-[350px] h-[350px] bg-primary/6 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[280px] h-[280px] bg-accent/6 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Hero Content */}
          <motion.div 
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="lg:col-span-6 flex flex-col items-start text-left text-balance"
          >
            <motion.div 
              variants={fadeInUp}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-[11px] font-extrabold text-primary mb-6 uppercase tracking-wider shadow-sm shadow-primary/5"
            >
              <Sparkles className="h-3.5 w-3.5" /> Gestão de Casamentos Premium
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-7.5xl font-serif font-black tracking-tight text-foreground leading-[1.03] mb-6"
            >
              Planeie o seu casamento com <span className="text-primary bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent italic font-serif">precisão e elegância</span>
            </motion.h1>

            <motion.p 
              variants={fadeInUp}
              className="text-sm md:text-base text-foreground/60 leading-relaxed mb-8 max-w-xl font-medium"
            >
              Substitua as listas desatualizadas por tecnologia de ponta. Controle convidados com passes digitais QR Code, organize o banquete e receba fotos tiradas pelos seus convidados em tempo real.
            </motion.p>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
            >
              <Link 
                href={isLoggedIn ? "/admin/dashboard" : "/register"}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-bold text-white hover:bg-primary-hover shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Criar Casamento <ArrowRight className="h-4 w-4" />
              </Link>
              <a 
                href="#simulador"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full border border-border-custom bg-card-bg/60 hover:bg-secondary/40 px-8 py-4 text-sm font-bold text-foreground/80 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Testar Simulador Live
              </a>
            </motion.div>
          </motion.div>

          {/* Hero Visual Mockup with floating depth cards */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex justify-center relative"
          >
            {/* Floating Depth Card A (Top Left) */}
            <motion.div 
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute -top-6 -left-10 hidden sm:flex items-center gap-2 rounded-2xl border border-success/35 bg-card-bg/90 backdrop-blur px-4 py-2.5 shadow-lg z-20"
            >
              <UserCheck className="h-4 w-4 text-success" />
              <div className="text-left">
                <span className="text-[8px] font-black text-foreground/40 uppercase block tracking-wider">Confirmado</span>
                <span className="text-[10px] font-black text-foreground/80 block">Dra. Ana Paula</span>
              </div>
            </motion.div>

            {/* Floating Depth Card B (Bottom Right) */}
            <motion.div 
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 4, delay: 0.5, ease: 'easeInOut' }}
              className="absolute -bottom-6 -right-10 hidden sm:flex items-center gap-2 rounded-2xl border border-primary/20 bg-card-bg/90 backdrop-blur px-4 py-2.5 shadow-lg z-20"
            >
              <Heart className="h-4 w-4 text-primary animate-pulse" />
              <div className="text-left">
                <span className="text-[8px] font-black text-foreground/40 uppercase block tracking-wider">Orçamento</span>
                <span className="text-[10px] font-black text-primary block">Equilibrado</span>
              </div>
            </motion.div>

            {/* Main Video Frame Mockup */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              className="relative w-full max-w-md p-4 rounded-[32px] border border-border-custom/80 bg-card-bg/50 backdrop-blur shadow-2xl hover:shadow-primary/5 transition-all"
            >
              <div className="rounded-2xl overflow-hidden border border-border-custom bg-background/95 relative aspect-[4/3] flex items-center justify-center">
                <video 
                  src="https://assets.mixkit.co/videos/preview/mixkit-wedding-rings-and-flowers-close-up-44256-large.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Floating UI overlay for video control style */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 p-5 flex flex-col justify-between pointer-events-none">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary/95 text-white text-[9px] font-black uppercase px-2.5 py-1 tracking-wider flex items-center gap-1.5 shadow-md shadow-primary/20">
                      <Sparkles className="h-3 w-3 animate-spin" /> Vídeo Promocional
                    </span>
                    <span className="text-[9px] font-extrabold text-white/90 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">0:14</span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-serif font-black text-white block uppercase tracking-wider">A Experiência Meu Boda</span>
                    <div className="flex items-center gap-2">
                      {/* Play/Pause indicator loop */}
                      <div className="h-6 w-6 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white border border-white/10 shadow-lg">
                        <div className="h-1.5 w-1.5 bg-white rounded-full animate-ping" />
                      </div>
                      {/* Simulated timeline progress bar */}
                      <div className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden shadow-inner">
                        <div className="h-full w-[45%] bg-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* TRUST BAND */}
      <section className="bg-secondary/10 border-y border-border-custom/30 py-10">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <span className="text-2xl md:text-3xl font-black text-primary block">0%</span>
            <span className="text-[10px] font-extrabold uppercase text-foreground/50 tracking-wider">Comissões por Presentes</span>
          </div>
          <div className="space-y-1">
            <span className="text-2xl md:text-3xl font-black text-[#F5EBEB] block">+5.000</span>
            <span className="text-[10px] font-extrabold uppercase text-foreground/50 tracking-wider">Passes QR Emitidos</span>
          </div>
          <div className="space-y-1">
            <span className="text-2xl md:text-3xl font-black text-primary block">100%</span>
            <span className="text-[10px] font-extrabold uppercase text-foreground/50 tracking-wider">Livre de Penetras</span>
          </div>
          <div className="space-y-1">
            <span className="text-2xl md:text-3xl font-black text-[#F5EBEB] block">24/7</span>
            <span className="text-[10px] font-extrabold uppercase text-foreground/50 tracking-wider">Controlo e Acesso</span>
          </div>
        </div>
      </section>

      {/* BENTO GRID FUNCTIONALITY PORTFOLIO (MODERN SAAS PATTERN) */}
      <section id="experiencia" className="py-24 md:py-32 bg-background relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-xs font-extrabold text-primary uppercase tracking-widest block">Experiência Integrada</span>
            <h2 className="text-3xl lg:text-5xl font-serif font-extrabold text-foreground mt-2">
              Tudo o que precisa num ecossistema premium
            </h2>
            <p className="mt-4 text-xs md:text-sm text-foreground/60 leading-relaxed font-semibold">
              Conectamos todos os pontos críticos da organização do casamento, do planeamento à portaria.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            
            {/* Box 1 (Span 2 cols): Portaria & Passes QR */}
            <div className="md:col-span-2 rounded-3xl border border-border-custom bg-card-bg/40 p-8 flex flex-col md:flex-row gap-8 items-center justify-between shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="space-y-4 max-w-sm relative z-10">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <QrCode className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Portaria Inteligente QR Code</h3>
                <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                  Chega de listas rasuradas e constrangimentos na entrada do salão. Emita passes digitais exclusivos aos confirmados e faça o check-in na portaria por leitura óptica instantânea.
                </p>
              </div>

              {/* Simulated portaria validator visual */}
              <div className="rounded-2xl border border-border-custom bg-background/95 p-4 max-w-[220px] w-full shrink-0 shadow-lg relative z-10 transition-transform group-hover:scale-105">
                <div className="h-32 rounded-lg bg-secondary/20 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute top-1/2 inset-x-0 h-0.5 bg-success shadow-[0_0_8px_var(--success)] animate-pulse" />
                  <QrCode className="h-14 w-14 text-foreground/35" />
                </div>
                <div className="mt-3 flex items-center justify-between text-[9px] font-black text-foreground/60">
                  <span>Validação</span>
                  <span className="text-success uppercase tracking-wider bg-success/15 px-2 py-0.5 rounded-full">Autorizado</span>
                </div>
              </div>
            </div>

            {/* Box 2: Galeria Live */}
            <div className="rounded-3xl border border-border-custom bg-card-bg/40 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="space-y-4 relative z-10">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Camera className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Galeria Live Colaborativa</h3>
                <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                  Reúna fotos autênticas e divertidas partilhadas pelos convidados nas mesas lendo um simples código QR.
                </p>
              </div>

              {/* Photos grid visual */}
              <div className="grid grid-cols-3 gap-1.5 mt-6 relative z-10">
                <div className="aspect-square bg-cover bg-center rounded-lg shadow-sm" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=150&auto=format&fit=crop')" }} />
                <div className="aspect-square bg-cover bg-center rounded-lg shadow-sm" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=150&auto=format&fit=crop')" }} />
                <div className="aspect-square bg-slate-900 border border-border-custom/50 rounded-lg flex items-center justify-center text-[9px] font-extrabold text-primary animate-pulse">+50</div>
              </div>
            </div>

            {/* Box 3: Checklist Operacional */}
            <div className="rounded-3xl border border-border-custom bg-card-bg/40 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="space-y-4 relative z-10">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Checklist de Tarefas</h3>
                <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                  Mantenha as metas em dia com níveis de prioridade e datas de vencimento automáticas.
                </p>
              </div>

              {/* Task list visual */}
              <div className="space-y-2 mt-6 relative z-10">
                <div className="flex items-center justify-between rounded-xl bg-[#221B1C]/35 border border-border-custom/60 px-3 py-2 text-[10px] font-bold text-foreground/80">
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Buffet Contratado</span>
                  <span className="text-[8px] uppercase tracking-wider text-foreground/40 font-black">Feito</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#221B1C]/35 border border-border-custom/60 px-3 py-2 text-[10px] font-bold text-foreground/80">
                  <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 bg-primary rounded-full" /> Gerador Talatona</span>
                  <span className="text-[8px] uppercase tracking-wider text-primary font-black">Alta</span>
                </div>
              </div>
            </div>

            {/* Box 4: Controlo Financeiro */}
            <div className="rounded-3xl border border-border-custom bg-card-bg/40 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="space-y-4 relative z-10">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Coins className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Gestão de Orçamento</h3>
                <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                  Rastreie pagamentos, contratos e balanços de despesas em Kwanzas sem fugir às suas finanças.
                </p>
              </div>

              {/* Budget tracker visual */}
              <div className="mt-6 space-y-1 relative z-10">
                <div className="flex items-center justify-between text-[10px] font-black text-foreground/60">
                  <span>Limite Orçado</span>
                  <span>12.500.000 Kz</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary/80 overflow-hidden">
                  <div className="h-full w-[65%] bg-primary" />
                </div>
              </div>
            </div>

            {/* Box 5: Organização de Banquetes */}
            <div className="rounded-3xl border border-border-custom bg-card-bg/40 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="space-y-4 relative z-10">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Organização de Banquetes</h3>
                <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                  Distribua os seus convidados por mesas numeradas e evite disputas por assentos.
                </p>
              </div>

              {/* Seating plan visual */}
              <div className="flex items-center gap-1.5 mt-6 relative z-10">
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-bold">M1</div>
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-bold">M2</div>
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-bold">M3</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* UNIFIED SHOWCASE DASHBOARD (SIMULATOR CENTER) */}
      <section id="simulador" className="py-24 md:py-32 bg-secondary/15 border-y border-border-custom/50 relative">
        <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-primary/4 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-serif font-extrabold tracking-tight text-foreground">
              Dashboard de Experiência Meu Boda
            </h2>
            <p className="mt-4 text-xs md:text-sm text-foreground/60 leading-relaxed font-semibold">
              Selecione o recurso no painel interativo abaixo para testar as respostas reativas da nossa infraestrutura.
            </p>

            {/* Showcase Selector Tabs */}
            <div className="mt-8 inline-flex p-1 bg-secondary/35 rounded-full border border-border-custom relative">
              <button 
                onClick={() => setActiveSimTab('rsvp')}
                className={`rounded-full px-6 py-2.5 text-xs font-bold transition-all relative z-10 cursor-pointer ${
                  activeSimTab === 'rsvp' ? 'text-white' : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                🎟️ Simular Passes QR & RSVP
                {activeSimTab === 'rsvp' && (
                  <motion.div 
                    layoutId="activeSimTabBg"
                    className="absolute inset-0 bg-primary rounded-full -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
              <button 
                onClick={() => setActiveSimTab('tables')}
                className={`rounded-full px-6 py-2.5 text-xs font-bold transition-all relative z-10 cursor-pointer ${
                  activeSimTab === 'tables' ? 'text-white' : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                🍽️ Simular Banquete & Mesas
                {activeSimTab === 'tables' && (
                  <motion.div 
                    layoutId="activeSimTabBg"
                    className="absolute inset-0 bg-primary rounded-full -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </div>
          </div>

          <div className="bg-card-bg/60 border border-border-custom rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 h-1.5 w-full bg-primary/10" />
            
            <AnimatePresence mode="wait">
              {activeSimTab === 'rsvp' ? (
                /* SIMULATOR 1 CONTENT */
                <motion.div 
                  key="sim-rsvp-block"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.4 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch"
                >
                  <div className="lg:col-span-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-4">Configurar Convidado</h3>
                      <div className="space-y-5">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Nome Completo</label>
                          <input 
                            type="text" 
                            value={simName}
                            onChange={(e) => setSimName(e.target.value)}
                            className="w-full rounded-xl border border-border-custom bg-background px-4 py-3 text-sm font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Categoria</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['Convidado', 'Padrinho', 'Familiar'] as const).map((role) => (
                              <button
                                key={role}
                                onClick={() => setSimRole(role)}
                                className={`rounded-xl border py-3 text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                                  simRole === role 
                                    ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                                    : 'border-border-custom hover:bg-secondary/40 text-foreground/75'
                                }`}
                              >
                                {role}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Estado do RSVP</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setSimStatus('Confirmado')}
                              className={`rounded-xl border py-3 text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                                simStatus === 'Confirmado' 
                                  ? 'border-success bg-success/5 text-success shadow-sm' 
                                  : 'border-border-custom hover:bg-secondary/40 text-foreground/75'
                              }`}
                            >
                              Confirmado
                            </button>
                            <button
                              onClick={() => setSimStatus('Pendente')}
                              className={`rounded-xl border py-3 text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                                simStatus === 'Pendente' 
                                  ? 'border-error bg-error/5 text-error shadow-sm' 
                                  : 'border-border-custom hover:bg-secondary/40 text-foreground/75'
                              }`}
                            >
                              Pendente
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 pt-4 border-t border-border-custom flex items-center gap-2 text-xs text-foreground/50 font-medium">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      <span>Passes gerados em conformidade com as diretivas de impressão padrão.</span>
                    </div>
                  </div>

                  <div className="lg:col-span-6 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {simStatus === 'Confirmado' ? (
                        <motion.div 
                          key="active-pass"
                          initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
                          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                          exit={{ opacity: 0, scale: 0.9, rotateY: 15 }}
                          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className="w-full max-w-sm rounded-[30px] border border-primary/30 bg-gradient-to-b from-[#221B1C] to-[#181314] shadow-2xl p-6 relative overflow-hidden flex flex-col items-center justify-between text-center min-h-[400px]"
                        >
                          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary to-accent" />
                          <div className="absolute top-4 left-4 h-3 w-3 rounded-full bg-background/20" />
                          <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-background/20" />
                          
                          <div className="mb-4">
                            <span className="text-[10px] font-extrabold uppercase text-primary tracking-widest block">Meu Boda Digital Pass</span>
                            <h4 className="text-base font-black text-[#F5EBEB] tracking-wide mt-1 uppercase font-serif">MARCOS & ALICE</h4>
                          </div>

                          <div className="my-2 p-4 rounded-2xl bg-white border border-border-custom/10 flex flex-col items-center justify-center shadow-lg relative group transition-transform duration-300 hover:scale-105">
                            <QrCode className="h-28 w-28 text-slate-900" />
                            <div className="absolute top-1/2 -left-3 h-6 w-6 rounded-full bg-[#181314] border-r border-border-custom/10 transform -translate-y-1/2" />
                            <div className="absolute top-1/2 -right-3 h-6 w-6 rounded-full bg-[#181314] border-l border-border-custom/10 transform -translate-y-1/2" />
                          </div>

                          <div className="w-full space-y-4 mt-2">
                            <div>
                              <span className="text-[9px] font-bold text-foreground/40 uppercase block tracking-wider">Convidado de Honra</span>
                              <span className="text-lg font-black text-[#F5EBEB] block truncate mt-0.5">{simName || 'Sem Nome'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 border-t border-border-custom/20 pt-4">
                              <div>
                                <span className="text-[9px] font-bold text-foreground/45 uppercase block tracking-wider">Acesso</span>
                                <span className="text-xs font-bold text-primary block mt-0.5">{simRole}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-foreground/45 uppercase block tracking-wider">Mesa</span>
                                <span className="text-xs font-bold text-[#F5EBEB] block mt-0.5">Mesa 1 - Rosas</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 w-full bg-success/15 border border-success/35 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 shadow-inner">
                            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-success">Passe Válido na Entrada</span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="locked-pass"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.5 }}
                          className="w-full max-w-sm rounded-[30px] border border-border-custom bg-card-bg/40 p-8 text-center flex flex-col items-center justify-center gap-4 aspect-[4/5] shadow-inner"
                        >
                          <div className="h-16 w-16 rounded-full bg-error/10 text-error flex items-center justify-center mb-2 animate-pulse">
                            <Lock className="h-8 w-8" />
                          </div>
                          <h4 className="text-base font-bold text-foreground">Aguardando Confirmação</h4>
                          <p className="text-xs text-foreground/50 max-w-xs leading-relaxed font-semibold">
                            Os convidados com estado "Pendente" não possuem passes ativos para leitura de código QR na portaria.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                /* SIMULATOR 2 CONTENT */
                <motion.div 
                  key="sim-tables-block"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.4 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch"
                >
                  <div className="lg:col-span-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-2">Organizador de Mesas</h3>
                      <p className="text-xs text-foreground/60 mb-5 leading-relaxed font-semibold">
                        Adicione convidados fictícios às mesas e veja como a atribuição de lugares funciona em tempo real.
                      </p>

                      <form onSubmit={handleAddSimGuest} className="flex gap-2 mb-6">
                        <input 
                          type="text" 
                          value={newSimGuest}
                          onChange={(e) => setNewSimGuest(e.target.value)}
                          placeholder="Nome do convidado..."
                          className="flex-1 rounded-xl border border-border-custom bg-background px-4 py-3 text-xs font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                        />
                        <button 
                          type="submit"
                          className="bg-primary text-white text-xs font-bold px-5 py-3 rounded-xl hover:bg-primary-hover active:scale-95 transition-all cursor-pointer shadow-md shadow-primary/10"
                        >
                          Adicionar
                        </button>
                      </form>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Selecionar Mesa</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Mesa 1 - Rosas', 'Mesa 2 - Orquídeas', 'Mesa 3 - Lírios'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setSelectedTable(t)}
                              className={`rounded-xl border py-2.5 text-[10px] font-extrabold cursor-pointer transition-all active:scale-95 ${
                                selectedTable === t 
                                  ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                                  : 'border-border-custom hover:bg-secondary/40 text-foreground/75'
                              }`}
                            >
                              {t.split(' - ')[1]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 pt-4 border-t border-border-custom flex items-center gap-2 text-xs text-foreground/50 font-medium">
                      <Smartphone className="h-4 w-4 text-primary shrink-0" />
                      <span>A exportação de mapas de mesa ajuda o pessoal de catering/sala.</span>
                    </div>
                  </div>

                  <div className="lg:col-span-6 flex items-center justify-center">
                    <div className="w-full max-w-sm rounded-3xl border border-border-custom bg-card-bg shadow-xl p-6 flex flex-col justify-between aspect-[4/3] relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-1 w-full bg-secondary" />
                      <div>
                        <div className="flex items-center justify-between border-b border-border-custom/50 pb-3 mb-4">
                          <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider block">Visualização de Sala</span>
                          <span className="text-xs font-black text-foreground/80">{selectedTable}</span>
                        </div>
                        <motion.ul 
                          layout
                          className="space-y-2 max-h-[180px] overflow-y-auto pr-1"
                        >
                          <AnimatePresence>
                            {guestsInTables[selectedTable].map((g, idx) => (
                              <motion.li 
                                key={g + idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="flex items-center justify-between rounded-xl bg-secondary/15 border border-border-custom/40 px-3.5 py-2.5 text-xs font-semibold text-foreground/85 hover:border-primary/20 transition-colors"
                              >
                                <span>{g}</span>
                                <span className="text-[9px] font-extrabold text-foreground/45 bg-secondary px-2 py-0.5 rounded-md">Lugar {idx + 1}</span>
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </motion.ul>
                      </div>
                      <div className="text-[10px] text-foreground/50 font-bold text-center border-t border-border-custom/30 pt-3 mt-4">
                        Capacidade da mesa: {guestsInTables[selectedTable].length} convidados organizados.
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* EDITORIAL QUOTE / TESTIMONIAL (APPY COUPLE STYLE) */}
      <section className="py-24 bg-secondary/5 border-t border-border-custom/30">
        <div className="mx-auto max-w-4xl px-6 text-center space-y-6">
          <span className="text-primary text-4xl font-serif">“</span>
          <p className="text-lg md:text-2xl font-serif italic text-foreground/90 leading-relaxed max-w-3xl mx-auto">
            O Meu Boda transformou por completo a forma como gerimos a portaria do nosso casamento em Luanda. Eliminámos os penetras de última hora e mantivemos o buffet exatamente dentro do planeado.
          </p>
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-foreground block">Cláudio & Suzana</span>
            <span className="text-[9px] font-extrabold uppercase text-primary tracking-widest block">Casados em Luanda</span>
          </div>
        </div>
      </section>

      {/* STRATEGIC ADVANTAGES (COMPETITOR COMPARISON - INTERACTIVE DASHBOARD) */}
      <section id="diferencial" className="py-24 md:py-32 bg-background relative border-t border-border-custom/20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-xs font-extrabold text-primary uppercase tracking-widest block">Comparação Estratégica</span>
            <h2 className="text-3xl lg:text-5xl font-serif font-extrabold tracking-tight text-foreground mt-2">
              Porquê escolher o Meu Boda?
            </h2>
            <p className="mt-4 text-xs md:text-sm text-foreground/60 leading-relaxed font-semibold">
              Veja como resolvemos as maiores dores de cabeça organizacionais em comparação com métodos tradicionais.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left selector menu */}
            <div className="lg:col-span-4 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 scrollbar-none shrink-0 w-full">
              {[
                { title: "Confirmações (RSVP)", icon: "🎟️" },
                { title: "Portaria & Penetras", icon: "🛡️" },
                { title: "Organização de Mesas", icon: "🍽️" },
                { title: "Taxas & Finanças", icon: "💰" },
                { title: "Galeria de Recordações", icon: "📸" }
              ].map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveChallenge(idx)}
                  className={`text-left rounded-2xl p-4 border transition-all duration-300 cursor-pointer focus:outline-none flex items-center justify-between gap-3 shrink-0 lg:shrink w-full ${
                    activeChallenge === idx
                      ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5'
                      : 'border-border-custom bg-card-bg/20 text-foreground/60 hover:text-foreground hover:bg-secondary/20'
                  }`}
                >
                  <span className="text-xs font-black tracking-wide uppercase flex items-center gap-2">
                    <span>{c.icon}</span> {c.title}
                  </span>
                  <ChevronRight className={`h-4 w-4 hidden lg:block transition-transform duration-300 ${activeChallenge === idx ? 'translate-x-1' : 'opacity-0'}`} />
                </button>
              ))}
            </div>

            {/* Right comparison dashboard details */}
            <div className="lg:col-span-8 bg-card-bg/40 border border-border-custom rounded-[32px] p-8 shadow-xl relative overflow-hidden w-full">
              <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeChallenge}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="space-y-8"
                >
                  {/* The Problem / Pain Point */}
                  <div className="rounded-2xl bg-error/5 border border-error/20 p-5 flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-error shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-error uppercase tracking-wider">O Desafio Organizacional</h4>
                      <p className="text-xs text-foreground/75 leading-relaxed font-semibold mt-1">
                        {[
                          "Gerir presenças por mensagens e chamadas é cansativo e impreciso para casamentos de grande escala.",
                          "O orçamento do buffet é prejudicado por penetras e acessos descontrolados na entrada do salão.",
                          "Conflitos de assento e desorganização de banquetes criam mal-estar nos convidados e atrasos na sala.",
                          "Comissões ocultas em plataformas de venda que reduzem o orçamento disponível do casal.",
                          "As melhores fotos do casamento tiradas pelos convidados perdem-se nas suas galerias pessoais."
                        ][activeChallenge]}
                      </p>
                    </div>
                  </div>

                  {/* 3-Column Comparative Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* PDF manual card */}
                    <div className="rounded-2xl border border-border-custom/50 bg-background/40 p-5 flex flex-col justify-between min-h-[160px]">
                      <div>
                        <span className="text-[9px] font-black text-foreground/45 uppercase tracking-wider block">Alternativa 1</span>
                        <h5 className="text-xs font-bold text-foreground/80 mt-1 uppercase tracking-wide">Convites em PDF</h5>
                      </div>
                      <p className="text-xs text-foreground/50 leading-relaxed font-semibold mt-4">
                        {[
                          "Processo manual - os noivos têm de telefonar e registar cada convidado num caderno ou Excel.",
                          "Segurança nula - qualquer pessoa pode reencaminhar o PDF do convite no WhatsApp.",
                          "Desorganização total - convidados escolhem os lugares na hora, gerando confusão.",
                          "Sem taxas adicionais, mas sem qualquer automação de registo ou apoio financeiro.",
                          "Nenhuma - convidados enviam fotos compactadas ou esquecem-se de partilhar."
                        ][activeChallenge]}
                      </p>
                      <div className="mt-6 flex items-center gap-1.5 text-[9px] font-bold text-error uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-error" /> Frustrante e Manual
                      </div>
                    </div>

                    {/* Ticket platforms card */}
                    <div className="rounded-2xl border border-border-custom/50 bg-background/40 p-5 flex flex-col justify-between min-h-[160px]">
                      <div>
                        <span className="text-[9px] font-black text-foreground/45 uppercase tracking-wider block">Alternativa 2</span>
                        <h5 className="text-xs font-bold text-foreground/80 mt-1 uppercase tracking-wide">Bilheteiras Comuns</h5>
                      </div>
                      <p className="text-xs text-foreground/50 leading-relaxed font-semibold mt-4">
                        {[
                          "Desenho genérico focado em bilheteira paga que afasta e confunde os convidados mais velhos.",
                          "Funciona, mas exige pulseiras ou cobra taxas extra por cada passe lido na entrada.",
                          "Inexistente - plataformas de eventos corporativos não gerem banquetes ou planos de mesas.",
                          "Taxas abusivas sobre transferências de presentes que variam de 5% a 10% por transação.",
                          "Sem suporte - plataformas de bilhetes não incluem funcionalidades de fotos sociais."
                        ][activeChallenge]}
                      </p>
                      <div className="mt-6 flex items-center gap-1.5 text-[9px] font-bold text-error/80 uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-error/70" /> Taxas / Inadequado
                      </div>
                    </div>

                    {/* Meu Boda victory card */}
                    <div className="rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 flex flex-col justify-between min-h-[160px] shadow-lg shadow-primary/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-primary text-white px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-bl-xl shadow-sm">
                        Recomendado
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-primary uppercase tracking-wider block">A Solução</span>
                        <h5 className="text-xs font-black text-primary-hover mt-1 uppercase tracking-wide flex items-center gap-1">
                          Meu Boda <Sparkles className="h-3 w-3 animate-pulse" />
                        </h5>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed font-bold mt-4">
                        {[
                          "RSVP automatizado por Token único com estatísticas imediatas e assentos atribuídos.",
                          "Passes digitais com QR Code seguro. O staff valida o acesso em segundos com o telemóvel.",
                          "Organizador interativo de mesas. Distribua famílias e amigos em salas organizadas.",
                          "Taxa única fixa por evento. Sem taxas adicionais, sem percentagens sobre presentes.",
                          "Galeria Live. Leitores de QR Code nas mesas permitem upload instantâneo de fotos sem instalar apps."
                        ][activeChallenge]}
                      </p>
                      <div className="mt-6 flex items-center gap-1.5 text-[9px] font-black text-success uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping" /> Automático & Premium
                      </div>
                    </div>

                  </div>
                </motion.div>
              </AnimatePresence>

            </div>

          </div>
        </div>
      </section>

      {/* PRICING SECTION (COMPARE SIDE-BY-SIDE IN A GRID) */}
      <section id="precos" className="py-24 md:py-32 bg-background relative border-t border-border-custom/20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl lg:text-4xl font-serif font-extrabold tracking-tight text-foreground">
              Planos e Valores Comerciais
            </h2>
            <p className="mt-4 text-xs md:text-sm text-foreground/60 leading-relaxed font-semibold">
              Sem subscrições ocultas para casais, preços recorrentes escaláveis para planners e agências.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            
            {/* Plano Noivos Card */}
            <div className="rounded-[32px] border border-primary/20 bg-card-bg/40 p-8 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary to-accent" />
              <div>
                <div className="mb-4">
                  <span className="text-[10px] font-extrabold uppercase text-primary tracking-wider block">💍 B2C / Único</span>
                  <h3 className="text-lg font-bold text-foreground mt-1">Plano Noivos</h3>
                </div>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground">45.000 Kz</span>
                  <span className="text-xs text-foreground/50 font-semibold">/ Evento</span>
                </div>
                <p className="text-xs text-foreground/50 leading-relaxed font-medium mb-6">
                  Acesso completo a todas as ferramentas digitais para gerir o seu casamento sem limites de convidados.
                </p>
                
                <hr className="border-border-custom/50 mb-6" />
                
                <ul className="space-y-3.5 mb-8 text-xs font-semibold text-foreground/75">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> 1 Slot de Casamento Ativo</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Passes QR Code Ilimitados</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Galeria Live Colaborativa</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Gestão Financeira e Tarefas</li>
                </ul>
              </div>

              <Link 
                href={isLoggedIn ? "/admin/dashboard" : "/register"}
                className="w-full text-center rounded-full bg-primary py-3.5 text-xs font-bold text-white hover:bg-primary-hover shadow-md shadow-primary/10 cursor-pointer transition-transform hover:scale-105 active:scale-95 block mt-4"
              >
                Começar Agora
              </Link>
            </div>

            {/* Planner Starter Card */}
            <div className="rounded-[32px] border border-border-custom bg-card-bg/40 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 inset-x-0 h-1 bg-secondary" />
              <div>
                <div className="mb-4">
                  <span className="text-[10px] font-extrabold uppercase text-foreground/40 tracking-wider block">💼 B2B / Recorrente</span>
                  <h3 className="text-lg font-bold text-foreground mt-1">Planner Starter</h3>
                </div>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground">20.000 Kz</span>
                  <span className="text-xs text-foreground/50 font-semibold">/ Mês</span>
                </div>
                <p className="text-xs text-foreground/50 leading-relaxed font-medium mb-6">
                  Desenhado para organizadores independentes gerirem até dois noivos em simultâneo.
                </p>
                
                <hr className="border-border-custom/50 mb-6" />
                
                <ul className="space-y-3.5 mb-8 text-xs font-semibold text-foreground/75">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Até 2 Slots Ativos em simultâneo</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Slots libertados pós-evento</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Recursos ilimitados integrados</li>
                </ul>
              </div>

              <Link 
                href={isLoggedIn ? "/admin/dashboard" : "/register"}
                className="w-full text-center rounded-full border border-border-custom bg-card-bg/60 hover:bg-secondary/40 py-3.5 text-xs font-bold text-foreground/85 cursor-pointer transition-transform hover:scale-105 active:scale-95 block mt-4"
              >
                Ativar Starter
              </Link>
            </div>

            {/* Planner Pro Card */}
            <div className="rounded-[32px] border border-primary/20 bg-card-bg/50 p-8 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary to-accent" />
              <div className="absolute top-3 right-3 bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider">
                Profissional
              </div>
              <div>
                <div className="mb-4">
                  <span className="text-[10px] font-extrabold uppercase text-primary tracking-wider block">👑 B2B / Agência</span>
                  <h3 className="text-lg font-bold text-foreground mt-1">Planner Pro</h3>
                </div>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground">50.000 Kz</span>
                  <span className="text-xs text-foreground/50 font-semibold">/ Mês</span>
                </div>
                <p className="text-xs text-foreground/50 leading-relaxed font-medium mb-6">
                  A capacidade perfeita para agências gerirem até 5 casamentos simultâneos sem partilhas de contas.
                </p>
                
                <hr className="border-border-custom/50 mb-6" />
                
                <ul className="space-y-3.5 mb-8 text-xs font-semibold text-foreground/75">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Até 5 Slots Ativos em simultâneo</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Suporte prioritário via WhatsApp</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Relatórios avançados e exportações</li>
                </ul>
              </div>

              <Link 
                href={isLoggedIn ? "/admin/dashboard" : "/register"}
                className="w-full text-center rounded-full bg-primary py-3.5 text-xs font-bold text-white hover:bg-primary-hover shadow-md shadow-primary/10 cursor-pointer transition-transform hover:scale-105 active:scale-95 block mt-4"
              >
                Ativar Plano Pro
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 md:py-32 bg-secondary/15 border-t border-border-custom/50 relative">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl font-serif font-extrabold tracking-tight text-foreground">
              Perguntas Frequentes
            </h2>
            <p className="mt-4 text-xs md:text-sm text-foreground/60 leading-relaxed font-semibold">
              Esclarecimentos rápidos sobre o funcionamento operacional do Meu Boda.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Como funciona o controlo de entrada na portaria?',
                a: 'Os noivos ou organizadores descarregam os passes digitais em PDF gerados automaticamente após a confirmação do convidado. Na portaria do evento, o staff ou protocolo utiliza a câmara do telemóvel para ler o código QR do passe, validando a entrada no momento com estatísticas em tempo real.'
              },
              {
                q: 'Os noivos guardam acesso às informações após o casamento?',
                a: 'Completamente. Após a celebração, o casamento passa a um estado de arquivo histórico de leitura. Os noivos continuam a poder aceder à plataforma para descarregar as fotos originais da galeria live, consultar o balanço financeiro e exportar relatórios.'
              },
              {
                q: 'É necessário instalar alguma aplicação móvel?',
                a: 'Não. O Meu Boda é uma aplicação web otimizada para dispositivos móveis. Quer os noivos, planners, pessoal de portaria ou convidados na mesa podem aceder a todos os recursos diretamente a partir de qualquer navegador de telemóvel ou computador.'
              }
            ].map((faq, idx) => (
              <div 
                key={idx}
                className="rounded-2xl border border-border-custom bg-card-bg overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-6 text-left cursor-pointer focus:outline-none"
                >
                  <span className="text-sm font-bold text-foreground/90">{faq.q}</span>
                  <ChevronDown 
                    className={`h-5 w-5 text-foreground/45 transition-transform duration-300 ${
                      openFaq === idx ? 'transform rotate-180 text-primary' : ''
                    }`} 
                  />
                </button>
                
                <AnimatePresence initial={false}>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-6 pb-6 pt-1 border-t border-border-custom/30 text-xs text-foreground/60 leading-relaxed font-semibold">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-border-custom bg-card-bg pt-16 pb-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            
            {/* Brand Column */}
            <div className="space-y-4">
              <img 
                src="/meu_boda_hybrid-removebg-preview.png" 
                alt="Meu Boda" 
                className="h-36 w-auto object-contain"
              />
              <p className="text-xs text-foreground/50 leading-relaxed font-semibold max-w-xs">
                O Sistema Operacional de Casamentos em Angola. Planeie com precisão tecnológica e celebre com tranquilidade.
              </p>
            </div>

            {/* Navigation Column */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-black text-primary uppercase tracking-wider">Produto</h4>
              <ul className="space-y-2 text-xs font-semibold text-foreground/60">
                <li><a href="#experiencia" className="hover:text-primary transition-colors">Funcionalidades</a></li>
                <li><a href="#simulador" className="hover:text-primary transition-colors">Simuladores Live</a></li>
                <li><a href="#diferencial" className="hover:text-primary transition-colors">Porquê Nós</a></li>
                <li><a href="#precos" className="hover:text-primary transition-colors">Planos & Preços</a></li>
              </ul>
            </div>

            {/* Contacts / Support Column */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-black text-primary uppercase tracking-wider">Contactos & Apoio</h4>
              <ul className="space-y-2 text-xs font-semibold text-foreground/60">
                <li className="flex items-center gap-1.5 flex-wrap">
                  <span>E-mail:</span>
                  <a href="mailto:suporte@meuboda.co.ao" className="text-foreground/80 hover:text-primary transition-colors">suporte@meuboda.co.ao</a>
                </li>
                <li className="flex items-center gap-1.5 flex-wrap">
                  <span>Telefone:</span>
                  <a href="tel:+244948824600" className="text-foreground/80 hover:text-primary transition-colors">+244 948 824 600</a>
                  <span className="text-foreground/30">|</span>
                  <a href="tel:+244938669825" className="text-foreground/80 hover:text-primary transition-colors">+244 938 669 825</a>
                </li>
                <li className="flex items-center gap-1.5">
                  <span>WhatsApp:</span>
                  <a href="https://wa.me/244948824600" target="_blank" className="text-foreground/80 hover:text-primary transition-colors">+244 948 824 600</a>
                </li>
                <li className="text-[10px] text-foreground/45 mt-1 block">
                  Luanda, Angola
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-black text-primary uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-xs font-semibold text-foreground/60">
                <li><a href="#" className="hover:text-primary transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Diretrizes de Segurança</a></li>
              </ul>
            </div>

          </div>

          <div className="border-t border-border-custom/30 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-bold text-foreground/40 tracking-wider uppercase">
              © {new Date().getFullYear()} Meu Boda. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4 text-[10px] font-bold text-foreground/40 uppercase tracking-wider">
              <span>Made in Luanda</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
