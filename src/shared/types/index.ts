export type TransportType = 'TRIP' | 'TON';
export type TransportStatus = 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
export type SalaryPaymentStatus = 'DRAFT' | 'FINALIZED' | 'PAID';

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
  perTripRate?: number;
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
  totalDirectCosts?: number;
  driverAllowance?: number;
  status: TransportStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleExpense {
  id: string;
  transportId?: string;
  transportNo?: string;
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
  transportId?: string;
  transportNo?: string;
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
  transportId?: string;
  transportNo?: string;
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

export interface TripCostsPayload {
  transportId: string;
  fuel?: {
    quantity: number;
    rate: number;
    totalAmount: number;
    vendor?: string;
    odometer?: number;
  } | null;
  toll?: {
    amount: number;
    description?: string;
  } | null;
  fine?: {
    amount: number;
    description?: string;
    reference?: string;
  } | null;
  maintenance?: {
    amount: number;
    description?: string;
    vendor?: string;
  } | null;
  other?: {
    amount: number;
    description?: string;
  } | null;
}

export interface TripCostSummary {
  transportId: string;
  fuel?: FuelRecord | null;
  toll?: VehicleExpense | null;
  fine?: VehicleExpense | null;
  maintenance?: MaintenanceRecord | null;
  other?: VehicleExpense | null;
  totalDirectCosts: number;
  tripRevenue: number;
  directTripProfit: number;
  contributionMarginPercentage: number;
}

export interface TripProfitabilityItem {
  transportId: string;
  transportNo: string;
  date: string;
  vehicleId: string;
  vehicleRegistration: string;
  driverId: string;
  driverName: string;
  route: string;
  fromLocationName: string;
  toLocationName: string;
  status: TransportStatus;
  revenue: number;
  fuelCost: number;
  tollCost: number;
  fineCost: number;
  maintenanceCost: number;
  otherCost: number;
  totalDirectCosts: number;
  directTripProfit: number;
  contributionMarginPercentage: number;
}

export interface DriverSalaryAdjustment {
  id: string;
  salaryRecordId: string;
  adjustmentType: 'BONUS' | 'DEDUCTION' | 'ADVANCE';
  amount: number;
  reason: string;
  createdAt: string;
  createdBy?: string;
}

export interface DriverSalaryRecord {
  id: string;
  driverId: string;
  driverName?: string;
  salaryType?: string;
  salaryPeriod: string; // e.g. "2026-08"
  basicSalary: number;
  totalTrips?: number;
  ratePerTrip?: number;
  perTripRate?: number;
  tripEarnings?: number;
  allowances: number;
  deductions: number;
  advance: number;
  netSalary: number;
  paymentDate?: string;
  paymentStatus: SalaryPaymentStatus;
  paymentMethod?: string;
  paymentReference?: string;
  paidBy?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  notes?: string;
  adjustments?: DriverSalaryAdjustment[];
  createdAt: string;
  updatedAt: string;
}

export interface MasterPayrollSummary {
  salaryPeriod: string;
  totalDrivers: number;
  eligibleDrivers: number;
  workingDrivers: number;
  completedTrips: number;
  totalBasicSalary: number;
  totalTripEarnings: number;
  totalAllowances: number;
  totalDeductions: number;
  totalAdvances: number;
  totalNetPayable: number;
  totalPaid: number;
  totalPending: number;
  draftCount: number;
  finalizedCount: number;
  paidCount: number;
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
  status?: TransportStatus;
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
  r2BucketName?: string;
}
