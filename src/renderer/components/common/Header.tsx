import React, { useEffect, useState } from 'react';
import { Cloud, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutContext';

export const Header: React.FC<{ activeTabTitle: string }> = ({ activeTabTitle }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { registerAction } = useKeyboardShortcuts();

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

      <div className="flex items-center gap-3 text-xs">
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

        <Button
          onClick={handleManualCloudBackup}
          isLoading={isBackingUp}
          icon={<Cloud className="w-4 h-4 text-white" />}
          size="sm"
          className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-sm hover:shadow-emerald-500/25 border border-emerald-400/30 transition-all duration-200"
          title="Press Ctrl+B to trigger cloud backup sync from anywhere"
        >
          <span>{isBackingUp ? 'Syncing Cloud...' : 'Backup System Data'}</span>
          <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono text-white font-semibold">
            Ctrl+B
          </span>
        </Button>
      </div>
    </header>
  );
};
