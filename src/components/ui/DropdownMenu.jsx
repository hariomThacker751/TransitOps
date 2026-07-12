import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * DropdownMenu — accessible menu for row-level actions / overflow.
 * items: [{ label, icon, onClick, tone: 'default'|'danger', disabled }]
 */
export default function DropdownMenu({ trigger, items, align = 'right', className }) {
  return (
    <Menu as="div" className={cn('relative inline-block text-left', className)}>
      <Menu.Button as="div">{trigger}</Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            'absolute z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-lift focus:outline-none',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={`d${i}`} className="my-1 border-t border-ink-100" />
            ) : (
              <Menu.Item key={i} disabled={item.disabled}>
                {({ active }) => (
                  <button
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium transition-colors',
                      item.tone === 'danger'
                        ? active
                          ? 'bg-red-50 text-red-600'
                          : 'text-red-600'
                        : active
                          ? 'bg-ink-50 text-ink-900'
                          : 'text-ink-700',
                      item.disabled && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    {item.icon && <item.icon className="h-4 w-4 flex-none" />}
                    {item.label}
                  </button>
                )}
              </Menu.Item>
            ),
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

/** A compact kebab trigger button for row menus. */
export function KebabTrigger() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
      <ChevronDown className="h-4 w-4" />
    </span>
  )
}
