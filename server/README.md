# TransitOps Backend API

> **Fleet & Transport Operations Management Platform**
> Built for Odoo Hackathon 2026 — Node.js + Express + MySQL

---

## 🏗️ Architecture

```
Express REST API  →  MySQL via Sequelize ORM
JWT Authentication  →  Role-Based Access Control
Business Rules Engine  →  Atomic State Transitions
```

---

## ⚡ Quick Start

### 1. Prerequisites

- Node.js 18+ (LTS)
- MySQL 8.0+

### 2. Create the Database

```sql
CREATE DATABASE transitops_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Clone and Install

```bash
cd server
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=transitops_db
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
```

### 5. Seed the Database

```bash
# Import all 6 CSV datasets + create demo users
npm run seed:all

# Or run individually
npm run seed:import   # CSV data only
npm run seed:users    # Demo users only
```

### 6. Start the Server

```bash
npm run dev    # Development (nodemon)
npm start      # Production
```

Server runs at: **http://localhost:5000**

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Fleet Manager | fleet@transitops.com | Fleet@123 |
| Driver | driver@transitops.com | Driver@123 |
| Safety Officer | safety@transitops.com | Safety@123 |
| Financial Analyst | finance@transitops.com | Finance@123 |

---

## 📋 Complete API Reference

### Health Check
```
GET /api/health
```

### Authentication
```
POST /api/auth/login          # Login, returns JWT
GET  /api/auth/me             # Get current user profile [Protected]
```

### Vehicles
```
GET  /api/vehicles                    # List all vehicles [All roles]
GET  /api/vehicles/eligible-for-dispatch   # Available + no active maintenance
GET  /api/vehicles/:registration_number    # Get single vehicle
POST /api/vehicles                    # Create vehicle [fleet_manager]
PUT  /api/vehicles/:registration_number   # Update vehicle [fleet_manager]
```

**Query params for GET /api/vehicles:**
- `status` — Available | On Trip | In Shop | Retired
- `type` — filter by vehicle type
- `region` — filter by region
- `search` — search by reg number or model name
- `page` — page number (default: 1)
- `limit` — items per page (default: 20)

### Drivers
```
GET  /api/drivers                      # List all drivers [All roles]
GET  /api/drivers/eligible-for-dispatch   # Available + license not expired
GET  /api/drivers/:driver_id              # Get single driver
POST /api/drivers                      # Create driver [fleet_manager]
PUT  /api/drivers/:driver_id              # Update driver [fleet_manager, safety_officer*]
```

> *safety_officer can only update `status` and `safety_score`

**Query params for GET /api/drivers:**
- `status` — Available | On Trip | Off Duty | Suspended
- `license_category` — LMV | HMV etc.
- `search` — search by driver_id, name, or license number
- `page`, `limit`

### Trips
```
GET   /api/trips                    # List all trips [All roles]
GET   /api/trips/:trip_id           # Get single trip
POST  /api/trips                    # Create Draft trip [fleet_manager, driver]
PATCH /api/trips/:trip_id/dispatch  # Dispatch trip [fleet_manager, driver]
PATCH /api/trips/:trip_id/complete  # Complete trip [fleet_manager, driver]
PATCH /api/trips/:trip_id/cancel    # Cancel trip [fleet_manager, driver]
```

**Query params for GET /api/trips:**
- `status` — Draft | Dispatched | Completed | Cancelled
- `vehicle_reg` — filter by vehicle
- `driver_id` — filter by driver
- `date_from`, `date_to` — date range filter
- `page`, `limit`

### Maintenance
```
GET   /api/maintenance                            # List all [All roles]
POST  /api/maintenance                            # Create [fleet_manager, safety_officer]
PATCH /api/maintenance/:maintenance_id/close      # Close record [fleet_manager, safety_officer]
```

**Query params for GET /api/maintenance:**
- `status` — Active | Closed
- `vehicle_reg`
- `page`, `limit`

### Fuel Logs
```
GET  /api/fuel-logs    # List [All roles]
POST /api/fuel-logs    # Create [fleet_manager, driver]
```

**Query params:** `vehicle_reg`, `trip_id`, `date_from`, `date_to`, `page`, `limit`

### Expenses
```
GET  /api/expenses    # List [All roles]
POST /api/expenses    # Create [fleet_manager, driver]
```

**Query params:** `vehicle_reg`, `expense_type`, `date_from`, `date_to`, `page`, `limit`

### Dashboard & Reports
```
GET /api/dashboard/kpis             # Live fleet KPIs [All roles]
GET /api/dashboard/filters          # Filter dropdowns [All roles]
GET /api/reports/vehicle-costs      # Cost breakdown per vehicle [All roles]
GET /api/reports/roi                # ROI per vehicle [All roles]
GET /api/reports/fuel-efficiency    # Fuel efficiency per vehicle [All roles]
GET /api/reports/export/csv?report= # CSV export [fleet_manager, safety_officer, financial_analyst]
```

**CSV export report options:** `vehicle-costs` | `roi` | `fuel-efficiency` | `vehicles` | `drivers` | `trips`

---

## 📦 Sample Requests & Responses

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "fleet@transitops.com",
  "password": "Fleet@123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Fleet Admin",
      "email": "fleet@transitops.com",
      "role": "fleet_manager"
    }
  },
  "message": "Login successful"
}
```

