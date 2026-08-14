import { getDb } from '../database/db';
import {
  DriverSalaryRecord,
  DriverSalaryAdjustment,
  SalaryPaymentStatus,
  MasterPayrollSummary,
} from '../../shared/types';
import { cryptoRandomUUID } from '../utils/uuid';
import { enqueueSyncOperation } from '../sync/syncQueue';

/**
 * Calculates half-open date range [start, nextMonthStart) for a period like "2026-08".
 * Example: start = "2026-08-01", nextMonthStart = "2026-09-01".
 * Handles December -> January year rollover cleanly.
 */
export function getPeriodHalfOpenRange(salaryPeriod: string): { start: string; nextMonthStart: string } {
  const parts = salaryPeriod.split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || (new Date().getMonth() + 1);

  const start = `${year}-${String(month).padStart(2, '0')}-01`;

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  return { start, nextMonthStart };
}

export function calculateNetSalary(
  basic: number,
  tripEarnings: number,
  allowances: number,
  deductions: number,
  advance: number
): number {
  return Math.max(
    0,
    (basic || 0) + (tripEarnings || 0) + (allowances || 0) - (deductions || 0) - (advance || 0)
  );
}

/**
 * Calculates payroll components for a single driver in a given month.
 * Strictly uses status = 'COMPLETED' and half-open date range [start, nextMonthStart).
 */
export function calculateDriverPayrollForPeriod(
  driverId: string,
  salaryPeriod: string
): {
  basicSalary: number;
  completedTrips: number;
  tripEarnings: number;
  allowances: number;
  suggestedNet: number;
} {
  const db = getDb();
  const driver = db
    .prepare('SELECT basic_salary, salary_type, per_trip_rate FROM drivers WHERE id = ?')
    .get(driverId) as any;

  if (!driver) {
    return { basicSalary: 0, completedTrips: 0, tripEarnings: 0, allowances: 0, suggestedNet: 0 };
  }

  const { start, nextMonthStart } = getPeriodHalfOpenRange(salaryPeriod);

  const tripRow = db
    .prepare(`
      SELECT 
        COUNT(*) as trips,
        COALESCE(SUM(driver_allowance), 0) as total_allowances
      FROM transports 
      WHERE driver_id = ? 
        AND date >= ? 
        AND date < ? 
        AND status = 'COMPLETED'
    `)
    .get(driverId, start, nextMonthStart) as { trips: number; total_allowances: number };

  const completedTrips = tripRow?.trips || 0;
  const basicSalary = Number(driver.basic_salary || 0);
  const tripAllowances = Number(tripRow?.total_allowances || 0);

  // If PER_TRIP driver, calculate trip earnings: trips * per_trip_rate
  const perTripRate = Number(driver.per_trip_rate || 0);
  const tripEarnings = driver.salary_type === 'PER_TRIP' ? completedTrips * perTripRate : 0;

  const suggestedNet = basicSalary + tripEarnings + tripAllowances;

  return { basicSalary, completedTrips, tripEarnings, allowances: tripAllowances, suggestedNet };
}

/**
 * Batch generates/refreshes payroll draft for all eligible active drivers for a period.
 * Uses a SINGLE grouped SQL query for transport aggregation (No N+1 queries).
 * Strictly preserves locked historical records (FINALIZED / PAID).
 */
