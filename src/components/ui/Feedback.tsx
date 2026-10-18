import { IconInbox, IconLoader2, type Icon } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

// Spinner for loading states.
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <IconLoader2
      size={size}
      className={cn('animate-spin text-brand', className)}
      aria-label="Loading"
    />
  )
}

type EmptyProps = {
  title: string
  description?: string
  icon?: Icon
  action?: ReactNode
}

// Shown when a list has no rows — an invitation, not an apology.
export function EmptyState({ title, description, icon: Icon = IconInbox, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <span className="mb-3 rounded-full bg-brand-tint p-3 text-brand">
        <Icon size={26} stroke={1.6} aria-hidden />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
