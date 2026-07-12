import { Inbox } from 'lucide-react'
import { cn } from '@/utils/cn'

/** EmptyState — consistent "nothing here yet" treatment. */
export default function EmptyState({ icon: Icon = Inbox, title, message, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400 ring-1 ring-ink-200">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-ink-700">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-ink-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
