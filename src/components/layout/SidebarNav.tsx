import { NavLink } from 'react-router-dom'
import { navGroups } from '@/config/navigation'
import { cn } from '@/lib/cn'

// always = drawer (phone) · desktop = icons on tablet, labels on laptop+ · never = icon rail
export type LabelMode = 'always' | 'desktop' | 'never'

type Props = { labels: LabelMode; onNavigate?: () => void }

const labelClass: Record<LabelMode, string> = {
  always: 'inline',
  desktop: 'hidden lg:inline',
  never: 'hidden',
}

const groupTitleClass: Record<LabelMode, string> = {
  always: 'block',
  desktop: 'hidden lg:block',
  never: 'hidden',
}

const alignClass: Record<LabelMode, string> = {
  always: '',
  desktop: 'justify-center lg:justify-start',
  never: 'justify-center',
}

export function SidebarNav({ labels, onNavigate }: Props) {
  return (
    <nav className="flex flex-col gap-4" aria-label="Main">
      {navGroups.map((group) => (
        <div key={group.title}>
          <p
            className={cn(
              'mb-1 px-3 text-[11px] font-medium uppercase tracking-wide text-muted',
              groupTitleClass[labels],
            )}
          >
            {group.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map(({ label, path, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === '/'}
                  title={label}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-control px-3 py-2 transition-colors',
                      alignClass[labels],
                      isActive
                        ? 'bg-brand-tint font-medium text-brand'
                        : 'text-ink-soft hover:bg-page hover:text-ink',
                    )
                  }
                >
                  <Icon size={20} stroke={1.6} className="shrink-0" aria-hidden />
                  <span className={cn('truncate', labelClass[labels])}>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
