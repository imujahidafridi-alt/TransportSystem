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
 */
export function calculateDriverPayrollForPeriod(
  driverId: string,
  salaryPeriod: string
): {
  basicSalary: number;
  completedTrips: number;
  ratePerTrip: number;
  tripEarnings: number;
  allowances: number;
  suggestedNet: number;
} {
  const db = getDb();
  const driver = db
    .prepare('SELECT basic_salary, salary_type, per_trip_rate FROM drivers WHERE id = ?')
    .get(driverId) as any;

  if (!driver) {
    return { basicSalary: 0, completedTrips: 0, ratePerTrip: 0, tripEarnings: 0, allowances: 0, suggestedNet: 0 };
  }

  const { start, nextMonthStart } = getPeriodHalfOpenRange(salaryPeriod);

  const tripRow = db
    .prepare(`
      SELECT COUNT(*) as trips
      FROM transports 
      WHERE driver_id = ? 
        AND date >= ? 
        AND date < ? 
        AND status != 'CANCELLED'
    `)
    .get(driverId, start, nextMonthStart) as { trips: number };

  const completedTrips = tripRow?.trips || 0;
  const basicSalary = Number(driver.basic_salary || 0);

  // Check if an existing salary record has a decided rate for this month
  const existingRecord = db
    .prepare('SELECT rate_per_trip, trip_earnings FROM driver_salary_records WHERE driver_id = ? AND salary_period = ?')
    .get(driverId, salaryPeriod) as { rate_per_trip: number; trip_earnings: number } | undefined;

  const ratePerTrip = existingRecord ? Number(existingRecord.rate_per_trip || 0) : Number(driver.per_trip_rate || 0);
  const tripEarnings = completedTrips * ratePerTrip;
  const suggestedNet = basicSalary + tripEarnings;

  return { basicSalary, completedTrips, ratePerTrip, tripEarnings, allowances: 0, suggestedNet };
}

/**
 * Batch generates/refreshes payroll draft for all eligible active drivers for a period.
 * Rate per trip is decided at month end.
 */
export function generatePayrollDraftForPeriod(
  salaryPeriod: string,
  defaultRatePerTrip?: number,
  createdBy?: string
): { generatedCount: number; skippedFinalizedCount: number; totalEligible: number } {
  const db = getDb();
  const { start, nextMonthStart } = getPeriodHalfOpenRange(salaryPeriod);

  // 1. Single grouped aggregate query for all active transports in the period (No N+1)
  const transportAggregates = db
    .prepare(`
      SELECT 
        driver_id,
        COUNT(*) as completed_trips
      FROM transports
      WHERE status != 'CANCELLED'
        AND date >= ? 
        AND date < ?
      GROUP BY driver_id
    `)
    .all(start, nextMonthStart) as Array<{
    driver_id: string;
    completed_trips: number;
  }>;

  const transportMap = new Map<string, number>();
  for (const row of transportAggregates) {
    transportMap.set(row.driver_id, Number(row.completed_trips || 0));
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
    const completedTrips = transportMap.get(driver.id) || 0;
    const basicSalary = Number(driver.basic_salary || 0);

    const isEligible =
      driver.salary_type === 'MONTHLY' ||
      completedTrips > 0 ||
      basicSalary > 0;

    if (!isEligible) {
      continue;
    }

    totalEligible++;

    // Check if a record already exists for this driver and period
    const existing = db
      .prepare('SELECT id, payment_status, rate_per_trip, deductions, advance, allowances FROM driver_salary_records WHERE driver_id = ? AND salary_period = ?')
      .get(driver.id, salaryPeriod) as {
      id: string;
      payment_status: SalaryPaymentStatus;
      rate_per_trip: number;
      deductions: number;
      advance: number;
      allowances: number;
    } | undefined;

    // Rate is either explicitly passed, or preserved from existing draft, or driver default
    const tripRate = defaultRatePerTrip !== undefined
      ? Number(defaultRatePerTrip)
      : (existing && existing.rate_per_trip !== undefined ? Number(existing.rate_per_trip) : (Number(driver.per_trip_rate) || 0));

    const tripEarnings = completedTrips * tripRate;

    if (existing) {
      // Backend Immutability Rule: If FINALIZED or PAID, do not overwrite historical snapshot!
      if (existing.payment_status === 'FINALIZED' || existing.payment_status === 'PAID') {
        skippedFinalizedCount++;
        continue;
      }

      const netSalary = calculateNetSalary(
        basicSalary,
        tripEarnings,
        existing.allowances || 0,
        existing.deductions || 0,
        existing.advance || 0
      );

      db.prepare(`
        UPDATE driver_salary_records
        SET basic_salary = ?, total_trips = ?, rate_per_trip = ?, trip_earnings = ?, allowances = ?,
            net_salary = ?, updated_at = ?
        WHERE id = ?
      `).run(
        basicSalary,
        completedTrips,
        tripRate,
        tripEarnings,
        existing.allowances || 0,
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
        0,
        0,
        0
      );

      db.prepare(`
        INSERT INTO driver_salary_records (
          id, driver_id, salary_period, basic_salary, total_trips, rate_per_trip, trip_earnings,
          allowances, deductions, advance, net_salary, payment_status, notes, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 'DRAFT', ?, ?, ?
        )
      `).run(
        id,
        driver.id,
        salaryPeriod,
        basicSalary,
        completedTrips,
        tripRate,
        tripEarnings,
        netSalary,
        createdBy ? `Draft generated by ${createdBy}` : null,
        now,
        now
      );

      generatedCount++;
    }
  }

  return { generatedCount, skippedFinalizedCount, totalEligible };
}

