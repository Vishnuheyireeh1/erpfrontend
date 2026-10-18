import type { Icon } from '@tabler/icons-react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

export type TabItem<K extends string> = { key: K; label: string; icon?: Icon }

type Props<K extends string> = {
  tabs: TabItem<K>[]
  active: K
  onChange: (key: K) => void
}

// Underlined tab bar. Scrolls sideways on phones instead of wrapping.
export function Tabs<K extends string>({ tabs, active, onChange }: Props<K>) {
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the selected tab visible when the bar is scrollable (phones).
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])

  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div ref={listRef} role="tablist" className="flex min-w-max gap-1 border-b border-line">
        {tabs.map(({ key, label, icon: Icon }) => {
          const selected = key === active
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(key)}
              className={cn(
                '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors',
                selected
                  ? 'border-brand font-medium text-brand'
                  : 'border-transparent text-ink-soft hover:text-ink',
              )}
            >
              {Icon && <Icon size={18} stroke={1.6} aria-hidden />}
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
