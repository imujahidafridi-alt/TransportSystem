import { app, BrowserWindow, ipcMain } from 'electron';
import * as locationService from '../services/locationService';
import * as driverService from '../services/driverService';
import * as vehicleService from '../services/vehicleService';
import * as transportService from '../services/transportService';
import * as expenseService from '../services/expenseService';
import * as salaryService from '../services/salaryService';
import * as dashboardService from '../services/dashboardService';
import * as reportService from '../services/reportService';
import * as tripCostService from '../services/tripCostService';
import * as securityService from '../services/securityService';
import * as backupService from '../backup/backupService';
import * as syncQueue from '../sync/syncQueue';
import { openPdfPreviewWindow } from '../pdf/pdfWindowService';
import { buildReportPdfHtml, buildDriverLedgerPdfHtml, buildPnlPdfHtml } from '../pdf/pdfTemplates';

export function registerIpcHandlers(): void {
  // System
  ipcMain.handle('system:relaunch', () => {
    app.relaunch();
    app.exit(0);
  });

  // Locations
  ipcMain.handle('locations:get-all', (_, search?: string) => locationService.getAllLocations(search));
  ipcMain.handle('locations:create', (_, data) => locationService.createLocation(data));
  ipcMain.handle('locations:update', (_, { id, data }) => locationService.updateLocation(id, data));

  // Drivers
  ipcMain.handle('drivers:get-all', (_, search?: string) => driverService.getAllDrivers(search));
  ipcMain.handle('drivers:create', (_, data) => driverService.createDriver(data));
  ipcMain.handle('drivers:update', (_, { id, data }) => driverService.updateDriver(id, data));

  // Vehicles
  ipcMain.handle('vehicles:get-all', (_, search?: string) => vehicleService.getAllVehicles(search));
  ipcMain.handle('vehicles:create', (_, data) => vehicleService.createVehicle(data));
  ipcMain.handle('vehicles:update', (_, { id, data }) => vehicleService.updateVehicle(id, data));

  // Transports
  ipcMain.handle('transports:get-all', (_, { search, limit, offset }) => transportService.getAllTransports(search, limit, offset));
  ipcMain.handle('transports:create', (_, data) => transportService.createTransport(data));
  ipcMain.handle('transports:update', (_, { id, data }) => transportService.updateTransport(id, data));
  ipcMain.handle('transports:cancel', (_, id: string) => transportService.cancelTransport(id));

  // Expenses, Fuel, Maintenance
  ipcMain.handle('expenses:get-all', (_, vehicleId?: string) => expenseService.getAllExpenses(vehicleId));
  ipcMain.handle('expenses:create', (_, data) => expenseService.createExpense(data));

  ipcMain.handle('fuel:get-all', (_, vehicleId?: string) => expenseService.getAllFuelRecords(vehicleId));
  ipcMain.handle('fuel:create', (_, data) => expenseService.createFuelRecord(data));

  ipcMain.handle('maintenance:get-all', (_, vehicleId?: string) => expenseService.getAllMaintenanceRecords(vehicleId));
  ipcMain.handle('maintenance:create', (_, data) => expenseService.createMaintenanceRecord(data));

  // Salaries & Batch Payroll Engine
  ipcMain.handle('salaries:get-all', (_, filter?: { period?: string; driverId?: string; status?: string }) =>
    salaryService.getAllSalaries(filter?.period, filter?.driverId, filter?.status)
  );
  ipcMain.handle('salaries:calculate-payroll', (_, { driverId, salaryPeriod }) =>
    salaryService.calculateDriverPayrollForPeriod(driverId, salaryPeriod)
  );
  ipcMain.handle('salaries:create', (_, data) => salaryService.createSalaryRecord(data));
  ipcMain.handle('salaries:update-status', (_, { id, status, date }) =>
    salaryService.updateSalaryStatus(id, status, date)
  );
  ipcMain.handle('salaries:generate-draft', (_, { period, ratePerTrip, createdBy }) =>
    salaryService.generatePayrollDraftForPeriod(period, ratePerTrip, createdBy)
  );
  ipcMain.handle('salaries:update-trip-rate', (_, { id, ratePerTrip }) =>
    salaryService.updateDriverTripRate(id, ratePerTrip)
  );
  ipcMain.handle('salaries:batch-update-trip-rate', (_, { period, ratePerTrip }) =>
    salaryService.batchUpdateTripRate(period, ratePerTrip)
  );
  ipcMain.handle('salaries:finalize', (_, { period, salaryRecordIds, finalizedBy }) =>
    salaryService.finalizePayrollForPeriod(period, salaryRecordIds, finalizedBy)
  );
  ipcMain.handle('salaries:mark-paid', (_, payload) =>
    salaryService.markSalariesPaid(payload)
  );
  ipcMain.handle('salaries:get-by-id', (_, id: string) => salaryService.getSalaryById(id));
  ipcMain.handle('salaries:get-adjustments', (_, salaryRecordId: string) =>
    salaryService.getSalaryAdjustments(salaryRecordId)
  );
  ipcMain.handle('salaries:add-adjustment', (_, data) => salaryService.addSalaryAdjustment(data));
  ipcMain.handle('salaries:delete-adjustment', (_, id: string) => salaryService.deleteSalaryAdjustment(id));
  ipcMain.handle('salaries:revert-status', (_, { id, targetStatus }) =>
    salaryService.revertSalaryStatus(id, targetStatus)
  );
  ipcMain.handle('salaries:delete', (_, id: string) => salaryService.deleteSalaryRecord(id));
  ipcMain.handle('salaries:reopen-period', (_, period: string) =>
    salaryService.reopenPayrollPeriod(period)
  );
  ipcMain.handle('salaries:master-summary', (_, period: string) =>
    salaryService.getMasterPayrollSummary(period)
  );

  // Dashboard & Reports
  ipcMain.handle('dashboard:summary', (_, { period, customStart, customEnd }) => dashboardService.getDashboardSummary(period, customStart, customEnd));
  ipcMain.handle('reports:transactions', (_, filter) => reportService.getTransactionReports(filter));
  ipcMain.handle('reports:drivers', (_, filter) => reportService.getDriverReports(filter));
  ipcMain.handle('reports:vehicle-expenses', (_, filter) => reportService.getVehicleExpenseReports(filter));
  ipcMain.handle('reports:pnl-statement', (_, filter) => reportService.getProfitAndLossStatement(filter));
  ipcMain.handle('reports:trip-profitability', (_, filter) => tripCostService.getTripProfitabilityReport(filter));

  // Per-Trip Direct Costs Linkage
  ipcMain.handle('tripCosts:get', (_, transportId: string) => tripCostService.getTripCostsByTransportId(transportId));
  ipcMain.handle('tripCosts:save', (_, payload) => tripCostService.saveTripCosts(payload));

  // Backup & Sync
  ipcMain.handle('backup:create', () => backupService.createDatabaseBackup());
  ipcMain.handle('backup:list', () => backupService.listLocalBackups());
  ipcMain.handle('backup:restore', async (event, filePath: string) => {
    const res = await backupService.restoreDatabaseBackup(filePath);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      setTimeout(() => {
        win.reload();
      }, 500);
    }
    return res;
  });
  ipcMain.handle('backup:export', (_, filePath?: string) => backupService.exportBackupToCustomLocation(filePath));
  ipcMain.handle('backup:summary', () => backupService.getBackupStatusSummary());
  ipcMain.handle('sync:queue-status', () => syncQueue.getSyncQueueStatus());

  // PDF Preview & Printing Service
  ipcMain.handle('pdf:open-report-preview', (_, { title, description, columns, data, kpis, orientation }) => {
    const resolvedOrientation: 'portrait' | 'landscape' =
      orientation || (columns && columns.length >= 6 ? 'landscape' : 'portrait');
    const html = buildReportPdfHtml(title, description, columns, data, kpis, resolvedOrientation);
    openPdfPreviewWindow(title, html, resolvedOrientation);
  });

  ipcMain.handle('pdf:open-driver-ledger-preview', (_, data) => {
    const html = buildDriverLedgerPdfHtml(
      data.driverName,
      data.period,
      data.basicSalary,
      data.completedTripsCount,
      data.totalTripCommission,
      data.allowances,
      data.deductions,
      data.advance,
      data.netSalary,
      data.paymentStatus,
      data.trips
    );
    openPdfPreviewWindow(`Driver Ledger - ${data.driverName} (${data.period})`, html);
  });

  ipcMain.handle('pdf:open-pnl-preview', (_, pnl) => {
    const html = buildPnlPdfHtml(pnl);
    openPdfPreviewWindow(`Profit & Loss Statement - ${pnl.periodLabel}`, html);
  });

  // Enterprise Security & Lockscreen PIN
  ipcMain.handle('security:get-status', () => securityService.getSecurityStatus());
  ipcMain.handle('security:verify-pin', (_, pin: string) => securityService.verifyPin(pin));
  ipcMain.handle('security:set-pin', (_, pin: string) => securityService.setPin(pin));
  ipcMain.handle('security:change-pin', (_, { currentPin, newPin }) =>
    securityService.changePin(currentPin, newPin)
  );
  ipcMain.handle('security:disable-pin', (_, pin: string) => securityService.disablePin(pin));
  ipcMain.handle('security:update-settings', (_, { autoLockMinutes }) =>
    securityService.updateSecuritySettings(autoLockMinutes)
  );
}
