import { getDb } from '../database/db';
import { DriverSalaryRecord, SalaryPaymentStatus } from '../../shared/types';
import { cryptoRandomUUID } from '../utils/uuid';
import { enqueueSyncOperation } from '../sync/syncQueue';

export function calculateNetSalary(basic: number, allowances: number, deductions: number, advance: number): number {
  return Math.max(0, (basic || 0) + (allowances || 0) - (deductions || 0) - (advance || 0));
}

export function getAllSalaries(driverId?: string): DriverSalaryRecord[] {
  const db = getDb();
  let where = '';
  const params: string[] = [];
  if (driverId) {
    where = 'WHERE s.driver_id = ?';
    params.push(driverId);
  }
  const sql = `
    SELECT s.id, s.driver_id as driverId, d.name as driverName,
           s.salary_period as salaryPeriod, s.basic_salary as basicSalary,
           s.allowances, s.deductions, s.advance, s.net_salary as netSalary,
           s.payment_date as paymentDate, s.payment_status as paymentStatus,
           s.notes, s.created_at as createdAt, s.updated_at as updatedAt
    FROM driver_salary_records s
    JOIN drivers d ON s.driver_id = d.id
    ${where}
    ORDER BY s.salary_period DESC, s.created_at DESC
  `;
  return db.prepare(sql).all(...params) as DriverSalaryRecord[];
}

export function createSalaryRecord(data: Omit<DriverSalaryRecord, 'id' | 'netSalary' | 'createdAt' | 'updatedAt'>): DriverSalaryRecord {
  const db = getDb();
  const id = cryptoRandomUUID();
  const netSalary = calculateNetSalary(data.basicSalary, data.allowances, data.deductions, data.advance);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO driver_salary_records (
      id, driver_id, salary_period, basic_salary, allowances, deductions, advance, net_salary, payment_date, payment_status, notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    id,
    data.driverId,
    data.salaryPeriod,
    data.basicSalary || 0,
    data.allowances || 0,
    data.deductions || 0,
    data.advance || 0,
    netSalary,
    data.paymentDate || null,
    data.paymentStatus || 'PENDING',
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
    SELECT s.id, s.driver_id as driverId, d.name as driverName,
           s.salary_period as salaryPeriod, s.basic_salary as basicSalary,
           s.allowances, s.deductions, s.advance, s.net_salary as netSalary,
           s.payment_date as paymentDate, s.payment_status as paymentStatus,
           s.notes, s.created_at as createdAt, s.updated_at as updatedAt
    FROM driver_salary_records s
    JOIN drivers d ON s.driver_id = d.id
    WHERE s.id = ?
  `;
  const res = db.prepare(sql).get(id) as DriverSalaryRecord | undefined;
  return res || null;
}
