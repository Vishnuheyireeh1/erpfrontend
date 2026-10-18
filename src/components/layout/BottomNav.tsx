import { IconDots } from '@tabler/icons-react'
import { NavLink } from 'react-router-dom'
import { bottomNavItems } from '@/config/navigation'
import { cn } from '@/lib/cn'

const itemClass = 'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]'

// Phone-only bottom bar: 4 shortcuts + More (opens the drawer).
export function BottomNav({ onMore }: { onMore: () => void }) {
  return (
    <nav
      aria-label="Quick"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {bottomNavItems.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) => cn(itemClass, isActive ? 'text-brand' : 'text-muted')}
        >
          <Icon size={22} stroke={1.6} aria-hidden />
          {label}
        </NavLink>
      ))}
      <button type="button" onClick={onMore} className={cn(itemClass, 'text-muted')}>
        <IconDots size={22} stroke={1.6} aria-hidden />
        More
      </button>
    </nav>
  )
}
