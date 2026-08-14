import { getDb } from '../database/db';
import { Driver, DriverStatus } from '../../shared/types';
import { cryptoRandomUUID } from '../utils/uuid';
import { enqueueSyncOperation } from '../sync/syncQueue';

export function getAllDrivers(search?: string): Driver[] {
  const db = getDb();
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    return db.prepare(`
      SELECT id, name, phone, cnic_or_license as cnicOrLicense, salary_type as salaryType,
             basic_salary as basicSalary, per_trip_rate as perTripRate, status, notes,
             created_at as createdAt, updated_at as updatedAt
      FROM drivers
      WHERE name LIKE ? OR phone LIKE ? OR cnic_or_license LIKE ?
      ORDER BY name ASC
    `).all(s, s, s) as Driver[];
  }
  return db.prepare(`
    SELECT id, name, phone, cnic_or_license as cnicOrLicense, salary_type as salaryType,
           basic_salary as basicSalary, per_trip_rate as perTripRate, status, notes,
           created_at as createdAt, updated_at as updatedAt
    FROM drivers
    ORDER BY name ASC
  `).all() as Driver[];
}

export function createDriver(data: {
  name: string;
  phone?: string;
  cnicOrLicense?: string;
  salaryType?: string;
  basicSalary: number;
  perTripRate?: number;
  status?: DriverStatus;
  notes?: string;
}): Driver {
  const db = getDb();

  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error('Driver name cannot be empty.');
  }

  const existing = db.prepare('SELECT id FROM drivers WHERE LOWER(name) = LOWER(?)').get(trimmedName);
  if (existing) {
    throw new Error(`Driver '${trimmedName}' already exists.`);
  }

  const id = cryptoRandomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO drivers (id, name, phone, cnic_or_license, salary_type, basic_salary, per_trip_rate, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    trimmedName,
    data.phone || null,
    data.cnicOrLicense || null,
    data.salaryType || 'MONTHLY',
    data.basicSalary || 0,
    data.perTripRate !== undefined ? Number(data.perTripRate) : 60,
    data.status || 'ACTIVE',
    data.notes || null,
    now,
    now
  );

  const newDriver = getDriverById(id)!;
  enqueueSyncOperation('CREATE', 'DRIVERS', id, newDriver);
  return newDriver;
}

export function updateDriver(id: string, data: Partial<Driver>): Driver {
  const db = getDb();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE drivers
    SET name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        cnic_or_license = COALESCE(?, cnic_or_license),
        salary_type = COALESCE(?, salary_type),
        basic_salary = COALESCE(?, basic_salary),
        per_trip_rate = COALESCE(?, per_trip_rate),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    data.name || null,
    data.phone || null,
    data.cnicOrLicense || null,
    data.salaryType || null,
    data.basicSalary !== undefined ? data.basicSalary : null,
    data.perTripRate !== undefined ? data.perTripRate : null,
    data.status || null,
    data.notes || null,
    now,
    id
  );

  const updatedDriver = getDriverById(id)!;
  enqueueSyncOperation('UPDATE', 'DRIVERS', id, updatedDriver);
  return updatedDriver;
}

export function getDriverById(id: string): Driver | null {
  const db = getDb();
  const res = db.prepare(`
    SELECT id, name, phone, cnic_or_license as cnicOrLicense, salary_type as salaryType,
           basic_salary as basicSalary, per_trip_rate as perTripRate, status, notes,
           created_at as createdAt, updated_at as updatedAt
    FROM drivers WHERE id = ?
  `).get(id) as Driver | undefined;
  return res || null;
}
