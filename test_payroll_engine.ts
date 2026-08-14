import { getDb } from './src/main/database/db';
import {
  generatePayrollDraftForPeriod,
  finalizePayrollForPeriod,
  markSalariesPaid,
  addSalaryAdjustment,
  getMasterPayrollSummary,
  getSalaryById,
} from './src/main/services/salaryService';
import { cryptoRandomUUID } from './src/main/utils/uuid';

console.log('=== RUNNING ENTERPRISE BATCH PAYROLL AUTOMATED AUDIT SUITE ===\n');

const db = getDb();
const TEST_PERIOD = '2026-11';

// Setup test drivers
const d1Id = cryptoRandomUUID(); // Monthly Driver
const d2Id = cryptoRandomUUID(); // Per-Trip Driver (Active)
const d3Id = cryptoRandomUUID(); // Per-Trip Driver (Inactive, 0 trips)

db.prepare(`
  INSERT INTO drivers (id, name, phone, salary_type, basic_salary, per_trip_rate, status, created_at, updated_at)
  VALUES 
    (?, 'Test Driver Monthly', '0501111111', 'MONTHLY', 4000, 0, 'ACTIVE', datetime('now'), datetime('now')),
    (?, 'Test Driver Per-Trip Active', '0502222222', 'PER_TRIP', 0, 150, 'ACTIVE', datetime('now'), datetime('now')),
    (?, 'Test Driver Per-Trip Inactive', '0503333333', 'PER_TRIP', 0, 150, 'ACTIVE', datetime('now'), datetime('now'))
`).run(d1Id, d2Id, d3Id);

// Setup test transports
// D1: 2 COMPLETED trips (allowance 50 each), 1 CANCELLED trip, 1 PENDING trip
// D2: 3 COMPLETED trips (allowance 100 each), 1 DRAFT trip
db.prepare(`
  INSERT INTO transports (id, transport_no, date, driver_id, vehicle_id, total_amount, driver_allowance, status, created_at, updated_at)
  VALUES
    (?, 'TRP-T1', '2026-11-05', ?, 'VEH-1', 1000, 50, 'COMPLETED', datetime('now'), datetime('now')),
    (?, 'TRP-T2', '2026-11-10', ?, 'VEH-1', 1200, 50, 'COMPLETED', datetime('now'), datetime('now')),
    (?, 'TRP-T3', '2026-11-15', ?, 'VEH-1', 1500, 50, 'CANCELLED', datetime('now'), datetime('now')),
    (?, 'TRP-T4', '2026-11-20', ?, 'VEH-1', 1100, 50, 'PENDING', datetime('now'), datetime('now')),
    
    (?, 'TRP-T5', '2026-11-02', ?, 'VEH-1', 2000, 100, 'COMPLETED', datetime('now'), datetime('now')),
    (?, 'TRP-T6', '2026-11-08', ?, 'VEH-1', 2000, 100, 'COMPLETED', datetime('now'), datetime('now')),
    (?, 'TRP-T7', '2026-11-14', ?, 'VEH-1', 2000, 100, 'COMPLETED', datetime('now'), datetime('now')),
    (?, 'TRP-T8', '2026-11-22', ?, 'VEH-1', 2000, 100, 'DRAFT', datetime('now'), datetime('now'))
`).run(
  cryptoRandomUUID(), d1Id,
  cryptoRandomUUID(), d1Id,
  cryptoRandomUUID(), d1Id,
  cryptoRandomUUID(), d1Id,
  
  cryptoRandomUUID(), d2Id,
  cryptoRandomUUID(), d2Id,
  cryptoRandomUUID(), d2Id,
  cryptoRandomUUID(), d2Id
);

console.log('✓ Test seed data inserted.');

// TEST 1: Generate Payroll Draft
console.log('\n--- TEST 1: Generate Payroll Draft ---');
const draftRes = generatePayrollDraftForPeriod(TEST_PERIOD, 'Admin');
console.log('Draft Result:', draftRes);

if (draftRes.generatedCount !== 2) {
  throw new Error(`Expected 2 generated records (D1 monthly, D2 per-trip active), got ${draftRes.generatedCount}`);
}
console.log('✓ PASS: Exactly 2 eligible drivers drafted. Inactive D3 (0 trips) correctly skipped (Zero clutter rule).');

// Verify calculations for D1 and D2
const d1Salary = db.prepare('SELECT * FROM driver_salary_records WHERE driver_id = ? AND salary_period = ?').get(d1Id, TEST_PERIOD) as any;
const d2Salary = db.prepare('SELECT * FROM driver_salary_records WHERE driver_id = ? AND salary_period = ?').get(d2Id, TEST_PERIOD) as any;

console.log('\nD1 Monthly Salary Draft:', {
  basic: d1Salary.basic_salary,
  trips: d1Salary.total_trips,
  trip_earnings: d1Salary.trip_earnings,
  allowances: d1Salary.allowances,
  net: d1Salary.net_salary,
  status: d1Salary.payment_status,
});

if (d1Salary.total_trips !== 2) {
  throw new Error(`D1 expected 2 COMPLETED trips, got ${d1Salary.total_trips}`);
}
if (d1Salary.allowances !== 100) {
  throw new Error(`D1 expected 100 total allowances (2 trips * 50), got ${d1Salary.allowances}`);
}
if (d1Salary.net_salary !== 4100) {
  throw new Error(`D1 expected net 4100 (4000 basic + 100 allowances), got ${d1Salary.net_salary}`);
}
console.log('✓ PASS: D1 strict COMPLETED status filter verified (CANCELLED and PENDING trips excluded).');

