# TransitOps — Backend API

Rules-driven fleet operations platform backend (Odoo Hackathon 2026).
**Stack:** Node.js + Express + MySQL + JWT + bcrypt. REST/JSON only.

The real product is the **validation & status-synchronization engine**: trip
dispatch rules, atomic state transitions, maintenance locking, RBAC, and
live query-driven analytics.

---

## Setup

### 1. Prerequisites
- Node.js 18+ (built on Node 22)
- MySQL 8 (a local server running on `localhost:3306`)

### 2. Install dependencies
```bash
cd server
npm install
```

### 3. Configure environment
Copy the example and fill in your MySQL credentials:
```bash
cp .env.example .env
```
`.env` contents:
```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=transitops_db
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
```
The database `transitops_db` is created automatically by the seed script /
server start if it does not exist.

### 4. Seed the database
```bash
npm run seed:all
```
This runs `seed:import --fresh` (creates DB + tables, imports the 6 CSVs
unchanged) followed by `seed:users` (creates the 4 demo users).

Individual scripts:
- `npm run seed:import` — import CSVs (idempotent, INSERT IGNORE)
- `npm run seed:import -- --fresh` — truncate imported tables then reload
- `npm run seed:users` — upsert the demo users

### 5. Run the dev server
```bash
npm run dev
```
Server starts on `http://localhost:5000`. Health check: `GET /api/health`.

---

## Demo credentials

| Name | Email | Password | Role |
|---|---|---|---|
| Fleet Admin | fleet@transitops.com | Fleet@123 | fleet_manager |
| Driver Ops | driver@transitops.com | Driver@123 | driver |
| Safety Team | safety@transitops.com | Safety@123 | safety_officer |
| Finance Team | finance@transitops.com | Finance@123 | financial_analyst |

---

## Architecture

```
server/
├── src/
│   ├── config/db.js            # MySQL pool, ensureDatabase(), withTransaction()
│   ├── models/                 # One file per entity: schema + queries
│   ├── controllers/            # Request handlers (thin, delegate to services/models)
│   ├── services/
│   │   ├── tripRulesEngine.js  # 12-rule dispatch validation + transactional transitions
│   │   ├── maintenanceService.js
│   │   └── reportService.js    # KPI/ROI/fuel-efficiency queries
│   ├── routes/                 # Express routers per resource + index
│   ├── middlewares/            # auth, role, validateRequest, errorHandler
│   ├── validators/             # express-validator rules
│   ├── utils/                  # ApiError, ApiResponse, asyncHandler, pagination, ids
│   ├── seeds/                  # CSV importer + user seeder (+ data/*.csv)
│   └── app.js
├── server.js
├── .env.example
└── package.json
```

### Data policy
- The 6 CSVs are imported **unchanged** as seed data (no row mutation; only
  type conversion: empty→NULL, numerics coerced).
