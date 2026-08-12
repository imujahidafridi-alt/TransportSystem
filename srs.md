Below is a production-oriented SRS structured as a **Vibe Coding Blueprint**. It separates business rules, data model, workflows, UI behavior, architecture, and acceptance criteria so an AI coding agent can implement it without repeatedly making business assumptions.

# Software Requirements Specification (SRS)

## Transport Management & Fleet Operations System

**Document Version:** 1.0
**Platform:** Desktop
**Framework:** Electron
**Architecture:** Offline-First
**Local Database:** SQLite 3
**Cloud Storage:** Cloudflare R2
**Configuration:** `.env`
**Primary UX:** Excel-style, keyboard-first
**Performance Target:** <100 MB RAM during normal operation

---

# 1. System Overview

The system is a desktop-based **Transport Management & Fleet Operations System** designed to manage:

* Transport trips
* Fixed-price and ton-based transport
* Drivers
* Vehicles
* Vehicle expenses
* Fuel expenses
* Maintenance expenses
* Driver salaries
* Trip history
* Financial records
* Offline operations
* Cloud backup/synchronization

The application must operate **fully offline using SQLite 3** and synchronize required cloud data/files with **Cloudflare R2** when internet connectivity is available.

The system must be designed so that future modules and business-rule changes can be added without major architectural restructuring.

---

# 2. Core Business Concepts

## 2.1 Transport Types

The system supports exactly two primary transport pricing types.

### Type A — Trip

A trip has a predefined/fixed transport price.

Example:

> Peshawar → Lahore = Rs. 50,000

The price does not depend on weight/tons.

**Calculation:**

```text
Total Amount = Fixed Trip Price
```

---

### Type B — Ton

Transport charges are calculated according to transported weight.

Example:

> Rate = Rs. 2,500 / Ton
> Quantity = 20 Tons

```text
Total Amount = Rate × Tons
             = 2,500 × 20
             = Rs. 50,000
```

The system must store both:

* Ton quantity
* Per-ton rate

and calculate the total automatically.

---

# 3. Main Entities

The initial system should contain these core entities:

```text
Driver
Vehicle
Transport
Trip
Vehicle Expense
Fuel Expense
Maintenance Expense
Driver Salary
Location
User
System Configuration
Sync Queue
```

The architecture should allow additional entities/modules later.

---

# 4. Vehicle Management

## 4.1 Vehicle Master

Each vehicle must have a unique registration number.

Minimum fields:

| Field               | Required | Description               |
| ------------------- | -------: | ------------------------- |
| Vehicle ID          |      Yes | Internal UUID/ID          |
| Registration Number |      Yes | Vehicle registration      |
| Vehicle Type        |      Yes | Truck, Trailer, etc.      |
| Make/Model          |       No | Vehicle information       |
| Model Year          |       No | Manufacturing year        |
| Current Driver      |       No | Currently assigned driver |
| Status              |      Yes | Active / Inactive         |
| Notes               |       No | Additional information    |

### Registration Number

The registration number must be unique.

Example:

```text
ABC-123
LEA-4567
CBA-786
```

Duplicate vehicle registration numbers must not be allowed.

---

# 5. Driver Management

## 5.1 Driver Master

Each driver must have a dedicated record.

Minimum fields:

| Field            | Required |
| ---------------- | -------: |
| Driver ID        |      Yes |
| Driver Name      |      Yes |
| Phone            |       No |
| CNIC/License No. |       No |
| Salary Type      |      Yes |
| Basic Salary     |      Yes |
| Status           |      Yes |
| Notes            |       No |

Driver status:

```text
Active
Inactive
On Leave
```

---

# 6. Vehicle ↔ Driver Assignment

A vehicle normally has a primary/current driver.

However, the system **must not permanently bind a vehicle to one driver**.

### Business Rule

If Driver A is on leave, Vehicle A can temporarily be operated by Driver B.

Example:

```text
Vehicle: ABC-123

Normal Driver:
Driver A

Driver A → On Leave

Trip:
Vehicle = ABC-123
Driver = Driver B
```

The trip record must store the **actual driver who performed that specific trip**.

Therefore, historical records must never change if the vehicle's current driver is later changed.

### Important

Do NOT derive historical driver information from:

```text
vehicle.current_driver_id
```

