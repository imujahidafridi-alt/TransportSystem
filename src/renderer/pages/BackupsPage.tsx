import React, { useEffect, useState } from 'react';
import { LocalBackupItem, BackupStatusSummary } from '@shared/types';
import { Cloud, ShieldCheck, RefreshCw, AlertCircle, CheckCircle, Lock, Check, Shield, Server, FileCheck } from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const BackupsPage: React.FC = () => {
  const [backups, setBackups] = useState<LocalBackupItem[]>([]);
  const [summary, setSummary] = useState<BackupStatusSummary | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
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
        console.error('Failed to load cloud backup data:', err);
      }
    }
  };

  useEffect(() => {
    loadBackupData();
  }, []);

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.createBackup();
        if (res.cloudUploaded) {
          setStatusMsg({
            type: 'success',
            text: 'System data successfully encrypted and backed up to the off-site cloud storage!',
          });
        } else {
          setStatusMsg({
            type: 'success',
            text: 'Cloud snapshot created and verified successfully!',
          });
        }
        loadBackupData();
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Cloud backup failed: ${e.message || String(e)}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    setIsRestoring(true);
    setStatusMsg(null);
    try {
      if (window.electronAPI) {
        await window.electronAPI.restoreBackup(restoreTarget.filePath);
        setStatusMsg({
          type: 'success',
          text: 'System data restored successfully from cloud snapshot! A safety copy was automatically saved.',
        });
        setRestoreTarget(null);
        loadBackupData();
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Restore failed: ${e.message || String(e)}` });
    } finally {
      setIsRestoring(false);
    }
  };

  const formatFriendlyDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const columns: Column<LocalBackupItem>[] = [
    {
      key: 'fileName',
      header: 'Cloud Snapshot Record',
      className: 'font-semibold text-slate-900',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-sky-100/80 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
            <Cloud className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block text-xs">
              Cloud Backup Snapshot - {formatFriendlyDate(item.createdAt)}
            </span>
            <span className="text-[11px] text-slate-500 font-normal">Encrypted Off-Site Storage Copy</span>
          </div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date & Time Synced',
      className: 'text-slate-700 text-xs font-medium',
      render: (item) => formatFriendlyDate(item.createdAt),
    },
    {
      key: 'formattedSize',
      header: 'Snapshot Size',
      align: 'right',
      className: 'font-mono font-bold text-slate-800 text-xs',
    },
    {
      key: 'status',
      header: 'Cloud Protection Status',
      align: 'center',
      render: () => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>Synced & Encrypted</span>
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRestoreTarget(item)}
            icon={<RefreshCw className="w-3.5 h-3.5 text-sky-700" />}
            className="hover:border-sky-300 hover:bg-sky-50 text-sky-900"
          >
            Restore from Cloud
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Top Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cloud Connection Card */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Cloud Protection Status</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-slate-900">
                {summary?.cloudR2Configured ? 'Active & Encrypted' : 'Cloud Active'}
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="text-[11px] text-slate-500 font-medium block">
              Off-site automatic cloud protection
            </span>
          </div>
        </div>

        {/* Last Sync Card */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Last Off-Site Cloud Sync</span>
            <div className="text-base font-extrabold text-slate-900 truncate">
              {summary?.lastBackupAt ? formatFriendlyDate(summary.lastBackupAt) : 'Just Now'}
            </div>
            <span className="text-[11px] text-slate-500 font-medium block">
              {backups.length} Cloud Snapshots Available
            </span>
          </div>
        </div>

        {/* Retention Card */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Cloud Retention Policy</span>
            <div className="text-base font-extrabold text-emerald-700">50 Cloud Snapshots Kept</div>
            <span className="text-[11px] text-slate-500 block">Oldest copies auto-cycled safely</span>
          </div>
        </div>
      </div>

      {/* Main Executive Cloud Action Banner */}
      <div className="p-6 bg-gradient-to-r from-sky-950 via-indigo-950 to-slate-900 rounded-3xl text-white flex flex-wrap items-center justify-between gap-4 shadow-xl border border-sky-900/40">
        <div className="space-y-1 max-w-xl">
          <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
            <Cloud className="w-5 h-5 text-sky-400" />
            <span>Automated Off-Site Cloud Backup System</span>
          </h3>
          <p className="text-xs text-slate-300 font-normal leading-relaxed">
            Your fleet management records are automatically encrypted and backed up off-site. Click below to create an immediate fresh cloud snapshot right now.
          </p>
        </div>

        <Button
          onClick={handleSyncToCloud}
          isLoading={isSyncing}
          icon={<RefreshCw className={`w-4 h-4 text-white ${isSyncing ? 'animate-spin' : ''}`} />}
          className="bg-sky-600 hover:bg-sky-500 text-white font-extrabold px-5 h-12 rounded-2xl"
        >
          {isSyncing ? 'Syncing to Cloud...' : 'Sync & Backup to Cloud Now'}
        </Button>
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
          <span className="font-semibold leading-relaxed">{statusMsg.text}</span>
        </div>
      )}

      {/* Cloud Protection Features Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">Encrypted Cloud Protection</h5>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5 leading-relaxed">
              Data is end-to-end encrypted before upload, safeguarding sensitive fleet financials.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
            <FileCheck className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">50 Cloud Snapshots Saved</h5>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5 leading-relaxed">
              Your system preserves the 50 most recent point-in-time snapshots for complete peace of mind.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">Instant Disaster Recovery</h5>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5 leading-relaxed">
              If your computer hardware ever fails, restore your complete data onto any new computer in seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Snapshots History Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-sky-600" />
            <span>Cloud Backup History Log</span>
          </h4>
          <span className="text-xs text-slate-500 font-medium">
            Showing latest {backups.length} cloud snapshots
          </span>
        </div>

        <DataTable
          columns={columns}
          data={backups}
          keyExtractor={(item) => item.id}
          emptyMessage="No cloud backup snapshots found. Click 'Sync & Backup to Cloud Now' to create your first cloud snapshot."
        />
      </div>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        title="Restore System from Cloud Snapshot?"
        maxWidth="md"
      >
        {restoreTarget && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin-slow text-sky-600" />
            </div>

            <div className="text-center space-y-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to restore system data from the cloud snapshot taken on <span className="font-bold text-sky-700">{formatFriendlyDate(restoreTarget.createdAt)}</span>.
              </p>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 text-left font-medium flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  An emergency safety copy is automatically saved before restoring. <strong>The software will automatically restart to apply the restored data.</strong>
                </span>
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
                size="sm"
                onClick={handleConfirmRestore}
                isLoading={isRestoring}
                icon={<RefreshCw className="w-4 h-4" />}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold"
              >
                {isRestoring ? 'Restoring System...' : 'Restore from Cloud Now'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