### Create a Trip
```http
POST /api/trips
Authorization: Bearer <token>
Content-Type: application/json

{
  "source": "Mumbai",
  "destination": "Pune",
  "vehicle_reg": "VAN-05",
  "driver_id": "DRV-01",
  "cargo_weight_kg": 500,
  "planned_distance_km": 150
}
```

Response:
```json
{
  "success": true,
  "data": {
    "trip_id": "TRP-0016",
    "source": "Mumbai",
    "destination": "Pune",
    "status": "Draft",
    ...
  },
  "message": "Trip created successfully in Draft status."
}
```

### Dispatch a Trip
```http
PATCH /api/trips/TRP-0016/dispatch
Authorization: Bearer <token>
```

Response (success):
```json
{
  "success": true,
  "data": { "trip_id": "TRP-0016", "status": "Dispatched", ... },
  "message": "Trip dispatched successfully."
}
```

Response (failure — expired license):
```json
{
  "success": false,
  "message": "Driver's license has expired (expired: 2024-03-15). Cannot dispatch."
}
```

### Complete a Trip
```http
PATCH /api/trips/TRP-0016/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "actual_distance_km": 152,
  "fuel_consumed_liters": 18.5,
  "revenue": 25000
}
```

### Create Maintenance Record
```http
POST /api/maintenance
Authorization: Bearer <token>
Content-Type: application/json

{
  "vehicle_reg": "VAN-05",
  "maintenance_type": "Oil Change",
  "cost": 3500,
  "start_date": "2026-07-12"
}
```

### Dashboard KPIs
```http
GET /api/dashboard/kpis
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "active_vehicles": 2,
    "available_vehicles": 9,
    "vehicles_in_maintenance": 2,
    "retired_vehicles": 1,
    "total_vehicles": 15,
    "active_trips": 2,
    "pending_trips": 2,
    "drivers_on_duty": 2,
    "total_drivers": 10,
    "fleet_utilization_pct": 13.33
  }
}
```

### ROI Report
```http
GET /api/reports/roi
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "data": [
    {
      "registration_number": "TRK-01",
      "acquisition_cost": "3500000.00",
      "total_revenue": "161000.00",
      "total_maintenance_cost": "3500.00",
      "total_fuel_cost": "22100.00",
      "roi": 0.0384
    }
  ]
}
```

---

## 🔐 RBAC Matrix

| Action | fleet_manager | driver | safety_officer | financial_analyst |
|--------|:---:|:---:|:---:|:---:|
| Create/Update Vehicles | ✅ | ❌ | ❌ | ❌ |
| Read Vehicles | ✅ | ✅ | ✅ | ✅ |
| Create Drivers | ✅ | ❌ | ❌ | ❌ |
| Update Driver (full) | ✅ | ❌ | ❌ | ❌ |
| Update Driver (safety_score, status) | ✅ | ❌ | ✅ | ❌ |
| Create/Dispatch/Complete/Cancel Trips | ✅ | ✅ | ❌ | ❌ |
| Create/Close Maintenance | ✅ | ❌ | ✅ | ❌ |
| Log Fuel/Expenses | ✅ | ✅ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ✅ |
| Export CSV | ✅ | ❌ | ✅ | ✅ |

