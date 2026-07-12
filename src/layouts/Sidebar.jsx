import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Truck, IdCard, Route, Wrench, Fuel, ReceiptText, BarChart3,
  X, Truck as Logo,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { APP, NAV_ITEMS } from '@/utils/constants'
import { useAuth } from '@/context/AuthContext'

const ICONS = {
  LayoutDashboard, Truck, IdCard, Route, Wrench, Fuel, ReceiptText, BarChart3,
}

/** Brand mark — the TransitOps logo lockup. */
function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-600 shadow-glow">
        <Logo className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold tracking-tight text-white">{APP.name}</p>
        <p className="truncate text-[11px] font-medium text-ink-400">{APP.tagline}</p>
      </div>
    </div>
  )
}

/**
 * Sidebar — the dark ops-console navigation rail.
 * Items are role-gated via NAV_ITEMS; ineligible items are hidden entirely
 * (defense-in-depth — the backend enforces the same rules).
 */
export default function Sidebar({ open, onClose }) {
  const { role } = useAuth()

  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-900 transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between">
          <BrandMark />
          <button
            onClick={onClose}
            className="mr-3 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 no-scrollbar">
          <p className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-ink-500">
            Operations
          </p>
          {items.map((item) => {
            const Icon = ICONS[item.icon] || LayoutDashboard
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-ink-300 hover:bg-ink-800 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn('h-[18px] w-[18px] flex-none', isActive ? 'text-white' : 'text-ink-400 group-hover:text-ink-200')}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-ink-800 px-5 py-4">
          <p className="text-[11px] font-medium text-ink-500">{APP.edition}</p>
          <p className="mt-0.5 text-[10px] text-ink-600">Rules-driven fleet platform</p>
        </div>
      </aside>
    </>
  )
}