export function generatePayrollDraftForPeriod(
  salaryPeriod: string,
  createdBy?: string
): { generatedCount: number; skippedFinalizedCount: number; totalEligible: number } {
  const db = getDb();
  const { start, nextMonthStart } = getPeriodHalfOpenRange(salaryPeriod);

  // 1. Single grouped aggregate query for all completed transports in the period (No N+1)
  const transportAggregates = db
    .prepare(`
      SELECT 
        driver_id,
        COUNT(*) as completed_trips,
        COALESCE(SUM(driver_allowance), 0) as total_allowances
      FROM transports
      WHERE status = 'COMPLETED'
        AND date >= ? 
        AND date < ?
      GROUP BY driver_id
    `)
    .all(start, nextMonthStart) as Array<{
    driver_id: string;
    completed_trips: number;
    total_allowances: number;
  }>;

  const transportMap = new Map<string, { completedTrips: number; totalAllowances: number }>();
  for (const row of transportAggregates) {
    transportMap.set(row.driver_id, {
      completedTrips: Number(row.completed_trips || 0),
      totalAllowances: Number(row.total_allowances || 0),
    });
  }

  // 2. Fetch all active drivers
  const activeDrivers = db
    .prepare('SELECT id, name, salary_type, basic_salary, per_trip_rate FROM drivers WHERE status = ?')
    .all('ACTIVE') as Array<{
    id: string;
    name: string;
    salary_type: string;
    basic_salary: number;
    per_trip_rate: number;
  }>;

  let generatedCount = 0;
  let skippedFinalizedCount = 0;
  let totalEligible = 0;

  const now = new Date().toISOString();

  for (const driver of activeDrivers) {
    const tData = transportMap.get(driver.id) || { completedTrips: 0, totalAllowances: 0 };
    const basicSalary = Number(driver.basic_salary || 0);
    const perTripRate = Number(driver.per_trip_rate || 0);
    const tripEarnings = driver.salary_type === 'PER_TRIP' ? tData.completedTrips * perTripRate : 0;

    // Meaningful Eligibility Rule:
    // Eligible IF MONTHLY driver (owed contract basic salary) OR has completed trips / allowances
    const isEligible =
      driver.salary_type === 'MONTHLY' ||
      tData.completedTrips > 0 ||
      tData.totalAllowances > 0 ||
      basicSalary > 0;

    if (!isEligible) {
      continue; // Skip inactive per-trip drivers with 0 activity
    }

    totalEligible++;

    // Check if a record already exists for this driver and period
    const existing = db
      .prepare('SELECT id, payment_status, deductions, advance, allowances FROM driver_salary_records WHERE driver_id = ? AND salary_period = ?')
      .get(driver.id, salaryPeriod) as {
      id: string;
      payment_status: SalaryPaymentStatus;
      deductions: number;
      advance: number;
      allowances: number;
    } | undefined;

    if (existing) {
      // Backend Immutability Rule: If FINALIZED or PAID, do not overwrite historical snapshot!
      if (existing.payment_status === 'FINALIZED' || existing.payment_status === 'PAID') {
        skippedFinalizedCount++;
        continue;
      }

      // If DRAFT, refresh with active transport aggregates while preserving existing manual deductions/advances
      const netSalary = calculateNetSalary(
        basicSalary,
        tripEarnings,
        tData.totalAllowances,
        existing.deductions || 0,
        existing.advance || 0
      );

      db.prepare(`
        UPDATE driver_salary_records
        SET basic_salary = ?, total_trips = ?, trip_earnings = ?, allowances = ?,
            net_salary = ?, updated_at = ?
        WHERE id = ?
      `).run(
        basicSalary,
        tData.completedTrips,
        tripEarnings,
        tData.totalAllowances,
        netSalary,
        now,
        existing.id
      );

      generatedCount++;
    } else {
      // Create new DRAFT record
      const id = cryptoRandomUUID();
      const netSalary = calculateNetSalary(
        basicSalary,
        tripEarnings,
        tData.totalAllowances,
        0,
        0
      );

      db.prepare(`
        INSERT INTO driver_salary_records (
          id, driver_id, salary_period, basic_salary, total_trips, trip_earnings,
          allowances, deductions, advance, net_salary, payment_status,
          notes, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'DRAFT', ?, ?, ?
        )
      `).run(
        id,
        driver.id,
        salaryPeriod,
        basicSalary,
        tData.completedTrips,
        tripEarnings,
        tData.totalAllowances,
        netSalary,
        createdBy ? `Draft generated by ${createdBy}` : 'Auto-generated draft',
        now,
        now
      );

      generatedCount++;
    }
  }

  return { generatedCount, skippedFinalizedCount, totalEligible };
}

