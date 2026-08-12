import { getDb } from '../database/db';
import { DashboardSummary, Transport } from '../../shared/types';

export function getDashboardSummary(period: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL' = 'THIS_MONTH', customStart?: string, customEnd?: string): DashboardSummary {
  const db = getDb();
  
  let dateFilter = '';
  const now = new Date();
  let startDateStr = '';

  if (customStart && customEnd) {
    dateFilter = `WHERE date >= '${customStart}' AND date <= '${customEnd}'`;
  } else if (period === 'TODAY') {
    startDateStr = now.toISOString().slice(0, 10);
    dateFilter = `WHERE date = '${startDateStr}'`;
  } else if (period === 'THIS_WEEK') {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startDateStr = startOfWeek.toISOString().slice(0, 10);
    dateFilter = `WHERE date >= '${startDateStr}'`;
  } else if (period === 'THIS_MONTH') {
    startDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    dateFilter = `WHERE date >= '${startDateStr}'`;
  }

  // Vehicles count
  const totalVehicles = (db.prepare('SELECT COUNT(*) as c FROM vehicles').get() as { c: number }).c;
  const activeVehicles = (db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'ACTIVE'").get() as { c: number }).c;
  const idleVehicles = Math.max(0, totalVehicles - activeVehicles);

  // Drivers count
  const activeDrivers = (db.prepare("SELECT COUNT(*) as c FROM drivers WHERE status = 'ACTIVE'").get() as { c: number }).c;
  const driversOnLeave = (db.prepare("SELECT COUNT(*) as c FROM drivers WHERE status = 'ON_LEAVE'").get() as { c: number }).c;

  // Trips count
  const tripsSql = `SELECT COUNT(*) as c FROM transports ${dateFilter ? dateFilter + " AND status != 'CANCELLED'" : "WHERE status != 'CANCELLED'"}`;
  const tripsThisMonth = (db.prepare(tripsSql).get() as { c: number }).c;

  // Revenue
  const revSql = `SELECT COALESCE(SUM(total_amount), 0) as s FROM transports ${dateFilter ? dateFilter + " AND status != 'CANCELLED'" : "WHERE status != 'CANCELLED'"}`;
  const totalRevenue = (db.prepare(revSql).get() as { s: number }).s;

  // Vehicle Expenses
  const expSql = `SELECT COALESCE(SUM(amount), 0) as s FROM vehicle_expenses ${dateFilter}`;
  const vehicleExpenses = (db.prepare(expSql).get() as { s: number }).s;

  // Fuel Expenses
  const fuelSql = `SELECT COALESCE(SUM(total_amount), 0) as s FROM fuel_records ${dateFilter}`;
  const fuelExpenses = (db.prepare(fuelSql).get() as { s: number }).s;

  // Maintenance Expenses
  const maintSql = `SELECT COALESCE(SUM(amount), 0) as s FROM maintenance_records ${dateFilter}`;
  const maintenanceExpenses = (db.prepare(maintSql).get() as { s: number }).s;

  // Driver Salaries
  let salaryFilter = '';
  if (startDateStr) {
    const periodMonth = startDateStr.slice(0, 7);
    salaryFilter = `WHERE salary_period >= '${periodMonth}'`;
  }
  const salSql = `SELECT COALESCE(SUM(net_salary), 0) as s FROM driver_salary_records ${salaryFilter}`;
  const driverSalaries = (db.prepare(salSql).get() as { s: number }).s;

  const totalCost = vehicleExpenses + fuelExpenses + maintenanceExpenses + driverSalaries;
  const netResult = totalRevenue - totalCost;

  // Recent 5 transports
  const recentSql = `
    SELECT 
      t.*,
      fl.name as from_location_name,
      tl.name as to_location_name,
      v.registration_number as vehicle_registration,
      d.name as driver_name
    FROM transports t
    LEFT JOIN locations fl ON t.from_location_id = fl.id
    LEFT JOIN locations tl ON t.to_location_id = tl.id
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN drivers d ON t.driver_id = d.id
    ORDER BY t.created_at DESC
    LIMIT 6
  `;

  const rows = db.prepare(recentSql).all() as any[];
  const recentTransports: Transport[] = rows.map((r) => ({
    id: r.id,
    transportNo: r.transport_no,
    date: r.date,
    transportType: r.transport_type,
    fromLocationId: r.from_location_id,
    fromLocationName: r.from_location_name,
    toLocationId: r.to_location_id,
    toLocationName: r.to_location_name,
    vehicleId: r.vehicle_id,
    vehicleRegistration: r.vehicle_registration,
    driverId: r.driver_id,
    driverName: r.driver_name,
    tons: r.tons,
    ratePerTon: r.rate_per_ton,
    fixedPrice: r.fixed_price,
    totalAmount: r.total_amount,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return {
    totalVehicles,
    activeVehicles,
    idleVehicles,
    activeDrivers,
    driversOnLeave,
    tripsThisMonth,
    totalRevenue,
    vehicleExpenses,
    fuelExpenses,
    maintenanceExpenses,
    driverSalaries,
    netResult,
    recentTransports,
  };
}
