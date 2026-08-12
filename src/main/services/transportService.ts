import { getDb } from '../database/db';
import { Transport, TransportType } from '../../shared/types';
import { cryptoRandomUUID } from '../utils/uuid';
import { enqueueSyncOperation } from '../sync/syncQueue';

/**
 * Domain Pricing Service (SRS Section 41)
 * Centralizes pricing calculations for TRIP and TON transport types.
 */
export function calculateTransportAmount(
  type: TransportType,
  fixedPrice?: number,
  tons?: number,
  ratePerTon?: number
): number {
  if (type === 'TRIP') {
    return Math.max(0, fixedPrice || 0);
  } else if (type === 'TON') {
    const t = Math.max(0, tons || 0);
    const r = Math.max(0, ratePerTon || 0);
    return t * r;
  }
  return 0;
}

export function getAllTransports(search?: string, limit = 50, offset = 0): { items: Transport[]; total: number } {
  const db = getDb();
  let whereClause = '';
  const params: (string | number)[] = [];

  if (search && search.trim() !== '') {
    whereClause = `WHERE t.transport_no LIKE ? OR t.material_name LIKE ? OR v.registration_number LIKE ? OR d.name LIKE ? OR fl.name LIKE ? OR tl.name LIKE ?`;
    const s = `%${search.trim()}%`;
    params.push(s, s, s, s, s, s);
  }

  const countSql = `
    SELECT COUNT(*) as total 
    FROM transports t
    JOIN vehicles v ON t.vehicle_id = v.id
    JOIN drivers d ON t.driver_id = d.id
    JOIN locations fl ON t.from_location_id = fl.id
    JOIN locations tl ON t.to_location_id = tl.id
    ${whereClause}
  `;

  const total = (db.prepare(countSql).get(...params) as { total: number }).total;

  const dataSql = `
    SELECT 
      t.id, t.transport_no as transportNo, t.date, t.transport_type as transportType,
      t.material_name as materialName,
      t.from_location_id as fromLocationId, fl.name as fromLocationName,
      t.to_location_id as toLocationId, tl.name as toLocationName,
      t.vehicle_id as vehicleId, v.registration_number as vehicleRegistration,
      t.driver_id as driverId, d.name as driverName,
      t.tons, t.rate_per_ton as ratePerTon, t.fixed_price as fixedPrice,
      t.total_amount as totalAmount, t.status, t.notes,
      t.created_at as createdAt, t.updated_at as updatedAt
    FROM transports t
    JOIN vehicles v ON t.vehicle_id = v.id
    JOIN drivers d ON t.driver_id = d.id
    JOIN locations fl ON t.from_location_id = fl.id
    JOIN locations tl ON t.to_location_id = tl.id
    ${whereClause}
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const items = db.prepare(dataSql).all(...params, limit, offset) as Transport[];
  return { items, total };
}

export function createTransport(data: Omit<Transport, 'id' | 'transportNo' | 'totalAmount' | 'createdAt' | 'updatedAt'>): Transport {
  const db = getDb();

  // Business Rule: From != To
  if (data.fromLocationId === data.toLocationId) {
    throw new Error('From Location and To Location must be different.');
  }

  // Calculate Total Amount in domain service layer
  const totalAmount = calculateTransportAmount(
    data.transportType,
    data.fixedPrice,
    data.tons,
    data.ratePerTon
  );

  const id = cryptoRandomUUID();
  const now = new Date().toISOString();
  
  // Generate unique Transport No (e.g. TRP-1003)
  const countRow = db.prepare('SELECT COUNT(*) as c FROM transports').get() as { c: number };
  const transportNo = `TRP-${1001 + countRow.c}`;

  const stmt = db.prepare(`
    INSERT INTO transports (
      id, transport_no, date, transport_type, material_name, from_location_id, to_location_id,
      vehicle_id, driver_id, tons, rate_per_ton, fixed_price, total_amount,
      status, notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    id,
    transportNo,
    data.date,
    data.transportType,
    data.materialName ?? null,
    data.fromLocationId,
    data.toLocationId,
    data.vehicleId,
    data.driverId,
    data.tons ?? null,
    data.ratePerTon ?? null,
    data.fixedPrice ?? null,
    totalAmount,
    data.status || 'CONFIRMED',
    data.notes ?? null,
    now,
    now
  );

  const newRecord = getTransportById(id)!;
  enqueueSyncOperation('CREATE', 'TRANSPORTS', id, newRecord);
  return newRecord;
}

export function updateTransport(id: string, data: Partial<Transport>): Transport {
  const db = getDb();
  const existing = getTransportById(id);
  if (!existing) {
    throw new Error(`Transport record ${id} not found.`);
  }

  const fromLoc = data.fromLocationId ?? existing.fromLocationId;
  const toLoc = data.toLocationId ?? existing.toLocationId;
  if (fromLoc === toLoc) {
    throw new Error('From Location and To Location must be different.');
  }

  const type = data.transportType ?? existing.transportType;
  const fixedPrice = data.fixedPrice !== undefined ? data.fixedPrice : existing.fixedPrice;
  const tons = data.tons !== undefined ? data.tons : existing.tons;
  const ratePerTon = data.ratePerTon !== undefined ? data.ratePerTon : existing.ratePerTon;

  const totalAmount = calculateTransportAmount(type, fixedPrice, tons, ratePerTon);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE transports
    SET date = ?, transport_type = ?, material_name = ?, from_location_id = ?, to_location_id = ?,
        vehicle_id = ?, driver_id = ?, tons = ?, rate_per_ton = ?,
        fixed_price = ?, total_amount = ?, status = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    data.date ?? existing.date,
    type,
    data.materialName !== undefined ? data.materialName : existing.materialName ?? null,
    fromLoc,
    toLoc,
    data.vehicleId ?? existing.vehicleId,
    data.driverId ?? existing.driverId,
    tons ?? null,
    ratePerTon ?? null,
    fixedPrice ?? null,
    totalAmount,
    data.status ?? existing.status,
    data.notes ?? existing.notes ?? null,
    now,
    id
  );

  const updatedRecord = getTransportById(id)!;
  enqueueSyncOperation('UPDATE', 'TRANSPORTS', id, updatedRecord);
  return updatedRecord;
}

export function cancelTransport(id: string): Transport {
  return updateTransport(id, { status: 'CANCELLED' });
}

export function getTransportById(id: string): Transport | null {
  const db = getDb();
  const sql = `
    SELECT 
      t.id, t.transport_no as transportNo, t.date, t.transport_type as transportType,
      t.material_name as materialName,
      t.from_location_id as fromLocationId, fl.name as fromLocationName,
      t.to_location_id as toLocationId, tl.name as toLocationName,
      t.vehicle_id as vehicleId, v.registration_number as vehicleRegistration,
      t.driver_id as driverId, d.name as driverName,
      t.tons, t.rate_per_ton as ratePerTon, t.fixed_price as fixedPrice,
      t.total_amount as totalAmount, t.status, t.notes,
      t.created_at as createdAt, t.updated_at as updatedAt
    FROM transports t
    JOIN vehicles v ON t.vehicle_id = v.id
    JOIN drivers d ON t.driver_id = d.id
    JOIN locations fl ON t.from_location_id = fl.id
    JOIN locations tl ON t.to_location_id = tl.id
    WHERE t.id = ?
  `;
  const result = db.prepare(sql).get(id) as Transport | undefined;
  return result || null;
}