Instead:

```text
trip.driver_id
```

must be stored directly on every trip.

---

# 7. Vehicle Expense Management

All vehicle-related expenses must be linked directly to the vehicle.

Examples:

* Fuel
* Engine oil
* Tyres
* Repairs
* Maintenance
* Parts
* Workshop charges
* Other vehicle expenses

Every expense must have:

```text
vehicle_id
```

---

## 7.1 Expense Fields

Minimum structure:

| Field        | Required |
| ------------ | -------: |
| Expense ID   |      Yes |
| Vehicle      |      Yes |
| Date         |      Yes |
| Expense Type |      Yes |
| Description  |       No |
| Quantity     |       No |
| Unit Cost    |       No |
| Amount       |      Yes |
| Vendor       |       No |
| Reference    |       No |
| Notes        |       No |

---

# 8. Fuel Management

Fuel should be treated as a vehicle expense.

Minimum fields:

```text
Vehicle
Date
Fuel Type
Quantity
Unit
Rate
Total Amount
Fuel Station/Vendor
Odometer
Notes
```

Calculation:

```text
Total Fuel Cost = Quantity × Rate
```

Example:

```text
Vehicle: ABC-123
Fuel: Diesel
Quantity: 250 Liters
Rate: Rs. 280
Total: Rs. 70,000
```

The fuel record must be linked to the vehicle.

---

# 9. Maintenance Management

Maintenance records must also be linked to the vehicle.

Examples:

```text
Oil Change
Engine Repair
Tyre Replacement
Brake Repair
Electrical Repair
General Service
Other
```

Example:

```text
Vehicle: ABC-123
Date: 10-Aug-2026
Type: Engine Repair
Amount: Rs. 35,000
```

---

# 10. Transport / Trip Module

This is the primary operational module.

The user creates a transport record by entering:

1. Transport type
2. From location
3. To location
4. Driver
5. Vehicle
6. Pricing information
7. Date
8. Additional information

---

# 11. Transport Form

The form must be designed as an **Excel-style data-entry interface**.

## Required Fields

```text
Date
Transport Type
From
To
Vehicle Registration
Driver
```

### If Transport Type = Trip

Show:

```text
Fixed Price
```

### If Transport Type = Ton

Show:

```text
Total Tons
Rate Per Ton
Calculated Total
```

---

# 12. Pricing Rules

## 12.1 Trip

```text
Transport Type = TRIP

Total Amount = Fixed Price
```

Example:

```text
Fixed Price = 50,000

Total = 50,000
```

---

## 12.2 Ton

```text
Transport Type = TON

Total Amount = Tons × Rate Per Ton
```

Example:

```text
Tons = 25
Rate = 2,500

Total = 62,500
```

The calculated amount must update immediately when either:

* Tons
* Rate

changes.

The calculated total should not normally be manually editable.

---

# 13. Transport Record Structure

Recommended fields:

| Field          | Type     |    Required |
| -------------- | -------- | ----------: |
| ID             | UUID     |         Yes |
| Transport No.  | String   |         Yes |
| Date           | DateTime |         Yes |
| Transport Type | Enum     |         Yes |
| From Location  | FK       |         Yes |
| To Location    | FK       |         Yes |
| Vehicle        | FK       |         Yes |
| Driver         | FK       |         Yes |
| Tons           | Decimal  | Conditional |
| Rate Per Ton   | Decimal  | Conditional |
| Fixed Price    | Decimal  | Conditional |
| Total Amount   | Decimal  |         Yes |
| Status         | Enum     |         Yes |
| Notes          | Text     |          No |
| Created At     | DateTime |         Yes |
| Updated At     | DateTime |         Yes |

---

# 14. Transport Status

Initial statuses:

```text
Draft
Confirmed
Completed
Cancelled
```

Business rules:

### Draft

Record is being prepared.

### Confirmed

Transport has been officially assigned.

### Completed

Transport operation has been completed.

### Cancelled

Transport was cancelled.

Cancelled records should remain in the database for audit/history and must not simply be deleted.

---

# 15. Location Management

Locations must be maintained separately instead of storing uncontrolled text everywhere.

Example:

```text
Peshawar
Lahore
Islamabad
Karachi
Rawalpindi
Mardan
Nowshera
```

