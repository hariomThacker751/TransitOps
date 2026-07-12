/**
 * Central status vocabulary for TransitOps.
 * Every status maps to a semantic colour token, a soft bg/border/text combination,
 * and a dot colour for inline indicators. Keep these consistent across the whole app.
 */

// Tailwind class strings resolved at build time (must be literal for JIT).
const PALETTE = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  zinc: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
}

const DOT = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  zinc: 'bg-zinc-400',
  slate: 'bg-slate-400',
  indigo: 'bg-indigo-500',
}

export const VEHICLE_STATUS = {
  Available: { key: 'Available', label: 'Available', palette: 'emerald', dot: 'emerald', tone: 'positive' },
  'On Trip': { key: 'On Trip', label: 'On Trip', palette: 'blue', dot: 'blue', tone: 'active' },
  'In Shop': { key: 'In Shop', label: 'In Shop', palette: 'amber', dot: 'amber', tone: 'warning' },
  Retired: { key: 'Retired', label: 'Retired', palette: 'zinc', dot: 'zinc', tone: 'neutral' },
}

export const DRIVER_STATUS = {
  Available: { key: 'Available', label: 'Available', palette: 'emerald', dot: 'emerald', tone: 'positive' },
  'On Trip': { key: 'On Trip', label: 'On Trip', palette: 'blue', dot: 'blue', tone: 'active' },
  'Off Duty': { key: 'Off Duty', label: 'Off Duty', palette: 'slate', dot: 'slate', tone: 'neutral' },
  Suspended: { key: 'Suspended', label: 'Suspended', palette: 'red', dot: 'red', tone: 'danger' },
}

export const TRIP_STATUS = {
  Draft: { key: 'Draft', label: 'Draft', palette: 'slate', dot: 'slate', tone: 'neutral' },
  Dispatched: { key: 'Dispatched', label: 'Dispatched', palette: 'blue', dot: 'blue', tone: 'active' },
  Completed: { key: 'Completed', label: 'Completed', palette: 'emerald', dot: 'emerald', tone: 'positive' },
  Cancelled: { key: 'Cancelled', label: 'Cancelled', palette: 'zinc', dot: 'zinc', tone: 'neutral' },
}

export const MAINTENANCE_STATUS = {
  Active: { key: 'Active', label: 'Active', palette: 'amber', dot: 'amber', tone: 'warning' },
  Closed: { key: 'Closed', label: 'Closed', palette: 'emerald', dot: 'emerald', tone: 'positive' },
}

export const ROLES = {
  fleet_manager: { key: 'fleet_manager', label: 'Fleet Manager', palette: 'indigo', dot: 'indigo' },
  driver: { key: 'driver', label: 'Driver', palette: 'blue', dot: 'blue' },
  safety_officer: { key: 'safety_officer', label: 'Safety Officer', palette: 'amber', dot: 'amber' },
  financial_analyst: { key: 'financial_analyst', label: 'Financial Analyst', palette: 'emerald', dot: 'emerald' },
}

/** Resolve a status value against a status group, with a safe fallback. */
export function resolveStatus(group, value) {
  return group[value] || { key: value, label: value || 'Unknown', palette: 'zinc', dot: 'zinc', tone: 'neutral' }
}

export function badgeClasses(palette) {
  return PALETTE[palette] || PALETTE.zinc
}

export function dotClasses(palette) {
  return DOT[palette] || DOT.zinc
}

// Convenience option lists for selects / filters.
export const VEHICLE_STATUS_OPTIONS = Object.values(VEHICLE_STATUS).map((s) => ({ value: s.key, label: s.label }))
export const DRIVER_STATUS_OPTIONS = Object.values(DRIVER_STATUS).map((s) => ({ value: s.key, label: s.label }))
export const TRIP_STATUS_OPTIONS = Object.values(TRIP_STATUS).map((s) => ({ value: s.key, label: s.label }))
export const MAINTENANCE_STATUS_OPTIONS = Object.values(MAINTENANCE_STATUS).map((s) => ({ value: s.key, label: s.label }))

// Vehicle types & regions derived from the seed dataset (non-exhaustive but covers all rows).
export const VEHICLE_TYPES = ['Truck', 'Trailer', 'Mini-Truck', 'Pickup', 'Van']
export const VEHICLE_REGIONS = ['North', 'South', 'East', 'West', 'Central']
export const LICENSE_CATEGORIES = ['LMV', 'LMV-TR', 'HMV', 'HMV-TR', 'MCWG']
export const EXPENSE_TYPES = [
  'Traffic Fine',
  'Permit Renewal',
  'Parking',
  'Loading Charges',
  'Toll',
  'Insurance',
  'Repair',
  'Other',
]
export const MAINTENANCE_TYPES = [
  'General Inspection',
  'AC Service',
  'Brake Service',
  'Engine Overhaul',
  'Tyre Replacement',
  'Oil Change',
  'Body Repair',
]
