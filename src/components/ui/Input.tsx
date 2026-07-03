'use client';

import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === 'password';

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-foreground/75 tracking-wide">
            {label}
          </label>
        )}
        <div className="relative w-full">
          <input
            ref={ref}
            type={isPasswordType ? (showPassword ? 'text' : 'password') : type}
            className={`w-full rounded-xl border border-border-custom bg-card-bg px-3.5 py-2 text-sm placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 ${
              isPasswordType ? 'pr-10' : ''
            } ${
              error ? 'border-error focus:border-error focus:ring-error/20' : ''
            } ${className}`}
            {...props}
          />
          {isPasswordType && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {helperText && !error && <span className="text-[11px] text-foreground/50">{helperText}</span>}
        {error && <span className="text-xs text-error font-medium">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