Location fields:

```text
Location ID
Name
Code
Status
Notes
```

The system must allow users to add new locations.

---

# 16. Driver Salary Module

A dedicated salary module must manage driver salaries.

## Salary Record

Minimum fields:

```text
Salary ID
Driver
Salary Period
Basic Salary
Allowances
Deductions
Advance
Net Salary
Payment Date
Payment Status
Notes
```

Calculation:

```text
Net Salary =
Basic Salary
+ Allowances
- Deductions
- Advance
```

---

## 16.1 Salary Status

```text
Pending
Partially Paid
Paid
```

The system should maintain salary history per driver.

Example:

```text
Driver: Ali
Month: August 2026

Basic Salary: 45,000
Allowance: 5,000
Deduction: 2,000

Net Salary = 48,000
```

---

# 17. Dashboard

The dashboard should provide a quick operational overview.

Recommended KPIs:

```text
Total Vehicles
Active Vehicles
Active Drivers
Trips This Month
Total Transport Revenue
Vehicle Expenses
Fuel Expenses
Maintenance Expenses
Driver Salaries
Net Transport Result
```

Dashboard filters:

```text
Today
This Week
This Month
Custom Date Range
```

---

# 18. Reports

Initial reporting requirements:

## Transport Reports

* All transports
* Trip-type transports
* Ton-type transports
* Vehicle-wise transports
* Driver-wise transports
* Route-wise transports
* Date-wise transports
* Revenue by period

## Vehicle Reports

* Vehicle expense report
* Fuel report
* Maintenance report
* Vehicle-wise profitability

## Driver Reports

* Driver transport history
* Driver salary history
* Driver-wise activity

## Financial Reports

* Total revenue
* Total vehicle expenses
* Fuel expenses
* Maintenance expenses
* Driver salaries
* Net result

Reports should support:

```text
Date filter
Vehicle filter
Driver filter
Transport type filter
Location filter
Export
Print
```

---

# 19. Excel-Style UX

This is a major requirement.

The application must prioritize **keyboard-first data entry** rather than mouse-heavy forms.

## Required behavior

Users should be able to navigate fields using:

```text
Tab
Shift + Tab
Arrow Keys
Enter
Escape
```

The primary transport-entry screen should resemble a spreadsheet.

Example:

| Date   | Type | From     | To     | Vehicle | Driver | Tons | Rate | Total |
| ------ | ---- | -------- | ------ | ------- | ------ | ---: | ---: | ----: |
| 10-Aug | Ton  | Peshawar | Lahore | ABC-123 | Ali    |   20 | 2500 | 50000 |

---

# 20. Keyboard Shortcuts

Recommended shortcuts:

| Shortcut        | Action         |
| --------------- | -------------- |
| `Ctrl + N`      | New Transport  |
| `Ctrl + S`      | Save           |
| `Ctrl + F`      | Search         |
| `Ctrl + E`      | Edit           |
| `Ctrl + Delete` | Delete/Cancel  |
| `Esc`           | Close/Cancel   |
| `Enter`         | Confirm/Next   |
| `Tab`           | Next field     |
| `Shift + Tab`   | Previous field |

Shortcuts should be centralized so they can be changed later.

---

# 21. Search & Filtering

Every major list should support fast search.

Examples:

```text
Vehicle Registration
Driver Name
Transport No.
Location
Date
```

Search should work without requiring a page refresh.

Large datasets must use database-level filtering rather than loading all records into memory.

---

# 22. Offline-First Architecture

SQLite 3 is the **primary local database**.

The application must remain fully functional without internet access.

### Offline operations must support:

* Create transport
* Edit transport
* View transport
* Manage drivers
* Manage vehicles
* Add expenses
* Add fuel
* Add maintenance
* Manage salaries
* Reports based on local data

Internet availability must not block normal operations.

---

# 23. Cloudflare R2

Cloudflare R2 will be used as the cloud storage layer.

Configuration must be provided through `.env`.