---

## 🚦 Trip Dispatch Rules Engine

The dispatch endpoint runs 12 sequential checks. Any failure stops immediately with a clear error:

1. Trip exists
2. Trip status is `Draft`
3. Vehicle exists
4. Driver exists
5. Vehicle status is `Available`
6. Vehicle not linked to another Dispatched trip
7. Vehicle has no Active maintenance record
8. Driver status is `Available`
9. Driver is not `Suspended`
10. Driver not linked to another Dispatched trip
11. **Driver license_expiry_date ≥ today** ← guards against expired-but-"Available" seed case
12. cargo_weight_kg ≤ vehicle.max_load_capacity_kg

---

## 🧪 Test Scenarios (Seed Data)

| Scenario | Vehicle | Driver | Expected Result |
|----------|---------|--------|----------------|
| ✅ Valid dispatch | VAN-05 | DRV-01 | Success |
| ❌ Retired vehicle | VEH-02 | DRV-01 | 400: Vehicle not available (Retired) |
| ❌ In-shop vehicle | VEH-03 | DRV-01 | 400: Vehicle not available (In Shop) |
| ❌ In maintenance | TRK-04 | DRV-01 | 400: Vehicle under maintenance |
| ❌ Suspended driver | VAN-05 | DRV-02 | 400: Driver not available (Suspended) |
| ❌ Expired license | VAN-05 | DRV-03 | 400: Driver's license has expired |
| ❌ Overloaded cargo | VAN-05 (max 850kg) | DRV-01 | 400: Cargo weight exceeds capacity |

---

## 📊 State Transitions

**Vehicle:** Available → On Trip (dispatch) → Available (complete/cancel)
**Vehicle:** Available → In Shop (maintenance create) → Available (maintenance close)
**Vehicle:** Any → Retired (manual, terminal)

**Driver:** Available → On Trip (dispatch) → Available (complete/cancel)

**Trip:** Draft → Dispatched → Completed
**Trip:** Draft/Dispatched → Cancelled

All transitions involving 3+ entities use DB transactions.

---

## ⚙️ NPM Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (hot reload) |
| `npm run seed:import` | Import all CSV files |
| `npm run seed:users` | Create demo users |
| `npm run seed:all` | Fresh import + demo users |

---

## 📁 Project Structure

```
server/
├── src/
│   ├── config/db.js              # Sequelize + MySQL connection
│   ├── models/                   # Sequelize models
│   ├── controllers/              # Route handlers
│   ├── routes/                   # Express routers
│   ├── middlewares/              # Auth, RBAC, error handling
│   ├── services/                 # Business logic layer
│   │   ├── tripRulesEngine.js    # Dispatch validation (12 rules)
│   │   ├── maintenanceService.js # Maintenance transactions
│   │   └── reportService.js      # Analytics queries
│   ├── validators/               # express-validator chains
│   ├── utils/                    # ApiError, ApiResponse, asyncHandler
│   ├── seeds/                    # Import scripts + CSV data
│   └── app.js                    # Express app configuration
├── server.js                     # Entry point
├── .env.example                  # Environment template
└── package.json
```

---

## 🔧 Known Assumptions

1. **CSV data imported unchanged**: The 6 seed CSVs are imported as-is. Type coercion (empty → NULL, string → number/date) is the only transformation.
2. **Integrity for new records**: All business rule enforcement (cargo limits, license checks, maintenance locks) applies to records created through the API — not retroactively applied to imported seed data.
3. **No hard DB foreign keys on seed tables**: To allow importing synthetic seed data that may have cross-reference inconsistencies. Indexes are created instead. Application logic enforces referential integrity for new operations.
4. **Revenue field on trips**: The trips table includes a `revenue` field populated from `trips.csv`, used directly in ROI calculations without requiring manual entry at completion (though it can be updated on completion).
5. **Driver license expiry is authoritative**: The rules engine checks `license_expiry_date` directly against today's date, not just `status`. This catches seed data trap cases where a driver has `Available` status but an expired license (e.g., DRV-03).

---

*TransitOps Backend — Odoo Hackathon 2026*
