import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { Sparkles } from 'lucide-react'

/**
 * MainLayout — the authenticated app shell.
 * Dark sidebar (ops console) + light content canvas with a sticky topbar.
 */
export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  // Bump key to force child pages to refetch after a seed reset.
  const handleResetSeed = useCallback(() => setResetKey((k) => k + 1), [])

  return (
    <div className="flex h-screen overflow-hidden bg-ink-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} onResetSeed={handleResetSeed} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" key={resetKey}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Action Button for Ops Copilot */}
      <button
        onClick={() => window.dispatchEvent(new Event('transitops:open-copilot'))}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-[0_4px_20px_rgba(79,70,229,0.4)] transition-all hover:scale-105 hover:bg-brand-500 hover:shadow-[0_4px_25px_rgba(79,70,229,0.6)]"
        title="Ask the Ops Copilot"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    </div>
  )
}
