import fs from 'fs';
import path from 'path';
import { dialog } from 'electron';
import { getDatabasePath, getDb, closeDatabase, initDatabase } from '../database/db';
import { uploadToR2 } from '../sync/r2Client';
import { LocalBackupItem, BackupStatusSummary } from '../../shared/types';

export function getBackupsDirectory(): string {
  const currentDbPath = getDatabasePath();
  const baseDir = path.dirname(currentDbPath);
  return path.join(baseDir, 'Backups');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function createDatabaseBackup(): Promise<{ backupPath: string; cloudUploaded: boolean }> {
  const backupsDir = getBackupsDirectory();
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = now.toISOString().replace(/[:.]/g, '-');

  const targetFolder = path.join(backupsDir, year, month);
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  const backupFileName = `transport_${timestamp}.db`;
  const backupFilePath = path.join(targetFolder, backupFileName);

  // SQLite Online Backup safely copies active SQLite DB without lock issues
  const db = getDb();
  await db.backup(backupFilePath);
  console.log(`[Backup] Created local database backup at: ${backupFilePath}`);

  // Optional upload to Cloudflare R2
  let cloudUploaded = false;
  try {
    const fileBuffer = fs.readFileSync(backupFilePath);
    const r2Key = `backups/${year}/${month}/${backupFileName}`;
    cloudUploaded = await uploadToR2(r2Key, fileBuffer);

    // Save system setting timestamp
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('last_backup_at', ?)").run(now.toISOString());
  } catch (err) {
    console.warn('[Backup] Cloud R2 backup upload postponed:', err);
  }

  return { backupPath: backupFilePath, cloudUploaded };
}

export function listLocalBackups(): LocalBackupItem[] {
  const backupsDir = getBackupsDirectory();
  if (!fs.existsSync(backupsDir)) {
    return [];
  }

  const items: LocalBackupItem[] = [];

  function scanDir(dir: string, yearMonth: string) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        scanDir(fullPath, yearMonth ? `${yearMonth}/${file.name}` : file.name);
      } else if (file.isFile() && file.name.endsWith('.db')) {
        const stats = fs.statSync(fullPath);
        items.push({
          id: fullPath,
          fileName: file.name,
          filePath: fullPath,
          sizeBytes: stats.size,
          formattedSize: formatBytes(stats.size),
          createdAt: stats.birthtime.toISOString(),
          yearMonth: yearMonth || 'Root',
        });
      }
    }
  }

  scanDir(backupsDir, '');

  // Sort newest first
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function restoreDatabaseBackup(backupFilePath: string): Promise<{ success: boolean; message: string }> {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error('Selected backup file does not exist on disk.');
  }

  const currentDbPath = getDatabasePath();

  // 1. Create pre-restore safety snapshot
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safetyBackupPath = `${currentDbPath}.prerestore_${timestamp}.bak`;
  fs.copyFileSync(currentDbPath, safetyBackupPath);
  console.log(`[Backup] Pre-restore safety snapshot created at: ${safetyBackupPath}`);

  // 2. Close active DB handle safely
  closeDatabase();

  // 3. Replace active DB file with target backup DB file
  fs.copyFileSync(backupFilePath, currentDbPath);

  // 4. Re-open DB connection cleanly
  initDatabase();
  console.log(`[Backup] Database restored successfully from: ${backupFilePath}`);

  return {
    success: true,
    message: `Database restored cleanly! Safety backup saved at ${path.basename(safetyBackupPath)}`,
  };
}

export async function exportBackupToCustomLocation(backupFilePath?: string): Promise<{ exportedPath: string | null }> {
  let sourcePath = backupFilePath;

  // If no source path passed, create fresh backup
  if (!sourcePath) {
    const res = await createDatabaseBackup();
    sourcePath = res.backupPath;
  }

  const nowStr = new Date().toISOString().slice(0, 10);
  const defaultName = `transport_backup_EXPORT_${nowStr}.db`;

  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Transport Database Backup',
    defaultPath: defaultName,
    filters: [{ name: 'Database Files', extensions: ['db'] }],
  });

  if (canceled || !filePath) {
    return { exportedPath: null };
  }

  fs.copyFileSync(sourcePath, filePath);
  return { exportedPath: filePath };
}

export function getBackupStatusSummary(): BackupStatusSummary {
  const db = getDb();
  let lastBackupAt: string | undefined;

  try {
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'last_backup_at'").get() as any;
    if (row && row.value) lastBackupAt = row.value;
  } catch (e) {
    // Setting key might not exist yet
  }

  const backups = listLocalBackups();
  const totalStorageBytes = backups.reduce((acc, b) => acc + b.sizeBytes, 0);

  const r2Configured = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );

  return {
    lastBackupAt: lastBackupAt || (backups.length > 0 ? backups[0].createdAt : undefined),
    totalBackupsCount: backups.length,
    totalStorageBytes,
    formattedTotalStorage: formatBytes(totalStorageBytes),
    backupsDir: getBackupsDirectory(),
    cloudR2Configured: r2Configured,
  };
}
