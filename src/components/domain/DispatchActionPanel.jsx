import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Rocket, ShieldCheck } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useResource } from '@/hooks/useResource'
import api from '@/api'
import { validateDispatch } from '@/utils/dispatchRules'
import { cn } from '@/utils/cn'

/**
 * DispatchActionPanel — the live dispatch rules engine UI.
 *
 * Shows all 13 eligibility checks as a pass/fail checklist, then lets the
 * user dispatch the trip. On success, trip→Dispatched + vehicle/driver→On Trip.
 * On failure, the violation message is shown prominently.
 *
 * In mock mode: calls api.trips.validateDispatch (mock DB).
 * In real mode: fetches trip + vehicles + drivers + maintenance from the
 * backend and runs the shared validateDispatch utility client-side for the
 * checklist UI. The actual enforcement happens on the backend when Dispatch
 * is clicked — the backend's error message is surfaced if it rejects.
 */
export default function DispatchActionPanel({ trip, onDispatched, onClose }) {
  const [dispatching, setDispatching] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  // In real mode, fetch the context data for client-side rule evaluation.
  const { data: vehicles } = useResource(() => api.vehicles.list(), [])
  const { data: drivers } = useResource(() => api.drivers.list(), [])
  const { data: allTrips } = useResource(() => api.trips.list(), [])
  const { data: maintenance } = useResource(() => api.maintenance.list(), [])

  useEffect(() => {
    if (api.isMock) {
      // Mock mode: use the mock's built-in validate endpoint.
      let active = true
      setLoading(true)
      api.trips.validateDispatch(trip.trip_id).then((res) => {
        if (active) {
          setResult(res?.success ? res.data : { ok: false, checks: [], violations: [{ rule: 'error', message: res?.message }] })
          setLoading(false)
        }
      })
      return () => { active = false }
    }
    // Real mode: build context from fetched data and run shared rules.
    if (vehicles && drivers && allTrips && maintenance) {
      const ctx = { vehicles, drivers, trips: allTrips, maintenance }
      setResult(validateDispatch(trip, ctx))
      setLoading(false)
    }
  }, [trip?.trip_id, vehicles, drivers, allTrips, maintenance])

  const checks = result?.checks || []
  const violations = result?.violations || []
  const ok = result?.ok

  const handleDispatch = async () => {
    setDispatching(true)
    const res = await api.trips.dispatch(trip.trip_id)
    setDispatching(false)
    if (res.success === false) {
      // Backend rejected — surface its actual error message.
      setResult((prev) => ({
        ...prev,
        ok: false,
        violations: res.violations || [{ rule: 'backend', message: res.message }],
      }))
      return { success: false, message: res.message }
    }
    onDispatched?.(res)
    return res
  }

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={cn(
        'flex items-center gap-3 rounded-xl px-4 py-3 ring-1',
        ok ? 'bg-emerald-50 ring-emerald-600/10' : 'bg-red-50 ring-red-600/10',
      )}>
        {ok ? (
          <CheckCircle2 className="h-5 w-5 flex-none text-emerald-600" />
        ) : (
          <XCircle className="h-5 w-5 flex-none text-red-600" />
        )}
        <div>
          <p className={cn('text-sm font-bold', ok ? 'text-emerald-800' : 'text-red-800')}>
            {loading ? 'Evaluating rules…' : ok ? 'All checks passed — ready to dispatch' : `${violations.length} check${violations.length > 1 ? 's' : ''} failed`}
          </p>
          {!loading && !ok && <p className="text-xs text-red-600">{violations[0]?.message}</p>}
        </div>
      </div>

      {/* Rules checklist */}
      <div className="rounded-xl border border-ink-200">
        <div className="border-b border-ink-100 bg-ink-50/60 px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-500">
            <ShieldCheck className="h-3.5 w-3.5" /> Dispatch Eligibility ({checks.filter((c) => c.passed).length}/{checks.length})
          </p>
        </div>
        <div className="divide-y divide-ink-100">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-ink-400">Evaluating rules…</div>
          ) : (
            checks.map((check) => (
              <div key={check.rule} className="flex items-start gap-3 px-4 py-2.5">
                {check.passed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 flex-none text-red-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', check.passed ? 'text-ink-600' : 'font-semibold text-ink-900')}>{check.label}</p>
                  {check.detail && <p className="text-xs text-ink-400">{check.detail}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button leftIcon={Rocket} loading={dispatching} disabled={!ok || loading} onClick={handleDispatch}>
          Dispatch Trip
        </Button>
      </div>
    </div>
  )
}