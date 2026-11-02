import type { Icon } from '@tabler/icons-react'
import { IconChevronDown } from '@tabler/icons-react'
import { useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

export type MoreItem = { label: string; icon?: Icon; onClick: () => void; danger?: boolean; hidden?: boolean }

// "More ▾" button: the less-used actions of a page in one short list, so the page shows only the main buttons.
// Keys: ↓ opens and moves down, ↑ moves up, Enter picks, Esc closes.
export function MoreMenu({ items, label = 'More' }: { items: MoreItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const shown = items.filter((i) => !i.hidden)
  if (!shown.length) return null
  const entries = () => [...(box.current?.querySelectorAll<HTMLButtonElement>('li button') ?? [])]
  const keys = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
      box.current?.querySelector<HTMLButtonElement>('button')?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) setOpen(true)
      window.setTimeout(() => {
        const list = entries()
        const at = list.indexOf(document.activeElement as HTMLButtonElement)
        list[e.key === 'ArrowDown' ? Math.min(list.length - 1, at + 1) : Math.max(0, at - 1)]?.focus()
      }, 0)
    }
  }
  // Closes when the cursor leaves the whole menu (moving inside it keeps it open).
  const away = (e: FocusEvent) => { if (!box.current?.contains(e.relatedTarget as Node | null)) window.setTimeout(() => setOpen(false), 150) }
  return (
    <div ref={box} className="relative" onKeyDown={keys} onBlur={away}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
                className={cn('flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm focus:bg-page focus:outline-none', i.danger ? 'text-danger hover:bg-danger-tint' : 'text-ink hover:bg-page')}
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
