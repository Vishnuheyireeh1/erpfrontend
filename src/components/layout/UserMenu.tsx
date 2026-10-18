import { IconChevronDown, IconKey, IconLogout } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { ChangePasswordModal } from '@/features/auth/components/ChangePasswordModal'

// Avatar button in the top bar → change password / log out.
export function UserMenu() {
  const { admin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click or Esc.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const name = admin?.username ?? 'Admin'
  const initials = name.slice(0, 2).toUpperCase()
  const itemClass =
    'flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm hover:bg-page'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-control p-1 hover:bg-page"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-tint text-xs font-medium text-brand">
          {initials}
        </span>
        <span className="hidden max-w-[140px] truncate text-sm font-medium lg:inline">{name}</span>
        <IconChevronDown size={16} className="hidden text-muted lg:block" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-56 rounded-card border border-line bg-card p-1.5 shadow-lg"
        >
          <div className="border-b border-line px-3 pb-2 pt-1">
            <p className="truncate font-medium text-ink">{name}</p>
            <p className="text-xs text-muted">Administrator</p>
          </div>
          <button
            type="button"
            role="menuitem"
            className={`${itemClass} mt-1 text-ink`}
            onClick={() => {
              setOpen(false)
              setPwOpen(true)
            }}
          >
            <IconKey size={18} stroke={1.6} aria-hidden />
            Change password
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${itemClass} text-brand`}
            onClick={() => logout()}
          >
            <IconLogout size={18} stroke={1.6} aria-hidden />
            Log out
          </button>
        </div>
      )}

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}