/**
 * Locks all DRAFT records for a period into FINALIZED historical snapshots.
 * Backend enforces that only DRAFT records can be finalized.
 */
export function finalizePayrollForPeriod(
  salaryPeriod: string,
  salaryRecordIds?: string[],
  finalizedBy: string = 'Admin'
): { finalizedCount: number } {
  const db = getDb();
  const now = new Date().toISOString();

  let sql = `
    UPDATE driver_salary_records
    SET payment_status = 'FINALIZED',
        finalized_at = ?,
        finalized_by = ?,
        updated_at = ?
    WHERE salary_period = ? AND payment_status = 'DRAFT'
  `;
  const params: any[] = [now, finalizedBy, now, salaryPeriod];

  if (salaryRecordIds && salaryRecordIds.length > 0) {
    const placeholders = salaryRecordIds.map(() => '?').join(',');
    sql += ` AND id IN (${placeholders})`;
    params.push(...salaryRecordIds);
  }

  const result = db.prepare(sql).run(...params);
  return { finalizedCount: result.changes };
}

/**
 * Disburses payment and marks records as PAID with complete audit metadata.
 * Supports batch marking of finalized/draft records.
 */
export function markSalariesPaid(payload: {
  salaryRecordIds: string[];
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  paidBy: string;
}): { paidCount: number } {
  const db = getDb();
  const now = new Date().toISOString();

  if (!payload.salaryRecordIds || payload.salaryRecordIds.length === 0) {
    return { paidCount: 0 };
  }

  const placeholders = payload.salaryRecordIds.map(() => '?').join(',');
  const sql = `
    UPDATE driver_salary_records
    SET payment_status = 'PAID',
        payment_date = ?,
        payment_method = ?,
        payment_reference = ?,
        paid_by = ?,
        updated_at = ?
    WHERE id IN (${placeholders})
  `;

  const result = db.prepare(sql).run(
    payload.paymentDate,
    payload.paymentMethod || 'Bank Transfer / WPS',
    payload.paymentReference || null,
    payload.paidBy || 'Admin',
    now,
    ...payload.salaryRecordIds
  );

  return { paidCount: result.changes };
}

/**
 * Structured adjustments audit service: Add an adjustment to a salary record.
 * Backend strictly blocks adjustments on FINALIZED or PAID records.
 */
export function addSalaryAdjustment(data: {
  salaryRecordId: string;
  adjustmentType: 'BONUS' | 'DEDUCTION' | 'ADVANCE';
  amount: number;
  reason: string;
  createdBy?: string;
}): DriverSalaryRecord {
  const db = getDb();
  const salary = getSalaryById(data.salaryRecordId);
  if (!salary) {
    throw new Error(`Salary record '${data.salaryRecordId}' not found.`);
  }

  // Backend Immutability Rule: Reject modifications on locked records
  if (salary.paymentStatus === 'FINALIZED' || salary.paymentStatus === 'PAID') {
    throw new Error(`Cannot modify adjustments on a ${salary.paymentStatus} salary record.`);
  }

  if (!data.reason || !data.reason.trim()) {
    throw new Error('An audit reason is required for salary adjustments.');
  }

  const id = cryptoRandomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO driver_salary_adjustments (
      id, salary_record_id, adjustment_type, amount, reason, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.salaryRecordId,
    data.adjustmentType,
    Math.abs(data.amount),
    data.reason.trim(),
    now,
    data.createdBy || 'Admin'
  );

  // Recalculate totals on the salary record
  recalculateSalaryTotalsFromAdjustments(data.salaryRecordId);
  return getSalaryById(data.salaryRecordId)!;
}

/**
 * Recalculates allowances, deductions, advance, and net_salary from adjustments table.
 */
