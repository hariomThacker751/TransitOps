import { db } from './db.js'

/**
 * Mock LLM — offline stub for the Ops Copilot and anomaly explainer.
 *
 * In mock mode (VITE_USE_MOCK=true) there's no backend or Sarvam API key.
 * Instead of failing, we derive short, role-aware answers from the in-memory
 * mock DB so the feature is fully demoable. The answers reference real (mock)
 * data, mirroring what the live LLM would summarize.
 */

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))
const ok = (data) => ({ success: true, data })

function fmtINR(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n))
}

/**
 * Build a compact, role-aware answer from mock data.
 * Not a real LLM — just deterministic, data-grounded stub text.
 */
function stubAnswer(role, question) {
  const state = db.get()
  const q = (question || '').toLowerCase()

  if (role === 'driver') {
    const driver = state.drivers.find((d) => d.driver_id === 'DRV-01') || state.drivers[0]
    if (!driver) return 'Aapka driver record nahi mila. Please admin se contact karein.'
    const myTrips = state.trips.filter((t) => t.driver_id === driver.driver_id)
    const active = myTrips.find((t) => t.status === 'Dispatched')
    if (q.includes('trip') || q.includes('route') || q.includes('next')) {
      if (active) {
        return `Aapki current trip ${active.trip_id} hai: ${active.source} se ${active.destination} tak. Vehicle: ${active.vehicle_reg}. Safe driving karein!`
      }
      const next = myTrips.find((t) => t.status === 'Draft')
      if (next) return `Aapki next assigned trip ${next.trip_id} hai (${next.source} → ${next.destination}), abhi Draft status mein hai. Dispatch hone ka wait karein.`
      return `Aaj ke liye koi assigned trip nahi hai. Naye assignment ka intezar karein.`
    }
    if (q.includes('license') || q.includes('renew')) {
      return driver.license_expiry_date
        ? `Aapka license ${driver.license_expiry_date} ko expire ho raha hai. Time rehte pehle renewal karwa lijiye.`
        : 'License expiry ki jaankari available nahi hai.'
    }
    if (q.includes('vehicle') || q.includes('status')) {
      const vRegs = [...new Set(myTrips.map((t) => t.vehicle_reg).filter(Boolean))]
      const vehicles = state.vehicles.filter((v) => vRegs.includes(v.registration_number))
      if (!vehicles.length) return 'Aapko abhi koi vehicle assign nahi hai.'
      return vehicles.map((v) => `${v.registration_number} (${v.vehicle_name_model}): ${v.status}`).join('. ')
    }
    return `Namaste ${driver.name}! Main aapki trips, vehicle status aur license ke baare mein help kar sakta hoon. Aap kya jaanna chahte hain?`
  }

  if (role === 'safety_officer') {
    const today = new Date().toISOString().slice(0, 10)
    const expired = state.drivers.filter((d) => d.license_expiry_date && d.license_expiry_date < today)
    const lowScore = state.drivers.filter((d) => d.safety_score !== null && Number(d.safety_score) < 70)
    const suspended = state.drivers.filter((d) => d.status === 'Suspended')
    const parts = []
    if (expired.length) parts.push(`${expired.length} driver(s) ka license expire ho chuka hai: ${expired.map((d) => `${d.name} (${d.driver_id})`).join(', ')}.`)
    if (lowScore.length) parts.push(`${lowScore.length} driver(s) ka safety score 70 se kam hai: ${lowScore.map((d) => `${d.name} (${d.safety_score})`).join(', ')}.`)
    if (suspended.length) parts.push(`${suspended.length} driver(s) suspended hain: ${suspended.map((d) => d.name).join(', ')}.`)
    if (!parts.length) return 'Sab drivers compliant hain — koi safety alert nahi.'
    return parts.join(' ')
  }

  if (role === 'financial_analyst') {
    const { vehicles, trips, fuelLogs, maintenance } = state
    const rows = vehicles.map((v) => {
      const revenue = trips.filter((t) => t.vehicle_reg === v.registration_number && t.status === 'Completed').reduce((s, t) => s + Number(t.revenue || 0), 0)
      const fuel = fuelLogs.filter((f) => f.vehicle_reg === v.registration_number).reduce((s, f) => s + Number(f.cost || 0), 0)
      const maint = maintenance.filter((m) => m.vehicle_reg === v.registration_number).reduce((s, m) => s + Number(m.cost || 0), 0)
      return { reg: v.registration_number, revenue, opCost: fuel + maint, fuel, maint }
    }).sort((a, b) => b.opCost - a.opCost)
    const top = rows[0]
    const totalRev = rows.reduce((s, r) => s + r.revenue, 0)
    const totalCost = rows.reduce((s, r) => s + r.opCost, 0)
    return `Total revenue ${fmtINR(totalRev)} hai aur total operational cost ${fmtINR(totalCost)} hai. Sabse zyada operational cost ${top.reg} ka hai (${fmtINR(top.opCost)} — fuel ${fmtINR(top.fuel)} + maintenance ${fmtINR(top.maint)}). Fuel cost overall cost ka bada hissa hai, isliye fuel efficiency improve karne se savings ho sakti hain.`
  }

  // fleet_manager (default)
  const { vehicles, trips, fuelLogs, maintenance } = state
  const activeVehicles = vehicles.filter((v) => v.status === 'On Trip').length
  const inShop = vehicles.filter((v) => v.status === 'In Shop').length
  const util = vehicles.length ? Math.round((activeVehicles / vehicles.length) * 100) : 0
  const costRows = vehicles.map((v) => {
    const fuel = fuelLogs.filter((f) => f.vehicle_reg === v.registration_number).reduce((s, f) => s + Number(f.cost || 0), 0)
    const maint = maintenance.filter((m) => m.vehicle_reg === v.registration_number).reduce((s, m) => s + Number(m.cost || 0), 0)
    return { reg: v.registration_number, opCost: fuel + maint, status: v.status }
  }).sort((a, b) => b.opCost - a.opCost)
  const top = costRows[0]
  if (q.includes('cost') || q.includes('retire') || q.includes('bottleneck')) {
    return `Fleet utilization ${util}% hai (${activeVehicles}/${vehicles.length} on trip, ${inShop} in shop). Sabse zyada operational cost ${top.reg} ka hai (${fmtINR(top.opCost)}, status: ${top.status}). Agar cost high hai aur utilization low hai, toh is vehicle ko retire karne ya reallocate karne par vichar kiya ja sakta hai.`
  }
  return `Fleet overview: ${vehicles.length} vehicles, ${activeVehicles} on trip, ${inShop} in maintenance, utilization ${util}%. ${trips.length} total trips recorded. Sabse mehenga vehicle abhi ${top.reg} hai. Aap puch sakte hain: "top cost vehicles", "which to retire", ya "bottlenecks".`
}

