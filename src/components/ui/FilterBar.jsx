import { Search, X } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * FilterBar — a horizontal control row for searching + filtering tables.
 * Renders a search input plus an arbitrary set of filter slots (selects, etc.).
 */
export default function FilterBar({ search, onSearchChange, searchPlaceholder = 'Search…', children, right, className }) {
  const hasSearch = search !== undefined && onSearchChange
  const hasFilters = children || hasSearch
  if (!hasFilters && !right) return null
  return (
    <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between', className)}>
      <div className="flex flex-wrap items-center gap-2.5">
        {hasSearch && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-lg border border-ink-300 bg-white pl-9 pr-9 text-sm text-ink-800 placeholder:text-ink-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:w-64"
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
      {right && <div className="flex items-center gap-2.5">{right}</div>}
    </div>
  )
}
