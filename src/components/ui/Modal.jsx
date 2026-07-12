import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Modal — accessible centered dialog built on Headless UI.
 * Provides consistent title/close/footer scaffolding across all forms.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }
  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink-950/50 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95 translate-y-2"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel
              className={cn(
                'w-full overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-ink-900/5',
                sizes[size],
              )}
            >
              {(title || onClose) && (
                <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-4">
                  <div className="min-w-0">
                    {title && (
                      <Dialog.Title className="text-base font-bold text-ink-900">{title}</Dialog.Title>
                    )}
                    {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
                  </div>
                  <button
                    onClick={onClose}
                    className="-mr-2 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                    aria-label="Close dialog"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}

              <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>

              {footer && (
                <div className="flex items-center justify-end gap-3 border-t border-ink-100 bg-ink-50/60 px-6 py-4">
                  {footer}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
