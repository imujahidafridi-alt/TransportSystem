import { getDb } from '../database/db';
import { ReportFilter, Transport } from '../../shared/types';

export interface VehicleProfitabilityReport {
  vehicleId: string;
  registrationNumber: string;
  totalTrips: number;
  totalRevenue: number;
  fuelExpense: number;
  maintenanceExpense: number;
  otherExpense: number;
  totalExpense: number;
  netProfit: number;
}

export function getFilteredTransportsReport(filter: ReportFilter): Transport[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

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
  if (filter.locationId) {
    conditions.push('(t.from_location_id = ? OR t.to_location_id = ?)');
    params.push(filter.locationId, filter.locationId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      t.id, t.transport_no as transportNo, t.date, t.transport_type as transportType,
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
    ORDER BY t.date DESC
  `;

  return db.prepare(sql).all(...params) as Transport[];
}

export function getVehicleProfitabilityReport(filter: ReportFilter): VehicleProfitabilityReport[] {
  const db = getDb();
  const vehicles = db.prepare('SELECT id, registration_number FROM vehicles ORDER BY registration_number ASC').all() as { id: string; registration_number: string }[];

  const results: VehicleProfitabilityReport[] = [];

  for (const veh of vehicles) {
    let dateFilter = '';
    const params: string[] = [veh.id];
    if (filter.startDate && filter.endDate) {
      dateFilter = 'AND date >= ? AND date <= ?';
      params.push(filter.startDate, filter.endDate);
    }

    const tripStats = db.prepare(`
      SELECT COUNT(*) as trips, COALESCE(SUM(total_amount), 0) as rev
      FROM transports
      WHERE vehicle_id = ? AND status != 'CANCELLED' ${dateFilter}
    `).get(...params) as { trips: number; rev: number };

    const fuelStats = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as fuel
      FROM fuel_records
      WHERE vehicle_id = ? ${dateFilter}
    `).get(...params) as { fuel: number };

    const maintStats = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as maint
      FROM maintenance_records
      WHERE vehicle_id = ? ${dateFilter}
    `).get(...params) as { maint: number };

    const expStats = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as exp
      FROM vehicle_expenses
      WHERE vehicle_id = ? ${dateFilter}
    `).get(...params) as { exp: number };

    const totalExpense = fuelStats.fuel + maintStats.maint + expStats.exp;
    const netProfit = tripStats.rev - totalExpense;

    results.push({
      vehicleId: veh.id,
      registrationNumber: veh.registration_number,
      totalTrips: tripStats.trips,
      totalRevenue: tripStats.rev,
      fuelExpense: fuelStats.fuel,
      maintenanceExpense: maintStats.maint,
      otherExpense: expStats.exp,
      totalExpense,
      netProfit,
    });
  }

  return results;
}
