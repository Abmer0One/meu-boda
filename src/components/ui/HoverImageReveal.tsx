'use client';

import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export interface RevealItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  badge?: string;
}

interface HoverImageRevealProps {
  items: RevealItem[];
}

export default function HoverImageRevealList({ items }: HoverImageRevealProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion values for tracking cursor relative coordinates
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for lag/inertia look
  const springConfig = { damping: 20, stiffness: 150, mass: 0.6 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Position the reveal box relative to the hovered item or mouse pointer
    // Offset by -110px on X and -75px on Y to center the preview box on the cursor
    mouseX.set(e.clientX - rect.left - 120);
    mouseY.set(e.clientY - rect.top - 80);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIndex(null)}
      className="relative w-full max-w-4xl mx-auto divide-y divide-border-custom/50 border-y border-border-custom/50"
    >
      {/* Floating dynamic image preview window */}
      {hoveredIndex !== null && (
        <motion.div
          style={{
            left: smoothX,
            top: smoothY,
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 50,
          }}
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="hidden md:block w-[240px] h-[160px] rounded-2xl border border-primary/20 overflow-hidden shadow-2xl bg-card-bg bg-cover bg-center"
        >
          {/* Subtle overlay shimmer */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-white/10" />
          <motion.div
            key={hoveredIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url('${items[hoveredIndex].imageUrl}')` }}
          />
        </motion.div>
      )}

      {/* Interactive List Items */}
      {items.map((item, index) => (
        <div
          key={item.id}
          onMouseEnter={() => setHoveredIndex(index)}
          className="relative py-6 md:py-8 px-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer group transition-all duration-300 hover:bg-secondary/10 overflow-hidden"
        >
          {/* Subtle highlight backing */}
          <div className="absolute inset-y-0 left-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />
          
          <div className="space-y-1 pl-2">
            <div className="flex items-center gap-3">
              <span className="text-xl md:text-2xl font-serif font-bold text-foreground group-hover:text-primary transition-colors">
                {item.title}
              </span>
              {item.badge && (
                <span className="text-[9px] font-black uppercase tracking-wider text-success bg-success/15 px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm text-foreground/50 font-medium max-w-xl group-hover:text-foreground/75 transition-colors">
              {item.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4 md:mt-0 pl-2">
            {/* Visual indicator / CTA */}
            <span className="text-xs font-bold text-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all flex items-center gap-1">
              Ver demonstração <span className="font-serif text-sm">→</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