/**
 * Updates the decided per-trip rate for an individual driver for their specific monthly draft.
 */
export function updateDriverTripRate(salaryRecordId: string, ratePerTrip: number): DriverSalaryRecord {
  const db = getDb();
  const salary = getSalaryById(salaryRecordId);
  if (!salary) throw new Error('Salary record not found.');
  if (salary.paymentStatus === 'FINALIZED' || salary.paymentStatus === 'PAID') {
    throw new Error(`Cannot modify ${salary.paymentStatus} salary record.`);
  }

  const rate = Math.max(0, Number(ratePerTrip) || 0);
  const { start, nextMonthStart } = getPeriodHalfOpenRange(salary.salaryPeriod);

  // Always query fresh completed trips count from transports
  const tripRow = db
    .prepare("SELECT COUNT(*) as trips FROM transports WHERE driver_id = ? AND date >= ? AND date < ? AND status != 'CANCELLED'")
    .get(salary.driverId, start, nextMonthStart) as { trips: number } | undefined;

  const totalTrips = tripRow?.trips ?? salary.totalTrips ?? 0;
  const tripEarnings = totalTrips * rate;
  const netSalary = calculateNetSalary(
    salary.basicSalary,
    tripEarnings,
    salary.allowances,
    salary.deductions,
    salary.advance
  );
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE driver_salary_records
    SET total_trips = ?, rate_per_trip = ?, trip_earnings = ?, net_salary = ?, updated_at = ?
    WHERE id = ?
  `).run(totalTrips, rate, tripEarnings, netSalary, now, salaryRecordId);

  return getSalaryById(salaryRecordId)!;
}

/**
 * Batch updates all DRAFT salary records for a month with a uniform decided rate per trip.
 */
export function batchUpdateTripRate(salaryPeriod: string, ratePerTrip: number): { updatedCount: number } {
  const db = getDb();
  const rate = Math.max(0, Number(ratePerTrip) || 0);
  const now = new Date().toISOString();
  const { start, nextMonthStart } = getPeriodHalfOpenRange(salaryPeriod);

  // Query actual completed trips from transports table
  const transportAggregates = db
    .prepare(`
      SELECT 
        driver_id,
        COUNT(*) as completed_trips
      FROM transports
      WHERE status != 'CANCELLED'
        AND date >= ? 
        AND date < ?
      GROUP BY driver_id
    `)
    .all(start, nextMonthStart) as Array<{
    driver_id: string;
    completed_trips: number;
  }>;

  const transportMap = new Map<string, number>();
  for (const row of transportAggregates) {
    transportMap.set(row.driver_id, Number(row.completed_trips || 0));
  }

  const draftRecords = db
    .prepare("SELECT id, driver_id, basic_salary, total_trips, allowances, deductions, advance FROM driver_salary_records WHERE salary_period = ? AND payment_status = 'DRAFT'")
    .all(salaryPeriod) as Array<{
      id: string;
      driver_id: string;
      basic_salary: number;
      total_trips: number;
      allowances: number;
      deductions: number;
      advance: number;
    }>;

  let updatedCount = 0;
  const updateStmt = db.prepare(`
    UPDATE driver_salary_records
    SET total_trips = ?, rate_per_trip = ?, trip_earnings = ?, net_salary = ?, updated_at = ?
    WHERE id = ?
  `);

  for (const s of draftRecords) {
    const actualTrips = transportMap.get(s.driver_id) ?? s.total_trips ?? 0;
    const tripEarnings = actualTrips * rate;
    const netSalary = calculateNetSalary(s.basic_salary, tripEarnings, s.allowances, s.deductions, s.advance);
    updateStmt.run(actualTrips, rate, tripEarnings, netSalary, now, s.id);
    updatedCount++;
  }

  return { updatedCount };
}

/**
 * Locks all DRAFT records for a period into FINALIZED historical snapshots.
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

  // Queue sync operation
  enqueueSyncOperation('UPDATE', 'driver_salary_records', salaryPeriod, {
    action: 'FINALIZE_PAYROLL',
    salaryPeriod,
    finalizedBy,
    finalizedAt: now,
  });

  return { finalizedCount: result.changes };
}

/**
 * Transitions FINALIZED or DRAFT records to PAID with audit disbursement metadata.
 */
export function markSalariesPaid(payload: {
  salaryRecordIds: string[];
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  paidBy: string;
}): { updatedCount: number } {
  const db = getDb();
  const { salaryRecordIds, paymentDate, paymentMethod, paymentReference, paidBy } = payload;

  if (!salaryRecordIds || salaryRecordIds.length === 0) {
    return { updatedCount: 0 };
  }

  const now = new Date().toISOString();
  const placeholders = salaryRecordIds.map(() => '?').join(',');

  const stmt = db.prepare(`
    UPDATE driver_salary_records
    SET payment_status = 'PAID',
        payment_date = ?,
        payment_method = ?,
        payment_reference = ?,
        paid_by = ?,
        updated_at = ?
    WHERE id IN (${placeholders})
  `);

  const result = stmt.run(
    paymentDate,
    paymentMethod,
    paymentReference || null,
    paidBy,
    now,
    ...salaryRecordIds
  );

  // Queue sync
  for (const id of salaryRecordIds) {
    enqueueSyncOperation('UPDATE', 'driver_salary_records', id, {
      paymentStatus: 'PAID',
      paymentDate,
      paymentMethod,
      paymentReference,
      paidBy,
      updatedAt: now,
    });
  }

  return { updatedCount: result.changes };
}

/**
 * Adds an audited adjustment record (Bonus, Deduction, Cash Advance).
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
  if (!salary) throw new Error('Salary record not found.');

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

  const netSalary = calculateNetSalary(
    salary.basic_salary,
    salary.trip_earnings,
    bonusTotal,
    deductionTotal,
    advanceTotal
  );

  db.prepare(`
    UPDATE driver_salary_records
    SET allowances = ?, deductions = ?, advance = ?, net_salary = ?, updated_at = ?
    WHERE id = ?
  `).run(bonusTotal, deductionTotal, advanceTotal, netSalary, new Date().toISOString(), salaryRecordId);
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
    .prepare("SELECT COUNT(*) as trips, COUNT(DISTINCT driver_id) as working_drivers FROM transports WHERE date >= ? AND date < ? AND status != 'CANCELLED'")
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
           s.total_trips as totalTrips, s.rate_per_trip as ratePerTrip, s.rate_per_trip as perTripRate,
           s.trip_earnings as tripEarnings,
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

  // Self-heal and sync live trip counts for DRAFT records
  if (salaryPeriod) {
    const { start, nextMonthStart } = getPeriodHalfOpenRange(salaryPeriod);
    const transportAggregates = db
      .prepare(`
        SELECT driver_id, COUNT(*) as completed_trips
        FROM transports
        WHERE status != 'CANCELLED'
          AND date >= ? 
          AND date < ?
        GROUP BY driver_id
      `)
      .all(start, nextMonthStart) as Array<{ driver_id: string; completed_trips: number }>;

    const transportMap = new Map<string, number>();
    for (const row of transportAggregates) {
      transportMap.set(row.driver_id, Number(row.completed_trips || 0));
    }

    const updateStmt = db.prepare(`
      UPDATE driver_salary_records
      SET total_trips = ?, trip_earnings = ?, net_salary = ?, updated_at = ?
      WHERE id = ?
    `);

    const now = new Date().toISOString();

    for (const rec of records) {
      if (rec.paymentStatus === 'DRAFT') {
        const actualTrips = transportMap.get(rec.driverId) || 0;
        const rate = Number(rec.ratePerTrip || 0);

        // If trip count is out of sync or trips > 0 with calculated earnings:
        if (rec.totalTrips !== actualTrips || (actualTrips > 0 && rec.tripEarnings !== actualTrips * rate)) {
          rec.totalTrips = actualTrips;
          rec.tripEarnings = actualTrips * rate;
          rec.netSalary = calculateNetSalary(rec.basicSalary, rec.tripEarnings, rec.allowances, rec.deductions, rec.advance);
          updateStmt.run(actualTrips, rec.tripEarnings, rec.netSalary, now, rec.id);
        }
      }
    }
  }

  // Populate audited adjustments for all records
  const adjStmt = db.prepare(`
    SELECT id, salary_record_id as salaryRecordId, adjustment_type as adjustmentType,
           amount, reason, created_at as createdAt, created_by as createdBy
    FROM driver_salary_adjustments
    WHERE salary_record_id = ?
    ORDER BY created_at ASC
  `);

  for (const rec of records) {
    rec.adjustments = adjStmt.all(rec.id) as DriverSalaryAdjustment[];
  }

  return records;
}

export function createSalaryRecord(data: Omit<DriverSalaryRecord, 'id' | 'netSalary' | 'createdAt' | 'updatedAt'>): DriverSalaryRecord {
  const db = getDb();
  const { start, nextMonthStart } = getPeriodHalfOpenRange(data.salaryPeriod);

  // If totalTrips is 0 or not passed, count from transports
  let totalTrips = data.totalTrips || 0;
  if (totalTrips === 0) {
    const tripRow = db
      .prepare("SELECT COUNT(*) as trips FROM transports WHERE driver_id = ? AND date >= ? AND date < ? AND status != 'CANCELLED'")
      .get(data.driverId, start, nextMonthStart) as { trips: number } | undefined;
    totalTrips = tripRow?.trips || 0;
  }

  const ratePerTrip = Number(data.ratePerTrip !== undefined ? data.ratePerTrip : (data.perTripRate || 0));
  const tripEarnings = data.tripEarnings !== undefined ? Number(data.tripEarnings) : totalTrips * ratePerTrip;
  const netSalary = calculateNetSalary(data.basicSalary, tripEarnings, data.allowances, data.deductions, data.advance);
  const now = new Date().toISOString();

  // Check if salary record already exists for this driver and period
  const existing = db.prepare('SELECT id, payment_status FROM driver_salary_records WHERE driver_id = ? AND salary_period = ?').get(data.driverId, data.salaryPeriod) as { id: string; payment_status: SalaryPaymentStatus } | undefined;

  if (existing) {
    const updatedStatus = data.paymentStatus || existing.payment_status || 'DRAFT';
    db.prepare(`
      UPDATE driver_salary_records
      SET basic_salary = ?, total_trips = ?, rate_per_trip = ?, trip_earnings = ?, allowances = ?, deductions = ?, advance = ?,
          net_salary = ?, payment_date = ?, payment_status = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      data.basicSalary || 0,
      totalTrips,
      ratePerTrip,
      tripEarnings,
      data.allowances || 0,
      data.deductions || 0,
      data.advance || 0,
      netSalary,
      data.paymentDate || null,
      updatedStatus,
      data.notes || null,
      now,
      existing.id
    );

    syncManualEntryAdjustments(db, existing.id, data.allowances || 0, data.deductions || 0, data.advance || 0, now);
    return getSalaryById(existing.id)!;
  }

  const id = cryptoRandomUUID();
  db.prepare(`
    INSERT INTO driver_salary_records (
      id, driver_id, salary_period, basic_salary, total_trips, rate_per_trip, trip_earnings,
      allowances, deductions, advance, net_salary, payment_date, payment_status,
      payment_method, payment_reference, paid_by, notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `).run(
    id,
    data.driverId,
    data.salaryPeriod,
    data.basicSalary || 0,
    totalTrips,
    ratePerTrip,
    tripEarnings,
    data.allowances || 0,
    data.deductions || 0,
    data.advance || 0,
    netSalary,
    data.paymentDate || null,
    data.paymentStatus || 'DRAFT',
    data.paymentMethod || null,
    data.paymentReference || null,
    data.paidBy || null,
    data.notes || null,
    now,
    now
  );

  syncManualEntryAdjustments(db, id, data.allowances || 0, data.deductions || 0, data.advance || 0, now);
  return getSalaryById(id)!;
}

