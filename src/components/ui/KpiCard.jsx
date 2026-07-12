import { cn } from '@/utils/cn'

/**
 * KpiCard — the dashboard metric tile.
 * accent: brand | emerald | blue | amber | red | zinc
 */
const ACCENTS = {
  brand: { bar: 'bg-brand-500', icon: 'bg-brand-50 text-brand-600 ring-brand-600/10', value: 'text-ink-900' },
  emerald: { bar: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10', value: 'text-ink-900' },
  blue: { bar: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600 ring-blue-600/10', value: 'text-ink-900' },
  amber: { bar: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600 ring-amber-600/10', value: 'text-ink-900' },
  red: { bar: 'bg-red-500', icon: 'bg-red-50 text-red-600 ring-red-600/10', value: 'text-ink-900' },
  zinc: { bar: 'bg-zinc-400', icon: 'bg-zinc-100 text-zinc-600 ring-zinc-500/10', value: 'text-ink-900' },
}

export default function KpiCard({ label, value, sub, icon: Icon, accent = 'brand', trend, className }) {
  const a = ACCENTS[accent] || ACCENTS.brand
  return (
    <div className={cn('surface group relative overflow-hidden', className)}>
      <div className={cn('absolute inset-y-0 left-0 w-1', a.bar)} />
      <div className="flex items-start justify-between gap-3 px-5 py-4 pl-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
          <p className={cn('mt-1.5 text-2xl font-bold tabular-nums', a.value)}>{value}</p>
          {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
          {trend && <div className="mt-1.5">{trend}</div>}
        </div>
        {Icon && (
          <div className={cn('flex h-10 w-10 flex-none items-center justify-center rounded-xl ring-1', a.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )
}
