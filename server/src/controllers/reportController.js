const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const ApiError = require('../utils/ApiError')
const reportService = require('../services/reportService')
const { query } = require('../config/db')

/** GET /api/reports/vehicle-costs */
const vehicleCosts = asyncHandler(async (_req, res) => {
  const data = await reportService.vehicleCosts()
  return success(res, data)
})

/** GET /api/reports/roi */
const roi = asyncHandler(async (_req, res) => {
  const data = await reportService.roi()
  return success(res, data)
})

/** GET /api/reports/fuel-efficiency */
const fuelEfficiency = asyncHandler(async (_req, res) => {
  const data = await reportService.fuelEfficiency()
  return success(res, data)
})

/**
 * GET /api/reports/export/csv?report=vehicle-costs|roi|fuel-efficiency|vehicles|drivers|trips
 *
 * Accepts either `report` (spec) or `type` (frontend) query param.
 * Streams a CSV download with Content-Disposition attachment.
 */
const EXPORTERS = {
  'vehicle-costs': async () => ({
    filename: 'vehicle-costs.csv',
    headers: ['registration_number', 'vehicle_name_model', 'total_fuel_cost', 'total_maintenance_cost', 'total_expense_cost', 'total_operational_cost'],
    rows: (await reportService.vehicleCosts()).map((r) => [
      r.registration_number, r.vehicle_name_model, r.total_fuel_cost, r.total_maintenance_cost, r.total_expense_cost, r.total_operational_cost,
    ]),
  }),
  'roi': async () => ({
    filename: 'roi.csv',
    headers: ['registration_number', 'vehicle_name_model', 'total_revenue', 'total_maintenance_cost', 'total_fuel_cost', 'acquisition_cost', 'roi'],
    rows: (await reportService.roi()).map((r) => [
      r.registration_number, r.vehicle_name_model, r.total_revenue, r.total_maintenance_cost, r.total_fuel_cost, r.acquisition_cost, r.roi ?? '',
    ]),
  }),
  'fuel-efficiency': async () => ({
    filename: 'fuel-efficiency.csv',
    headers: ['registration_number', 'vehicle_name_model', 'completed_trips', 'total_distance', 'total_fuel_liters', 'efficiency_km_per_liter'],
    rows: (await reportService.fuelEfficiency()).map((r) => [
      r.registration_number, r.vehicle_name_model, r.completed_trips, r.total_distance, r.total_fuel_liters, r.efficiency_km_per_liter ?? '',
    ]),
  }),
  'vehicles': async () => {
    const [rows] = await query('SELECT * FROM vehicles ORDER BY registration_number ASC')
    const headers = ['registration_number', 'vehicle_name_model', 'type', 'max_load_capacity_kg', 'odometer_km', 'acquisition_cost', 'status', 'region']
    return {
      filename: 'vehicles.csv',
      headers,
      rows: rows.map((r) => headers.map((h) => r[h])),
    }
  },
  'drivers': async () => {
    const [rows] = await query('SELECT * FROM drivers ORDER BY driver_id ASC')
    const headers = ['driver_id', 'name', 'license_number', 'license_category', 'license_expiry_date', 'contact_number', 'safety_score', 'status']
    return {
      filename: 'drivers.csv',
      headers,
      rows: rows.map((r) => headers.map((h) => r[h])),
    }
  },
  'trips': async () => {
    const [rows] = await query('SELECT * FROM trips ORDER BY created_date DESC, trip_id DESC')
    const headers = ['trip_id', 'source', 'destination', 'vehicle_reg', 'driver_id', 'cargo_weight_kg', 'planned_distance_km', 'actual_distance_km', 'fuel_consumed_liters', 'revenue', 'status', 'created_date', 'dispatched_date', 'completed_date']
    return {
      filename: 'trips.csv',
      headers,
      rows: rows.map((r) => headers.map((h) => r[h] ?? '')),
    }
  },
}

function escapeCsv(value) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsv({ headers, rows }) {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','))
  }
  return lines.join('\r\n')
}

const exportCsv = asyncHandler(async (req, res) => {
  const report = (req.query.report || req.query.type || '').toString()
  const exporter = EXPORTERS[report]
  if (!exporter) {
    throw ApiError.badRequest(
      `Unknown report type "${report}". Valid: ${Object.keys(EXPORTERS).join(', ')}.`,
    )
  }

  const { filename, headers, rows } = await exporter()
  const csv = toCsv({ headers, rows })

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  return res.status(200).send(csv)
})

module.exports = { vehicleCosts, roi, fuelEfficiency, exportCsv }