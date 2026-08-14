import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

// Global modal stack to hide parent modals when a child/sub-modal opens
let globalModalStack: string[] = [];
const stackSubscribers = new Set<() => void>();

function notifyStackChange() {
  stackSubscribers.forEach((cb) => cb());
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const idRef = useRef<string>(`modal-${Math.random().toString(36).slice(2, 9)}`);
  const modalId = idRef.current;

  const [isTopModal, setIsTopModal] = useState(true);

  // Track global modal stack position
  useEffect(() => {
    if (isOpen) {
      // Add this modal to the top of the stack
      globalModalStack = [...globalModalStack.filter((id) => id !== modalId), modalId];
      notifyStackChange();
    } else {
      // Remove this modal from the stack
      globalModalStack = globalModalStack.filter((id) => id !== modalId);
      notifyStackChange();
    }

    const updateStackState = () => {
      const isTop = globalModalStack.length > 0 && globalModalStack[globalModalStack.length - 1] === modalId;
      setIsTopModal(isTop);
    };

    stackSubscribers.add(updateStackState);
    updateStackState();

    return () => {
      globalModalStack = globalModalStack.filter((id) => id !== modalId);
      stackSubscribers.delete(updateStackState);
      notifyStackChange();
    };
  }, [isOpen, modalId]);

  // 1. Auto-Focus when modal opens OR when it becomes top-modal again (after sub-modal closes)
  useEffect(() => {
    if (!isOpen || !isTopModal) return;

    const timer = setTimeout(() => {
      // If focus is already inside modal, do not disrupt the user
      if (modalRef.current && modalRef.current.contains(document.activeElement)) {
        return;
      }
      if (!modalRef.current) return;

      const nodes = modalRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [data-select-trigger="true"], button:not([disabled])'
      );
      const focusables = Array.from(nodes).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
      );

      if (focusables.length > 0) {
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

    return () => clearTimeout(timer);
  }, [isOpen, isTopModal]);

  // 2. Keyboard Trap & Enter Key Navigation (Only active on the topmost modal)
  useEffect(() => {
    if (!isOpen || !isTopModal) return;

    const getFocusables = (): HTMLElement[] => {
      if (!modalRef.current) return [];
      const nodes = modalRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(nodes).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
      );
    };

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
      // Escape: Close topmost modal
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      // Tab / Shift+Tab: Strict Focus Trap inside Modal
      if (e.key === 'Tab') {
        const focusables = getFocusables();
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl || !modalRef.current?.contains(document.activeElement)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl || !modalRef.current?.contains(document.activeElement)) {
            e.preventDefault();
            firstEl.focus();
          }
        }
        return;
      }

      // Enter Key: Move to next field
      if (e.key === 'Enter') {
        const active = document.activeElement as HTMLElement | null;
        if (!active || !modalRef.current?.contains(active)) return;

        if (active.tagName === 'TEXTAREA' && !e.ctrlKey) return;
        if (active.tagName === 'BUTTON' && !active.hasAttribute('data-select-trigger')) return;

        const inputs = getFormInputs();
        const currentIndex = inputs.indexOf(active);

        if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
          e.preventDefault();
          inputs[currentIndex + 1].focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTopModal]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }[maxWidth];

  return createPortal(
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center p-4 select-none transition-all duration-150 ${
        isTopModal ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isTopModal}
    >
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
