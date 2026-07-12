import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export function Loader({ className, label }) {
  return (
    <div className={cn('flex items-center justify-center gap-2.5 text-ink-400', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  )
}

/** Full-area centered loader for page-level fetching. */
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader label={label} />
    </div>
  )
}

/** Skeleton block — uses the .skeleton shimmer class from index.css. */
export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="divide-y divide-ink-100">
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex gap-4 px-5 py-3.5">
          {[...Array(cols)].map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" style={{ animationDelay: `${r * 60 + c * 30}ms` }} />
          ))}
        </div>
      ))}
    </div>
  )
}
