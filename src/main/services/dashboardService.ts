import { getDb } from '../database/db';
import { DashboardSummary, Transport } from '../../shared/types';

export function getDashboardSummary(
  period: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL' = 'THIS_MONTH',
  customStart?: string,
  customEnd?: string
): DashboardSummary {
  const db = getDb();
  
  let dateFilter = '';
  let salaryFilter = '';
  const now = new Date();
  
  // Format local date components YYYY-MM-DD
  const year = now.getFullYear();
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const dayStr = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${monthStr}-${dayStr}`;
  const currentMonthStr = `${year}-${monthStr}`;
  const monthStartStr = `${currentMonthStr}-01`;
  
  // Last day of current month
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const monthEndStr = `${currentMonthStr}-${String(lastDay).padStart(2, '0')}`;

  if (customStart && customEnd) {
    dateFilter = `WHERE date >= '${customStart}' AND date <= '${customEnd}'`;
    salaryFilter = `WHERE (payment_date >= '${customStart}' AND payment_date <= '${customEnd}') OR (salary_period >= '${customStart.slice(0, 7)}' AND salary_period <= '${customEnd.slice(0, 7)}')`;
  } else if (period === 'TODAY') {
    dateFilter = `WHERE date = '${todayStr}'`;
    salaryFilter = `WHERE payment_date = '${todayStr}'`;
  } else if (period === 'THIS_WEEK') {
    const d = new Date(now);
    const day = d.getDay(); // 0 is Sunday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const startOfWeek = new Date(d.setDate(diff));
    const startOfWeekStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const endOfWeekStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`;

    dateFilter = `WHERE date >= '${startOfWeekStr}' AND date <= '${endOfWeekStr}'`;
    salaryFilter = `WHERE payment_date >= '${startOfWeekStr}' AND payment_date <= '${endOfWeekStr}'`;
  } else if (period === 'THIS_MONTH') {
    dateFilter = `WHERE date >= '${monthStartStr}' AND date <= '${monthEndStr}'`;
    salaryFilter = `WHERE salary_period = '${currentMonthStr}' OR (payment_date >= '${monthStartStr}' AND payment_date <= '${monthEndStr}')`;
  } else if (period === 'ALL') {
    dateFilter = '';
    salaryFilter = '';
  }

  // 1. Fleet Vehicle Counts
  const totalVehicles = (db.prepare('SELECT COUNT(*) as c FROM vehicles').get() as { c: number })?.c || 0;
  const activeVehicles = (db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'ACTIVE'").get() as { c: number })?.c || 0;
  const idleVehicles = Math.max(0, totalVehicles - activeVehicles);

  // 2. Driver Counts
  const activeDrivers = (db.prepare("SELECT COUNT(*) as c FROM drivers WHERE status = 'ACTIVE'").get() as { c: number })?.c || 0;
  const driversOnLeave = (db.prepare("SELECT COUNT(*) as c FROM drivers WHERE status = 'ON_LEAVE'").get() as { c: number })?.c || 0;

  // 3. Operational Transports & Gross Revenue (Excluding CANCELLED)
  const tripsSql = `SELECT COUNT(*) as c FROM transports ${dateFilter ? dateFilter + " AND status != 'CANCELLED'" : "WHERE status != 'CANCELLED'"}`;
  const tripsThisMonth = (db.prepare(tripsSql).get() as { c: number })?.c || 0;

  const revSql = `SELECT COALESCE(SUM(total_amount), 0) as s FROM transports ${dateFilter ? dateFilter + " AND status != 'CANCELLED'" : "WHERE status != 'CANCELLED'"}`;
  const totalRevenue = (db.prepare(revSql).get() as { s: number })?.s || 0;

  // 4. Operating Expenses Components
  // A. Vehicle Expenses
  const expSql = `SELECT COALESCE(SUM(amount), 0) as s FROM vehicle_expenses ${dateFilter}`;
  const vehicleExpenses = (db.prepare(expSql).get() as { s: number })?.s || 0;

  // B. Fuel Expenses
  const fuelSql = `SELECT COALESCE(SUM(total_amount), 0) as s FROM fuel_records ${dateFilter}`;
  const fuelExpenses = (db.prepare(fuelSql).get() as { s: number })?.s || 0;

  // C. Maintenance & Repair Expenses
  const maintSql = `SELECT COALESCE(SUM(amount), 0) as s FROM maintenance_records ${dateFilter}`;
  const maintenanceExpenses = (db.prepare(maintSql).get() as { s: number })?.s || 0;

  // D. Driver Salaries
  const salSql = `SELECT COALESCE(SUM(net_salary), 0) as s FROM driver_salary_records ${salaryFilter}`;
  const driverSalaries = (db.prepare(salSql).get() as { s: number })?.s || 0;

  // Total Fleet Operating Cost & Net Operating Result
  const totalCost = vehicleExpenses + fuelExpenses + maintenanceExpenses + driverSalaries;
  const netResult = totalRevenue - totalCost;

  // 5. Recent 6 Transports for live feed
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
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT 6
  `;

  const rows = db.prepare(recentSql).all() as any[];
  const recentTransports: Transport[] = rows.map((r) => ({
    id: r.id,
    transportNo: r.transport_no,
    date: r.date,
    transportType: r.transport_type,
    materialName: r.material_name,
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
