# TransitOps — Frontend Build Plan

Build a production-grade React frontend for the TransitOps fleet-operations platform. The backend (Express + MySQL) is being built separately, so the frontend ships with a **fully functional mock layer** that simulates the entire rules engine + state machine client-side, with an env flag that flips every call to the real REST API (exact endpoints from the plan) with zero page changes.

## Locked decisions (confirmed)
- **Language:** JavaScript / JSX
- **UI layer:** Custom premium design system — Tailwind + accessible headless primitives (Headless UI + Radix), hand-built for a distinctive fleet-ops console look
- **Mock depth:** Full functional prototype — dispatch validation, auto status transitions, maintenance locking, and live KPIs all work in-browser; state persists via localStorage; flips to real API via `VITE_USE_MOCK`

## Tech stack
- **Vite + React 18** (JSX) — fast HMR, modern, the de-facto standard
- **TailwindCSS v3.4** + PostCSS — utility styling + design tokens
- **React Router v6** — routing + route guards
- **Headless UI** (Dialog/Menu/Popover/Listbox/Tabs) + **Radix Tooltip** — accessible primitives, custom-styled
- **Recharts** — KPI charts (donut, bar, gauge, line)
- **react-hot-toast** — action feedback
- **lucide-react** — icons
- **papaparse** — parse the seed CSVs (imported from repo root via Vite `?raw`, so the dataset files stay the single source of truth and are never modified)
- **axios** — real-API transport (used only when mock is off)
- **date-fns, clsx, tailwind-merge** — formatting + class composition

## Design language (the "best UI/UX" goal)
- **Aesthetic:** dark sidebar "ops console" + clean light content area. Refined slate/zinc neutrals, **indigo primary**, and a strict semantic status palette.
- **Status colors:** Available=emerald · On Trip=blue · In Shop=amber · Retired=zinc · Off Duty=slate · Suspended=red · Draft=slate · Dispatched=blue · Completed=emerald · Cancelled=zinc · license expiring≤30d=amber · expired=red.
- **Patterns:** KPI cards with icons + accents; data tables with search/filter/sort + responsive card mode on mobile; modals/drawers for forms and detail views (snappy SPA feel, no route-per-detail); toast + confirm-dialog for actions; skeletons + empty states throughout; consistent spacing/typography/shadow/rounded-corner tokens.

