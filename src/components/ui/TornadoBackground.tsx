'use client';

import React, { useEffect, useRef } from 'react';

export default function TornadoBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles: Particle[] = [];
    const particleCount = 70;
    const colors = [
      'rgba(183, 110, 121, 0.25)', // Dusty Rose / Primary
      'rgba(235, 187, 180, 0.2)',  // Champagne / Rose Gold
      'rgba(245, 235, 235, 0.15)', // Blush Pink
      'rgba(183, 110, 121, 0.1)',  // Lighter Rose
    ];

    class Particle {
      x = 0;
      y = 0;
      radius = 0;
      color = '';
      angle = 0;
      speed = 0;
      distance = 0;
      depth = 0; // 3D depth illusion

      constructor() {
        this.reset();
      }

      reset() {
        this.angle = Math.random() * Math.PI * 2;
        this.distance = Math.random() * Math.min(width, height) * 0.7 + 30;
        this.speed = (Math.random() * 0.005 + 0.002) * (Math.random() > 0.5 ? 1 : -1);
        this.radius = Math.random() * 2 + 1;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.depth = Math.random() * 0.8 + 0.2;
        this.x = width / 2 + Math.cos(this.angle) * this.distance;
        this.y = height / 2 + Math.sin(this.angle) * this.distance;
      }

      update(mouseX: number, mouseY: number) {
        this.angle += this.speed * this.depth;
        
        // Swirling vortex motion
        this.x = width / 2 + Math.cos(this.angle) * this.distance;
        this.y = height / 2 + Math.sin(this.angle) * this.distance;

        // Interactive mouse interaction: pull particles slightly towards mouse or create wave
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          const force = (180 - dist) / 180;
          this.x += (dx / dist) * force * 15;
          this.y += (dy / dist) * force * 15;
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius * this.depth, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.fill();
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      particles.forEach((p) => p.reset());
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw dynamic glowing center aura
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width, height) * 0.6);
      grad.addColorStop(0, 'rgba(183, 110, 121, 0.03)');
      grad.addColorStop(1, 'rgba(26, 19, 20, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw connection lines between close particles for a digital constellation grid feel
      ctx.lineWidth = 0.3;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(183, 110, 121, ${(1 - dist / 90) * 0.1})`;
            ctx.stroke();
          }
        }
      }

      // Update and draw particles
      particles.forEach((p) => {
        p.update(mouseX, mouseY);
        p.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
