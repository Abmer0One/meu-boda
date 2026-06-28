'use client';

import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-foreground/75 tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 ${
            error ? 'border-error focus:border-error focus:ring-error/20' : ''
          } ${className}`}
          {...props}
        />
        {helperText && !error && <span className="text-[11px] text-foreground/50">{helperText}</span>}
        {error && <span className="text-xs text-error font-medium">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