function recalculateSalaryTotalsFromAdjustments(salaryRecordId: string) {
  const db = getDb();
  const salary = db.prepare('SELECT * FROM driver_salary_records WHERE id = ?').get(salaryRecordId) as any;
  if (!salary) return;

  const adjRows = db
    .prepare('SELECT adjustment_type, amount FROM driver_salary_adjustments WHERE salary_record_id = ?')
    .all(salaryRecordId) as Array<{ adjustment_type: string; amount: number }>;

  let bonusTotal = 0;
  let deductionTotal = 0;
  let advanceTotal = 0;

  for (const adj of adjRows) {
    if (adj.adjustment_type === 'BONUS') bonusTotal += adj.amount;
    else if (adj.adjustment_type === 'DEDUCTION') deductionTotal += adj.amount;
    else if (adj.adjustment_type === 'ADVANCE') advanceTotal += adj.amount;
  }

  const { start, nextMonthStart } = getPeriodHalfOpenRange(salary.salary_period);
  const tripRow = db
    .prepare(`
      SELECT COALESCE(SUM(driver_allowance), 0) as total_allowances
      FROM transports 
      WHERE driver_id = ? AND date >= ? AND date < ? AND status = 'COMPLETED'
    `)
    .get(salary.driver_id, start, nextMonthStart) as { total_allowances: number };

  const totalAllowances = (tripRow?.total_allowances || 0) + bonusTotal;
  const netSalary = calculateNetSalary(
    salary.basic_salary,
    salary.trip_earnings,
    totalAllowances,
    deductionTotal,
    advanceTotal
  );

  db.prepare(`
    UPDATE driver_salary_records
    SET allowances = ?, deductions = ?, advance = ?, net_salary = ?, updated_at = ?
    WHERE id = ?
  `).run(totalAllowances, deductionTotal, advanceTotal, netSalary, new Date().toISOString(), salaryRecordId);
}

