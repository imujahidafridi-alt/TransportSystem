export type TransportType = 'TRIP' | 'TON';
export type TransportStatus = 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
export type SalaryPaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID';

export interface Location {
  id: string;
  name: string;
  code?: string;
  status: EntityStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  cnicOrLicense?: string;
  salaryType: string;
  basicSalary: number;
  status: DriverStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  makeModel?: string;
  modelYear?: number;
  currentDriverId?: string;
  currentDriverName?: string; // Joined field for display
  status: EntityStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transport {
  id: string;
  transportNo: string;
  date: string;
  transportType: TransportType;
  materialName?: string;
  fromLocationId: string;
  fromLocationName?: string;
  toLocationId: string;
  toLocationName?: string;
  vehicleId: string;
  vehicleRegistration?: string;
  driverId: string;
  driverName?: string;
  tons?: number;
  ratePerTon?: number;
  fixedPrice?: number;
  totalAmount: number;
  status: TransportStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleExpense {
  id: string;
  vehicleId: string;
  vehicleRegistration?: string;
  date: string;
  expenseType: string;
  description?: string;
  quantity?: number;
  unitCost?: number;
  amount: number;
  vendor?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  vehicleRegistration?: string;
  date: string;
  fuelType: string;
  quantity: number;
  unit: string;
  rate: number;
  totalAmount: number;
  vendor?: string;
  odometer?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleRegistration?: string;
  date: string;
  maintenanceType: string;
  description?: string;
  amount: number;
  vendor?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverSalaryRecord {
  id: string;
  driverId: string;
  driverName?: string;
  salaryPeriod: string; // e.g. "2026-08"
  basicSalary: number;
  allowances: number;
  deductions: number;
  advance: number;
  netSalary: number;
  paymentDate?: string;
  paymentStatus: SalaryPaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'BACKUP';
  entity: string;
  entityId: string;
  payload: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  currencySymbol: string;
  r2AccountId?: string;
  r2BucketName?: string;
  r2Configured: boolean;
  lastBackupAt?: string;
}

export interface DashboardSummary {
  totalVehicles: number;
  activeVehicles: number;
  idleVehicles: number;
  activeDrivers: number;
  driversOnLeave: number;
  tripsThisMonth: number;
  totalRevenue: number;
  vehicleExpenses: number;
  fuelExpenses: number;
  maintenanceExpenses: number;
  driverSalaries: number;
  netResult: number;
  recentTransports: Transport[];
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  vehicleId?: string;
  driverId?: string;
  transportType?: TransportType;
  locationId?: string;
}

export interface LocalBackupItem {
  id: string;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  formattedSize: string;
  createdAt: string;
  yearMonth: string;
}

export interface BackupStatusSummary {
  lastBackupAt?: string;
  totalBackupsCount: number;
  totalStorageBytes: number;
  formattedTotalStorage: string;
  backupsDir: string;
  cloudR2Configured: boolean;
}
