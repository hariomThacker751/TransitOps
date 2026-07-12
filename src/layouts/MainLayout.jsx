import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

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
    </div>
  )
}
