import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from '@tabler/icons-react'
import logo from '@/assets/logo.png'
import swan from '@/assets/swan.png'
import { cn } from '@/lib/cn'
import { SidebarNav } from './SidebarNav'

type Props = { collapsed: boolean; onToggle: () => void }

// Tablet (md): 72px icon rail. Laptop+ (lg): full 240px, user can collapse to rail.
export function Sidebar({ collapsed, onToggle }: Props) {
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-card md:flex',
        'w-[72px] transition-[width] duration-200',
        !collapsed && 'lg:w-60',
      )}
    >
      <div className="flex h-16 items-center justify-center border-b border-line px-3">
        <img
          src={logo}
          alt="Sairandhri Designer Boutique"
          className={cn('hidden h-auto w-full max-w-[190px]', !collapsed && 'lg:block')}
        />
        <img
          src={swan}
          alt="Sairandhri"
          className={cn('size-9 object-contain', !collapsed && 'lg:hidden')}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav labels={collapsed ? 'never' : 'desktop'} />
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'hidden items-center gap-2 border-t border-line py-3 text-muted hover:text-ink lg:flex',
          collapsed ? 'justify-center' : 'px-6',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <IconLayoutSidebarLeftExpand size={20} stroke={1.6} />
        ) : (
          <>
            <IconLayoutSidebarLeftCollapse size={20} stroke={1.6} />
            <span>Collapse</span>
          </>
        )}
      </button>
    </aside>
  )
}
