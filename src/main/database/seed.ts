import { getDb } from './db';
import { cryptoRandomUUID } from '../utils/uuid';

export function seedInitialDataIfNeeded(): void {
  const db = getDb();
  const locationCount = (db.prepare('SELECT COUNT(*) as count FROM locations').get() as { count: number }).count;

  if (locationCount > 0) {
    return; // Already populated
  }

  console.log('[Seed] Populating UAE initial demo data...');
  const now = new Date().toISOString();

  // 1. Seed UAE Locations
  const locations = [
    { name: 'Dubai', code: 'DXB' },
    { name: 'Abu Dhabi', code: 'AUH' },
    { name: 'Sharjah', code: 'SHJ' },
    { name: 'Ajman', code: 'AJM' },
    { name: 'Ras Al Khaimah', code: 'RAK' },
    { name: 'Fujairah', code: 'FUJ' },
    { name: 'Al Ain', code: 'AAN' },
  ];

  const insertLocation = db.prepare(
    `INSERT INTO locations (id, name, code, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', ?, ?)`
  );

  const locationIds: Record<string, string> = {};
  for (const loc of locations) {
    const id = cryptoRandomUUID();
    insertLocation.run(id, loc.name, loc.code, now, now);
    locationIds[loc.name] = id;
  }

  // 2. Seed Drivers
  const drivers = [
    { name: 'Rashid Al-Maktoum', phone: '+971 50 123 4567', cnic: '784-1988-1234567-1', basicSalary: 6500 },
    { name: 'Tariq Mansoor', phone: '+971 52 765 4321', cnic: '784-1992-7654321-2', basicSalary: 7000 },
    { name: 'Zayed Al-Hashemi', phone: '+971 55 999 8887', cnic: '784-1990-9998887-3', basicSalary: 6800 },
  ];

  const insertDriver = db.prepare(
    `INSERT INTO drivers (id, name, phone, cnic_or_license, salary_type, basic_salary, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'MONTHLY', ?, 'ACTIVE', ?, ?)`
  );

  const driverIds: string[] = [];
  for (const d of drivers) {
    const id = cryptoRandomUUID();
    insertDriver.run(id, d.name, d.phone, d.cnic, d.basicSalary, now, now);
    driverIds.push(id);
  }

  // 3. Seed Vehicles
  const vehicles = [
    { reg: 'DXB-10293', type: 'Trailer', make: 'Mercedes-Benz Actros', year: 2023, driverId: driverIds[0] },
    { reg: 'AUH-45672', type: 'Truck', make: 'Volvo FH16', year: 2022, driverId: driverIds[1] },
    { reg: 'SHJ-78901', type: 'Container', make: 'MAN TGX', year: 2024, driverId: driverIds[2] },
  ];

  const insertVehicle = db.prepare(
    `INSERT INTO vehicles (id, registration_number, vehicle_type, make_model, model_year, current_driver_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`
  );

  const vehicleIds: string[] = [];
  for (const v of vehicles) {
    const id = cryptoRandomUUID();
    insertVehicle.run(id, v.reg, v.type, v.make, v.year, v.driverId, now, now);
    vehicleIds.push(id);
  }

  // 4. Seed Initial Transports
  const insertTransport = db.prepare(
    `INSERT INTO transports (id, transport_no, date, transport_type, from_location_id, to_location_id, vehicle_id, driver_id, tons, rate_per_ton, fixed_price, total_amount, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)`
  );

  // Trip A (Fixed Price)
  insertTransport.run(
    cryptoRandomUUID(),
    'TRP-1001',
    now.slice(0, 10),
    'TRIP',
    locationIds['Dubai'],
    locationIds['Abu Dhabi'],
    vehicleIds[0],
    driverIds[0],
    null,
    null,
    3500,
    3500,
    now,
    now
  );

  // Trip B (Ton Based)
  insertTransport.run(
    cryptoRandomUUID(),
    'TRP-1002',
    now.slice(0, 10),
    'TON',
    locationIds['Sharjah'],
    locationIds['Ras Al Khaimah'],
    vehicleIds[1],
    driverIds[1],
    25,
    140,
    null,
    3500,
    now,
    now
  );

  console.log('[Seed] UAE Initial data populated successfully.');
}
