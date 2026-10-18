import { IconX } from '@tabler/icons-react'
import { useEffect } from 'react'
import logo from '@/assets/logo.png'
import { cn } from '@/lib/cn'
import { SidebarNav } from './SidebarNav'

type Props = { open: boolean; onClose: () => void }

// Phone-only slide-in menu with every module (opened by the menu button or "More").
export function MobileDrawer({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <div className={cn('fixed inset-0 z-50 md:hidden', !open && 'pointer-events-none')}>
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink/40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        className={cn(
          'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-line px-4">
          <img src={logo} alt="Sairandhri Designer Boutique" className="h-auto w-44" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-control p-1.5 text-muted hover:bg-page"
            aria-label="Close menu"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav labels="always" onNavigate={onClose} />
        </div>
      </aside>
    </div>
  )
}
