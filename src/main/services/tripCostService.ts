import { getDb } from '../database/db';
import { cryptoRandomUUID } from '../utils/uuid';
import {
  TripCostsPayload,
  TripCostSummary,
  TripProfitabilityItem,
  ReportFilter,
  FuelRecord,
  MaintenanceRecord,
  VehicleExpense,
} from '../../shared/types';

/**
 * Get linked trip costs and contribution margin for a specific transport record.
 */
export function getTripCostsByTransportId(transportId: string): TripCostSummary {
  const db = getDb();

  const transport = db.prepare(`
    SELECT t.id, t.transport_no, t.date, t.vehicle_id, t.driver_id, t.total_amount, t.status
    FROM transports t
    WHERE t.id = ?
  `).get(transportId) as any;

  if (!transport) {
    throw new Error(`Transport record not found with ID: ${transportId}`);
  }

  const tripRevenue = transport.total_amount || 0;

  // 1. Linked Fuel Record
  const fuelRow = db.prepare(`
    SELECT f.id, f.transport_id as transportId, f.vehicle_id as vehicleId,
           f.date, f.fuel_type as fuelType, f.quantity, f.unit, f.rate,
           f.total_amount as totalAmount, f.vendor, f.odometer, f.notes,
           f.created_at as createdAt, f.updated_at as updatedAt
    FROM fuel_records f
    WHERE f.transport_id = ?
    LIMIT 1
  `).get(transportId) as FuelRecord | undefined;

  // 2. Linked Toll / Salik Expense
  const tollRow = db.prepare(`
    SELECT e.id, e.transport_id as transportId, e.vehicle_id as vehicleId,
           e.date, e.expense_type as expenseType, e.description, e.amount,
           e.vendor, e.reference, e.notes, e.created_at as createdAt, e.updated_at as updatedAt
    FROM vehicle_expenses e
    WHERE e.transport_id = ? AND e.expense_type = 'Salik / Tolls'
    LIMIT 1
  `).get(transportId) as VehicleExpense | undefined;

  // 3. Linked Fine Expense
  const fineRow = db.prepare(`
    SELECT e.id, e.transport_id as transportId, e.vehicle_id as vehicleId,
           e.date, e.expense_type as expenseType, e.description, e.amount,
           e.vendor, e.reference, e.notes, e.created_at as createdAt, e.updated_at as updatedAt
    FROM vehicle_expenses e
    WHERE e.transport_id = ? AND e.expense_type = 'Traffic Fines'
    LIMIT 1
  `).get(transportId) as VehicleExpense | undefined;

  // 4. Linked Maintenance Record
  const maintRow = db.prepare(`
    SELECT m.id, m.transport_id as transportId, m.vehicle_id as vehicleId,
           m.date, m.maintenance_type as maintenanceType, m.description, m.amount,
           m.vendor, m.notes, m.created_at as createdAt, m.updated_at as updatedAt
    FROM maintenance_records m
    WHERE m.transport_id = ?
    LIMIT 1
  `).get(transportId) as MaintenanceRecord | undefined;

  // 5. Linked Other Direct Expense
  const otherRow = db.prepare(`
    SELECT e.id, e.transport_id as transportId, e.vehicle_id as vehicleId,
           e.date, e.expense_type as expenseType, e.description, e.amount,
           e.vendor, e.reference, e.notes, e.created_at as createdAt, e.updated_at as updatedAt
    FROM vehicle_expenses e
    WHERE e.transport_id = ? AND e.expense_type = 'Other Direct'
    LIMIT 1
  `).get(transportId) as VehicleExpense | undefined;

  const fuelCost = fuelRow?.totalAmount || 0;
  const tollCost = tollRow?.amount || 0;
  const fineCost = fineRow?.amount || 0;
  const maintenanceCost = maintRow?.amount || 0;
  const otherCost = otherRow?.amount || 0;

  const totalDirectCosts = fuelCost + tollCost + fineCost + maintenanceCost + otherCost;
  const directTripProfit = tripRevenue - totalDirectCosts;
  const contributionMarginPercentage =
    tripRevenue > 0 ? parseFloat(((directTripProfit / tripRevenue) * 100).toFixed(2)) : 0;

  return {
    transportId,
    fuel: fuelRow || null,
    toll: tollRow || null,
    fine: fineRow || null,
    maintenance: maintRow || null,
    other: otherRow || null,
    totalDirectCosts,
    tripRevenue,
    directTripProfit,
    contributionMarginPercentage,
  };
}

