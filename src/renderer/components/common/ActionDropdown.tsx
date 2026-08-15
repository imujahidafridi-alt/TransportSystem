import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { MoreVertical } from 'lucide-react';

export interface ActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'warning' | 'primary';
  disabled?: boolean;
  onClick: () => void;
}

interface ActionDropdownProps {
  items: ActionItem[];
  trigger?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
  direction?: 'down' | 'up' | 'auto';
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  items,
  trigger,
  className = '',
  align = 'right',
  direction = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synchronously determine direction BEFORE opening or rendering (matching SelectDropdown)
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

      return availableSpaceBelow < 200;
    }
    return false;
  }, [direction]);

  useLayoutEffect(() => {
    if (isOpen) {
      setOpenUpward(calculateDirection());
    }
  }, [isOpen, calculateDirection]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      setOpenUpward(calculateDirection());
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left select-none ${className}`}>
      {/* Trigger Button - Full rounded pill / circle */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition flex items-center justify-center shadow-2xs focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        title="More options"
      >
        {trigger || <MoreVertical className="w-3.5 h-3.5" />}
      </button>

      {/* Floating Menu with identical SelectDropdown smooth aesthetics & shadows */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } z-50 bg-white border border-slate-200/90 rounded-2xl min-w-[190px] p-1.5 shadow-[0_12px_35px_rgba(108,92,231,0.18)] animate-in fade-in zoom-in-95 duration-150 ${
            openUpward ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'
          }`}
        >
          <div className="space-y-0.5">
            {items
              .filter((item) => !item.disabled)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-xl transition-all duration-150 flex items-center gap-2.5 text-left font-medium ${
                    item.variant === 'danger'
                      ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                      : item.variant === 'warning'
                      ? 'text-amber-700 hover:bg-amber-50 hover:text-amber-800'
                      : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
