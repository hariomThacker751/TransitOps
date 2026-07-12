const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const reportService = require('../services/reportService')

/** GET /api/dashboard/kpis */
const kpis = asyncHandler(async (_req, res) => {
  const data = await reportService.kpis()
  return success(res, data)
})

/** GET /api/dashboard/filters */
const filters = asyncHandler(async (_req, res) => {
  const data = await reportService.filters()
  return success(res, data)
})

/** GET /api/dashboard/charts */
const charts = asyncHandler(async (_req, res) => {
  const data = await reportService.charts()
  return success(res, data)
})

module.exports = { kpis, filters, charts }