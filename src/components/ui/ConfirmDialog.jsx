import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { AlertTriangle } from 'lucide-react'
import Button from './Button'

/**
 * ConfirmDialog — confirmation for destructive or important state transitions.
 * Mirrors the "confirmation before destructive/important transitions" UI rule.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
}) {
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

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-ink-900/5">
              <div className="flex gap-4 p-6">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-600/10">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <Dialog.Title className="text-base font-bold text-ink-900">{title}</Dialog.Title>
                  {message && <p className="mt-1 text-sm text-ink-600">{message}</p>}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-ink-100 bg-ink-50/60 px-6 py-4">
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  {cancelLabel}
                </Button>
                <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
                  {confirmLabel}
                </Button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
