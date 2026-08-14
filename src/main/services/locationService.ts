import { getDb } from '../database/db';
import { Location } from '../../shared/types';
import { cryptoRandomUUID } from '../utils/uuid';
import { enqueueSyncOperation } from '../sync/syncQueue';

export function getAllLocations(search?: string): Location[] {
  const db = getDb();
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    return db.prepare(`
      SELECT id, name, code, status, notes, created_at as createdAt, updated_at as updatedAt
      FROM locations
      WHERE name LIKE ? OR code LIKE ?
      ORDER BY name ASC
    `).all(s, s) as Location[];
  }
  return db.prepare(`
    SELECT id, name, code, status, notes, created_at as createdAt, updated_at as updatedAt
    FROM locations
    ORDER BY name ASC
  `).all() as Location[];
}

export function createLocation(data: { name: string; code?: string; status?: 'ACTIVE' | 'INACTIVE'; notes?: string }): Location {
  const db = getDb();

  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error('Location name cannot be empty.');
  }

  const existing = db.prepare('SELECT id FROM locations WHERE LOWER(name) = LOWER(?)').get(trimmedName);
  if (existing) {
    throw new Error(`Location '${trimmedName}' already exists.`);
  }

  const id = cryptoRandomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO locations (id, name, code, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, trimmedName, data.code ? data.code.trim().toUpperCase() : null, data.status || 'ACTIVE', data.notes || null, now, now);
  const newLoc = getLocationById(id)!;
  enqueueSyncOperation('CREATE', 'LOCATIONS', id, newLoc);
  return newLoc;
}

export function updateLocation(id: string, data: Partial<Location>): Location {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE locations
    SET name = COALESCE(?, name),
        code = COALESCE(?, code),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = ?
    WHERE id = ?
  `);
  stmt.run(data.name || null, data.code || null, data.status || null, data.notes || null, now, id);
  const updatedLoc = getLocationById(id)!;
  enqueueSyncOperation('UPDATE', 'LOCATIONS', id, updatedLoc);
  return updatedLoc;
}

export function getLocationById(id: string): Location | null {
  const db = getDb();
  const res = db.prepare(`
    SELECT id, name, code, status, notes, created_at as createdAt, updated_at as updatedAt
    FROM locations WHERE id = ?
  `).get(id) as Location | undefined;
  return res || null;
}