export function getSalaryAdjustments(salaryRecordId: string): DriverSalaryAdjustment[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT id, salary_record_id as salaryRecordId, adjustment_type as adjustmentType,
             amount, reason, created_at as createdAt, created_by as createdBy
      FROM driver_salary_adjustments
      WHERE salary_record_id = ?
      ORDER BY created_at ASC
    `)
    .all(salaryRecordId) as DriverSalaryAdjustment[];
  return rows;
}

export function deleteSalaryAdjustment(adjustmentId: string): void {
  const db = getDb();
  const adj = db.prepare('SELECT salary_record_id FROM driver_salary_adjustments WHERE id = ?').get(adjustmentId) as { salary_record_id: string } | undefined;
  if (!adj) return;

  const salary = getSalaryById(adj.salary_record_id);
  if (salary && (salary.paymentStatus === 'FINALIZED' || salary.paymentStatus === 'PAID')) {
    throw new Error(`Cannot delete adjustments on a ${salary.paymentStatus} salary record.`);
  }

  db.prepare('DELETE FROM driver_salary_adjustments WHERE id = ?').run(adjustmentId);
  recalculateSalaryTotalsFromAdjustments(adj.salary_record_id);
}

/**
 * Calculates Master Payroll Summary KPI Metrics for a selected period.
 */
export function getMasterPayrollSummary(salaryPeriod: string): MasterPayrollSummary {
  const db = getDb();
  const { start, nextMonthStart } = getPeriodHalfOpenRange(salaryPeriod);

  // Active drivers count
  const totalDriversRow = db.prepare("SELECT COUNT(*) as c FROM drivers WHERE status = 'ACTIVE'").get() as { c: number };
  const totalDrivers = totalDriversRow?.c || 0;

  // Completed trips in the period
  const tripRow = db
    .prepare("SELECT COUNT(*) as trips, COUNT(DISTINCT driver_id) as working_drivers FROM transports WHERE date >= ? AND date < ? AND status = 'COMPLETED'")
    .get(start, nextMonthStart) as { trips: number; working_drivers: number };

  const completedTrips = tripRow?.trips || 0;
  const workingDrivers = tripRow?.working_drivers || 0;

  // Salary records aggregates for the period
  const salaryRows = db
    .prepare(`
      SELECT 
        COUNT(*) as eligible_drivers,
        COALESCE(SUM(basic_salary), 0) as total_basic,
        COALESCE(SUM(trip_earnings), 0) as total_trips_earning,
        COALESCE(SUM(allowances), 0) as total_allowances,
        COALESCE(SUM(deductions), 0) as total_deductions,
        COALESCE(SUM(advance), 0) as total_advance,
        COALESCE(SUM(net_salary), 0) as total_net,
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN net_salary ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN payment_status != 'PAID' THEN net_salary ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN payment_status = 'DRAFT' THEN 1 ELSE 0 END), 0) as draft_count,
        COALESCE(SUM(CASE WHEN payment_status = 'FINALIZED' THEN 1 ELSE 0 END), 0) as finalized_count,
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END), 0) as paid_count
      FROM driver_salary_records
      WHERE salary_period = ?
    `)
    .get(salaryPeriod) as any;

  return {
    salaryPeriod,
    totalDrivers,
    eligibleDrivers: salaryRows?.eligible_drivers || 0,
    workingDrivers,
    completedTrips,
    totalBasicSalary: Number(salaryRows?.total_basic || 0),
    totalTripEarnings: Number(salaryRows?.total_trips_earning || 0),
    totalAllowances: Number(salaryRows?.total_allowances || 0),
    totalDeductions: Number(salaryRows?.total_deductions || 0),
    totalAdvances: Number(salaryRows?.total_advance || 0),
    totalNetPayable: Number(salaryRows?.total_net || 0),
    totalPaid: Number(salaryRows?.total_paid || 0),
    totalPending: Number(salaryRows?.total_pending || 0),
    draftCount: Number(salaryRows?.draft_count || 0),
    finalizedCount: Number(salaryRows?.finalized_count || 0),
    paidCount: Number(salaryRows?.paid_count || 0),
  };
}

export function getAllSalaries(salaryPeriod?: string, driverId?: string, paymentStatus?: string): DriverSalaryRecord[] {
  const db = getDb();
  const whereClauses: string[] = [];
  const params: string[] = [];

  if (salaryPeriod) {
    whereClauses.push('s.salary_period = ?');
    params.push(salaryPeriod);
  }
  if (driverId) {
    whereClauses.push('s.driver_id = ?');
    params.push(driverId);
  }
  if (paymentStatus) {
    whereClauses.push('s.payment_status = ?');
    params.push(paymentStatus);
  }

  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const sql = `
    SELECT s.id, s.driver_id as driverId, d.name as driverName, d.salary_type as salaryType,
           s.salary_period as salaryPeriod, s.basic_salary as basicSalary,
           s.total_trips as totalTrips, s.trip_earnings as tripEarnings,
           s.allowances, s.deductions, s.advance, s.net_salary as netSalary,
           s.payment_date as paymentDate, s.payment_status as paymentStatus,
           s.payment_method as paymentMethod, s.payment_reference as paymentReference,
           s.paid_by as paidBy, s.finalized_at as finalizedAt, s.finalized_by as finalizedBy,
           s.notes, s.created_at as createdAt, s.updated_at as updatedAt
    FROM driver_salary_records s
    JOIN drivers d ON s.driver_id = d.id
    ${where}
    ORDER BY s.salary_period DESC, d.name ASC
  `;

  const records = db.prepare(sql).all(...params) as DriverSalaryRecord[];
  return records;
}

export function createSalaryRecord(data: Omit<DriverSalaryRecord, 'id' | 'netSalary' | 'createdAt' | 'updatedAt'>): DriverSalaryRecord {
  const db = getDb();
  const totalTrips = data.totalTrips || 0;
  const tripEarnings = data.tripEarnings || 0;
  const netSalary = calculateNetSalary(data.basicSalary, tripEarnings, data.allowances, data.deductions, data.advance);
  const now = new Date().toISOString();

  // Check if salary record already exists for this driver and period
  const existing = db.prepare('SELECT id, payment_status FROM driver_salary_records WHERE driver_id = ? AND salary_period = ?').get(data.driverId, data.salaryPeriod) as { id: string; payment_status: SalaryPaymentStatus } | undefined;

  if (existing) {
    if (existing.payment_status === 'FINALIZED' || existing.payment_status === 'PAID') {
      throw new Error(`Cannot modify a ${existing.payment_status} salary record.`);
    }

    db.prepare(`
      UPDATE driver_salary_records
      SET basic_salary = ?, total_trips = ?, trip_earnings = ?, allowances = ?, deductions = ?, advance = ?,
          net_salary = ?, payment_date = ?, payment_status = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      data.basicSalary || 0,
      totalTrips,
      tripEarnings,
      data.allowances || 0,
      data.deductions || 0,
      data.advance || 0,
      netSalary,
      data.paymentDate || null,
      data.paymentStatus || 'DRAFT',
      data.notes || null,
      now,
      existing.id
    );
    const rec = getSalaryById(existing.id)!;
    enqueueSyncOperation('UPDATE', 'SALARIES', existing.id, rec);
    return rec;
  }

  const id = cryptoRandomUUID();
  const stmt = db.prepare(`
    INSERT INTO driver_salary_records (
      id, driver_id, salary_period, basic_salary, total_trips, trip_earnings, allowances, deductions, advance, net_salary, payment_date, payment_status, notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    id,
    data.driverId,
    data.salaryPeriod,
    data.basicSalary || 0,
    totalTrips,
    tripEarnings,
    data.allowances || 0,
    data.deductions || 0,
    data.advance || 0,
    netSalary,
    data.paymentDate || null,
    data.paymentStatus || 'DRAFT',
    data.notes || null,
    now,
    now
  );

  const rec = getSalaryById(id)!;
  enqueueSyncOperation('CREATE', 'SALARIES', id, rec);
  return rec;
}

export function updateSalaryStatus(id: string, paymentStatus: SalaryPaymentStatus, paymentDate?: string): DriverSalaryRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const pDate = paymentStatus === 'PAID' ? (paymentDate || now.slice(0, 10)) : paymentDate;

  db.prepare(`
    UPDATE driver_salary_records
    SET payment_status = ?, payment_date = ?, updated_at = ?
    WHERE id = ?
  `).run(paymentStatus, pDate || null, now, id);

  const rec = getSalaryById(id)!;
  enqueueSyncOperation('UPDATE', 'SALARIES', id, rec);
  return rec;
}

export function getSalaryById(id: string): DriverSalaryRecord | null {
  const db = getDb();
  const sql = `
    SELECT s.id, s.driver_id as driverId, d.name as driverName, d.salary_type as salaryType,
           s.salary_period as salaryPeriod, s.basic_salary as basicSalary,
           s.total_trips as totalTrips, s.trip_earnings as tripEarnings,
           s.allowances, s.deductions, s.advance, s.net_salary as netSalary,
           s.payment_date as paymentDate, s.payment_status as paymentStatus,
           s.payment_method as paymentMethod, s.payment_reference as paymentReference,
           s.paid_by as paidBy, s.finalized_at as finalizedAt, s.finalized_by as finalizedBy,
           s.notes, s.created_at as createdAt, s.updated_at as updatedAt
    FROM driver_salary_records s
    JOIN drivers d ON s.driver_id = d.id
    WHERE s.id = ?
  `;
  const res = db.prepare(sql).get(id) as DriverSalaryRecord | undefined;
  if (!res) return null;

  res.adjustments = getSalaryAdjustments(id);
  return res;
}

