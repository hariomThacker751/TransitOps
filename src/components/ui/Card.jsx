import { cn } from '@/utils/cn'

/** Card — the base surface for grouped content. */
export function Card({ className, children, ...props }) {
  return (
    <div className={cn('surface', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 py-4', className)}>
      <div className="min-w-0">
        {title && <h3 className="text-sm font-bold text-ink-900">{title}</h3>}
        {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, children }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}
