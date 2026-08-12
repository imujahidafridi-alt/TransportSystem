import React, { useEffect, useState } from 'react';
import { LocalBackupItem, BackupStatusSummary } from '@shared/types';
import { HardDrive, Cloud, ShieldCheck, Download, RefreshCw, AlertCircle, Database, CheckCircle } from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const BackupsPage: React.FC = () => {
  const [backups, setBackups] = useState<LocalBackupItem[]>([]);
  const [summary, setSummary] = useState<BackupStatusSummary | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<LocalBackupItem | null>(null);

  const loadBackupData = async () => {
    if (window.electronAPI) {
      try {
        const [bList, bSummary] = await Promise.all([
          window.electronAPI.getLocalBackups(),
          window.electronAPI.getBackupSummary(),
        ]);
        setBackups(bList);
        setSummary(bSummary);
      } catch (err: any) {
        console.error('Failed to load backup data:', err);
      }
    }
  };

  useEffect(() => {
    loadBackupData();
  }, []);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setStatusMsg(null);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.createBackup();
        setStatusMsg({
          type: 'success',
          text: `Backup created successfully! Saved at ${res.backupPath} ${res.cloudUploaded ? '(Uploaded to Cloud R2)' : '(Local)'}`,
        });
        loadBackupData();
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Backup failed: ${e.message || String(e)}` });
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportCustom = async (item?: LocalBackupItem) => {
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.exportBackup(item?.filePath);
        if (res.exportedPath) {
          setStatusMsg({ type: 'success', text: `Backup exported to: ${res.exportedPath}` });
        }
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Export failed: ${e.message || String(e)}` });
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    setIsRestoring(true);
    setStatusMsg(null);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.restoreBackup(restoreTarget.filePath);
        setStatusMsg({ type: 'success', text: res.message });
        setRestoreTarget(null);
        loadBackupData();
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Restore failed: ${e.message || String(e)}` });
    } finally {
      setIsRestoring(false);
    }
  };

  const columns: Column<LocalBackupItem>[] = [
    {
      key: 'fileName',
      header: 'Backup File Name',
      className: 'font-mono font-bold text-violet-700',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xs shrink-0">
            <Database className="w-3.5 h-3.5" />
          </div>
          <span>{item.fileName}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created Date & Time',
      className: 'font-mono text-slate-700',
      render: (item) => new Date(item.createdAt).toLocaleString(),
    },
    {
      key: 'yearMonth',
      header: 'Folder Vault',
      className: 'font-mono text-slate-500',
    },
    {
      key: 'formattedSize',
      header: 'File Size',
      align: 'right',
      className: 'font-mono font-bold text-slate-800',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportCustom(item)}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRestoreTarget(item)}
            icon={<RefreshCw className="w-3.5 h-3.5 text-amber-600" />}
            className="hover:border-amber-300 hover:bg-amber-50 text-amber-900"
          >
            Restore
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Top Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Local Vault */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Local Storage Vault</span>
            <div className="text-base font-extrabold text-slate-900 font-mono">
              {summary ? `${summary.totalBackupsCount} Backups (${summary.formattedTotalStorage})` : 'Loading...'}
            </div>
            <span className="text-[11px] text-slate-400 font-mono truncate block" title={summary?.backupsDir}>
              {summary?.backupsDir || '.../Backups'}
            </span>
          </div>
        </div>

        {/* Cloud Status */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Cloudflare R2 Sync</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-slate-900 font-sans">
                {summary?.cloudR2Configured ? 'Connected & Active' : 'Local Only'}
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  summary?.cloudR2Configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </div>
            <span className="text-[11px] text-slate-500 font-mono block">
              Last: {summary?.lastBackupAt ? new Date(summary.lastBackupAt).toLocaleString() : 'Never'}
            </span>
          </div>
        </div>

        {/* System Protection */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Database Health</span>
            <div className="text-base font-extrabold text-emerald-700 font-sans">SQLite WAL Protected</div>
            <span className="text-[11px] text-slate-500 block">Auto Pre-Restore Safety Snapshots</span>
          </div>
        </div>
      </div>

      {/* Action Banner */}
      <div className="p-5 bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 rounded-3xl text-white flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1 max-w-xl">
          <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-violet-400" />
            <span>End-to-End Backup & Data Recovery</span>
          </h3>
          <p className="text-xs text-slate-300 font-normal leading-relaxed">
            Create full point-in-time database snapshots saved locally and synced to Cloudflare R2 cloud storage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleExportCustom()}
            variant="secondary"
            icon={<Download className="w-4 h-4 text-slate-700" />}
          >
            Export Vault Backup
          </Button>
          <Button
            onClick={handleCreateBackup}
            isLoading={isCreating}
            icon={<HardDrive className="w-4 h-4 text-white" />}
          >
            {isCreating ? 'Creating Snapshot...' : 'Create Vault Snapshot'}
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 animate-in fade-in duration-200 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium font-mono leading-relaxed">{statusMsg.text}</span>
        </div>
      )}

      {/* Backups Table */}
      <DataTable
        columns={columns}
        data={backups}
        keyExtractor={(item) => item.id}
        emptyMessage="No backup snapshots found in vault. Click 'Create Vault Snapshot' to generate one."
      />

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        title="Restore Vault Snapshot?"
        maxWidth="md"
      >
        {restoreTarget && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin-slow" />
            </div>

            <div className="text-center space-y-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to restore the database to snapshot <span className="font-mono font-bold text-violet-700">{restoreTarget.fileName}</span>.
              </p>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 text-left font-mono">
                ✓ Pre-restore safety snapshot will be automatically created before applying restore.
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRestoreTarget(null)}
                disabled={isRestoring}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmRestore}
                isLoading={isRestoring}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                {isRestoring ? 'Restoring...' : 'Restore Vault Snapshot'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
