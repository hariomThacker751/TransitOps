import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Compose Tailwind classes with conditional logic and conflict de-duplication.
 * Usage: cn('px-2', condition && 'px-4', { 'text-red-600': hasError })
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
