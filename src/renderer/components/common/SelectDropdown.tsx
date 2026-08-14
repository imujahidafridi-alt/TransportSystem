import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
}

interface SelectDropdownProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  direction?: 'down' | 'up' | 'auto';
  variant?: 'default' | 'pill';
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
  size = 'md',
  direction = 'auto',
  variant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Synchronously determine direction BEFORE opening or rendering
  const calculateDirection = useCallback((): boolean => {
    if (direction === 'up') return true;
    if (direction === 'down') return false;
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const modalEl = dropdownRef.current.closest('[role="dialog"], .modal-card') || document.body;
      const modalRect = modalEl.getBoundingClientRect();
      
      const spaceBelowInModal = modalRect.bottom - rect.bottom;
      const spaceBelowInViewport = window.innerHeight - rect.bottom;
      const availableSpaceBelow = Math.min(spaceBelowInModal, spaceBelowInViewport);
      
      return availableSpaceBelow < 240;
    }
    return false;
  }, [direction]);

  // Synchronously recalculate before paint whenever isOpen changes
  useLayoutEffect(() => {
    if (isOpen) {
      setOpenUpward(calculateDirection());
    }
  }, [isOpen, calculateDirection]);

  // Toggle handler computes direction synchronously
  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      setOpenUpward(calculateDirection());
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const isPill = variant === 'pill';

  const baseStyle = isPill
    ? 'h-11 px-5 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-xs font-semibold text-slate-900'
    : size === 'sm'
    ? 'h-9 px-3.5 rounded-xl bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent text-xs font-semibold text-slate-900 shadow-sm'
    : 'h-11 px-4 rounded-2xl bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent text-xs font-semibold text-slate-900 shadow-sm';

  return (
    <div ref={dropdownRef} className={`relative inline-block w-full text-left select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        data-select-trigger="true"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full ${baseStyle} focus:border-violet-600 focus:outline-none transition-all duration-200 flex items-center justify-between gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'ring-4 ring-violet-500/15 border-violet-600 bg-white shadow-md' : ''
        }`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption ? (
            <>
              {selectedOption.icon}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-violet-600 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Options Menu Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 bg-white border border-slate-200/80 rounded-2xl py-1.5 min-w-full max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 shadow-[0_12px_35px_rgba(108,92,231,0.18)] ${
            openUpward
              ? 'bottom-full mb-2 origin-bottom'
              : 'top-full mt-2 origin-top'
          }`}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-400 font-medium text-center">
              No options available
            </div>
          ) : (
            <div className="px-1 space-y-0.5">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl transition-all duration-150 flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-violet-50 text-violet-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-semibold'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      {opt.icon}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {opt.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100/90 text-slate-600 border border-slate-200/60">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-violet-600 stroke-[2.5] shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
