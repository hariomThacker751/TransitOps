const MaintenanceLog = require('../models/MaintenanceLog')
const Vehicle = require('../models/Vehicle')
const ApiError = require('../utils/ApiError')
const { withTransaction } = require('../config/db')
const { nextId } = require('../utils/ids')

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Create a maintenance record (transactional):
 * - reject if the vehicle already has an Active maintenance row (409)
 * - reject if the vehicle is Retired
 * - set the new row status = Active
 * - set vehicle status = In Shop
 */
async function create({ vehicle_reg, maintenance_type, cost, start_date }) {
  const vehicle = await Vehicle.findByReg(vehicle_reg)
  if (!vehicle) {
    throw ApiError.notFound(`Vehicle ${vehicle_reg} not found.`)
  }
  if (vehicle.status === 'Retired') {
    throw ApiError.badRequest('Cannot schedule maintenance for a Retired vehicle.')
  }

  const alreadyActive = await MaintenanceLog.hasActiveForVehicle(vehicle_reg)
  if (alreadyActive) {
    throw ApiError.conflict(`Vehicle ${vehicle_reg} already has an active maintenance record.`)
  }

  // Insert + vehicle status update inside the transaction; fetch the committed
  // row AFTER commit so the read is not served from a separate pool connection
  // that cannot see the uncommitted writes.
  const id = await withTransaction(async (conn, q) => {
    const newId = await nextId(conn, 'MNT', 'maintenance_logs', 'maintenance_id', 3)
    await q(
      `INSERT INTO maintenance_logs (maintenance_id, vehicle_reg, maintenance_type, cost, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Active')`,
      [newId, vehicle_reg, maintenance_type, Number(cost) || 0, start_date || today(), null],
    )
    await q(`UPDATE vehicles SET status = 'In Shop' WHERE registration_number = ?`, [vehicle_reg])
    return newId
  })
  return MaintenanceLog.findById(id)
}

/**
 * Close a maintenance record (transactional):
 * - set row status = Closed, end_date = today (or provided)
 * - if vehicle is Retired, keep Retired
 * - else if another Active maintenance row still exists for the vehicle, keep In Shop
 * - else set vehicle status = Available
 */
async function close(maintenanceId, { end_date } = {}) {
  const rec = await MaintenanceLog.findById(maintenanceId)
  if (!rec) {
    throw ApiError.notFound(`Maintenance record ${maintenanceId} not found.`)
  }
  if (rec.status === 'Closed') {
    throw ApiError.badRequest('Maintenance record is already closed.')
  }

  await withTransaction(async (conn, q) => {
    await q(
      `UPDATE maintenance_logs SET status = 'Closed', end_date = ? WHERE maintenance_id = ?`,
      [end_date || today(), maintenanceId],
    )

    const [vRows] = await q(`SELECT status FROM vehicles WHERE registration_number = ?`, [
      rec.vehicle_reg,
    ])
    const vehicleStatus = vRows[0]?.status

    if (vehicleStatus === 'Retired') {
      // Keep Retired — do nothing to the vehicle.
    } else {
      const [activeRows] = await q(
        `SELECT COUNT(*) AS n FROM maintenance_logs WHERE vehicle_reg = ? AND status = 'Active'`,
        [rec.vehicle_reg],
      )
      if (activeRows[0].n > 0) {
        // Another active record keeps the vehicle In Shop.
      } else {
        await q(`UPDATE vehicles SET status = 'Available' WHERE registration_number = ?`, [
          rec.vehicle_reg,
        ])
      }
    }
  })
  return MaintenanceLog.findById(maintenanceId)
}

module.exports = { create, close }