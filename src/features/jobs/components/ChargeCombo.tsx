import { IconChevronDown, IconPlus } from '@tabler/icons-react'
import { useState, type KeyboardEvent } from 'react'
import { controlClass } from '@/components/ui/controlClass'
import { cn } from '@/lib/cn'

type Props = { label: string; value: string; options: string[]; onChange: (v: string) => void; autoFocus?: boolean }

// Charge name inside a garment on the bill: a dropdown of the garment type's saved charges that opens on click /
// focus and narrows as you type. ↑ ↓ move, Enter picks, Esc closes. A name not in the list is kept as typed.
export function ChargeCombo({ label, value, options, onChange, autoFocus }: Props) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const term = value.trim().toLowerCase()
  // Typing narrows the list (names starting with it first); an exact match shows them all.
  const exact = options.some((o) => o.toLowerCase() === term)
  const list = !term || exact ? options : [...options.filter((o) => o.toLowerCase().startsWith(term)), ...options.filter((o) => !o.toLowerCase().startsWith(term) && o.toLowerCase().includes(term))]
  const pick = (o: string) => { onChange(o); setOpen(false); setHi(-1) }

  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!list.length) return
      e.preventDefault()
      setOpen(true)
      setHi((h) => Math.max(0, Math.min(list.length - 1, h + (e.key === 'ArrowDown' ? 1 : -1))))
    } else if (e.key === 'Enter' && open && list[hi]) {
      e.preventDefault()
      pick(list[hi])
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="relative min-w-0">
      <input aria-label={label} role="combobox" aria-expanded={open} placeholder={options.length ? 'Pick or type, e.g. Lining' : 'Type the charge, e.g. Lining'} maxLength={40} value={value} autoComplete="off" autoFocus={autoFocus}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={keys}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(-1) }} className={cn(controlClass(), 'h-9 w-full pr-8')} />
      <IconChevronDown size={15} className="pointer-events-none absolute right-2.5 top-2.5 text-muted" aria-hidden />
      {open && (list.length > 0 || term) && (
        <ul role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-control border border-line bg-card p-1 shadow-lg" onMouseDown={(e) => e.preventDefault()}>
          {list.map((o, i) => (
            <li key={o} role="option" aria-selected={i === hi}>
              <button type="button" onClick={() => pick(o)} className={cn('w-full rounded-control px-2.5 py-1.5 text-left text-sm hover:bg-page', i === hi && 'bg-page', o.toLowerCase() === term && 'font-medium text-brand')}>{o}</button>
            </li>
          ))}
          {term && !exact && (
            <li className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted"><IconPlus size={13} aria-hidden /> "{value.trim()}" — new, saved to this garment's list when booked</li>
          )}
        </ul>
      )}
    </div>
  )
}
