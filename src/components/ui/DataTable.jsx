import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from 'lucide-react'
import { cn } from '@/utils/cn'
import EmptyState from './EmptyState'

/**
 * DataTable — the workhorse table for every list page.
 *
 * columns: [{ key, header, accessor, render, sortable, align, className, cellClassName }]
 *   - accessor(row): returns the sortable/raw value (defaults to row[key])
 *   - render(row): returns the displayed cell content
 *   - sortable: enable click-to-sort on this column
 *
 * Features: client-side sorting, row click (onRowClick → detail drawer),
 * empty state, optional sticky header, responsive horizontal scroll.
 */
export default function DataTable({
  columns,
  rows,
  onRowClick,
  emptyTitle = 'No records found',
  emptyMessage = 'Try adjusting your filters or create a new record.',
  emptyIcon: EmptyIcon = Inbox,
  emptyAction,
  loading = false,
  initialSort,
  rowKey = (row, i) => row.id ?? i,
  className,
}) {
  const [sort, setSort] = useState(
    initialSort ? { key: initialSort.key, dir: initialSort.dir || 'asc' } : null,
  )

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const accessor = col.accessor || ((row) => row[col.key])
    const dir = sort.dir === 'desc' ? -1 : 1
    return [...rows].sort((a, b) => {
      const av = accessor(a)
      const bv = accessor(b)
      if (av === bv) return 0
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir
    })
  }, [rows, sort, columns])

  const toggleSort = (col) => {
    if (!col.sortable) return
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 'asc' }
      if (prev.dir === 'asc') return { key: col.key, dir: 'desc' }
      return null // third click clears sort
    })
  }

  if (loading) {
    return (
      <div className="surface overflow-hidden">
        <div className="border-b border-ink-100 bg-ink-50/50 px-5 py-3">
          <div className="h-4 w-40 skeleton" />
        </div>
        <div className="divide-y divide-ink-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 px-5 py-4">
              {columns.map((_, j) => (
                <div key={j} className="h-4 flex-1 skeleton" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!sortedRows.length) {
    return (
      <div className="surface">
        <EmptyState icon={EmptyIcon} title={emptyTitle} message={emptyMessage} action={emptyAction} />
      </div>
    )
  }

  return (
    <div className={cn('surface overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/60">
              {columns.map((col) => {
                const isSorted = sort?.key === col.key
                return (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col)}
                    className={cn(
                      'px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.headerClassName,
                      col.sortable && 'cursor-pointer select-none transition-colors hover:text-ink-800',
                    )}
                  >
                    <span className={cn('inline-flex items-center gap-1', col.align === 'right' && 'flex-row-reverse')}>
                      {col.header}
                      {col.sortable &&
                        (isSorted ? (
                          sort.dir === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5 text-brand-500" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-brand-500" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 text-ink-300" />
                        ))}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {sortedRows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-brand-50/40',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-5 py-3.5 text-ink-700',
                      col.align === 'right' && 'text-right tabular-nums',
                      col.align === 'center' && 'text-center',
                      col.cellClassName,
                    )}
                  >
                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Result count footer */}
      <div className="border-t border-ink-100 bg-ink-50/40 px-5 py-2.5">
        <p className="text-xs font-medium text-ink-500">
          {sortedRows.length} {sortedRows.length === 1 ? 'record' : 'records'}
        </p>
      </div>
    </div>
  )
}