/**
 * Atomically save or update direct trip costs for a transport record.
 * Non-zero costs are persisted; zero or cleared costs are cleanly removed.
 */
export function saveTripCosts(payload: TripCostsPayload): TripCostSummary {
  const db = getDb();
  const now = new Date().toISOString();

  const transport = db.prepare(`
    SELECT t.id, t.vehicle_id, t.date, t.driver_id
    FROM transports t
    WHERE t.id = ?
  `).get(payload.transportId) as any;

  if (!transport) {
    throw new Error(`Transport record not found with ID: ${payload.transportId}`);
  }

  const vehicleId = transport.vehicle_id;
  const tripDate = transport.date;

  const executeTransaction = db.transaction(() => {
    // 1. Fuel Processing
    if (payload.fuel && payload.fuel.totalAmount > 0) {
      const existingFuel = db.prepare('SELECT id FROM fuel_records WHERE transport_id = ?').get(payload.transportId) as { id: string } | undefined;
      if (existingFuel) {
        db.prepare(`
          UPDATE fuel_records
          SET quantity = ?, rate = ?, total_amount = ?, vendor = ?, vehicle_id = ?, date = ?, updated_at = ?
          WHERE id = ?
        `).run(
          payload.fuel.quantity,
          payload.fuel.rate,
          payload.fuel.totalAmount,
          payload.fuel.vendor || 'ENOC Station',
          vehicleId,
          tripDate,
          now,
          existingFuel.id
        );
      } else {
        const newId = cryptoRandomUUID();
        db.prepare(`
          INSERT INTO fuel_records (id, transport_id, vehicle_id, date, fuel_type, quantity, unit, rate, total_amount, vendor, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'DIESEL', ?, 'LITERS', ?, ?, ?, ?, ?)
        `).run(
          newId,
          payload.transportId,
          vehicleId,
          tripDate,
          payload.fuel.quantity,
          payload.fuel.rate,
          payload.fuel.totalAmount,
          payload.fuel.vendor || 'ENOC Station',
          now,
          now
        );
      }
    } else {
      db.prepare('DELETE FROM fuel_records WHERE transport_id = ?').run(payload.transportId);
    }

    // 2. Toll / Salik Processing
    if (payload.toll && payload.toll.amount > 0) {
      const existingToll = db.prepare("SELECT id FROM vehicle_expenses WHERE transport_id = ? AND expense_type = 'Salik / Tolls'").get(payload.transportId) as { id: string } | undefined;
      if (existingToll) {
        db.prepare(`
          UPDATE vehicle_expenses
          SET amount = ?, description = ?, vehicle_id = ?, date = ?, updated_at = ?
          WHERE id = ?
        `).run(
          payload.toll.amount,
          payload.toll.description || 'Salik / Toll',
          vehicleId,
          tripDate,
          now,
          existingToll.id
        );
      } else {
        const newId = cryptoRandomUUID();
        db.prepare(`
          INSERT INTO vehicle_expenses (id, transport_id, vehicle_id, date, expense_type, description, amount, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'Salik / Tolls', ?, ?, ?, ?)
        `).run(
          newId,
          payload.transportId,
          vehicleId,
          tripDate,
          payload.toll.description || 'Salik / Toll',
          payload.toll.amount,
          now,
          now
        );
      }
    } else {
      db.prepare("DELETE FROM vehicle_expenses WHERE transport_id = ? AND expense_type = 'Salik / Tolls'").run(payload.transportId);
    }

    // 3. Traffic Fine Processing
    if (payload.fine && payload.fine.amount > 0) {
      const existingFine = db.prepare("SELECT id FROM vehicle_expenses WHERE transport_id = ? AND expense_type = 'Traffic Fines'").get(payload.transportId) as { id: string } | undefined;
      if (existingFine) {
        db.prepare(`
          UPDATE vehicle_expenses
          SET amount = ?, description = ?, reference = ?, vehicle_id = ?, date = ?, updated_at = ?
          WHERE id = ?
        `).run(
          payload.fine.amount,
          payload.fine.description || 'Traffic Fine',
          payload.fine.reference || null,
          vehicleId,
          tripDate,
          now,
          existingFine.id
        );
      } else {
        const newId = cryptoRandomUUID();
        db.prepare(`
          INSERT INTO vehicle_expenses (id, transport_id, vehicle_id, date, expense_type, description, reference, amount, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'Traffic Fines', ?, ?, ?, ?, ?)
        `).run(
          newId,
          payload.transportId,
          vehicleId,
          tripDate,
          payload.fine.description || 'Traffic Fine',
          payload.fine.reference || null,
          payload.fine.amount,
          now,
          now
        );
      }
    } else {
      db.prepare("DELETE FROM vehicle_expenses WHERE transport_id = ? AND expense_type = 'Traffic Fines'").run(payload.transportId);
    }

    // 4. Trip Maintenance Processing
    if (payload.maintenance && payload.maintenance.amount > 0) {
      const existingMaint = db.prepare('SELECT id FROM maintenance_records WHERE transport_id = ?').get(payload.transportId) as { id: string } | undefined;
      if (existingMaint) {
        db.prepare(`
          UPDATE maintenance_records
          SET amount = ?, description = ?, vendor = ?, vehicle_id = ?, date = ?, updated_at = ?
          WHERE id = ?
        `).run(
          payload.maintenance.amount,
          payload.maintenance.description || 'Emergency Trip Maintenance',
          payload.maintenance.vendor || 'Workshop',
          vehicleId,
          tripDate,
          now,
          existingMaint.id
        );
      } else {
        const newId = cryptoRandomUUID();
        db.prepare(`
          INSERT INTO maintenance_records (id, transport_id, vehicle_id, date, maintenance_type, description, amount, vendor, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'Emergency Repair', ?, ?, ?, ?, ?)
        `).run(
          newId,
          payload.transportId,
          vehicleId,
          tripDate,
          payload.maintenance.description || 'Emergency Trip Maintenance',
          payload.maintenance.amount,
          payload.maintenance.vendor || 'Workshop',
          now,
          now
        );
      }
    } else {
      db.prepare('DELETE FROM maintenance_records WHERE transport_id = ?').run(payload.transportId);
    }

    // 5. Other Direct Cost Processing
    if (payload.other && payload.other.amount > 0) {
      const existingOther = db.prepare("SELECT id FROM vehicle_expenses WHERE transport_id = ? AND expense_type = 'Other Direct'").get(payload.transportId) as { id: string } | undefined;
      if (existingOther) {
        db.prepare(`
          UPDATE vehicle_expenses
          SET amount = ?, description = ?, vehicle_id = ?, date = ?, updated_at = ?
          WHERE id = ?
        `).run(
          payload.other.amount,
          payload.other.description || 'Other Direct Cost',
          vehicleId,
          tripDate,
          now,
          existingOther.id
        );
      } else {
        const newId = cryptoRandomUUID();
        db.prepare(`
          INSERT INTO vehicle_expenses (id, transport_id, vehicle_id, date, expense_type, description, amount, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'Other Direct', ?, ?, ?, ?)
        `).run(
          newId,
          payload.transportId,
          vehicleId,
          tripDate,
          payload.other.description || 'Other Direct Cost',
          payload.other.amount,
          now,
          now
        );
      }
    } else {
      db.prepare("DELETE FROM vehicle_expenses WHERE transport_id = ? AND expense_type = 'Other Direct'").run(payload.transportId);
    }
  });

  executeTransaction();

  return getTripCostsByTransportId(payload.transportId);
}

