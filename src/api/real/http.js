import axios from 'axios'

/**
 * Real API client — calls the Express + MySQL backend.
 * Endpoints match the implementation plan exactly so the backend team's work
 * plugs in with zero frontend changes (just set VITE_USE_MOCK=false).
 */

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
const http = axios.create({ baseURL, timeout: 15000 })

// Attach JWT to every request.
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('transitops.token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Normalize errors into the plan's { success, message } shape.
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.message || err.message || 'Network error.'
    return Promise.reject({ success: false, message, status: err.response?.status })
  },
)

export { http }
export default http
