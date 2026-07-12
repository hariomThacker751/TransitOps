import { http } from './http.js'

/**
 * Real LLM API — calls the Express backend's /api/llm endpoints, which in turn
 * call the Sarvam AI Chat Completions API server-side.
 *
 * CONTRACT (from backend):
 *   - Success: { success, data: { answer, role, model, usage, ... }, message? }
 *   - Error:   { success: false, message }
 *
 * The axios response interceptor already returns the parsed body, so these
 * functions receive the full envelope and return it as-is.
 */

/**
 * Ask the role-aware Ops Copilot a natural-language question.
 * @param {string} question
 * @param {string} [role]  Optional; defaults to the caller's session role server-side.
 * @returns {Promise<object>} { success, data: { answer, role, model, usage } }
 */
export function opsQuery(question, role) {
  const payload = { question }
  if (role) payload.role = role
  return http.post('/llm/ops-query', payload, { timeout: 45000 })
}

/**
 * Ask the LLM to explain why a vehicle's metric looks off over a time window.
 * @param {object} params
 * @param {string} params.vehicle_reg
 * @param {'roi'|'operational_cost'|'fuel_efficiency'} params.metric
 * @param {{ from: string, to: string }} params.window
 * @param {string} [params.question]
 * @returns {Promise<object>} { success, data: { answer, vehicle_reg, metric, window, summary } }
 */
export function explainAnomaly({ vehicle_reg, metric, window, question }) {
  return http.post('/llm/explain-anomaly', { vehicle_reg, metric, window, question }, { timeout: 45000 })
}

export const realLlm = { opsQuery, explainAnomaly }
export default realLlm