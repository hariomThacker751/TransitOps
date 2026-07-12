import { Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

/**
 * ProtectedRoute — redirects to /login if not authenticated.
 * Wrap any route element that requires a session.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-100">
        <div className="flex items-center gap-3 text-ink-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <span className="text-sm font-medium">Loading session…</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Logged-out visitors land on the marketing/landing page first.
    // window.location.replace forces a full navigation to the static
    // landing.html (a <Navigate> would only change the URL client-side
    // and fall through to the NotFound catch-all route).
    return <RedirectToLanding />
  }

  return children
}

/** Imperatively navigate to the static landing page. */
function RedirectToLanding() {
  useEffect(() => {
    window.location.replace('/landing.html')
  }, [])
  return null
}

/**
 * RoleGuard — redirects to "/" if the current role isn't permitted.
 * @param allowed array of role keys, or null for any authenticated user.
 */
export function RoleGuard({ allowed, children, fallback = null }) {
  const { role } = useAuth()
  if (allowed && !allowed.includes(role)) {
    return <Navigate to="/" replace />
  }
  return children
}

/** Convenience: render children only if the current role has a permission. */
export function Can({ resource, action, children, fallback = null }) {
  const { can } = useAuth()
  return can(resource, action) ? children : fallback
}
