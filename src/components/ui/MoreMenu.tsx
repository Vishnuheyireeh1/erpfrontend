import type { Icon } from '@tabler/icons-react'
import { IconChevronDown } from '@tabler/icons-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'

export type MoreItem = { label: string; icon?: Icon; onClick: () => void; danger?: boolean; hidden?: boolean }

// "More ▾" button: the less-used actions of a page in one short list, so the page shows only the main buttons.
export function MoreMenu({ items, label = 'More' }: { items: MoreItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const shown = items.filter((i) => !i.hidden)
  if (!shown.length) return null
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-1.5 rounded-control border border-line bg-card px-4 text-sm font-medium text-ink hover:bg-page"
      >
        {label} <IconChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="absolute right-0 top-11 z-40 min-w-56 rounded-card border border-line bg-card p-1 shadow-lg">
          {shown.map((i) => (
            <li key={i.label}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setOpen(false); i.onClick() }}
                className={cn('flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm', i.danger ? 'text-danger hover:bg-danger-tint' : 'text-ink hover:bg-page')}
              >
                {i.icon && <i.icon size={18} className="shrink-0" aria-hidden />}
                {i.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
