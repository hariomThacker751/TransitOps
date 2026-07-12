import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Truck, Mail, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuth, ROLES } from '@/context/AuthContext'
import { DEMO_USERS, APP } from '@/utils/constants'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/FormField'
import toast from 'react-hot-toast'

const ROLE_ACCENTS = {
  fleet_manager: { bg: 'from-brand-500 to-brand-700', label: 'Fleet Manager' },
  driver: { bg: 'from-blue-500 to-blue-700', label: 'Driver' },
  safety_officer: { bg: 'from-amber-500 to-amber-600', label: 'Safety Officer' },
  financial_analyst: { bg: 'from-emerald-500 to-emerald-700', label: 'Financial Analyst' },
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await login({ email, password })
    setLoading(false)
    if (res.success === false) {
      setError(res.message)
    } else {
      toast.success(`Welcome back, ${res.data.name}`)
      navigate(from, { replace: true })
    }
  }

  const quickLogin = async (role) => {
    const user = DEMO_USERS.find((u) => u.role === role)
    if (!user) return
    setEmail(user.email)
    setPassword(user.password)
    setError('')
    setLoading(true)
    const res = await login({ email: user.email, password: user.password })
    setLoading(false)
    if (res.success === false) {
      setError(res.message)
    } else {
      toast.success(`Signed in as ${ROLE_ACCENTS[role].label}`)
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-900 p-12 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 via-ink-900 to-ink-950" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 shadow-glow">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-white">{APP.name}</p>
            <p className="text-xs font-medium text-ink-400">{APP.tagline}</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-balance text-3xl font-bold leading-tight text-white">
            Rules-driven fleet operations, without the spreadsheet chaos.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-400">
            Dispatch validation, automatic status transitions, maintenance locking,
            and live KPI analytics — all enforced by a real business-rules engine.
          </p>
          <div className="mt-8 space-y-3">
            {[
              '13-rule dispatch eligibility engine',
              'Atomic vehicle & driver status sync',
              'Maintenance-to-dispatch locking',
              'Live ROI, cost & utilization analytics',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2.5 text-sm text-ink-300">
                <ShieldCheck className="h-4 w-4 flex-none text-emerald-400" />
                {feat}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-ink-600">{APP.edition} · Virtual Round</p>
      </div>

      {/* Login form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <p className="text-lg font-bold text-ink-900">{APP.name}</p>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-ink-900">Sign in</h2>
            <p className="mt-1 text-sm text-ink-500">Access your fleet operations console.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              leftIcon={Mail}
              placeholder="fleet@transitops.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              required
              leftIcon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-600/10">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading} rightIcon={ArrowRight}>
              Sign in to console
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-medium text-ink-400">
                  Or try a demo role instantly
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {Object.values(ROLES).map((r) => (
                <button
                  key={r.key}
                  onClick={() => quickLogin(r.key)}
                  disabled={loading}
                  className="group flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white p-3 text-left transition-all hover:border-brand-300 hover:shadow-card disabled:opacity-50"
                >
                  <span
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gradient-to-br ${ROLE_ACCENTS[r.key].bg} text-xs font-bold text-white`}
                  >
                    {r.label.charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-ink-800">{r.label}</span>
                    <span className="block text-[10px] text-ink-400">One-click demo</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