Example:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
```

Secrets must **never be hardcoded**.

They must not be committed to Git.

---

# 24. Important R2 Architecture Rule

Cloudflare R2 is object storage, **not a relational database**.

Therefore, SQLite remains the operational database.

R2 should primarily be used for:

```text
Backups
Database snapshots
Generated reports
Attachments/documents
Export files
```

If future requirements need true multi-device relational cloud synchronization, a proper cloud database/service should be introduced rather than trying to use R2 as a SQL database.

---

# 25. Synchronization Architecture

Recommended architecture:

```text
┌────────────────────────────┐
│       Electron App         │
│                            │
│ React UI                   │
│        ↓                   │
│ Application Services       │
│        ↓                   │
│ SQLite 3                   │
└─────────────┬──────────────┘
              │
              ↓
       Sync / Backup Queue
              │
        Internet Available
              │
              ↓
       Cloudflare R2
```

The application should not make the UI wait for cloud operations.

Cloud operations must run asynchronously.

---

# 26. Sync Queue

A local queue should track pending cloud operations.

Example:

```text
sync_queue
```

Fields:

```text
id
operation
entity
entity_id
payload
status
attempts
last_error
created_at
updated_at
```

Statuses:

```text
Pending
Processing
Completed
Failed
```

Failed operations should be retryable.

---

# 27. Data Integrity

The system must enforce:

### Vehicle

```text
registration_number UNIQUE
```

### Driver

Driver must exist before assigning them to transport.

### Vehicle

Vehicle must exist before assigning it to transport.

### Location

Both From and To locations must exist.

### Transport

```text
From != To
```

unless explicitly allowed by future business rules.

### Ton Transport

```text
tons > 0
rate_per_ton >= 0
```

### Trip Transport

```text
fixed_price >= 0
```

---

# 28. Audit & Record Safety

Important business records should not be physically deleted without authorization.

Recommended behavior:

```text
Active
Archived
Cancelled
```

Instead of deleting historical transport records.

At minimum, store:

```text
created_at
updated_at
created_by
updated_by
```

for important entities.

---

# 29. Database Design

Use normalized relational tables.

Recommended initial schema:

```text
users

drivers
vehicles
locations

transports

vehicle_expenses
fuel_records
maintenance_records

driver_salary_records

sync_queue
system_settings
```

---

# 30. Recommended Relationships

```text
Driver
   │
   ├──────────────< Transport
   │
   └──────────────< Driver Salary


Vehicle
   │
   ├──────────────< Transport
   ├──────────────< Vehicle Expense
   ├──────────────< Fuel Record
   └──────────────< Maintenance Record


Location
   │
   ├──────────────< Transport (From)
   └──────────────< Transport (To)
```

---

# 31. Performance Requirements

The application must be optimized for low-resource desktop systems.

### Target

```text
Normal RAM usage: <100 MB
```

This should be treated as a **performance target**, not a guarantee under every workload.

Optimization priorities:

* Avoid unnecessary Electron renderer processes
* Avoid large in-memory datasets
* Use SQLite indexes
* Use pagination/virtualization
* Avoid loading entire tables
* Lazy-load modules
* Minimize React re-renders
* Avoid GPU-heavy animations
* Avoid unnecessary background processes
* Use prepared SQLite statements
* Keep cloud synchronization outside the UI thread

---

# 32. SQLite Optimization

Recommended:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
```

Use indexes for:

```text
vehicles.registration_number
drivers.name
transports.date
transports.vehicle_id
transports.driver_id
transports.from_location_id
transports.to_location_id
vehicle_expenses.vehicle_id
fuel_records.vehicle_id
maintenance_records.vehicle_id
driver_salary_records.driver_id
```

---

# 33. Application Architecture

Recommended layered architecture:

```text
Electron Main Process
        │
        ├── Database Layer
        │       └── SQLite
        │
        ├── Repository Layer
        │
        ├── Service Layer
        │
        ├── Sync/Backup Service
        │
        └── IPC Layer
                │
                ↓
          React Renderer
                │
          UI Components
```

### Renderer must NOT directly access SQLite.

Instead:

```text
React UI
   ↓
IPC
   ↓
Application Service
   ↓
Repository
   ↓
SQLite
```

This provides better security and maintainability.

---

# 34. Suggested Technology Stack

```text
Desktop:
Electron

Frontend:
React
TypeScript

UI:
Tailwind CSS
shadcn/ui

Database:
SQLite 3

Validation:
Zod

Cloud Storage:
Cloudflare R2

ORM/Query Layer:
Drizzle ORM or lightweight SQLite repository layer

Build:
Vite

Language:
TypeScript
```

