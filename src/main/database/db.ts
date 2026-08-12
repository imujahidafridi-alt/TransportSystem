import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CREATE_TABLES_SQL } from './schema';

let dbInstance: Database.Database | null = null;

export function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  // Default path in user app directory or local folder
  const baseDir = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME || '.');
  const appDir = path.join(baseDir, 'TransportFleetSystem');
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
  }
  return path.join(appDir, 'transport_fleet.db');
}

export function initDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  console.log(`[Database] Initializing SQLite database at: ${dbPath}`);

  dbInstance = new Database(dbPath, { verbose: console.log });

  // Recommended WAL Mode & Foreign Key Pragmas from SRS
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('synchronous = NORMAL');

  // Execute DDL schemas and indexes
  dbInstance.exec(CREATE_TABLES_SQL);

  // Migration: Ensure material_name column exists in transports
  try {
    dbInstance.exec('ALTER TABLE transports ADD COLUMN material_name TEXT;');
  } catch {
    // Column already exists
  }

  // Initialize default system settings if not present
  const checkSetting = dbInstance.prepare("SELECT value FROM system_settings WHERE key = ?").get('currency_symbol');
  if (!checkSetting) {
    dbInstance.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)").run('currency_symbol', 'AED');
  }

  return dbInstance;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