/**
 * Get Granular Per-Trip Direct Profitability & Cost Breakdown Report
 */
export function getTripProfitabilityReport(filter: ReportFilter): TripProfitabilityItem[] {
  const db = getDb();

  const conditions: string[] = [];
  const params: any[] = [];

  if (filter.startDate) {
    conditions.push('t.date >= ?');
    params.push(filter.startDate);
  }
  if (filter.endDate) {
    conditions.push('t.date <= ?');
    params.push(filter.endDate);
  }
  if (filter.vehicleId) {
    conditions.push('t.vehicle_id = ?');
    params.push(filter.vehicleId);
  }
  if (filter.driverId) {
    conditions.push('t.driver_id = ?');
    params.push(filter.driverId);
  }
  if (filter.transportType) {
    conditions.push('t.transport_type = ?');
    params.push(filter.transportType);
  }
  if (filter.status) {
    if (filter.status === 'COMPLETED') {
      conditions.push("t.status != 'CANCELLED'");
    } else if (filter.status === 'CANCELLED') {
      conditions.push("t.status = 'CANCELLED'");
    } else {
      conditions.push('t.status = ?');
      params.push(filter.status);
    }
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      t.id as transportId,
      t.transport_no as transportNo,
      t.date,
      t.vehicle_id as vehicleId,
      v.registration_number as vehicleRegistration,
      t.driver_id as driverId,
      d.name as driverName,
      fl.name as fromLocationName,
      tl.name as toLocationName,
      t.status,
      t.total_amount as revenue,
      COALESCE(fuel.total_amount, 0) as fuelCost,
      COALESCE(toll.amount, 0) as tollCost,
      COALESCE(fine.amount, 0) as fineCost,
      COALESCE(maint.amount, 0) as maintenanceCost,
      COALESCE(other.amount, 0) as otherCost
    FROM transports t
    JOIN vehicles v ON t.vehicle_id = v.id
    JOIN drivers d ON t.driver_id = d.id
    JOIN locations fl ON t.from_location_id = fl.id
    JOIN locations tl ON t.to_location_id = tl.id
    LEFT JOIN (
      SELECT transport_id, SUM(total_amount) as total_amount
      FROM fuel_records
      WHERE transport_id IS NOT NULL
      GROUP BY transport_id
    ) fuel ON fuel.transport_id = t.id
    LEFT JOIN (
      SELECT transport_id, SUM(amount) as amount
      FROM vehicle_expenses
      WHERE transport_id IS NOT NULL AND expense_type = 'Salik / Tolls'
      GROUP BY transport_id
    ) toll ON toll.transport_id = t.id
    LEFT JOIN (
      SELECT transport_id, SUM(amount) as amount
      FROM vehicle_expenses
      WHERE transport_id IS NOT NULL AND expense_type = 'Traffic Fines'
      GROUP BY transport_id
    ) fine ON fine.transport_id = t.id
    LEFT JOIN (
      SELECT transport_id, SUM(amount) as amount
      FROM maintenance_records
      WHERE transport_id IS NOT NULL
      GROUP BY transport_id
    ) maint ON maint.transport_id = t.id
    LEFT JOIN (
      SELECT transport_id, SUM(amount) as amount
      FROM vehicle_expenses
      WHERE transport_id IS NOT NULL AND expense_type = 'Other Direct'
      GROUP BY transport_id
    ) other ON other.transport_id = t.id
    ${whereClause}
    ORDER BY t.date DESC, t.created_at DESC
  `;

  const rows = db.prepare(sql).all(...params) as any[];

  return rows.map((r) => {
    const revenue = r.revenue || 0;
    const fuelCost = r.fuelCost || 0;
    const tollCost = r.tollCost || 0;
    const fineCost = r.fineCost || 0;
    const maintenanceCost = r.maintenanceCost || 0;
    const otherCost = r.otherCost || 0;

    const totalDirectCosts = fuelCost + tollCost + fineCost + maintenanceCost + otherCost;
    const directTripProfit = revenue - totalDirectCosts;
    const contributionMarginPercentage =
      revenue > 0 ? parseFloat(((directTripProfit / revenue) * 100).toFixed(2)) : 0;

    return {
      transportId: r.transportId,
      transportNo: r.transportNo,
      date: r.date,
      vehicleId: r.vehicleId,
      vehicleRegistration: r.vehicleRegistration,
      driverId: r.driverId,
      driverName: r.driverName,
      route: `${r.fromLocationName} ➔ ${r.toLocationName}`,
      fromLocationName: r.fromLocationName,
      toLocationName: r.toLocationName,
      status: r.status,
      revenue,
      fuelCost,
      tollCost,
      fineCost,
      maintenanceCost,
      otherCost,
      totalDirectCosts,
      directTripProfit,
      contributionMarginPercentage,
    };
  });
}
