import { getDb } from '../database/db';
import { Vehicle } from '../../shared/types';
import { cryptoRandomUUID } from '../utils/uuid';
import { enqueueSyncOperation } from '../sync/syncQueue';

export function getAllVehicles(search?: string): Vehicle[] {
  const db = getDb();
  let whereClause = '';
  const params: string[] = [];

  if (search && search.trim()) {
    whereClause = `WHERE v.registration_number LIKE ? OR v.vehicle_type LIKE ? OR v.make_model LIKE ? OR d.name LIKE ?`;
    const s = `%${search.trim()}%`;
    params.push(s, s, s, s);
  }

  const sql = `
    SELECT 
      v.id, v.registration_number as registrationNumber, v.vehicle_type as vehicleType,
      v.make_model as makeModel, v.model_year as modelYear,
      v.current_driver_id as currentDriverId, d.name as currentDriverName,
      v.status, v.notes, v.created_at as createdAt, v.updated_at as updatedAt
    FROM vehicles v
    LEFT JOIN drivers d ON v.current_driver_id = d.id
    ${whereClause}
    ORDER BY v.registration_number ASC
  `;

  return db.prepare(sql).all(...params) as Vehicle[];
}

export function createVehicle(data: {
  registrationNumber: string;
  vehicleType: string;
  makeModel?: string;
  modelYear?: number;
  currentDriverId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  notes?: string;
}): Vehicle {
  const db = getDb();

  // Enforce Registration Number Uniqueness
  const existing = db.prepare('SELECT id FROM vehicles WHERE registration_number = ?').get(data.registrationNumber.trim().toUpperCase());
  if (existing) {
    throw new Error(`Vehicle registration number '${data.registrationNumber}' already exists.`);
  }

  const id = cryptoRandomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO vehicles (id, registration_number, vehicle_type, make_model, model_year, current_driver_id, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.registrationNumber.trim().toUpperCase(),
    data.vehicleType,
    data.makeModel || null,
    data.modelYear || null,
    data.currentDriverId || null,
    data.status || 'ACTIVE',
    data.notes || null,
    now,
    now
  );

  const newVehicle = getVehicleById(id)!;
  enqueueSyncOperation('CREATE', 'VEHICLES', id, newVehicle);
  return newVehicle;
}

export function updateVehicle(id: string, data: Partial<Vehicle>): Vehicle {
  const db = getDb();
  const existing = getVehicleById(id);
  if (!existing) {
    throw new Error(`Vehicle ${id} not found.`);
  }

  if (data.registrationNumber && data.registrationNumber.trim().toUpperCase() !== existing.registrationNumber) {
    const regCheck = db.prepare('SELECT id FROM vehicles WHERE registration_number = ? AND id != ?')
      .get(data.registrationNumber.trim().toUpperCase(), id);
    if (regCheck) {
      throw new Error(`Vehicle registration number '${data.registrationNumber}' is already in use.`);
    }
  }

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE vehicles
    SET registration_number = COALESCE(?, registration_number),
        vehicle_type = COALESCE(?, vehicle_type),
        make_model = COALESCE(?, make_model),
        model_year = COALESCE(?, model_year),
        current_driver_id = COALESCE(?, current_driver_id),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    data.registrationNumber ? data.registrationNumber.trim().toUpperCase() : null,
    data.vehicleType || null,
    data.makeModel || null,
    data.modelYear !== undefined ? data.modelYear : null,
    data.currentDriverId !== undefined ? data.currentDriverId : null,
    data.status || null,
    data.notes || null,
    now,
    id
  );

  const updatedVehicle = getVehicleById(id)!;
  enqueueSyncOperation('UPDATE', 'VEHICLES', id, updatedVehicle);
  return updatedVehicle;
}

export function getVehicleById(id: string): Vehicle | null {
  const db = getDb();
  const sql = `
    SELECT 
      v.id, v.registration_number as registrationNumber, v.vehicle_type as vehicleType,
      v.make_model as makeModel, v.model_year as modelYear,
      v.current_driver_id as currentDriverId, d.name as currentDriverName,
      v.status, v.notes, v.created_at as createdAt, v.updated_at as updatedAt
    FROM vehicles v
    LEFT JOIN drivers d ON v.current_driver_id = d.id
    WHERE v.id = ?
  `;
  const res = db.prepare(sql).get(id) as Vehicle | undefined;
  return res || null;
}
