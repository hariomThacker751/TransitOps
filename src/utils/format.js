import { format, formatDistanceToNow, isAfter, isBefore, differenceInDays, parseISO } from 'date-fns'

/** Format a number as Indian-rupee currency (the dataset uses INR cost values). */
export function formatCurrency(value, { compact = false } = {}) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? 'compact' : 'standard',
  }).format(Number(value))
}

/** Plain number with thousands separators. */
export function formatNumber(value, { decimals = 0, compact = false } = {}) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    notation: compact ? 'compact' : 'standard',
  }).format(Number(value))
}

/** Compact weight / distance values with units. */
export function formatKg(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  return `${formatNumber(value)} kg`
}

export function formatKm(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  return `${formatNumber(Number(value).toFixed(0))} km`
}

export function formatLiters(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  return `${formatNumber(Number(value).toFixed(1))} L`
}

/** Percentage with one decimal. */
export function formatPercent(value, { decimals = 0 } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toFixed(decimals)}%`
}

/** Safe ISO / date-string -> human date. */
export function formatDate(value, pattern = 'dd MMM yyyy') {
  if (!value) return '—'
  const d = typeof value === 'string' ? parseISO(value) : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return format(d, pattern)
}

/** "3 days ago" style relative time. */
export function formatRelative(value) {
  if (!value) return '—'
  const d = typeof value === 'string' ? parseISO(value) : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return formatDistanceToNow(d, { addSuffix: true })
}

/** Number of days from today until the given date (negative = past). */
export function daysUntil(value) {
  if (!value) return null
  const d = typeof value === 'string' ? parseISO(value) : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return differenceInDays(d, new Date())
}

export function isExpired(value) {
  if (!value) return false
  const d = typeof value === 'string' ? parseISO(value) : new Date(value)
  if (Number.isNaN(d.getTime())) return false
  return isBefore(d, new Date())
}

export function isExpiringSoon(value, withinDays = 30) {
  const days = daysUntil(value)
  if (days === null) return false
  return days >= 0 && days <= withinDays
}

export { isAfter, isBefore, parseISO, format }
