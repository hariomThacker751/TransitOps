import { cn } from '@/utils/cn'
import { badgeClasses, dotClasses, resolveStatus } from '@/utils/statusConfig'

/**
 * Generic pill badge with a palette token from the status config.
 */
const TONES = {
  neutral: 'bg-ink-100 text-ink-600 ring-ink-500/10',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  red: 'bg-red-50 text-red-700 ring-red-600/15',
  zinc: 'bg-zinc-100 text-zinc-600 ring-zinc-500/15',
}

export default function Badge({ children, tone = 'neutral', dot = false, dotColor, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
        TONES[tone] || TONES.neutral,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotClasses(dotColor) || 'bg-ink-400')} />}
      {children}
    </span>
  )
}

/**
 * StatusBadge — render any entity status with its semantic colour + dot.
 * Pass a `status` object from statusConfig (resolveStatus result).
 */
export function StatusBadge({ status, withDot = true, className }) {
  if (!status) return null
  return (
    <Badge tone={status.palette} dot={withDot} dotColor={status.palette} className={className}>
      {status.label}
    </Badge>
  )
}

/** Convenience: badge from a raw status value + status group. */
export function StatusPill({ group, value, className }) {
  return <StatusBadge status={resolveStatus(group, value)} className={className} />
}