## Architecture — swappable data layer
`src/api/` exposes one facade per resource (auth, vehicles, drivers, trips, maintenance, fuelLogs, expenses, dashboard, reports). `client.js` routes each call to **mock/** or **real/** based on `VITE_USE_MOCK` (default `true`).

- **mock/seed.js** — parse the 6 root CSVs (`?raw` + papaparse) into a normalized in-memory DB.
- **mock/db.js** — in-memory store, auto-persisted to localStorage on every mutation, rehydrated on load, with a "reset to seed" action.
- **mock/rules.js** — the dispatch **validation engine**: all 13 eligibility rules from the plan, returning `{ ok, checks:[{rule,label,passed}], violations:[{rule,message}] }` so the UI can render a live pass/fail checklist.
- **mock/transitions.js** — atomic-style state transitions mirroring the plan's transactional ops: `dispatchTrip`, `completeTrip`, `cancelTrip`, `createMaintenance` (→ vehicle In Shop), `closeMaintenance` (→ vehicle Available unless Retired).
- **real/index.js** — axios calls to the exact endpoints from the plan (`/api/auth/login`, `/api/vehicles`, `…/trips/:id/dispatch`, `/api/dashboard/kpis`, `/api/reports/roi`, `/api/reports/export/csv`, etc.). Ready so the backend person's work plugs in by flipping one flag.

## Auth & RBAC
- `AuthContext`: user + role + token, persisted to localStorage. Mock login accepts the 4 demo users from the plan (fleet@/driver@/safety@/finance@transitops.com).
- `ProtectedRoute` + `RoleGuard` gate routes and actions per the permission matrix (sidebar items, action buttons, dashboard widgets).
- **Demo role-switcher** in the topbar (mock mode) — evaluators instantly view all 4 role-based dashboards without re-logging in. A high-impact demo feature.

## Pages (9) — matching the plan + analysis report
1. **Login** — branded split screen: identity panel + login form with one-click demo buttons per role.
2. **Dashboard** (role-gated) — 7 live KPI cards + charts (fleet status donut, trips by status, utilization gauge, trips over time); safety view (license compliance, suspended drivers, avg safety score) and financial view (fuel/maintenance/operational cost, ROI) for those roles.
3. **Vehicles** — DataTable (reg, model, type, max load, odometer, cost, status, region), filters (status/type/region/search), create/edit modal, detail drawer with linked trips/maintenance/fuel/expenses.
4. **Drivers** — DataTable with filters, safety-score bars, color-coded license-expiry warnings, create/edit modal, detail drawer.
5. **Trips** *(hero page)* — DataTable + filters; create Draft (TripForm); **DispatchActionPanel** showing the live 13-rule eligibility checklist with clear violation messages, Dispatch runs the rules engine (success flips trip→Dispatched + vehicle/driver→On Trip; failure shows rejection reason); **CompleteTripModal** (actual distance + fuel consumed → restores statuses); **Cancel** confirm (restores statuses if was dispatched). This visibly demonstrates business correctness — the demo's core.
6. **Maintenance** — active/closed list; create (immediately sets vehicle → In Shop); close (restores → Available unless Retired). Status coupling shown explicitly.
7. **Fuel Logs** — list + filters (vehicle/date) + create modal.
8. **Expenses** — list + filters (type/vehicle/date) + create modal.
9. **Reports** (role-gated) — Vehicle ROI table (sortable, color-coded +/−), operational cost breakdown (stacked bar: fuel vs maintenance vs expenses), fuel-efficiency report, and **CSV export** (generic `utils/csv.js` array→CSV download) of the current report view.

## Project structure
```
TransitOps/
├─ index.html  package.json  vite.config.js
├─ tailwind.config.js  postcss.config.js  .gitignore  README.md
├─ *.csv                         ← existing seed (single source, imported via ?raw; never modified)
└─ src/
   ├─ main.jsx  App.jsx  index.css
   ├─ api/  (index, client, auth, vehicles, drivers, trips, maintenance,
   │        fuelLogs, expenses, dashboard, reports)
   │   ├─ mock/  (index, seed, db, rules, transitions)
   │   └─ real/  (index — axios to plan endpoints)
   ├─ context/AuthContext.jsx
   ├─ routes/  (ProtectedRoute, RoleGuard, index)
   ├─ layouts/  (MainLayout, Sidebar, Topbar)
   ├─ components/
   │   ├─ ui/   (Button, Input, Select, Textarea, FormField, Badge, StatusBadge,
   │   │        Card, Modal, Drawer, ConfirmDialog, DataTable, FilterBar, KpiCard,
   │   │        ChartCard, Tabs, Tooltip, Dropdown, EmptyState, Loader, Skeleton, PageHeader)
   │   └─ domain/  (VehicleForm, DriverForm, TripForm, DispatchActionPanel,
   │               CompleteTripModal, MaintenanceForm, FuelLogForm, ExpenseForm,
   │               ROITable, CostBreakdownChart, RoleSwitcher)
   ├─ pages/  (Login, Dashboard, Vehicles, Drivers, Trips, Maintenance,
   │          FuelLogs, Expenses, Reports)
   ├─ hooks/  (useAuth, useResource, useDebounce)
   └─ utils/  (cn, format, csv, statusConfig, constants)
```

## Build order (each step yields a runnable, committable state)
1. **Scaffold** Vite+React+Tailwind, install deps, design tokens, base UI primitives, `cn`/format/status utils.
2. **Mock data layer** — seed CSVs → DB (localStorage), rules engine, transitions. Verify dispatch/complete/cancel/maintenance logic.
3. **Auth + RBAC + routing + layout** — login, role switcher, protected routes, sidebar/topbar.
4. **Dashboard** — role-gated KPIs + charts (live-computed from the mock DB).
5. **Vehicles** → 6. **Drivers** → 7. **Trips (hero)** → 8. **Maintenance** → 9. **Fuel Logs** → 10. **Expenses**.
11. **Reports** — ROI table, cost breakdown, fuel efficiency, CSV export.
12. **Polish** — responsive (sidebar drawer, card stacking), empty states, skeletons, toasts, confirm dialogs, README.

## Commit cadence
Per the hackathon git strategy, I'll commit in meaningful, runnable chunks with `feat:`/`ui:`/`fix:` prefixes roughly every 60–90 min of work, so pushes show steady progress as required.

## Notes / defaults I'm taking
- App lives at the **repo root** (frontend-only deliverable; backend is a separate effort). Existing CSVs stay at root as the single seed source, imported read-only.
- All business rules are enforced **client-side in the mock** (mirroring the server logic) so the prototype is a faithful demo; the real backend remains the enforcement authority in production.
- No backend, no env secrets beyond an optional `VITE_API_BASE_URL` for real mode.