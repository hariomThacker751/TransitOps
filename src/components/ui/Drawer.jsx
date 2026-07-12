import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Drawer — right-side slide-over panel for detail views.
 * Keeps the SPA snappy (no route-per-detail) while showing rich linked data.
 */
export default function Drawer({ open, onClose, title, subtitle, children, footer, width = 'md' }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-2xl' }
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
          <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-y-0 right-0 flex max-w-full">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-out duration-300"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in duration-200"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel
                className={cn(
                  'flex h-full w-full flex-col bg-white shadow-lift ring-1 ring-ink-900/5',
                  widths[width],
                )}
              >
                <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
                  <div className="min-w-0">
                    {title && <Dialog.Title className="text-base font-bold text-ink-900">{title}</Dialog.Title>}
                    {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
                  </div>
                  <button
                    onClick={onClose}
                    className="-mr-2 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                    aria-label="Close panel"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

                {footer && <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-4">{footer}</div>}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
