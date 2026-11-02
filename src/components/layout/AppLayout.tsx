import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MobileDrawer } from './MobileDrawer'
import { FormPageKeys } from './FormPageKeys'
import { KeysHelp } from './KeysHelp'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useAppKeys } from './useAppKeys'
import { useFormKeys } from './useFormKeys'

const COLLAPSE_KEY = 'sairandhri.sidebarCollapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function saveCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
  } catch {
    // Storage unavailable (private mode) — the preference just isn't remembered.
  }
}

// App shell: sidebar (tablet+), top bar, page content, bottom bar + drawer (phone).
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  useAppKeys() // Alt+M menu, Ctrl+K search, Alt+B billing
  useFormKeys() // every form / popup: Enter next, Esc back, arrows, F9 / Ctrl+S save

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    saveCollapsed(next)
  }

  return (
    <div className="flex min-h-dvh">
      <KeysHelp />
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setDrawerOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8">
          <Outlet />
          <FormPageKeys />
        </main>
      </div>
      <BottomNav onMore={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />
    </div>
  )
}
