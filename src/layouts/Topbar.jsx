import { useState, useEffect } from 'react'
import { Menu, LogOut, RefreshCw, ChevronDown, Sparkles } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth, ROLES } from '@/context/AuthContext'
import Badge from '@/components/ui/Badge'
import DropdownMenu, { KebabTrigger } from '@/components/ui/DropdownMenu'
import OpsCopilotPanel from '@/components/domain/OpsCopilotPanel'
import api from '@/api'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

/** Demo role switcher — lets evaluators instantly view any role's dashboard. */
function RoleSwitcher() {
  const { role, switchRole } = useAuth()
  if (!api.isMock) return null

  return (
    <DropdownMenu
      align="right"
      trigger={
        <button className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-50">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          Demo: {ROLES[role]?.label || role}
          <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
        </button>
      }
      items={Object.values(ROLES).map((r) => ({
        label: r.label,
        onClick: () => {
          switchRole(r.key)
          toast.success(`Switched to ${r.label} view`)
        },
      }))}
    />
  )
}

export default function Topbar({ onMenuClick, onResetSeed }) {
  const { user, logout, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [copilotOpen, setCopilotOpen] = useState(false)

  // Allow other components (e.g. the Dashboard quick action) to open the copilot.
  useEffect(() => {
    const handler = () => setCopilotOpen(true)
    window.addEventListener('transitops:open-copilot', handler)
    return () => window.removeEventListener('transitops:open-copilot', handler)
  }, [])

  const handleReset = async () => {
    try {
      api.resetSeed()
      toast.success('Demo data reset to seed.')
      onResetSeed?.()
    } catch {
      toast.error('Reset unavailable.')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <Breadcrumb pathname={location.pathname} />
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setCopilotOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          title="Ask the Ops Copilot"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ops Copilot</span>
        </button>

        {api.isMock && (
          <button
            onClick={handleReset}
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 sm:inline-flex"
            title="Reset demo data to seed"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset data
          </button>
        )}
        <RoleSwitcher />

        <DropdownMenu
          align="right"
          trigger={
            <button className="flex items-center gap-2.5 rounded-lg p-1 pr-2 transition-colors hover:bg-ink-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold leading-tight text-ink-800">{user?.name}</p>
                <p className="text-[11px] leading-tight text-ink-400">{ROLES[role]?.label}</p>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-ink-400 sm:block" />
            </button>
          }
          items={[
            { label: 'Sign out', icon: LogOut, onClick: handleLogout, tone: 'danger' },
          ]}
        />
      </div>

      <OpsCopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </header>
  )
}

/** Simple breadcrumb derived from the current path. */
function Breadcrumb({ pathname }) {
  const segments = pathname.split('/').filter(Boolean)
  const labels = {
    vehicles: 'Vehicles', drivers: 'Drivers', trips: 'Trips',
    maintenance: 'Maintenance', 'fuel-logs': 'Fuel Logs', expenses: 'Expenses', reports: 'Reports',
  }
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {segments.length === 0 ? (
        <span className="font-semibold text-ink-700">Dashboard</span>
      ) : (
        <>
          <span className="text-ink-400">Dashboard</span>
          <span className="text-ink-300">/</span>
          <span className="font-semibold text-ink-700">{labels[segments[0]] || segments[0]}</span>
        </>
      )}
    </nav>
  )
}
