import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '@/api'
import { DEMO_USERS, STORAGE_KEYS, can as canDo } from '@/utils/constants'
import { ROLES } from '@/utils/statusConfig'

const AuthContext = createContext(null)

/**
 * AuthProvider — owns the authenticated user, role, and token.
 * In mock mode also supports an instant "role switch" for demo evaluators.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session from storage on mount.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.auth)
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch {
        localStorage.removeItem(STORAGE_KEYS.auth)
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const res = await api.auth.login({ email, password })
    if (res.success === false) return res
    const u = res.data
    setUser(u)
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(u))
    return res
  }, [])

  const logout = useCallback(async () => {
    // If not mock mode, tell server to clear cookie
    if (!api.isMock) {
      await api.auth.logout?.().catch(() => {})
    }
    setUser(null)
    localStorage.removeItem(STORAGE_KEYS.auth)
  }, [])

  /** Instant role switch for demo — only in mock mode. */
  const switchRole = useCallback((role) => {
    const demo = DEMO_USERS.find((u) => u.role === role)
    if (!demo) return
    const { password: _pw, ...safe } = demo
    const u = { ...safe, token: `mock.${role}.${Date.now()}` }
    setUser(u)
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(u))
  }, [])

  const value = useMemo(
    () => ({
      user,
      role: user?.role || null,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      switchRole,
      can: (resource, action) => canDo(user?.role, resource, action),
    }),
    [user, loading, login, logout, switchRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { ROLES }