/**
 * Synchronizes manual entry allowances/deductions/advances with driver_salary_adjustments table.
 */
function syncManualEntryAdjustments(
  db: any,
  salaryRecordId: string,
  allowances: number,
  deductions: number,
  advance: number,
  now: string
) {
  const existingAdjustments = db
    .prepare('SELECT id, adjustment_type, amount, reason, created_by FROM driver_salary_adjustments WHERE salary_record_id = ?')
    .all(salaryRecordId) as Array<{ id: string; adjustment_type: string; amount: number; reason: string; created_by: string }>;

  const syncType = (type: 'BONUS' | 'DEDUCTION' | 'ADVANCE', targetAmount: number, defaultReason: string) => {
    const matching = existingAdjustments.filter((a) => a.adjustment_type === type);
    const currentSum = matching.reduce((acc, a) => acc + a.amount, 0);

    if (targetAmount > 0) {
      if (matching.length === 0) {
        const id = cryptoRandomUUID();
        db.prepare(`
          INSERT INTO driver_salary_adjustments (id, salary_record_id, adjustment_type, amount, reason, created_at, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, salaryRecordId, type, targetAmount, defaultReason, now, 'Manual Entry');
      } else if (matching.length === 1 && currentSum !== targetAmount) {
        db.prepare('UPDATE driver_salary_adjustments SET amount = ? WHERE id = ?').run(targetAmount, matching[0].id);
      } else if (currentSum !== targetAmount) {
        const delta = targetAmount - currentSum;
        if (delta > 0) {
          const id = cryptoRandomUUID();
          db.prepare(`
            INSERT INTO driver_salary_adjustments (id, salary_record_id, adjustment_type, amount, reason, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(id, salaryRecordId, type, delta, `${defaultReason} (Adjustment)`, now, 'Manual Entry');
        }
      }
    } else if (targetAmount === 0 && matching.length > 0) {
      db.prepare("DELETE FROM driver_salary_adjustments WHERE salary_record_id = ? AND adjustment_type = ? AND created_by = 'Manual Entry'").run(salaryRecordId, type);
    }
  };

  syncType('BONUS', Number(allowances || 0), 'Manual Entry Bonus');
  syncType('DEDUCTION', Number(deductions || 0), 'Manual Entry Deduction');
  syncType('ADVANCE', Number(advance || 0), 'Manual Entry Cash Advance');
}

export function updateSalaryStatus(
  id: string,
  paymentStatus: string,
  paymentDate?: string
): DriverSalaryRecord {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE driver_salary_records
    SET payment_status = ?, payment_date = ?, updated_at = ?
    WHERE id = ?
  `).run(paymentStatus, paymentDate || null, now, id);

  return getSalaryById(id)!;
}

export function revertSalaryStatus(
  id: string,
  targetStatus: 'DRAFT' | 'FINALIZED'
): DriverSalaryRecord {
  const db = getDb();
  const now = new Date().toISOString();

  if (targetStatus === 'DRAFT') {
    db.prepare(`
      UPDATE driver_salary_records
      SET payment_status = 'DRAFT',
          finalized_at = NULL,
          finalized_by = NULL,
          payment_date = NULL,
          payment_method = NULL,
          payment_reference = NULL,
          paid_by = NULL,
          updated_at = ?
      WHERE id = ?
    `).run(now, id);
  } else {
    db.prepare(`
      UPDATE driver_salary_records
      SET payment_status = 'FINALIZED',
          payment_date = NULL,
          payment_method = NULL,
          payment_reference = NULL,
          paid_by = NULL,
          updated_at = ?
      WHERE id = ?
    `).run(now, id);
  }

  return getSalaryById(id)!;
}

export function deleteSalaryRecord(id: string): { success: boolean } {
  const db = getDb();
  db.prepare('DELETE FROM driver_salary_adjustments WHERE salary_record_id = ?').run(id);
  db.prepare('DELETE FROM driver_salary_records WHERE id = ?').run(id);
  return { success: true };
}

export function reopenPayrollPeriod(salaryPeriod: string): { updatedCount: number } {
  const db = getDb();
  const now = new Date().toISOString();
  const res = db.prepare(`
    UPDATE driver_salary_records
    SET payment_status = 'DRAFT',
        finalized_at = NULL,
        finalized_by = NULL,
        updated_at = ?
    WHERE salary_period = ? AND payment_status = 'FINALIZED'
  `).run(now, salaryPeriod);

  return { updatedCount: res.changes };
}

export function getSalaryById(id: string): DriverSalaryRecord | undefined {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT s.id, s.driver_id as driverId, d.name as driverName, d.salary_type as salaryType,
             s.salary_period as salaryPeriod, s.basic_salary as basicSalary,
             s.total_trips as totalTrips, s.rate_per_trip as ratePerTrip, s.rate_per_trip as perTripRate,
             s.trip_earnings as tripEarnings,
             s.allowances, s.deductions, s.advance, s.net_salary as netSalary,
             s.payment_date as paymentDate, s.payment_status as paymentStatus,
             s.payment_method as paymentMethod, s.payment_reference as paymentReference,
             s.paid_by as paidBy, s.finalized_at as finalizedAt, s.finalized_by as finalizedBy,
             s.notes, s.created_at as createdAt, s.updated_at as updatedAt
      FROM driver_salary_records s
      JOIN drivers d ON s.driver_id = d.id
      WHERE s.id = ?
    `)
    .get(id) as DriverSalaryRecord | undefined;

  if (row) {
    row.adjustments = getSalaryAdjustments(id);
  }
  return row;
}
