import type { Icon } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type CardProps = {
  title?: string
  actions?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}

// White surface with optional title row. Use bodyClassName="p-0" for edge-to-edge tables.
export function Card({ title, actions, className, bodyClassName, children }: CardProps) {
  return (
    <section className={cn('rounded-card border border-line bg-card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          {title && <h2 className="font-semibold text-ink">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

type StatProps = {
  label: string
  value: string
  note?: string
  noteTone?: 'muted' | 'success' | 'warn'
  icon?: Icon
}

const noteColor = { muted: 'text-muted', success: 'text-success', warn: 'text-warn' }

// KPI tile for dashboards.
export function StatCard({ label, value, note, noteTone = 'muted', icon: Icon }: StatProps) {
  return (
    <div className="rounded-card border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted">{label}</p>
        {Icon && (
          <span className="rounded-control bg-brand-tint p-1.5 text-brand">
            <Icon size={18} stroke={1.7} aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {note && <p className={cn('mt-0.5 text-xs', noteColor[noteTone])}>{note}</p>}
    </div>
  )
}
