'use client';

import React, { useEffect, useState, use } from 'react';
import { EventRepository } from '@/repositories/event.repository';
import { MediaRepository, EventMedia } from '@/repositories/media.repository';
import { Event } from '@/types';
import { supabase } from '@/lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Loader2, Play, Heart } from 'lucide-react';

interface LiveGalleryProps {
  params: Promise<{ slug: string }>;
}

export default function PublicLiveGalleryPage({ params }: LiveGalleryProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [event, setEvent] = useState<Event | null>(null);
  const [mediaList, setMediaList] = useState<EventMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedEvent = await EventRepository.getBySlug(slug);
      if (!fetchedEvent) {
        setLoading(false);
        return;
      }
      setEvent(fetchedEvent);

      const approvedMedia = await MediaRepository.getApproved(fetchedEvent.id);
      setMediaList(approvedMedia);
    } catch (err) {
      console.error('Error loading slideshow data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Real-time updates subscription
  useEffect(() => {
    if (!event) return;

    const channelId = `live-gallery-${event.id}-${Math.random().toString(36).substring(2, 9)}`;
    let channel: any = null;

    try {
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'event_media',
          },
          (payload) => {
            // Handle inserts, updates, and deletes in real-time
            if (payload.eventType === 'INSERT') {
              const newMedia = payload.new as EventMedia;
              if (newMedia.event_id === event.id && newMedia.status === 'approved') {
                setMediaList((prev) => {
                  // Prevent duplicate entries
                  if (prev.some((m) => m.id === newMedia.id)) return prev;
                  return [newMedia, ...prev];
                });
              }
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as EventMedia;
              if (updated.event_id === event.id) {
                if (updated.status === 'approved') {
                  setMediaList((prev) => {
                    if (prev.some((m) => m.id === updated.id)) {
                      return prev.map((m) => (m.id === updated.id ? updated : m));
                    }
                    return [updated, ...prev];
                  });
                } else {
                  // If status was changed from approved to something else
                  setMediaList((prev) => prev.filter((m) => m.id !== updated.id));
                }
              }
            } else if (payload.eventType === 'DELETE') {
              const oldId = payload.old.id;
              setMediaList((prev) => prev.filter((m) => m.id !== oldId));
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime live gallery not available:', err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [event]);

  // Automatic slideshow rotation
  useEffect(() => {
    if (mediaList.length <= 1) return;

    // Default duration is 6 seconds for images, but we can check if it is video.
    // For now, simple 7 seconds rotation interval.
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % mediaList.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [mediaList]);

  // Reset index if media list changes or shrinks
  useEffect(() => {
    if (currentIndex >= mediaList.length) {
      setCurrentIndex(0);
    }
  }, [mediaList, currentIndex]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#090909] text-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm font-semibold tracking-wider text-primary">A preparar projeção ao vivo...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#090909] text-white p-4 text-center">
        <p className="text-lg font-semibold text-error mb-2">Evento não encontrado</p>
        <p className="text-xs text-foreground/50">Por favor, verifique o link de projeção do casamento.</p>
      </div>
    );
  }

  const currentMedia = mediaList[currentIndex];

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050505] text-white relative flex flex-col justify-between p-6">
      {/* Background Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      {/* Slide Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-[#d4af37]/20 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[2px] text-[#f3e0aa] flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 fill-[#d4af37] text-[#d4af37] animate-pulse" /> Galeria Colaborativa (Meu Boda Live)
          </span>
          <h1 className="text-xl md:text-2xl font-serif font-black tracking-tight text-white mt-1">{event.title}</h1>
        </div>

        {/* Counter of approved images */}
        <div className="text-right text-xs font-bold text-[#f3e0aa] bg-[#d4af37]/15 border border-[#d4af37]/30 px-3.5 py-1.5 rounded-full shadow-sm">
          <span>{mediaList.length} momentos partilhados</span>
        </div>
      </header>

      {/* Main Slide Presentation Area */}
      <main className="flex-1 flex items-center justify-center relative py-6">
        <AnimatePresence mode="wait">
          {mediaList.length > 0 && currentMedia ? (
            <motion.div
              key={currentMedia.id}
              initial={{ opacity: 0, scale: 0.95, rotate: -0.5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 1.05, rotate: 0.5 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="w-full max-w-[85vw] max-h-[72vh] aspect-[4/3] sm:aspect-video md:aspect-[3/2] bg-[#0e0e13] text-white p-5 pb-16 shadow-2xl rounded-2xl flex flex-col justify-between border-2 border-[#d4af37]/40 select-none relative"
              style={{
                boxShadow: '0 0 60px rgba(212, 175, 55, 0.2), 0 25px 50px -12px rgba(0, 0, 0, 0.9)',
              }}
            >
              {/* Media container */}
              <div className="flex-1 bg-[#050507] overflow-hidden rounded-xl relative flex items-center justify-center border border-[#d4af37]/20">
                {currentMedia.media_type === 'video' ? (
                  <video
                    src={currentMedia.media_url}
                    className="w-full h-full object-contain"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentMedia.media_url}
                    alt={currentMedia.caption || 'Foto'}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Luxury Frame Footer */}
              <div className="absolute bottom-3.5 left-6 right-6 flex items-center justify-between text-white font-medium">
                <span className="text-sm font-semibold tracking-wide text-white/90">
                  Enviado por: <span className="text-[#f3e0aa] font-bold text-base font-cinzel">{currentMedia.guest_name}</span>
                </span>
                <span className="text-sm italic font-serif truncate max-w-[50%] text-[#f3e0aa]">
                  {currentMedia.caption ? `"${currentMedia.caption}"` : ''}
                </span>
              </div>
            </motion.div>
          ) : (
            /* Empty State Slideshow */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-4 max-w-md p-8 rounded-3xl border border-[#d4af37]/30 bg-[#0e0e13] shadow-2xl"
            >
              <div className="rounded-full bg-[#d4af37]/15 p-6 inline-block border border-[#d4af37]/30 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                <Camera className="h-12 w-12 text-[#f3e0aa]" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-wide text-[#f3e0aa] font-cinzel">Aguardando Fotos...</h3>
                <p className="text-xs text-white/90 mt-2 leading-relaxed">
                  Os convidados podem partilhar fotos tiradas nos seus telemóveis abrindo o link do convite e clicando em &quot;Tirar / Enviar Foto&quot;.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Slide Footer */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between border-t border-[#d4af37]/20 pt-4 text-xs text-white/60">
        <div>
          <span>Desenvolvido por <span className="font-bold text-[#f3e0aa]">Meu Boda</span></span>
        </div>
        <div className="mt-2 sm:mt-0 font-bold bg-[#d4af37]/15 py-1.5 px-4 rounded-full border border-[#d4af37]/30 flex items-center gap-2 text-[#f3e0aa]">
          <span className="h-2 w-2 rounded-full bg-[#d4af37] animate-pulse" />
          <span>Envie as suas fotos em tempo real através do link do seu convite</span>
        </div>
      </footer>
    </div>
  );
}
