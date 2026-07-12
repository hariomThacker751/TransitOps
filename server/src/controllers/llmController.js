const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getPromptForRole, getAnomalyPrompt } = require('../services/llmPrompts');
const {
  buildFleetManagerContext,
  buildSafetyOfficerContext,
  buildFinancialAnalystContext,
  buildDriverContext,
  buildAnomalyContext,
} = require('../services/llmContextBuilder');
const { callOpsCopilot, callAnomalyExplainer, getConfig } = require('../services/llmClient');

/**
 * LLM Controller — exposes read-only, authenticated LLM endpoints.
 *
 * These endpoints NEVER mutate the database. They gather a role-scoped context
 * snapshot, pass it to the LLM for summarization/explanation, and return the
 * answer. The deterministic rules engine is untouched and authoritative.
 */

const VALID_ROLES = ['fleet_manager', 'safety_officer', 'financial_analyst', 'driver'];
const VALID_METRICS = ['roi', 'operational_cost', 'fuel_efficiency'];

/**
 * Resolve the effective role for an ops-query.
 * - A user may explicitly pass a role only if they hold that role.
 * - Driver-role users are always scoped to their own data.
 */
function resolveRole(req) {
  const requested = req.body.role;
  const sessionRole = req.user.role;

  if (requested && !VALID_ROLES.includes(requested)) {
    throw new ApiError(400, `Invalid role. Allowed: ${VALID_ROLES.join(', ')}.`);
  }

  // Drivers can only ever query as themselves — they must not see other roles' data.
  if (sessionRole === 'driver') {
    return 'driver';
  }
  // Non-driver users may request a different role only if it matches their own
  // (prevents a fleet_manager from impersonating a safety_officer's dataset
  //  in a way that could leak cross-role context). Default to their session role.
  return requested && requested === sessionRole ? requested : sessionRole;
}

/**
 * Build the context snapshot appropriate for the effective role.
 */
async function buildContextForRole(role, req) {
  switch (role) {
    case 'fleet_manager':
      return buildFleetManagerContext();
    case 'safety_officer':
      return buildSafetyOfficerContext();
    case 'financial_analyst':
      return buildFinancialAnalystContext();
    case 'driver': {
      if (!req.user.driver_id) {
        throw new ApiError(400, 'Your account is not linked to a driver record, so the driver assistant has no data to work with.');
      }
      return buildDriverContext(req.user.driver_id);
    }
    default:
      return buildFleetManagerContext();
  }
}

/**
 * POST /api/llm/ops-query
 * Body: { question: string, role?: string }
 *
 * Role-aware Ops Copilot. READ-ONLY.
 */
const opsQuery = asyncHandler(async (req, res) => {
  const { question } = req.body;

  if (!question || !question.trim()) {
    throw new ApiError(400, 'A question is required.');
  }

  const effectiveRole = resolveRole(req);
  const contextSummary = await buildContextForRole(effectiveRole, req);
  const systemPrompt = getPromptForRole(effectiveRole);

  const { answer, usage, error } = await callOpsCopilot({
    role: effectiveRole,
    systemPrompt,
    contextSummary,
    question: question.trim(),
  });

  if (error) {
    // Return a 502 (upstream) so the frontend can surface the message clearly.
    return ApiResponse.error(res, 502, error);
  }

  return ApiResponse.success(res, 200, {
    answer,
    role: effectiveRole,
    model: getConfig().model,
    usage,
    contextUsed: contextSummary,
  }, 'Ops Copilot response');
});

/**
 * POST /api/llm/explain-anomaly
 * Body: { vehicle_reg, metric, window: { from, to }, question? }
 *
 * Explains why a metric looks off for one vehicle. READ-ONLY.
 */
const explainAnomaly = asyncHandler(async (req, res) => {
  const { vehicle_reg, metric, window: win, question } = req.body;

  if (!vehicle_reg || !vehicle_reg.trim()) {
    throw new ApiError(400, 'vehicle_reg is required.');
  }
  if (!metric || !VALID_METRICS.includes(metric)) {
    throw new ApiError(400, `Invalid metric. Allowed: ${VALID_METRICS.join(', ')}.`);
  }
  if (!win || !win.from || !win.to) {
    throw new ApiError(400, 'window.from and window.to (YYYY-MM-DD) are required.');
  }

  const from = String(win.from);
  const to = String(win.to);
  if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    throw new ApiError(400, 'window.from and window.to must be valid YYYY-MM-DD dates.');
  }

  const contextSummary = await buildAnomalyContext(vehicle_reg.trim(), from, to);

  if (!contextSummary.vehicle) {
    throw new ApiError(404, `Vehicle "${vehicle_reg}" not found.`);
  }

  const finalQuestion =
    question && question.trim()
      ? question.trim()
      : `Explain why ${vehicle_reg} has a notable ${metric.replace(/_/g, ' ')} pattern between ${from} and ${to}.`;

  const systemPrompt = getAnomalyPrompt();

  const { answer, usage, error } = await callAnomalyExplainer({
    systemPrompt,
    contextSummary,
    question: finalQuestion,
  });

  if (error) {
    return ApiResponse.error(res, 502, error);
  }

  return ApiResponse.success(res, 200, {
    answer,
    vehicle_reg: vehicle_reg.trim(),
    metric,
    window: { from, to },
    model: getConfig().model,
    usage,
    summary: contextSummary.summary,
  }, 'Anomaly explanation');
});

module.exports = { opsQuery, explainAnomaly };