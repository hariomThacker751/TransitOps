import { loadSeed } from './seed.js'
import { STORAGE_KEYS } from '@/utils/constants'

/**
 * In-memory database backed by localStorage.
 *
 * - On first load, imports the seed CSVs (unchanged) as the initial dataset.
 * - Every mutation persists the full state to localStorage.
 * - Provides a `reset()` to wipe app-created changes and re-seed from CSVs.
 *
 * This makes the prototype a faithful demo: dispatch/complete/cancel/maintenance
 * operations mutate state exactly as the real backend would, and reloads survive.
 */

let state = null
const listeners = new Set()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(state))
  } catch {
    // localStorage may be full or disabled — fail silently in a demo context.
  }
  listeners.forEach((fn) => fn(state))
}

/** Build a fresh state object from the seed CSVs. */
function freshSeed() {
  const seed = loadSeed()
  return {
    vehicles: seed.vehicles,
    drivers: seed.drivers,
    trips: seed.trips,
    maintenance: seed.maintenance,
    fuelLogs: seed.fuelLogs,
    expenses: seed.expenses,
    _seq: { trip: seed.trips.length, maint: seed.maintenance.length, fuel: seed.fuelLogs.length, exp: seed.expenses.length },
  }
}

/** Load from localStorage if present, otherwise seed from CSVs. */
function init() {
  if (state) return state
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.db)
    if (saved) {
      state = JSON.parse(saved)
      return state
    }
  } catch {
    // corrupt storage — fall through to seed
  }
  state = freshSeed()
  persist()
  return state
}

export const db = {
  get() {
    return init()
  },

  /** Subscribe to state changes (used by React hooks to re-render). */
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  /** Commit a mutation: apply the updater, persist, and notify. */
  commit(updater) {
    init()
    updater(state)
    persist()
    return state
  },

  /** Replace all state with a fresh seed from the CSVs. */
  reset() {
    state = freshSeed()
    persist()
    return state
  },

  /** Peek at the sequence counter for a given entity type. */
  nextSeq(type) {
    init()
    state._seq[type] = (state._seq[type] || 0) + 1
    return state._seq[type]
  },
}
