import { getDb } from '../database/db';
import { ReportFilter, Transport } from '../../shared/types';

export interface TransactionReportItem extends Transport {}

export interface DriverReportItem {
  driverId: string;
  driverName: string;
  phone: string;
  cnicOrLicense: string;
  totalTrips: number;
  basicSalary: number;
  latestTransactionDate?: string;
}

export interface VehicleExpenseReportItem {
  vehicleId: string;
  registrationNumber: string;
  vehicleType: string;
  totalTrips: number;
  fuelCost: number;
  maintenanceCost: number;
  otherExpenses: number;
  totalVehicleExpense: number;
}

export interface ProfitAndLossStatement {
  periodLabel: string;
  totalTripsCount: number;
  tripRevenue: number;
  tonRevenue: number;
  totalGrossRevenue: number;
  fuelCost: number;
  maintenanceCost: number;
  otherExpenses: number;
  driverSalaries: number;
  totalOperatingCosts: number;
  netProfit: number;
  profitMarginPercentage: number;
}

/**
 * 1. Transaction Reports
 */
export function getTransactionReports(filter: ReportFilter): TransactionReportItem[] {
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
  `;

  return db.prepare(sql).all(...params) as Transport[];
}

/**
 * 2. Driver Reports Linked With Each Transaction (For Manual Month-End Commission Calculation)
 */
export function getDriverReports(filter: ReportFilter): DriverReportItem[] {
  const db = getDb();
  let driverWhere = '';
  const params: string[] = [];

  if (filter.driverId) {
    driverWhere = 'WHERE id = ?';
    params.push(filter.driverId);
  }

  const drivers = db.prepare(`SELECT id, name, phone, cnic_or_license, basic_salary FROM drivers ${driverWhere} ORDER BY name ASC`).all(...params) as any[];

  const results: DriverReportItem[] = [];

  for (const d of drivers) {
    let dateFilter = '';
    const tripParams: string[] = [d.id];
    if (filter.startDate && filter.endDate) {
      dateFilter = 'AND date >= ? AND date <= ?';
      tripParams.push(filter.startDate, filter.endDate);
    }

    const tripStats = db.prepare(`
      SELECT COUNT(*) as trips, MAX(date) as lastDate
      FROM transports
      WHERE driver_id = ? AND status != 'CANCELLED' ${dateFilter}
    `).get(...tripParams) as { trips: number; lastDate: string };

    const basicSalary = d.basic_salary || 1500;

    results.push({
      driverId: d.id,
      driverName: d.name,
      phone: d.phone || '-',
      cnicOrLicense: d.cnic_or_license || '-',
      totalTrips: tripStats.trips || 0,
      basicSalary,
      latestTransactionDate: tripStats.lastDate || '-',
    });
  }

  return results;
}

/**
 * 3. Expense Report Linked With Vehicle
 */
export function getVehicleExpenseReports(filter: ReportFilter): VehicleExpenseReportItem[] {
  const db = getDb();
  let vehWhere = '';
  const params: string[] = [];

  if (filter.vehicleId) {
    vehWhere = 'WHERE id = ?';
    params.push(filter.vehicleId);
  }

  const vehicles = db.prepare(`SELECT id, registration_number, vehicle_type FROM vehicles ${vehWhere} ORDER BY registration_number ASC`).all(...params) as any[];

  const results: VehicleExpenseReportItem[] = [];

  for (const v of vehicles) {
    let dateFilter = '';
    const dateParams: string[] = [v.id];
    if (filter.startDate && filter.endDate) {
      dateFilter = 'AND date >= ? AND date <= ?';
      dateParams.push(filter.startDate, filter.endDate);
    }

    const tripStats = db.prepare(`
      SELECT COUNT(*) as trips
      FROM transports
      WHERE vehicle_id = ? AND status != 'CANCELLED' ${dateFilter}
    `).get(...dateParams) as { trips: number };

    const fuelStats = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as fuel
      FROM fuel_records
      WHERE vehicle_id = ? ${dateFilter}
    `).get(...dateParams) as { fuel: number };

    const maintStats = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as maint
      FROM maintenance_records
      WHERE vehicle_id = ? ${dateFilter}
    `).get(...dateParams) as { maint: number };

    const expStats = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as exp
      FROM vehicle_expenses
      WHERE vehicle_id = ? ${dateFilter}
    `).get(...dateParams) as { exp: number };

    const fuelCost = fuelStats.fuel || 0;
    const maintenanceCost = maintStats.maint || 0;
    const otherExpenses = expStats.exp || 0;

    const totalVehicleExpense = fuelCost + maintenanceCost + otherExpenses;

    results.push({
      vehicleId: v.id,
      registrationNumber: v.registration_number,
      vehicleType: v.vehicle_type || 'Truck',
      totalTrips: tripStats.trips || 0,
      fuelCost,
      maintenanceCost,
      otherExpenses,
      totalVehicleExpense,
    });
  }

  return results;
}

