import { getDb } from '../database/db';
import { VehicleExpense, FuelRecord, MaintenanceRecord } from '../../shared/types';
import { cryptoRandomUUID } from '../utils/uuid';
import { enqueueSyncOperation } from '../sync/syncQueue';

// --- General Vehicle Expenses & Maintenance & Payroll ---
export function getAllExpenses(vehicleId?: string): VehicleExpense[] {
  const db = getDb();
  let whereExpense = '';
  let whereMaint = '';
  let whereSalary = "WHERE s.payment_status = 'PAID'";
  const params: string[] = [];

  if (vehicleId) {
    whereExpense = 'WHERE e.vehicle_id = ?';
    whereMaint = 'WHERE m.vehicle_id = ?';
    whereSalary = "WHERE s.payment_status = 'PAID' AND d.id IN (SELECT current_driver_id FROM vehicles WHERE id = ?)";
    params.push(vehicleId, vehicleId, vehicleId);
  }

  const sql = `
    SELECT * FROM (
      SELECT e.id, e.transport_id as transportId, t.transport_no as transportNo,
             e.vehicle_id as vehicleId, v.registration_number as vehicleRegistration,
             e.date, e.expense_type as expenseType, e.description, e.quantity, e.unit_cost as unitCost,
             e.amount, e.vendor, e.reference, e.notes, e.created_at as createdAt, e.updated_at as updatedAt
      FROM vehicle_expenses e
      JOIN vehicles v ON e.vehicle_id = v.id
      LEFT JOIN transports t ON e.transport_id = t.id
      ${whereExpense}

      UNION ALL

      SELECT m.id, m.transport_id as transportId, t.transport_no as transportNo,
             m.vehicle_id as vehicleId, v.registration_number as vehicleRegistration,
             m.date, m.maintenance_type as expenseType, m.description, NULL as quantity, NULL as unitCost,
             m.amount, m.vendor, NULL as reference, m.notes, m.created_at as createdAt, m.updated_at as updatedAt
      FROM maintenance_records m
      JOIN vehicles v ON m.vehicle_id = v.id
      LEFT JOIN transports t ON m.transport_id = t.id
      ${whereMaint}

      UNION ALL

      SELECT s.id, NULL as transportId, NULL as transportNo,
             v.id as vehicleId, COALESCE(v.registration_number, 'Fleet Driver') as vehicleRegistration,
             COALESCE(s.payment_date, s.salary_period || '-01') as date, 'Driver Payroll' as expenseType,
             ('Salary: ' || d.name || ' (' || s.salary_period || ')') as description,
             NULL as quantity, NULL as unitCost,
             s.net_salary as amount, d.name as vendor, s.payment_reference as reference,
             ('Paid via ' || COALESCE(s.payment_method, 'Bank / Cash')) as notes,
             s.created_at as createdAt, s.updated_at as updatedAt
      FROM driver_salary_records s
      JOIN drivers d ON s.driver_id = d.id
      LEFT JOIN vehicles v ON v.current_driver_id = d.id
      ${whereSalary}
    )
    ORDER BY date DESC, createdAt DESC
  `;

  return db.prepare(sql).all(...params) as VehicleExpense[];
}

export function createExpense(data: Omit<VehicleExpense, 'id' | 'createdAt' | 'updatedAt'>): VehicleExpense {
  const db = getDb();
  const id = cryptoRandomUUID();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO vehicle_expenses (id, transport_id, vehicle_id, date, expense_type, description, quantity, unit_cost, amount, vendor, reference, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, data.transportId || null, data.vehicleId, data.date, data.expenseType, data.description || null, data.quantity || null, data.unitCost || null, data.amount, data.vendor || null, data.reference || null, data.notes || null, now, now);
  
  const rec = db.prepare(`
    SELECT e.id, e.transport_id as transportId, t.transport_no as transportNo,
           e.vehicle_id as vehicleId, v.registration_number as vehicleRegistration,
           e.date, e.expense_type as expenseType, e.description, e.quantity, e.unit_cost as unitCost,
           e.amount, e.vendor, e.reference, e.notes, e.created_at as createdAt, e.updated_at as updatedAt
    FROM vehicle_expenses e
    JOIN vehicles v ON e.vehicle_id = v.id
    LEFT JOIN transports t ON e.transport_id = t.id
    WHERE e.id = ?
  `).get(id) as VehicleExpense;
  enqueueSyncOperation('CREATE', 'EXPENSES', id, rec);
  return rec;
}

