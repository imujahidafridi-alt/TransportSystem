import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Strict Focus Trap, Auto-Focus, and Enter Key "Next Field" Navigation
  useEffect(() => {
    if (!isOpen) return;

    // Helper: Find all focusable elements inside the modal
    const getFocusables = (): HTMLElement[] => {
      if (!modalRef.current) return [];
      const nodes = modalRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(nodes).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
      );
    };

    // Helper: Find interactive form inputs (for Enter key navigation)
    const getFormInputs = (): HTMLElement[] => {
      if (!modalRef.current) return [];
      const nodes = modalRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [data-select-trigger="true"]'
      );
      return Array.from(nodes).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. ESCAPE: Close modal
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // 2. TAB / SHIFT+TAB: Strict Focus Trap inside Modal
      if (e.key === 'Tab') {
        const focusables = getFocusables();
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];

        if (e.shiftKey) {
          // Backward tab: cycle from first element back to last element
          if (document.activeElement === firstEl || !modalRef.current?.contains(document.activeElement)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          // Forward tab: cycle from last element forward to first element
          if (document.activeElement === lastEl || !modalRef.current?.contains(document.activeElement)) {
            e.preventDefault();
            firstEl.focus();
          }
        }
        return;
      }

      // 3. ENTER KEY: Move focus to the next input field (or submit if on last field / button)
      if (e.key === 'Enter') {
        const active = document.activeElement as HTMLElement | null;
        if (!active || !modalRef.current?.contains(active)) return;

        // If active element is a TEXTAREA, allow native newline unless Ctrl is pressed
        if (active.tagName === 'TEXTAREA' && !e.ctrlKey) {
          return;
        }

        // If active element is a BUTTON (e.g. Save, Cancel, Close), allow native button action
        if (active.tagName === 'BUTTON' && !active.hasAttribute('data-select-trigger')) {
          return;
        }

        // Sequential Form Input Navigation:
        const inputs = getFormInputs();
        const currentIndex = inputs.indexOf(active);

        if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
          // Move focus to next input field
          e.preventDefault();
          inputs[currentIndex + 1].focus();
        }
        // If on the last input field, pressing Enter lets native form submit proceed to save record!
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Auto-focus first input field inside modal after React DOM animation tick
    const timer = setTimeout(() => {
      const focusables = getFocusables();
      if (focusables.length > 0) {
        // Prefer first actual input or select field over close button
        const firstInput = focusables.find(
          (el) => el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.hasAttribute('data-select-trigger')
        );
        if (firstInput) {
          firstInput.focus();
        } else {
          focusables[0].focus();
        }
      }
    }, 60);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 select-none">
      {/* Full-Window Clean Backdrop covering Header + Sidebar + Main */}
      <div
        className="fixed inset-0 bg-slate-900/30 transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Centered Modal Dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${maxWidthClass} bg-white border border-slate-200/80 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.25)] text-slate-900 animate-in fade-in zoom-in-95 duration-150 modal-card`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-violet-50/60 border-b border-violet-100 flex items-center justify-between rounded-t-3xl">
          <h3 className="font-extrabold text-violet-950 text-base tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white transition"
          >
            <X className="w-4.5 h-4.5 text-slate-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-visible">{children}</div>
      </div>
    </div>,
    document.body
  );
};
