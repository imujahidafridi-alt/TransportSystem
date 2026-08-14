import { getDb } from '../database/db';
import { Transport, TransportType } from '../../shared/types';
import { cryptoRandomUUID } from '../utils/uuid';
import { enqueueSyncOperation } from '../sync/syncQueue';

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
      t.total_amount as totalAmount, t.driver_allowance as driverAllowance, t.status, t.notes,
      COALESCE(c.totalCosts, 0) as totalDirectCosts,
      t.created_at as createdAt, t.updated_at as updatedAt
    FROM transports t
    JOIN vehicles v ON t.vehicle_id = v.id
    JOIN drivers d ON t.driver_id = d.id
    JOIN locations fl ON t.from_location_id = fl.id
    JOIN locations tl ON t.to_location_id = tl.id
    LEFT JOIN (
      SELECT transport_id, SUM(cost) as totalCosts
      FROM (
        SELECT transport_id, total_amount as cost FROM fuel_records WHERE transport_id IS NOT NULL
        UNION ALL
        SELECT transport_id, amount as cost FROM vehicle_expenses WHERE transport_id IS NOT NULL
        UNION ALL
        SELECT transport_id, amount as cost FROM maintenance_records WHERE transport_id IS NOT NULL
      )
      GROUP BY transport_id
    ) c ON c.transport_id = t.id
    ${whereClause}
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const items = db.prepare(dataSql).all(...params, limit, offset) as Transport[];
  return { items, total };
}

export function createTransport(data: Omit<Transport, 'id' | 'transportNo' | 'totalAmount' | 'createdAt' | 'updatedAt'>): Transport {
  const db = getDb();
  
  if (data.fromLocationId === data.toLocationId) {
    throw new Error('From Location and To Location must be different.');
  }

  const totalAmount = calculateTransportAmount(
    data.transportType,
    data.fixedPrice,
    data.tons,
    data.ratePerTon
  );

  const id = cryptoRandomUUID();
  const now = new Date().toISOString();
  
  const maxRow = db.prepare(`
    SELECT COALESCE(MAX(CAST(SUBSTR(transport_no, 5) AS INTEGER)), 1000) as maxNo 
    FROM transports 
    WHERE transport_no LIKE 'TRP-%'
  `).get() as { maxNo: number };
  const nextNo = (maxRow?.maxNo || 1000) + 1;
  const transportNo = `TRP-${nextNo}`;

  const stmt = db.prepare(`
    INSERT INTO transports (
      id, transport_no, date, transport_type, material_name, from_location_id, to_location_id,
      vehicle_id, driver_id, tons, rate_per_ton, fixed_price, total_amount, driver_allowance,
      status, notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
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
    data.driverAllowance || 0,
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
  const driverAllowance = data.driverAllowance !== undefined ? data.driverAllowance : (existing.driverAllowance || 0);

  const totalAmount = calculateTransportAmount(type, fixedPrice, tons, ratePerTon);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE transports
    SET date = ?, transport_type = ?, material_name = ?, from_location_id = ?, to_location_id = ?,
        vehicle_id = ?, driver_id = ?, tons = ?, rate_per_ton = ?,
        fixed_price = ?, total_amount = ?, driver_allowance = ?, status = ?, notes = ?, updated_at = ?
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
    driverAllowance,
    data.status ?? existing.status,
    data.notes ?? existing.notes ?? null,
    now,
    id
  );

  // Synchronize vehicle_id and date on linked trip costs
  if (data.vehicleId || data.date) {
    const newVehId = data.vehicleId ?? existing.vehicleId;
    const newDate = data.date ?? existing.date;
    db.prepare('UPDATE fuel_records SET vehicle_id = ?, date = ?, updated_at = ? WHERE transport_id = ?').run(newVehId, newDate, now, id);
    db.prepare('UPDATE maintenance_records SET vehicle_id = ?, date = ?, updated_at = ? WHERE transport_id = ?').run(newVehId, newDate, now, id);
    db.prepare('UPDATE vehicle_expenses SET vehicle_id = ?, date = ?, updated_at = ? WHERE transport_id = ?').run(newVehId, newDate, now, id);
  }

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
      t.total_amount as totalAmount, t.driver_allowance as driverAllowance, t.status, t.notes,
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
