import React, { useEffect, useState } from 'react';
import { Cloud, CheckCircle, AlertCircle, Lock, Shield } from 'lucide-react';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutContext';
import { useSecurity } from '../../context/SecurityContext';

export const Header: React.FC<{ activeTabTitle: string }> = ({ activeTabTitle }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { registerAction } = useKeyboardShortcuts();
  const { isPinSet, isEnabled, lockApp, openSettings } = useSecurity();

  const handleManualCloudBackup = async () => {
    setIsBackingUp(true);
    setBackupMessage(null);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.createBackup();
        if (res.cloudUploaded) {
          setBackupMessage({ type: 'success', text: 'Cloud Backup Synced Successfully!' });
        } else {
          setBackupMessage({ type: 'success', text: 'Backup Snapshot Created!' });
        }
        setTimeout(() => setBackupMessage(null), 4000);
      }
    } catch (e: any) {
      setBackupMessage({ type: 'error', text: `Backup failed: ${e.message || e}` });
      setTimeout(() => setBackupMessage(null), 5000);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Register Ctrl + B global shortcut
  useEffect(() => {
    const unregister = registerAction('CLOUD_BACKUP', handleManualCloudBackup);
    return () => unregister();
  }, [registerAction]);

  return (
    <header className="h-16 my-3 mr-3 ml-3 px-6 bg-white border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        <h2 className="font-extrabold text-slate-900 text-base tracking-tight">{activeTabTitle}</h2>
      </div>

      <div className="flex items-center gap-2.5 text-xs">
        {backupMessage && (
          <div
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in duration-200 ${
              backupMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                : 'bg-rose-50 text-rose-800 border border-rose-200/80'
            }`}
          >
            {backupMessage.type === 'success' ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            )}
            <span>{backupMessage.text}</span>
          </div>
        )}

        {/* 1. Cloud Backup Button */}
        <button
          type="button"
          onClick={handleManualCloudBackup}
          disabled={isBackingUp}
          className="h-9 px-3.5 rounded-xl bg-white hover:bg-emerald-50/70 active:bg-emerald-100/70 text-slate-700 hover:text-emerald-900 border border-slate-200/90 hover:border-emerald-300/80 shadow-2xs transition-all duration-150 flex items-center gap-2 font-semibold select-none disabled:opacity-50"
          title="Press Ctrl+B to trigger cloud backup sync from anywhere"
        >
          <Cloud className={`w-4 h-4 text-emerald-600 ${isBackingUp ? 'animate-bounce' : ''}`} />
          <span>{isBackingUp ? 'Syncing...' : 'Backup'}</span>
          <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-mono text-[10px] font-bold border border-slate-200/80">
            Ctrl+B
          </kbd>
        </button>

        {/* 2. Security & Lock Controls */}
        {isEnabled && isPinSet && (
          <button
            type="button"
            onClick={lockApp}
            className="h-9 px-3.5 rounded-xl bg-white hover:bg-violet-50/70 active:bg-violet-100/70 text-slate-700 hover:text-violet-900 border border-slate-200/90 hover:border-violet-300/80 shadow-2xs transition-all duration-150 flex items-center gap-2 font-semibold select-none"
            title="Lock app screen immediately (Ctrl+L)"
          >
            <Lock className="w-3.5 h-3.5 text-violet-600" />
            <span>Lock</span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-mono text-[10px] font-bold border border-slate-200/80">
              Ctrl+L
            </kbd>
          </button>
        )}

        {/* 3. Security Settings Button */}
        <button
          type="button"
          onClick={openSettings}
          className={`h-9 w-9 rounded-xl flex items-center justify-center border shadow-2xs transition-all duration-150 select-none ${
            isEnabled && isPinSet
              ? 'bg-white hover:bg-violet-50 text-slate-500 hover:text-violet-700 border-slate-200/90 hover:border-violet-300/80'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
          }`}
          title="Security & Lockscreen PIN Settings"
        >
          <Shield className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
