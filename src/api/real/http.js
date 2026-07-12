import axios from 'axios'

/**
 * Real API client — calls the Express + MySQL backend.
 * Endpoints match the implementation plan exactly so the backend team's work
 * plugs in with zero frontend changes (just set VITE_USE_MOCK=false).
 */

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
const http = axios.create({ baseURL, timeout: 60000, withCredentials: true })

// Normalize errors into the plan's { success, message } shape.
// Blob responses (CSV export) bypass this — they're handled separately.
http.interceptors.response.use(
  (res) => {
    // Blob responses pass through as-is for download handling.
    if (res.config.responseType === 'blob') return res
    // JSON responses: return the body (already { success, data, ... }).
    return res.data
  },
  (err) => {
    // Blob error responses need special handling — try to parse the error.
    if (err.config?.responseType === 'blob' && err.response?.data instanceof Blob) {
      return err.response.data.text().then((text) => {
        try {
          const parsed = JSON.parse(text)
          return Promise.reject({ success: false, message: parsed.message || 'Export failed.' })
        } catch {
          return Promise.reject({ success: false, message: 'Export failed.' })
        }
      })
    }
    const message = err.response?.data?.message || err.message || 'Network error.'
    return Promise.reject({ success: false, message, status: err.response?.status })
  },
)

export { http }
export default http