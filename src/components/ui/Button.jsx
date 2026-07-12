import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Button — the primary action primitive.
 * Variants: primary, secondary, ghost, danger, outline, subtle
 * Sizes: sm, md, lg, icon
 */
const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300 disabled:shadow-none',
  secondary:
    'bg-ink-800 text-white shadow-sm hover:bg-ink-900 active:bg-ink-950 disabled:bg-ink-400',
  outline:
    'border border-ink-300 bg-white text-ink-700 shadow-sm hover:bg-ink-50 hover:border-ink-400 active:bg-ink-100 disabled:opacity-50 disabled:hover:bg-white',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200 disabled:opacity-50',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200 disabled:opacity-50',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 disabled:shadow-none',
  'danger-outline':
    'border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 active:bg-red-100 disabled:opacity-50',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-sm gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-lg',
  'icon-sm': 'h-8 w-8 rounded-lg',
}

const Button = forwardRef(function Button(
  {
    children,
    className,
    variant = 'primary',
    size = 'md',
    type = 'button',
    loading = false,
    disabled = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        LeftIcon && <LeftIcon className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden="true" />
      )}
      {children}
      {RightIcon && !loading && (
        <RightIcon className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden="true" />
      )}
    </button>
  )
})

export default Button