For a strict **<100 MB RAM** target, avoid unnecessarily heavy libraries and keep dependencies minimal.

---

# 35. Security

Sensitive configuration must be stored outside source code.

Never expose:

```text
R2_SECRET_ACCESS_KEY
```

to the React renderer.

Secrets should only be accessible from the Electron main process/backend layer.

IPC endpoints must expose only required operations.

Do not expose arbitrary filesystem or shell execution through IPC.

---

# 36. Error Handling

Every operation must have predictable error handling.

Example:

```text
Database Error
→ Show user-friendly error
→ Log technical error
→ Do not crash application
```

Cloud failure:

```text
Cloud unavailable
→ Save locally
→ Add operation to sync queue
→ Continue application operation
```

Validation failure:

```text
Invalid data
→ Highlight field
→ Show validation message
→ Keep user inside form
```

---

# 37. Backup

The system should support manual and automatic SQLite backup.

Recommended backup structure:

```text
Backups/
   2026/
      08/
         transport_2026-08-10_120000.db
```

Optional cloud backup:

```text
SQLite Backup
      ↓
Cloudflare R2
```

The local database must remain the source of truth.

---

# 38. Scalability Requirements

The architecture must allow future modules such as:

```text
Customers
Suppliers
Invoices
Payments
Fuel Inventory
Vehicle Documents
Vehicle Registration Expiry
Driver License Expiry
Route Management
Profitability
Accounts
Multiple Branches
User Roles
Permissions
Cloud Database
Multi-PC Synchronization
```

New modules should be implemented independently rather than modifying a large monolithic file.

---

# 39. Code Organization

Do NOT build the entire application in one:

```text
App.tsx
```

or:

```text
db.ts
```

file.

Recommended structure:

```text
src/
├── main/
│   ├── database/
│   ├── ipc/
│   ├── services/
│   ├── sync/
│   └── backup/
│
├── renderer/
│   ├── components/
│   ├── features/
│   │   ├── dashboard/
│   │   ├── transports/
│   │   ├── vehicles/
│   │   ├── drivers/
│   │   ├── expenses/
│   │   ├── fuel/
│   │   ├── maintenance/
│   │   └── salaries/
│   ├── hooks/
│   ├── lib/
│   └── pages/
│
├── shared/
│   ├── types/
│   ├── schemas/
│   └── constants/
│
└── migrations/
```

---

# 40. Vibe Coding Rules

The developer/AI coding agent must follow these rules:

### Rule 1 — Do not invent business rules

If a requirement is not specified, isolate it as a configurable rule or clearly mark it as a TODO.

### Rule 2 — Preserve existing data

Database migrations must never casually drop production tables/data.

### Rule 3 — No destructive migrations

Before destructive schema changes:

```text
Backup
→ Migration
→ Validation
```

### Rule 4 — Business logic belongs in services

Do not put calculations inside UI components.

Example:

```text
calculateTransportAmount()
```

belongs in the domain/service layer.

### Rule 5 — UI must not own database logic

Components should call services/hooks.

### Rule 6 — Keep modules independent

Transport, Vehicle, Driver, Expense and Salary modules should be independently maintainable.

---

# 41. Transport Calculation Service

Centralize pricing logic.

Pseudo-contract:

```text
calculateTransportAmount(transport)
```

### Trip

```text
amount = fixed_price
```

### Ton

```text
amount = tons × rate_per_ton
```

No duplicate calculation logic should exist across:

```text
Form
Table
Reports
Dashboard
PDF
```

All should use the same business service.

---

# 42. Core Workflow

## Create Transport

```text
User opens Transport Entry
        ↓
Select Date
        ↓
Select Transport Type
        ↓
Select From
        ↓
Select To
        ↓
Select Vehicle
        ↓
Select Driver
        ↓
Enter pricing information
        ↓
System calculates total
        ↓
Validate
        ↓
Save SQLite transaction
        ↓
Create Sync/Backup event
        ↓
Show success
```

---

# 43. Vehicle/Driver Workflow

Normal situation:

```text
Vehicle ABC-123
        ↓
Assigned Driver = Ali
```

Driver goes on leave:

```text
Ali → On Leave
        ↓
Vehicle remains active
        ↓
Trip assigns Driver = Ahmed
```

