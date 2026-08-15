import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldOpenUp = direction === 'up' || (direction !== 'down' && spaceBelow < 220);

    setOpenUpward(shouldOpenUp);

    const pos: { top?: number; bottom?: number; left?: number; right?: number } = {};
    if (shouldOpenUp) {
      pos.bottom = window.innerHeight - rect.top + 6;
    } else {
      pos.top = rect.bottom + 6;
    }

    if (align === 'right') {
      pos.right = Math.max(8, window.innerWidth - rect.right);
    } else {
      pos.left = Math.max(8, rect.left);
    }

    setMenuPos(pos);
  }, [direction, align]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition flex items-center justify-center shadow-2xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${
          isOpen ? 'ring-2 ring-violet-500/20 border-violet-500 text-violet-700 bg-violet-50/50' : ''
        }`}
        title="More options"
      >
        {trigger || <MoreVertical className="w-3.5 h-3.5" />}
      </button>

      {/* Floating Menu rendered directly into document.body (Zero container clipping) */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuPos.top !== undefined ? `${menuPos.top}px` : undefined,
              bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : undefined,
              left: menuPos.left !== undefined ? `${menuPos.left}px` : undefined,
              right: menuPos.right !== undefined ? `${menuPos.right}px` : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
            className={`z-[9999] bg-white border border-slate-200/90 rounded-2xl min-w-[190px] p-1.5 shadow-[0_12px_35px_rgba(108,92,231,0.22)] animate-in fade-in zoom-in-95 duration-150 select-none ${
              openUpward ? 'origin-bottom' : 'origin-top'
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
          </div>,
          document.body
        )}
    </div>
  );
};
