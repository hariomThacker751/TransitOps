import { ROLES } from './statusConfig.js'

/** App identity + nav metadata. */
export const APP = {
  name: 'TransitOps',
  tagline: 'Fleet Operations Console',
  edition: 'Odoo Hackathon 2026',
}

/** localStorage keys — namespaced to avoid collisions. */
export const STORAGE_KEYS = {
  auth: 'transitops.auth',
  db: 'transitops.db.v1',
}

/**
 * Demo credentials — mirror the seeded users in the backend (seedUsers.js).
 * Passwords match the backend's bcrypt-hashed seeds.
 * In mock mode these are used directly; in real mode they're just hints
 * for the quick-login buttons (the backend validates against the DB).
 */
export const DEMO_USERS = [
  {
    id: 1,
    name: 'Fleet Admin',
    email: 'fleet@transitops.com',
    password: 'Fleet@123',
    role: 'fleet_manager',
    driver_id: null,
  },
  {
    id: 2,
    name: 'Driver Ops',
    email: 'driver@transitops.com',
    password: 'Driver@123',
    role: 'driver',
    driver_id: 'DRV-01',
  },
  {
    id: 3,
    name: 'Safety Team',
    email: 'safety@transitops.com',
    password: 'Safety@123',
    role: 'safety_officer',
    driver_id: null,
  },
  {
    id: 4,
    name: 'Finance Team',
    email: 'finance@transitops.com',
    password: 'Finance@123',
    role: 'financial_analyst',
    driver_id: null,
  },
]

/** Sidebar navigation items with role-gating metadata. */
export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'LayoutDashboard', roles: null },
  { to: '/vehicles', label: 'Vehicles', icon: 'Truck', roles: ['fleet_manager'] },
  { to: '/drivers', label: 'Drivers', icon: 'IdCard', roles: ['fleet_manager', 'safety_officer'] },
  { to: '/trips', label: 'Trips', icon: 'Route', roles: ['fleet_manager', 'driver'] },
  { to: '/maintenance', label: 'Maintenance', icon: 'Wrench', roles: ['fleet_manager', 'safety_officer'] },
  { to: '/fuel-logs', label: 'Fuel Logs', icon: 'Fuel', roles: ['fleet_manager', 'driver'] },
  { to: '/expenses', label: 'Expenses', icon: 'ReceiptText', roles: ['fleet_manager', 'driver', 'financial_analyst'] },
  { to: '/reports', label: 'Reports', icon: 'BarChart3', roles: ['fleet_manager', 'financial_analyst', 'safety_officer'] },
]

/**
 * RBAC permission matrix — the single source of truth for what each role may do.
 * Derived directly from the analysis report's permission table.
 * `null` means "all authenticated roles".
 */
export const PERMISSIONS = {
  // Records
  vehicles: { view: null, create: ['fleet_manager'], edit: ['fleet_manager'] },
  drivers: { view: ['fleet_manager', 'safety_officer'], create: ['fleet_manager'], edit: ['fleet_manager'], suspend: ['safety_officer'] },
  trips: {
    view: ['fleet_manager', 'driver'],
    create: ['fleet_manager', 'driver'],
    dispatch: ['fleet_manager', 'driver'],
    complete: ['fleet_manager', 'driver'],
    cancel: ['fleet_manager', 'driver'],
  },
  maintenance: { view: ['fleet_manager', 'safety_officer'], create: ['fleet_manager', 'safety_officer'], close: ['fleet_manager', 'safety_officer'] },
  fuelLogs: { view: ['fleet_manager', 'driver', 'financial_analyst'], create: ['fleet_manager', 'driver'] },
  expenses: { view: ['fleet_manager', 'driver', 'financial_analyst'], create: ['fleet_manager', 'driver', 'financial_analyst'] },
  reports: { view: ['fleet_manager', 'financial_analyst', 'safety_officer'], export: ['fleet_manager', 'financial_analyst', 'safety_officer'] },
  // Dashboard widgets — which KPI sections each role sees.
  dashboard: {
    fleet: ['fleet_manager'],
    safety: ['fleet_manager', 'safety_officer'],
    financial: ['fleet_manager', 'financial_analyst'],
    operations: ['fleet_manager', 'driver'],
  },
}

/** Check whether a role may perform an action. `null` action value = any role. */
export function can(role, resource, action) {
  const res = PERMISSIONS[resource]
  if (!res) return false
  const allowed = res[action]
  if (allowed === null || allowed === undefined) return true
  if (!role) return false
  return allowed.includes(role)
}

export const ROLE_OPTIONS = Object.values(ROLES)