- No hard foreign keys on imported relations; integrity for **new** records is
  enforced by the backend service layer (per the plan's soft-relational strategy).
- The `users` table is **not** from CSV — it is created manually.

---

## API routes

### Auth
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | Login, returns JWT |
| GET | `/api/auth/me` | any | Current user profile |

### Vehicles
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/vehicles` | any | List (filters: status, type, region, search, page, limit) |
| GET | `/api/vehicles/eligible-for-dispatch` | any | Available vehicles not under active maintenance |
| GET | `/api/vehicles/:registration_number` | any | Details |
| POST | `/api/vehicles` | fleet_manager | Create |
| PUT | `/api/vehicles/:registration_number` | fleet_manager | Update (cannot manually set On Trip/In Shop) |

### Drivers
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/drivers` | any | List (filters: status, license_category, search, page, limit) |
| GET | `/api/drivers/eligible-for-dispatch` | any | Available + license not expired |
| GET | `/api/drivers/:driver_id` | any | Details |
| POST | `/api/drivers` | fleet_manager | Create |
| PUT | `/api/drivers/:driver_id` | fleet_manager (full) / safety_officer (safety_score, status only) | Update |

### Trips
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/trips` | any | List (filters: status, vehicle_reg, driver_id, date_from, date_to, page, limit) |
| GET | `/api/trips/:trip_id` | any | Details |
| GET | `/api/trips/:trip_id/validate-dispatch` | any | Preview dispatch eligibility |
| POST | `/api/trips` | fleet_manager, driver | Create Draft (rejects cargo overload at creation) |
| PATCH | `/api/trips/:trip_id/dispatch` | fleet_manager, driver | Dispatch (runs rules engine, transactional) |
| PATCH | `/api/trips/:trip_id/complete` | fleet_manager, driver | Complete (transactional, updates odometer) |
| PATCH | `/api/trips/:trip_id/cancel` | fleet_manager, driver | Cancel (restores vehicle/driver if dispatched) |

### Maintenance
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/maintenance` | any | List (filters: status, vehicle_reg, page, limit) |
| POST | `/api/maintenance` | fleet_manager, safety_officer | Create → vehicle In Shop (transactional) |
| PATCH | `/api/maintenance/:maintenance_id/close` | fleet_manager, safety_officer | Close → vehicle Available unless Retired/other active |

### Fuel logs
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/fuel-logs` | any | List (filters: vehicle_reg, trip_id, date_from, date_to, page, limit) |
| POST | `/api/fuel-logs` | fleet_manager, driver | Create |

### Expenses
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/expenses` | any | List (filters: vehicle_reg, expense_type, date_from, date_to, page, limit) |
| POST | `/api/expenses` | fleet_manager, driver | Create |

### Dashboard / Reports
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/api/dashboard/kpis` | any | Live KPIs (utilization, counts) |
| GET | `/api/dashboard/filters` | any | Distinct types & regions |
| GET | `/api/dashboard/charts` | any | Status breakdown series |
| GET | `/api/reports/vehicle-costs` | any | Per-vehicle operational cost |
| GET | `/api/reports/roi` | any | Per-vehicle ROI (completed-trips revenue) |
| GET | `/api/reports/fuel-efficiency` | any | Per-vehicle km/liter |
| GET | `/api/reports/export/csv?report=vehicles\|drivers\|trips\|vehicle-costs\|roi\|fuel-efficiency` | fleet_manager, safety_officer, financial_analyst | CSV download |

---

## Response envelope

Success:
```json
{ "success": true, "data": {}, "message": "optional" }
```
Paginated:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```
Error:
```json
{ "success": false, "message": "human readable error", "errors": [] }
```

---

## Sample requests

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fleet@transitops.com","password":"Fleet@123"}'
```
Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": { "id": 1, "name": "Fleet Admin", "email": "fleet@transitops.com", "role": "fleet_manager" }
  },
  "message": "Login successful."
}
```

### Dispatch a trip
```bash
curl -X PATCH http://localhost:5000/api/trips/TRIP-035/dispatch \
  -H "Authorization: Bearer <token>"
```
On success the trip, its vehicle, and its driver are all updated in one
transaction. On rule violation:
```json
{ "success": false, "message": "Driver's license has expired (expired on 2026-06-12)." }
```

### Create maintenance (locks vehicle)
```bash
curl -X POST http://localhost:5000/api/maintenance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"vehicle_reg":"VAN-05","maintenance_type":"Oil Change","cost":5000,"start_date":"2026-07-12"}'
```

### Reports — ROI
```bash
curl http://localhost:5000/api/reports/roi -H "Authorization: Bearer <token>"
```

---

## Trip dispatch rules engine

`src/services/tripRulesEngine.js#validateDispatch(tripId)` runs 12 checks in
order, fail-fast, with explicit messages:

1. trip exists
2. trip status is `Draft`
3. vehicle exists
4. driver exists
5. vehicle status is `Available`
6. vehicle not on another `Dispatched` trip
7. vehicle has no `Active` maintenance
8. driver status is `Available`
9. driver status is not `Suspended`
10. driver not on another `Dispatched` trip
11. driver `license_expiry_date >= today` (authority over status — catches the
    seed trap where an expired-license driver still shows `Available`)
12. `cargo_weight_kg <= vehicle.max_load_capacity_kg`

### Transactional state transitions
- **Dispatch:** trip→Dispatched, vehicle→On Trip, driver→On Trip, set dispatched_date
- **Complete:** trip→Completed, set completed_date + actual_distance + fuel +
  optional revenue; vehicle→Available; driver→Available; odometer += actual_distance
- **Cancel (from Dispatched):** trip→Cancelled, vehicle→Available, driver→Available
- **Cancel (from Draft):** trip→Cancelled only
- **Maintenance create:** new Active row + vehicle→In Shop
- **Maintenance close:** row→Closed + end_date; vehicle→Available unless Retired
  or another Active record still exists

---

## Known assumptions
- Seed CSVs are imported unchanged; cross-link inconsistencies in the seed are
  preserved (historical data).
- Relational integrity for all new app-created records is enforced in the
  service layer, not via DB foreign keys.
- KPIs/reports are computed live from MySQL — no hardcoded values.
- `trips.revenue` already exists in the dataset and is used directly for ROI
  (only completed trips contribute).

---

## Run (final)
```bash
npm install
npm run seed:all
npm run dev
```