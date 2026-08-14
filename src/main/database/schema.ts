export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  cnic_or_license TEXT,
  salary_type TEXT NOT NULL DEFAULT 'MONTHLY',
  basic_salary REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  registration_number TEXT NOT NULL UNIQUE,
  vehicle_type TEXT NOT NULL,
  make_model TEXT,
  model_year INTEGER,
  current_driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transports (
  id TEXT PRIMARY KEY,
  transport_no TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  transport_type TEXT NOT NULL,
  material_name TEXT,
  from_location_id TEXT NOT NULL REFERENCES locations(id),
  to_location_id TEXT NOT NULL REFERENCES locations(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  driver_id TEXT NOT NULL REFERENCES drivers(id),
  tons REAL,
  rate_per_ton REAL,
  fixed_price REAL,
  total_amount REAL NOT NULL,
  driver_allowance REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicle_expenses (
  id TEXT PRIMARY KEY,
  transport_id TEXT REFERENCES transports(id) ON DELETE SET NULL,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  expense_type TEXT NOT NULL,
  description TEXT,
  quantity REAL,
  unit_cost REAL,
  amount REAL NOT NULL,
  vendor TEXT,
  reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fuel_records (
  id TEXT PRIMARY KEY,
  transport_id TEXT REFERENCES transports(id) ON DELETE SET NULL,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  fuel_type TEXT NOT NULL DEFAULT 'DIESEL',
  quantity REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'LITERS',
  rate REAL NOT NULL,
  total_amount REAL NOT NULL,
  vendor TEXT,
  odometer REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY,
  transport_id TEXT REFERENCES transports(id) ON DELETE SET NULL,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  maintenance_type TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  vendor TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS driver_salary_records (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  salary_period TEXT NOT NULL,
  basic_salary REAL NOT NULL DEFAULT 0,
  total_trips INTEGER NOT NULL DEFAULT 0,
  trip_earnings REAL NOT NULL DEFAULT 0,
  allowances REAL NOT NULL DEFAULT 0,
  deductions REAL NOT NULL DEFAULT 0,
  advance REAL NOT NULL DEFAULT 0,
  net_salary REAL NOT NULL DEFAULT 0,
  payment_date TEXT,
  payment_status TEXT NOT NULL DEFAULT 'DRAFT',
  payment_method TEXT,
  payment_reference TEXT,
  paid_by TEXT,
  finalized_at TEXT,
  finalized_by TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS driver_salary_adjustments (
  id TEXT PRIMARY KEY,
  salary_record_id TEXT NOT NULL REFERENCES driver_salary_records(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL, -- 'BONUS' | 'DEDUCTION' | 'ADVANCE'
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const CREATE_INDEXES_SQL = `
-- Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_reg_num ON vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_drivers_name ON drivers(name);
CREATE INDEX IF NOT EXISTS idx_transports_date ON transports(date);
CREATE INDEX IF NOT EXISTS idx_transports_vehicle_id ON transports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_transports_driver_id ON transports(driver_id);
CREATE INDEX IF NOT EXISTS idx_transports_from_loc ON transports(from_location_id);
CREATE INDEX IF NOT EXISTS idx_transports_to_loc ON transports(to_location_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON vehicle_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_transport_id ON vehicle_expenses(transport_id);
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_id ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_transport_id ON fuel_records(transport_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_transport_id ON maintenance_records(transport_id);
CREATE INDEX IF NOT EXISTS idx_salaries_driver_id ON driver_salary_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_salaries_period ON driver_salary_records(salary_period);
CREATE INDEX IF NOT EXISTS idx_adjustments_salary_id ON driver_salary_adjustments(salary_record_id);
`;
