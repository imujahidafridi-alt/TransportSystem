import { ipcMain } from 'electron';
import * as locationService from '../services/locationService';
import * as driverService from '../services/driverService';
import * as vehicleService from '../services/vehicleService';
import * as transportService from '../services/transportService';
import * as expenseService from '../services/expenseService';
import * as salaryService from '../services/salaryService';
import * as dashboardService from '../services/dashboardService';
import * as reportService from '../services/reportService';
import * as backupService from '../backup/backupService';
import * as syncQueue from '../sync/syncQueue';

export function registerIpcHandlers(): void {
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

  // Salaries
  ipcMain.handle('salaries:get-all', (_, driverId?: string) => salaryService.getAllSalaries(driverId));
  ipcMain.handle('salaries:create', (_, data) => salaryService.createSalaryRecord(data));
  ipcMain.handle('salaries:update-status', (_, { id, status, date }) => salaryService.updateSalaryStatus(id, status, date));

  // Dashboard & Reports
  ipcMain.handle('dashboard:summary', (_, { period, customStart, customEnd }) => dashboardService.getDashboardSummary(period, customStart, customEnd));
  ipcMain.handle('reports:transports', (_, filter) => reportService.getFilteredTransportsReport(filter));
  ipcMain.handle('reports:vehicle-profitability', (_, filter) => reportService.getVehicleProfitabilityReport(filter));

  // Backup & Sync
  ipcMain.handle('backup:create', () => backupService.createDatabaseBackup());
  ipcMain.handle('backup:list', () => backupService.listLocalBackups());
  ipcMain.handle('backup:restore', (_, filePath: string) => backupService.restoreDatabaseBackup(filePath));
  ipcMain.handle('backup:export', (_, filePath?: string) => backupService.exportBackupToCustomLocation(filePath));
  ipcMain.handle('backup:summary', () => backupService.getBackupStatusSummary());
  ipcMain.handle('sync:queue-status', () => syncQueue.getSyncQueueStatus());
}
