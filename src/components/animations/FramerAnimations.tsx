'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. FadeIn
export const FadeIn: React.FC<{ children: React.ReactNode; duration?: number; delay?: number }> = ({
  children,
  duration = 0.5,
  delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration, delay, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

// 2. FadeInUp
export const FadeInUp: React.FC<{ children: React.ReactNode; duration?: number; delay?: number; y?: number }> = ({
  children,
  duration = 0.5,
  delay = 0,
  y = 20,
}) => (
  <motion.div
    initial={{ opacity: 0, y }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration, delay, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

// 3. FadeInLeft
export const FadeInLeft: React.FC<{ children: React.ReactNode; duration?: number; delay?: number; x?: number }> = ({
  children,
  duration = 0.5,
  delay = 0,
  x = -20,
}) => (
  <motion.div
    initial={{ opacity: 0, x }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration, delay, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

// 4. FadeInRight
export const FadeInRight: React.FC<{ children: React.ReactNode; duration?: number; delay?: number; x?: number }> = ({
  children,
  duration = 0.5,
  delay = 0,
  x = 20,
}) => (
  <motion.div
    initial={{ opacity: 0, x }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration, delay, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

// 5. SlideIn
export const SlideIn: React.FC<{
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  delay?: number;
}> = ({ children, direction = 'up', duration = 0.5, delay = 0 }) => {
  const getInitial = () => {
    switch (direction) {
      case 'up':
        return { y: 50, opacity: 0 };
      case 'down':
        return { y: -50, opacity: 0 };
      case 'left':
        return { x: -50, opacity: 0 };
      case 'right':
        return { x: 50, opacity: 0 };
    }
  };

  return (
    <motion.div
      initial={getInitial()}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

// 6. StaggerContainer
export const StaggerContainer: React.FC<{
  children: React.ReactNode;
  staggerChildren?: number;
  delayChildren?: number;
}> = ({ children, staggerChildren = 0.1, delayChildren = 0 }) => (
  <motion.div
    initial="hidden"
    animate="show"
    variants={{
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren,
          delayChildren,
        },
      },
    }}
  >
    {children}
  </motion.div>
);

export const StaggerItem: React.FC<{ children: React.ReactNode; y?: number }> = ({ children, y = 15 }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y },
      show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
    }}
  >
    {children}
  </motion.div>
);

// 7. HoverCard
export const HoverCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <motion.div
    whileHover={{ scale: 1.02, translateY: -2 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
    className={className}
  >
    {children}
  </motion.div>
);

// 8. AnimatedCounter
export const AnimatedCounter: React.FC<{ value: number; duration?: number; prefix?: string; suffix?: string }> = ({
  value,
  duration = 1.5,
  prefix = '',
  suffix = '',
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalMiliseconds = duration * 1000;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 20);
    
    const timer = setInterval(() => {
      start += Math.ceil((end - start) / 10);
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

// 9. PageTransition
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AnimatePresence mode="wait">
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);
