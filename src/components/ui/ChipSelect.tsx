import { IconCheck } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ChipOption = { value: number; label: string; prefix?: ReactNode }

type Props = {
  label: string
  options: ChipOption[]
  selected: number[]
  // Parent adds / removes the value from its latest state (safe with fast double taps).
  onToggle: (value: number) => void
  locked?: number[] // selected values that belong to saved rows — tooltip warns before removing
  emptyText?: string
}

// Multi-select as tappable chips — easier than a dropdown on phones.
export function ChipSelect({ label, options, selected, onToggle: toggle, locked = [], emptyText }: Props) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{label}</legend>
      {options.length === 0 && <p className="text-xs text-muted">{emptyText}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt.value)
          const isLocked = locked.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(opt.value)}
              title={isLocked ? 'Removing this deletes its saved variants' : undefined}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
                on ? 'border-brand bg-brand-tint text-brand' : 'border-line bg-card text-ink-soft hover:border-ink-soft',
              )}
            >
              {on ? <IconCheck size={15} aria-hidden /> : opt.prefix}
              {opt.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
