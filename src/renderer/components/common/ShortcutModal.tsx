import React from 'react';
import { KEYBOARD_SHORTCUTS } from '@shared/constants/shortcuts';
import { Keyboard } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-violet-950 font-bold text-xs">
          <Keyboard className="w-4 h-4 text-violet-600" />
          <span>System Hotkeys Legend</span>
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {KEYBOARD_SHORTCUTS.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-violet-50/40 transition"
            >
              <div>
                <p className="text-xs font-bold text-slate-800">{sc.action}</p>
                <p className="text-[11px] text-slate-400">{sc.description}</p>
              </div>
              <kbd className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-violet-700 shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="text-left">
            <span className="font-bold text-slate-800 text-xs block">TripLedger — Transport & Fleet ERP</span>
            <p className="text-[10px] text-slate-400 font-medium">v1.0.0 • A product of Afridi Labz • Lead Developer: Mujahid Afridi</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={onClose}
          >
            Got it (Esc)
          </Button>
        </div>
      </div>
    </Modal>
  );
};
