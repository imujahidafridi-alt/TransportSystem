import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success' | 'export' | 'print';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  // Base Pill Capsules
  const baseClasses =
    'inline-flex items-center justify-center font-bold tracking-wide rounded-full transition-all duration-200 focus:outline-none focus:ring-4 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  // Size Variations
  const sizeClasses = {
    sm: 'h-9 px-4 text-xs gap-1.5',
    md: 'h-11 px-5 text-xs gap-2',
    lg: 'h-12 px-6 text-sm gap-2.5',
  }[size];

  // Variant Styles
  const variantClasses = {
    primary:
      'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/25 focus:ring-violet-500/20 border border-transparent',
    secondary:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-sm focus:ring-slate-400/20',
    outline:
      'bg-violet-50/70 hover:bg-violet-100 text-violet-700 border border-violet-200/80 focus:ring-violet-500/20',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 focus:ring-rose-500/20 border border-transparent',
    ghost:
      'bg-transparent hover:bg-slate-100/80 text-slate-600 hover:text-slate-900 focus:ring-slate-400/20',
    success:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 focus:ring-emerald-500/20 border border-transparent',
    export:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs border border-emerald-600 focus:ring-emerald-500/20',
    print:
      'bg-violet-600 hover:bg-violet-700 text-white shadow-2xs border border-violet-600 focus:ring-violet-500/20',
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {!isLoading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
};
