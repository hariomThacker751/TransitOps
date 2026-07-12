import { Tab } from '@headlessui/react'
import { Fragment } from 'react'
import { cn } from '@/utils/cn'

/**
 * Tabs — segmented control built on Headless UI.
 * tabs: [{ label, value, icon }]
 * onChange receives the selected tab's value.
 */
export default function Tabs({ tabs, value, onChange, className }) {
  const selectedIndex = Math.max(
    0,
    tabs.findIndex((t) => t.value === value),
  )
  return (
    <Tab.Group selectedIndex={selectedIndex} onChange={(i) => onChange(tabs[i].value)}>
      <Tab.List
        className={cn(
          'inline-flex items-center gap-1 rounded-xl bg-ink-100 p-1',
          className,
        )}
      >
        {tabs.map((tab) => (
          <Tab as={Fragment} key={tab.value}>
            {({ selected }) => (
              <button
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all',
                  selected
                    ? 'bg-white text-ink-900 shadow-sm ring-1 ring-ink-200'
                    : 'text-ink-500 hover:text-ink-800',
                )}
              >
                {tab.icon && <tab.icon className="h-4 w-4" />}
                {tab.label}
              </button>
            )}
          </Tab>
        ))}
      </Tab.List>
    </Tab.Group>
  )
}