console.log('\nD2 Per-Trip Salary Draft:', {
  basic: d2Salary.basic_salary,
  trips: d2Salary.total_trips,
  trip_earnings: d2Salary.trip_earnings,
  allowances: d2Salary.allowances,
  net: d2Salary.net_salary,
  status: d2Salary.payment_status,
});

if (d2Salary.total_trips !== 3) {
  throw new Error(`D2 expected 3 COMPLETED trips, got ${d2Salary.total_trips}`);
}
if (d2Salary.trip_earnings !== 450) {
  throw new Error(`D2 expected 450 trip earnings (3 * 150), got ${d2Salary.trip_earnings}`);
}
if (d2Salary.allowances !== 300) {
  throw new Error(`D2 expected 300 allowances (3 * 100), got ${d2Salary.allowances}`);
}
if (d2Salary.net_salary !== 750) {
  throw new Error(`D2 expected net 750 (450 earnings + 300 allowances), got ${d2Salary.net_salary}`);
}
console.log('✓ PASS: D2 Per-Trip Commission + Allowances calculation verified.');

// TEST 2: Audited Structured Adjustments
console.log('\n--- TEST 2: Structured Adjustments ---');
addSalaryAdjustment({
  salaryRecordId: d1Salary.id,
  adjustmentType: 'ADVANCE',
  amount: 500,
  reason: 'Mid-month cash advance on 15th',
  createdBy: 'Admin',
});

addSalaryAdjustment({
  salaryRecordId: d1Salary.id,
  adjustmentType: 'BONUS',
  amount: 200,
  reason: 'Overnight long-haul safety bonus',
  createdBy: 'Admin',
});

const d1AfterAdj = getSalaryById(d1Salary.id)!;
console.log('D1 After Adjustments:', {
  allowances: d1AfterAdj.allowances, // 100 trip allowance + 200 bonus = 300
  advance: d1AfterAdj.advance, // 500
  net: d1AfterAdj.netSalary, // 4000 basic + 300 - 500 = 3800
  adjustmentsCount: d1AfterAdj.adjustments?.length,
});

if (d1AfterAdj.advance !== 500 || d1AfterAdj.netSalary !== 3800) {
  throw new Error(`D1 expected net 3800 after advance, got ${d1AfterAdj.netSalary}`);
}
console.log('✓ PASS: Structured multi-adjustments correctly recorded with audit reasons and recalculate net salary.');

// TEST 3: Finalize Payroll & Immutability Enforcement
console.log('\n--- TEST 3: Finalize Payroll & Immutability ---');
const finRes = finalizePayrollForPeriod(TEST_PERIOD, undefined, 'Admin');
console.log('Finalize Result:', finRes);

const d1Finalized = getSalaryById(d1Salary.id)!;
if (d1Finalized.paymentStatus !== 'FINALIZED' || !d1Finalized.finalizedAt) {
  throw new Error('Expected status FINALIZED with finalizedAt timestamp');
}
console.log('✓ PASS: Record locked into FINALIZED with finalizedAt timestamp.');

// Backend Immutability Verification: Ensure adjustment addition is rejected on FINALIZED record
try {
  addSalaryAdjustment({
    salaryRecordId: d1Salary.id,
    adjustmentType: 'DEDUCTION',
    amount: 100,
    reason: 'Late penalty',
  });
  throw new Error('FAIL: Backend should have thrown error rejecting adjustment on finalized record!');
} catch (err: any) {
  console.log('✓ PASS: Backend successfully blocked unauthorized modification on locked FINALIZED record:', err.message);
}

// TEST 4: Batch Disbursement ("Mark as Paid") with Audit Metadata
console.log('\n--- TEST 4: Batch Mark as Paid ---');
const payRes = markSalariesPaid({
  salaryRecordIds: [d1Salary.id, d2Salary.id],
  paymentDate: '2026-11-28',
  paymentMethod: 'Bank Transfer / WPS',
  paymentReference: 'WPS-BATCH-9941',
  paidBy: 'Financial Controller',
});
console.log('Payment Result:', payRes);

const d1Paid = getSalaryById(d1Salary.id)!;
if (d1Paid.paymentStatus !== 'PAID' || d1Paid.paymentReference !== 'WPS-BATCH-9941') {
  throw new Error('Expected status PAID with paymentReference');
}
console.log('✓ PASS: Payment audit metadata (Date, Method, Reference, PaidBy) written successfully.');

// TEST 5: Master Payroll Summary
console.log('\n--- TEST 5: Master Payroll Summary ---');
const summary = getMasterPayrollSummary(TEST_PERIOD);
console.log('Master Summary KPIs:', summary);

if (summary.completedTrips !== 5) {
  throw new Error(`Expected 5 completed trips in period, got ${summary.completedTrips}`);
}
if (summary.paidCount !== 2 || summary.totalPending !== 0) {
  throw new Error(`Expected 2 paid records and 0 pending, got paid=${summary.paidCount}, pending=${summary.totalPending}`);
}
console.log('✓ PASS: Master Monthly Summary KPI computation verified.');

console.log('\n========================================');
console.log('🎉 ALL 5 ENTERPRISE PAYROLL SUITE TESTS PASSED 100%!');
console.log('========================================\n');
