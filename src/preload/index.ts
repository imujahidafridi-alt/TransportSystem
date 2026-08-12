import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Locations
  getLocations: (search?: string) => ipcRenderer.invoke('locations:get-all', search),
  createLocation: (data: any) => ipcRenderer.invoke('locations:create', data),
  updateLocation: (id: string, data: any) => ipcRenderer.invoke('locations:update', { id, data }),

  // Drivers
  getDrivers: (search?: string) => ipcRenderer.invoke('drivers:get-all', search),
  createDriver: (data: any) => ipcRenderer.invoke('drivers:create', data),
  updateDriver: (id: string, data: any) => ipcRenderer.invoke('drivers:update', { id, data }),

  // Vehicles
  getVehicles: (search?: string) => ipcRenderer.invoke('vehicles:get-all', search),
  createVehicle: (data: any) => ipcRenderer.invoke('vehicles:create', data),
  updateVehicle: (id: string, data: any) => ipcRenderer.invoke('vehicles:update', { id, data }),

  // Transports
  getTransports: (params: { search?: string; limit?: number; offset?: number } = {}) => ipcRenderer.invoke('transports:get-all', params),
  createTransport: (data: any) => ipcRenderer.invoke('transports:create', data),
  updateTransport: (id: string, data: any) => ipcRenderer.invoke('transports:update', { id, data }),
  cancelTransport: (id: string) => ipcRenderer.invoke('transports:cancel', id),

  // Expenses, Fuel, Maintenance
  getExpenses: (vehicleId?: string) => ipcRenderer.invoke('expenses:get-all', vehicleId),
  createExpense: (data: any) => ipcRenderer.invoke('expenses:create', data),

  getFuelRecords: (vehicleId?: string) => ipcRenderer.invoke('fuel:get-all', vehicleId),
  createFuelRecord: (data: any) => ipcRenderer.invoke('fuel:create', data),

  getMaintenanceRecords: (vehicleId?: string) => ipcRenderer.invoke('maintenance:get-all', vehicleId),
  createMaintenanceRecord: (data: any) => ipcRenderer.invoke('maintenance:create', data),

  // Salaries
  getSalaries: (driverId?: string) => ipcRenderer.invoke('salaries:get-all', driverId),
  createSalaryRecord: (data: any) => ipcRenderer.invoke('salaries:create', data),
  updateSalaryStatus: (id: string, status: string, date?: string) => ipcRenderer.invoke('salaries:update-status', { id, status, date }),

  // Dashboard & Reports
  getDashboardSummary: (params: { period?: string; customStart?: string; customEnd?: string } = {}) => ipcRenderer.invoke('dashboard:summary', params),
  getTransportsReport: (filter: any) => ipcRenderer.invoke('reports:transports', filter),
  getVehicleProfitabilityReport: (filter: any) => ipcRenderer.invoke('reports:vehicle-profitability', filter),

  // Backup & Sync
  createBackup: () => ipcRenderer.invoke('backup:create'),
  getLocalBackups: () => ipcRenderer.invoke('backup:list'),
  restoreBackup: (filePath: string) => ipcRenderer.invoke('backup:restore', filePath),
  exportBackup: (filePath?: string) => ipcRenderer.invoke('backup:export', filePath),
  getBackupSummary: () => ipcRenderer.invoke('backup:summary'),
  getSyncQueueStatus: () => ipcRenderer.invoke('sync:queue-status'),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
