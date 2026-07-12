import { cn } from '@/utils/cn'

/**
 * ChartCard — framed container for Recharts visualisations.
 * Provides title/subtitle header and a fixed-height responsive body.
 */
export default function ChartCard({ title, subtitle, action, children, height = 260, className }) {
  return (
    <div className={cn('surface flex flex-col', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-bold text-ink-900">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="flex-1 px-2 pb-3 pt-4" style={{ minHeight: height }}>
        {children}
      </div>
    </div>
  )
}
