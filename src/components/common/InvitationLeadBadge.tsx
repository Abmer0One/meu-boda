'use client';

import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface InvitationLeadBadgeProps {
  className?: string;
}

export default function InvitationLeadBadge({ className = '' }: InvitationLeadBadgeProps) {
  const whatsappUrl =
    'https://wa.me/244936952391?text=' +
    encodeURIComponent(
      'Olá! Vi um convite digital gerado pelo Meu Boda e gostaria de saber como funciona para o meu casamento/evento.'
    );

  return (
    <div className={`w-full max-w-3xl mx-auto mt-10 mb-6 px-4 ${className}`}>
      <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/35 bg-gradient-to-b from-[#181820]/95 via-[#121217]/95 to-[#0b0b0e]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
        {/* Subtle decorative glow accents */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#d4af37]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-2 border border-[#d4af37]/10 rounded-[20px] pointer-events-none" />

        {/* Category micro-tag */}
        <div className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#f3e0aa] mb-3.5 shadow-sm">
          <Sparkles className="h-3 w-3 text-[#d4af37]" />
          <span>Tecnologia & Protocolo para Eventos</span>
        </div>

        {/* Headline */}
        <h3 className="relative z-10 text-base sm:text-lg md:text-xl font-bold tracking-tight text-white mb-2 font-serif">
          A planear o seu Casamento ou Alambamento?
        </h3>

        {/* Subtitle */}
        <p className="relative z-10 text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto leading-relaxed mb-6">
          Elimine penetras com passes QR Code individuais, receba confirmações de presença automáticas e organize as mesas sem listas de papel.
        </p>

        {/* Value badges */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] font-semibold text-[#f3e0aa]/90 mb-6">
          <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
            <ShieldCheck className="h-3 w-3 text-emerald-400" /> Portaria Antifraude
          </span>
          <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
            ✨ Convites com RSVP Digital
          </span>
          <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
            🍽️ Mapa de Mesas 2D
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold px-6 py-3 shadow-lg shadow-[#25D366]/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            {/* WhatsApp SVG Icon */}
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Falar no WhatsApp
          </a>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full border border-[#d4af37]/40 bg-white/5 hover:bg-[#d4af37]/10 text-[#f3e0aa] text-xs font-semibold px-5 py-3 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            Conhecer o Meu Boda <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Micro-branding */}
        <p className="relative z-10 text-[10px] text-zinc-500 font-medium mt-5 tracking-wider uppercase">
          Meu Boda • Tecnologia de Protocolo e Gestão de Casamentos em Angola
        </p>
      </div>
    </div>
  );
}
