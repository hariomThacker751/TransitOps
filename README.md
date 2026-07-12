# TransitOps — Fleet Operations Console

A rules-driven fleet operations platform built for **Odoo Hackathon 2026**. The frontend ships with a fully functional client-side rules engine that simulates the entire backend (dispatch validation, atomic state transitions, maintenance locking, and live KPI analytics) so it can be demoed standalone — and flips to the real Express + MySQL backend with a single env flag.

## ✨ Highlights

- **13-rule dispatch validation engine** — every eligibility check rendered as a live pass/fail checklist
- **Atomic state machine** — dispatch/complete/cancel atomically sync Trip + Vehicle + Driver statuses
- **Maintenance locking** — creating a maintenance record instantly locks the vehicle to "In Shop"; closing restores it
- **Role-based access control** — 4 roles (Fleet Manager, Driver, Safety Officer, Financial Analyst) with server-side-equivalent enforcement
- **Live KPI dashboards** — fleet utilization, active trips, safety alerts, ROI — all computed from real data
- **Reports & CSV export** — vehicle ROI, cost breakdown, and fuel efficiency with one-click export
- **Premium UI** — custom design system on Tailwind + Headless UI, dark "ops console" sidebar, fully responsive

## 🚀 Quick Start

```bash
npm install
npm run dev          # starts on http://localhost:5173
```

### Demo Logins

| Role | Email | Password |
|---|---|---|
| Fleet Manager | `fleet@transitops.com` | `transitops` |
| Driver | `driver@transitops.com` | `transitops` |
| Safety Officer | `safety@transitops.com` | `transitops` |
| Financial Analyst | `finance@transitops.com` | `transitops` |

Or use the **one-click demo buttons** on the login screen. In mock mode, the topbar has a **role switcher** to instantly view any role's dashboard without re-logging in.

## 🏗️ Architecture

```
TransitOps/
├── *.csv                      # Seed datasets (single source of truth, imported via Vite ?raw)
└── src/
    ├── api/
    │   ├── index.js           # Unified facade — routes to mock or real based on VITE_USE_MOCK
    │   ├── mock/              # Client-side rules engine + state machine
    │   │   ├── seed.js        # Parses the 6 CSVs into normalized records
    │   │   ├── db.js          # In-memory store with localStorage persistence
    │   │   ├── rules.js       # The 13-rule dispatch validation engine
    │   │   └── transitions.js # Atomic state transitions (dispatch/complete/cancel/maintenance)
    │   └── real/              # Axios calls to the Express API (plan's exact endpoints)
    ├── context/AuthContext.jsx
    ├── routes/guards.jsx      # ProtectedRoute + RoleGuard
    ├── layouts/               # MainLayout, Sidebar, Topbar
    ├── components/
    │   ├── ui/                # Design system primitives
    │   └── domain/            # Forms + dispatch panel
    ├── pages/                 # 9 pages
    └── utils/                 # cn, format, csv, statusConfig, constants
```

### Swappable Data Layer

The app runs in **mock mode** by default (`VITE_USE_MOCK=true`). All business logic — the 13 dispatch rules, status transitions, maintenance locking, and KPI computation — is faithfully simulated client-side. State persists to `localStorage` and can be reset to seed via the topbar "Reset data" button.

To connect the real backend:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:4000
```

No component changes needed — the `src/api/` facade routes every call to the corresponding REST endpoint.

## 🔧 Business Rules

### Dispatch Eligibility (all 13 must pass)

1. Trip is in Draft status
2. Vehicle exists
3. Driver exists
4. Vehicle status is Available
5. Vehicle is not In Shop
6. Vehicle is not Retired
7. Driver status is Available
8. Driver is not Suspended
9. Driver license is not expired
10. Cargo weight ≤ vehicle max load capacity
11. Vehicle has no active maintenance record
12. Vehicle not on another dispatched trip
13. Driver not on another dispatched trip

### Atomic State Transitions

| Operation | Trip | Vehicle | Driver |
|---|---|---|---|
| Dispatch | Draft → Dispatched | Available → On Trip | Available → On Trip |
| Complete | Dispatched → Completed | On Trip → Available | On Trip → Available |
| Cancel (was dispatched) | Dispatched → Cancelled | On Trip → Available | On Trip → Available |
| Cancel (was draft) | Draft → Cancelled | — | — |
| Maintenance create | — | → In Shop | — |
| Maintenance close | — | → Available* | — |

\* Unless the vehicle is Retired.

## 🎨 Tech Stack

- **React 18** + **Vite** (JSX)
- **TailwindCSS** — utility styling + design tokens
- **Headless UI** + **Radix** — accessible primitives
- **Recharts** — KPI charts
- **React Router v6** — routing + route guards
- **papaparse** — seed CSV parsing
- **axios** — real-API transport

## 📊 Seed Data

The six CSV files at the repo root are the imported unchanged as seed data:
- `vehicles.csv` (16 vehicles)
- `drivers.csv` (18 drivers)
- `trips.csv` (44 trips)
- `maintenance_logs.csv` (21 records)
- `fuel_logs.csv` (60 logs)
- `expenses.csv` (30 expenses)

## 📝 Demo Script

1. Login as Fleet Manager
2. View the dashboard KPIs and charts
3. Go to Trips → create a draft trip with an Available vehicle & driver
4. Click Dispatch — review the 13-rule checklist, then dispatch
5. Try dispatching with a Suspended or expired-license driver — see the rejection
6. Go to Maintenance → create a record — watch the vehicle lock to In Shop
7. Close the maintenance — vehicle returns to Available
8. Go to Reports → view ROI table and export CSV

---

*Built for Odoo Hackathon 2026 — Virtual Round.*