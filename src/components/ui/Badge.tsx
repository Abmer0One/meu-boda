'use client';

import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'primary' | 'secondary';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide border transition-colors';

  const variants: Record<BadgeVariant, string> = {
    default: 'bg-foreground/5 text-foreground/80 border-border-custom',
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary text-primary border-accent/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-error/10 text-error border-error/20',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

export default Badge;