// --- Fuel Records ---
export function getAllFuelRecords(vehicleId?: string): FuelRecord[] {
  const db = getDb();
  let where = '';
  const params: string[] = [];
  if (vehicleId) {
    where = 'WHERE f.vehicle_id = ?';
    params.push(vehicleId);
  }
  const sql = `
    SELECT f.id, f.transport_id as transportId, t.transport_no as transportNo,
           f.vehicle_id as vehicleId, v.registration_number as vehicleRegistration,
           f.date, f.fuel_type as fuelType, f.quantity, f.unit, f.rate, f.total_amount as totalAmount,
           f.vendor, f.odometer, f.notes, f.created_at as createdAt, f.updated_at as updatedAt
    FROM fuel_records f
    JOIN vehicles v ON f.vehicle_id = v.id
    LEFT JOIN transports t ON f.transport_id = t.id
    ${where}
    ORDER BY f.date DESC, f.created_at DESC
  `;
  return db.prepare(sql).all(...params) as FuelRecord[];
}

export function createFuelRecord(data: Omit<FuelRecord, 'id' | 'totalAmount' | 'createdAt' | 'updatedAt'>): FuelRecord {
  const db = getDb();
  const id = cryptoRandomUUID();
  const totalAmount = (data.quantity || 0) * (data.rate || 0);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO fuel_records (id, transport_id, vehicle_id, date, fuel_type, quantity, unit, rate, total_amount, vendor, odometer, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, data.transportId || null, data.vehicleId, data.date, data.fuelType || 'DIESEL', data.quantity, data.unit || 'LITERS', data.rate, totalAmount, data.vendor || null, data.odometer || null, data.notes || null, now, now);

  const rec = db.prepare(`
    SELECT f.id, f.transport_id as transportId, t.transport_no as transportNo,
           f.vehicle_id as vehicleId, v.registration_number as vehicleRegistration,
           f.date, f.fuel_type as fuelType, f.quantity, f.unit, f.rate, f.total_amount as totalAmount,
           f.vendor, f.odometer, f.notes, f.created_at as createdAt, f.updated_at as updatedAt
    FROM fuel_records f
    JOIN vehicles v ON f.vehicle_id = v.id
    LEFT JOIN transports t ON f.transport_id = t.id
    WHERE f.id = ?
  `).get(id) as FuelRecord;
  enqueueSyncOperation('CREATE', 'FUEL', id, rec);
  return rec;
}

// --- Maintenance Records ---
export function getAllMaintenanceRecords(vehicleId?: string): MaintenanceRecord[] {
  const db = getDb();
  let where = '';
  const params: string[] = [];
  if (vehicleId) {
    where = 'WHERE m.vehicle_id = ?';
    params.push(vehicleId);
  }
  const sql = `
    SELECT m.id, m.transport_id as transportId, t.transport_no as transportNo,
           m.vehicle_id as vehicleId, v.registration_number as vehicleRegistration,
           m.date, m.maintenance_type as maintenanceType, m.description, m.amount,
           m.vendor, m.notes, m.created_at as createdAt, m.updated_at as updatedAt
    FROM maintenance_records m
    JOIN vehicles v ON m.vehicle_id = v.id
    LEFT JOIN transports t ON m.transport_id = t.id
    ${where}
    ORDER BY m.date DESC, m.created_at DESC
  `;
  return db.prepare(sql).all(...params) as MaintenanceRecord[];
}

export function createMaintenanceRecord(data: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'updatedAt'>): MaintenanceRecord {
  const db = getDb();
  const id = cryptoRandomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO maintenance_records (id, vehicle_id, date, maintenance_type, description, amount, vendor, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, data.vehicleId, data.date, data.maintenanceType, data.description || null, data.amount, data.vendor || null, data.notes || null, now, now);

  const rec = db.prepare(`
    SELECT m.id, m.vehicle_id as vehicleId, v.registration_number as vehicleRegistration,
           m.date, m.maintenance_type as maintenanceType, m.description, m.amount,
           m.vendor, m.notes, m.created_at as createdAt, m.updated_at as updatedAt
    FROM maintenance_records m
    JOIN vehicles v ON m.vehicle_id = v.id
    WHERE m.id = ?
  `).get(id) as MaintenanceRecord;
  enqueueSyncOperation('CREATE', 'MAINTENANCE', id, rec);
  return rec;
}