The vehicle's permanent/current assignment can remain Ali or be temporarily changed, but the actual trip must always record Ahmed.

---

# 44. Expense Workflow

```text
Expense
   ↓
Select Vehicle
   ↓
Select Expense Type
   ↓
Enter Amount
   ↓
Enter Date
   ↓
Save
```

The expense automatically becomes part of the selected vehicle's expense history.

---

# 45. Acceptance Criteria

## Transport

* [ ] User can create Trip transport.
* [ ] User can create Ton transport.
* [ ] Trip uses fixed price.
* [ ] Ton uses tons × rate.
* [ ] From location is required.
* [ ] To location is required.
* [ ] Vehicle is required.
* [ ] Driver is required.
* [ ] Actual driver is stored on the transport record.
* [ ] Vehicle registration is unique.
* [ ] Historical driver assignment does not change when vehicle driver changes.

## Vehicles

* [ ] Vehicle can be created.
* [ ] Vehicle can be edited.
* [ ] Vehicle can be deactivated.
* [ ] Vehicle expenses are linked to vehicle.
* [ ] Fuel is linked to vehicle.
* [ ] Maintenance is linked to vehicle.

## Drivers

* [ ] Driver can be created.
* [ ] Driver can be marked inactive/on leave.
* [ ] Driver can operate different vehicles.
* [ ] Driver salary records can be created.
* [ ] Salary history is maintained.

## Offline

* [ ] Application works without internet.
* [ ] New records can be created offline.
* [ ] Records remain available after restart.
* [ ] Cloud failure does not block local operations.
* [ ] Pending cloud operations can retry.

## UX

* [ ] Transport entry is keyboard-first.
* [ ] Tab navigation works.
* [ ] Search is fast.
* [ ] Large lists are virtualized/paginated.
* [ ] No unnecessary GPU-heavy animations.

## Performance

* [ ] SQLite queries are indexed.
* [ ] Renderer does not load entire database.
* [ ] Cloud synchronization is asynchronous.
* [ ] Application targets <100 MB RAM during normal usage.

---

# 46. MVP Development Order

For Vibe Coding, implement in this order:

### Phase 1 — Foundation

```text
Electron
React
TypeScript
SQLite
IPC architecture
Database migrations
.env configuration
```

### Phase 2 — Master Data

```text
Locations
Drivers
Vehicles
```

### Phase 3 — Core Transport

```text
Transport entry
Trip pricing
Ton pricing
Vehicle assignment
Driver assignment
Transport list
Search/filter
```

### Phase 4 — Vehicle Operations

```text
Expenses
Fuel
Maintenance
```

### Phase 5 — Driver Operations

```text
Salary
Salary history
Payment status
```

### Phase 6 — Reports

```text
Transport reports
Vehicle reports
Driver reports
Expense reports
Financial summary
```

### Phase 7 — Cloud

```text
R2 configuration
Backup
Sync queue
Retry mechanism
Cloud backup
```

### Phase 8 — Optimization

```text
SQLite optimization
Virtualized tables
Lazy loading
Memory profiling
Startup optimization
Renderer optimization
```

---

# 47. Final Production Principle

The application should follow this fundamental architecture:

```text
                 TRANSPORT SYSTEM
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Drivers        Vehicles       Locations
        │              │              │
        │              ├── Fuel       │
        │              ├── Repairs    │
        │              └── Expenses   │
        │                             │
        └──────────────┬──────────────┘
                       │
                    Transport
                       │
             ┌─────────┴─────────┐
             │                   │
           TRIP                  TON
       Fixed Price          Tons × Rate
             │                   │
             └─────────┬─────────┘
                       │
                    Reports
                       │
                    SQLite
                       │
                Offline First
                       │
                 Sync/Backup
                       │
                 Cloudflare R2
```

**Source of truth:** SQLite 3
**Cloud role:** Backup/object synchronization
**Transport pricing:** Trip or Ton
**Vehicle:** Independent master entity
**Driver:** Independently assignable to any vehicle/trip
**Expenses:** Vehicle-linked
**Salary:** Driver-linked
**UI:** Excel-style + keyboard-first
**Architecture:** Modular, service-based, scalable
**Deployment:** Lightweight Electron desktop application
