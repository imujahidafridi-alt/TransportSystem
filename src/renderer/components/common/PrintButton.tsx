import React from 'react';
import { Printer, Loader2 } from 'lucide-react';

export interface PrintButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  label = 'Print PDF Preview',
  children,
  size = 'sm',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-9 px-3.5 text-xs gap-1.5',
    md: 'h-10 px-4 text-xs gap-2',
    lg: 'h-11 px-5 text-sm gap-2.5',
  }[size];

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-semibold tracking-wide rounded-full transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] bg-violet-600 hover:bg-violet-700 text-white shadow-2xs border border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${sizeClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-white" />
      ) : (
        <Printer className="w-3.5 h-3.5 shrink-0 text-white stroke-[2]" />
      )}
      <span>{children || label}</span>
    </button>
  );
};
