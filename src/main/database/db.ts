import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL } from './schema';

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

  // Migration: Ensure reference_no column exists in transports
  try {
    dbInstance.exec('ALTER TABLE transports ADD COLUMN reference_no TEXT;');
  } catch {
    // Column already exists
  }

  // Migration: Ensure driver_allowance column exists in transports
  try {
    dbInstance.exec('ALTER TABLE transports ADD COLUMN driver_allowance REAL DEFAULT 0;');
  } catch {
    // Column already exists
  }

  // Migration: Ensure per_trip_rate column exists in drivers
  try {
    dbInstance.exec('ALTER TABLE drivers ADD COLUMN per_trip_rate REAL NOT NULL DEFAULT 0;');
  } catch {
    // Column already exists
  }

  // Migration: Ensure total_trips, rate_per_trip & trip_earnings exist in driver_salary_records
  try {
    dbInstance.exec('ALTER TABLE driver_salary_records ADD COLUMN total_trips INTEGER NOT NULL DEFAULT 0;');
  } catch {
    // Column already exists
  }
  try {
    dbInstance.exec('ALTER TABLE driver_salary_records ADD COLUMN rate_per_trip REAL NOT NULL DEFAULT 0;');
  } catch {
    // Column already exists
  }
  try {
    dbInstance.exec('ALTER TABLE driver_salary_records ADD COLUMN trip_earnings REAL NOT NULL DEFAULT 0;');
  } catch {
    // Column already exists
  }

  // Migration: Ensure transport_id column exists in vehicle_expenses, fuel_records, and maintenance_records
  try {
    dbInstance.exec('ALTER TABLE vehicle_expenses ADD COLUMN transport_id TEXT;');
  } catch {
    // Column already exists
  }
  try {
    dbInstance.exec('ALTER TABLE fuel_records ADD COLUMN transport_id TEXT;');
  } catch {
    // Column already exists
  }
  try {
    dbInstance.exec('ALTER TABLE maintenance_records ADD COLUMN transport_id TEXT;');
  } catch {
    // Column already exists
  }

  // Migration: Ensure payment metadata and finalization audit columns exist in driver_salary_records
  try {
    dbInstance.exec('ALTER TABLE driver_salary_records ADD COLUMN payment_method TEXT;');
  } catch {
    // Column already exists
  }
  try {
    dbInstance.exec('ALTER TABLE driver_salary_records ADD COLUMN payment_reference TEXT;');
  } catch {
    // Column already exists
  }
  try {
    dbInstance.exec('ALTER TABLE driver_salary_records ADD COLUMN paid_by TEXT;');
  } catch {
    // Column already exists
  }
  try {
    dbInstance.exec('ALTER TABLE driver_salary_records ADD COLUMN finalized_at TEXT;');
  } catch {
    // Column already exists
  }
  try {
    dbInstance.exec('ALTER TABLE driver_salary_records ADD COLUMN finalized_by TEXT;');
  } catch {
    // Column already exists
  }

  // Migration: Ensure driver_salary_adjustments table exists
  try {
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS driver_salary_adjustments (
        id TEXT PRIMARY KEY,
        salary_record_id TEXT NOT NULL REFERENCES driver_salary_records(id) ON DELETE CASCADE,
        adjustment_type TEXT NOT NULL,
        amount REAL NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT
      );
    `);
  } catch {
    // Table already exists
  }

  // Execute optimization indexes now that all columns are guaranteed to exist
  try {
    dbInstance.exec(CREATE_INDEXES_SQL);
  } catch {
    // Indexes already created
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
