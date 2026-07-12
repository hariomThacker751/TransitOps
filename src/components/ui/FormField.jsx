import { forwardRef, useId } from 'react'
import { cn } from '@/utils/cn'

/** Shared field shell — label, hint, error, and the input wrapper. */
export function FormField({ label, hint, error, required, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-semibold text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  )
}

const fieldBase =
  'w-full rounded-lg border bg-white px-3 text-sm text-ink-800 placeholder:text-ink-400 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-ink-100'

const fieldState = (error) =>
  error
    ? 'border-red-300 focus:border-red-400 focus:ring-red-500/30'
    : 'border-ink-300 focus:border-brand-400 focus:ring-brand-500/30'

export const Input = forwardRef(function Input(
  { label, hint, error, required, className, leftIcon: LeftIcon, ...props },
  ref,
) {
  const id = useId()
  const input = (
    <div className="relative">
      {LeftIcon && (
        <LeftIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      )}
      <input
        ref={ref}
        id={id}
        className={cn(fieldBase, 'h-10', fieldState(error), LeftIcon && 'pl-9', className)}
        {...props}
      />
    </div>
  )
  if (!label && !hint && !error) return input
  return (
    <FormField label={label} hint={hint} error={error} required={required}>
      {input}
    </FormField>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, required, className, rows = 3, ...props },
  ref,
) {
  const id = useId()
  const textarea = (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      className={cn(fieldBase, 'py-2 resize-y', fieldState(error), className)}
      {...props}
    />
  )
  if (!label && !hint && !error) return textarea
  return (
    <FormField label={label} hint={hint} error={error} required={required}>
      {textarea}
    </FormField>
  )
})

/** Lightweight native select — good enough for short option lists. */
export const Select = forwardRef(function Select(
  { label, hint, error, required, className, children, placeholder, ...props },
  ref,
) {
  const id = useId()
  const select = (
    <select
      ref={ref}
      id={id}
      className={cn(fieldBase, 'h-10 cursor-pointer pr-8', fieldState(error), className)}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  )
  if (!label && !hint && !error) return select
  return (
    <FormField label={label} hint={hint} error={error} required={required}>
      {select}
    </FormField>
  )
})