export const mockLlm = {
  async opsQuery(question, role) {
    await delay()
    const effectiveRole = role || 'fleet_manager'
    return ok({
      answer: stubAnswer(effectiveRole, question),
      role: effectiveRole,
      model: 'mock-stub',
      usage: null,
      contextUsed: null,
    })
  },
  async explainAnomaly({ vehicle_reg, metric, window }) {
    await delay(500)
    const { vehicles, trips, fuelLogs, maintenance, expenses } = db.get()
    const v = vehicles.find((x) => x.registration_number === vehicle_reg)
    if (!v) return { success: false, message: `Vehicle "${vehicle_reg}" not found.` }
    const vTrips = trips.filter((t) => t.vehicle_reg === vehicle_reg && t.status === 'Completed')
    const revenue = vTrips.reduce((s, t) => s + Number(t.revenue || 0), 0)
    const fuel = fuelLogs.filter((f) => f.vehicle_reg === vehicle_reg).reduce((s, f) => s + Number(f.cost || 0), 0)
    const maint = maintenance.filter((m) => m.vehicle_reg === vehicle_reg).reduce((s, m) => s + Number(m.cost || 0), 0)
    const exp = expenses.filter((e) => e.vehicle_reg === vehicle_reg).reduce((s, e) => s + Number(e.amount || 0), 0)
    const opCost = fuel + maint
    const acq = Number(v.acquisition_cost || 0)
    const roi = acq > 0 ? Number((((revenue - opCost) / acq) * 100).toFixed(2)) : 0
    const distance = vTrips.reduce((s, t) => s + Number(t.actual_distance_km || t.planned_distance_km || 0), 0)
    const tripFuel = vTrips.reduce((s, t) => s + Number(t.fuel_consumed_liters || 0), 0)
    const eff = tripFuel > 0 ? Number((distance / tripFuel).toFixed(2)) : 0

    let answer
    if (metric === 'roi') {
      answer = `${vehicle_reg} ka ROI ${roi.toFixed(1)}% hai. Revenue ${fmtINR(revenue)} aur operational cost ${fmtINR(opCost)} (fuel ${fmtINR(fuel)} + maintenance ${fmtINR(maint)}) hai. ${roi < 10 ? 'ROI low hai — fuel ya maintenance cost ko reduce karne par improve ho sakta hai.' : 'ROI theek hai.'}`
    } else if (metric === 'operational_cost') {
      answer = `${vehicle_reg} ka operational cost ${fmtINR(opCost)} hai (${window.from} se ${window.to} tak). Isme fuel ${fmtINR(fuel)} aur maintenance ${fmtINR(maint)} shamil hai. ${fuel > maint ? 'Fuel cost bada driver hai.' : 'Maintenance cost bada driver hai.'}`
    } else {
      answer = `${vehicle_reg} ki fuel efficiency ${eff} km/L hai (${vTrips.length} completed trips, ${distance} km, ${tripFuel.toFixed(1)} L fuel). ${eff > 0 && eff < 4 ? 'Efficiency low hai — vehicle service ya driving pattern review karwaayein.' : 'Efficiency acceptable hai.'}`
    }

    return ok({
      answer,
      vehicle_reg,
      metric,
      window,
      model: 'mock-stub',
      summary: {
        total_revenue: revenue,
        total_fuel_cost: fuel,
        total_maintenance_cost: maint,
        total_expense_cost: exp,
        total_operational_cost: opCost,
        acquisition_cost: acq,
        roi,
        total_distance_km: distance,
        trip_fuel_liters: tripFuel,
        fuel_efficiency_km_per_liter: eff,
        completed_trips: vTrips.length,
      },
    })
  },
}

export default mockLlm