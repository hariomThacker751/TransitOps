import { useState, useEffect } from 'react'
import { Sparkles, AlertCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Loader } from '@/components/ui/Loader'
import api from '@/api'
import { formatCurrency, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'

const METRIC_LABELS = {
  roi: 'ROI',
  operational_cost: 'Operational Cost',
  fuel_efficiency: 'Fuel Efficiency',
}

/**
 * Default time window: the last 180 days. The Reports page has no date picker,
 * so we use a sensible default covering the seeded trip history.
 */
function defaultWindow() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 180)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

/**
 * AnomalyExplainerModal — asks the LLM to explain why a vehicle's metric
 * (ROI / operational cost / fuel efficiency) looks off over a time window.
 * Shows the numeric summary from the backend alongside the explanation.
 *
 * Read-only: only calls /api/llm/explain-anomaly.
 */
export default function AnomalyExplainerModal({ open, onClose, vehicleReg, metric = 'roi' }) {
  const [answer, setAnswer] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !vehicleReg) return
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      setAnswer(null)
      setSummary(null)
      try {
        const res = await api.llm.explainAnomaly({
          vehicle_reg: vehicleReg,
          metric,
          window: defaultWindow(),
        })
        if (cancelled) return
        if (res.success === false) {
          setError(res.message || 'Could not generate an explanation.')
        } else {
          setAnswer(res.data.answer)
          setSummary(res.data.summary)
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Network error contacting the assistant.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [open, vehicleReg, metric])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Explain Anomaly"
      description={`${vehicleReg} · ${METRIC_LABELS[metric] || metric}`}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {loading ? (
        <div className="py-12">
          <Loader label="Analyzing vehicle data…" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-2.5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-600/10">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Numeric summary */}
          {summary && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">
                Computed Summary
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <SummaryStat label="Revenue" value={formatCurrency(summary.total_revenue, { compact: true })} accent="emerald" />
                <SummaryStat label="Op. Cost" value={formatCurrency(summary.total_operational_cost, { compact: true })} accent="red" />
                <SummaryStat label="Fuel Cost" value={formatCurrency(summary.total_fuel_cost, { compact: true })} accent="blue" />
                <SummaryStat label="Maintenance" value={formatCurrency(summary.total_maintenance_cost, { compact: true })} accent="amber" />
                <SummaryStat label="Expenses" value={formatCurrency(summary.total_expense_cost, { compact: true })} accent="zinc" />
                <SummaryStat
                  label="ROI"
                  value={summary.roi != null ? `${(summary.roi * 100).toFixed(1)}%` : '—'}
                  accent={summary.roi >= 0 ? 'emerald' : 'red'}
                />
                <SummaryStat label="Distance" value={formatNumber(summary.total_distance_km)} accent="blue" />
                <SummaryStat label="Fuel (L)" value={formatNumber(summary.trip_fuel_liters, { decimals: 1 })} accent="amber" />
                <SummaryStat
                  label="Efficiency"
                  value={summary.fuel_efficiency_km_per_liter != null ? `${summary.fuel_efficiency_km_per_liter} km/L` : '—'}
                  accent="brand"
                />
              </div>
            </div>
          )}

          {/* LLM explanation */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-500">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              AI Explanation
            </p>
            <div className="rounded-xl bg-brand-50/60 px-4 py-3 text-sm leading-relaxed text-ink-800 ring-1 ring-brand-600/10">
              {answer ? (
                <p className="whitespace-pre-wrap">{answer}</p>
              ) : (
                <p className="text-ink-400">No explanation was returned.</p>
              )}
            </div>
            <p className="mt-2 text-[11px] text-ink-400">
              Advisory only — the explanation is grounded in the computed summary and cannot change any records.
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}

const ACCENTS = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  red: 'bg-red-50 text-red-700 ring-red-600/10',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/10',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  zinc: 'bg-zinc-100 text-zinc-700 ring-zinc-500/10',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/10',
}

function SummaryStat({ label, value, accent = 'zinc' }) {
  return (
    <div className={cn('rounded-lg px-3 py-2 ring-1 ring-inset', ACCENTS[accent] || ACCENTS.zinc)}>
      <p className="text-[10px] font-medium opacity-80">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  )
}