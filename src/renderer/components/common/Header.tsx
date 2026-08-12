import React, { useState } from 'react';
import { HardDrive } from 'lucide-react';
import { Button } from './Button';

export const Header: React.FC<{ activeTabTitle: string }> = ({ activeTabTitle }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    setBackupMessage(null);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.createBackup();
        setBackupMessage(`Backup saved! ${res.cloudUploaded ? '(Cloud R2)' : '(Local)'}`);
        setTimeout(() => setBackupMessage(null), 4000);
      }
    } catch (e: any) {
      setBackupMessage(`Backup failed: ${e.message || e}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <header className="h-16 my-3 mr-3 ml-3 px-6 bg-white border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        <h2 className="font-extrabold text-slate-900 text-base tracking-tight">{activeTabTitle}</h2>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <Button
          onClick={handleManualBackup}
          isLoading={isBackingUp}
          icon={<HardDrive className="w-4 h-4 text-white" />}
          size="sm"
        >
          {isBackingUp ? 'Creating Snapshot...' : 'Backup System Data'}
        </Button>

        {backupMessage && (
          <span className="text-xs text-violet-600 font-semibold animate-pulse">{backupMessage}</span>
        )}
      </div>
    </header>
  );
};