/**
 * 4. Profit and Loss Statement (P&L)
 */
export function getProfitAndLossStatement(filter: ReportFilter): ProfitAndLossStatement {
  const db = getDb();
  let dateCondition = '';
  const params: string[] = [];

  if (filter.startDate && filter.endDate) {
    dateCondition = 'WHERE date >= ? AND date <= ?';
    params.push(filter.startDate, filter.endDate);
  }

  // 1. Revenue Streams
  const tripRevRow = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as rev
    FROM transports
    WHERE transport_type = 'TRIP' AND status != 'CANCELLED' ${filter.startDate ? 'AND date >= ? AND date <= ?' : ''}
  `).get(...(filter.startDate ? [filter.startDate, filter.endDate] : [])) as { count: number; rev: number };

  const tonRevRow = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as rev
    FROM transports
    WHERE transport_type = 'TON' AND status != 'CANCELLED' ${filter.startDate ? 'AND date >= ? AND date <= ?' : ''}
  `).get(...(filter.startDate ? [filter.startDate, filter.endDate] : [])) as { count: number; rev: number };

  const totalTripsCount = (tripRevRow?.count || 0) + (tonRevRow?.count || 0);
  const tripRevenue = tripRevRow?.rev || 0;
  const tonRevenue = tonRevRow?.rev || 0;
  const totalGrossRevenue = tripRevenue + tonRevenue;

  // 2. Operating Expenses (Fuel + Maintenance + Vehicle Expenses)
  const fuelRow = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as fuel FROM fuel_records ${dateCondition}
  `).get(...params) as { fuel: number };

  const maintRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as maint FROM maintenance_records ${dateCondition}
  `).get(...params) as { maint: number };

  const expRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as exp FROM vehicle_expenses ${dateCondition}
  `).get(...params) as { exp: number };

  const fuelCost = fuelRow?.fuel || 0;
  const maintenanceCost = maintRow?.maint || 0;
  const otherExpenses = expRow?.exp || 0;

  // 3. Driver Payroll & Commission Overheads
  let salaryCondition = '';
  const salaryParams: string[] = [];
  if (filter.startDate && filter.endDate) {
    const startPeriod = filter.startDate.slice(0, 7);
    const endPeriod = filter.endDate.slice(0, 7);
    salaryCondition = 'WHERE (payment_date >= ? AND payment_date <= ?) OR (salary_period >= ? AND salary_period <= ?)';
    salaryParams.push(filter.startDate, filter.endDate, startPeriod, endPeriod);
  }

  const salaryRow = db.prepare(`
    SELECT COALESCE(SUM(net_salary), 0) as salaries
    FROM driver_salary_records
    ${salaryCondition}
  `).get(...salaryParams) as { salaries: number };

  const driverSalaries = salaryRow?.salaries || 0;

  const totalOperatingCosts = fuelCost + maintenanceCost + otherExpenses + driverSalaries;
  const netProfit = totalGrossRevenue - totalOperatingCosts;
  const profitMarginPercentage = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0;

  const periodLabel = (filter.startDate && filter.endDate)
    ? `${filter.startDate} to ${filter.endDate}`
    : 'All Time Financial Performance';

  return {
    periodLabel,
    totalTripsCount,
    tripRevenue,
    tonRevenue,
    totalGrossRevenue,
    fuelCost,
    maintenanceCost,
    otherExpenses,
    driverSalaries,
    totalOperatingCosts,
    netProfit,
    profitMarginPercentage: parseFloat(profitMarginPercentage.toFixed(2)),
  };
}
