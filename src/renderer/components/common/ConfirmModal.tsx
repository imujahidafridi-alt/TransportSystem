import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Trash2, Info } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4 text-xs">
        <div
          className={`flex items-start gap-3.5 p-4 rounded-2xl border ${
            variant === 'danger'
              ? 'bg-rose-50/70 border-rose-200/80 text-rose-950'
              : variant === 'warning'
              ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
              : 'bg-violet-50/70 border-violet-200/80 text-violet-950'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              variant === 'danger'
                ? 'bg-rose-100 text-rose-600 border border-rose-200'
                : variant === 'warning'
                ? 'bg-amber-100 text-amber-600 border border-amber-200'
                : 'bg-violet-100 text-violet-600 border border-violet-200'
            }`}
          >
            {variant === 'danger' ? (
              <Trash2 className="w-4.5 h-4.5" />
            ) : variant === 'warning' ? (
              <AlertTriangle className="w-4.5 h-4.5" />
            ) : (
              <Info className="w-4.5 h-4.5" />
            )}
          </div>
          <div className="pt-0.5">
            <p className="font-semibold leading-relaxed text-slate-800">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className={
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'btn-primary-gradient'
            }
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
