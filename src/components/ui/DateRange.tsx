import { IconSortAscending, IconSortDescending } from '@tabler/icons-react'
import { cn } from '@/lib/cn'
import type { ListOrder } from '@/lib/useListOrder'
import { controlClass } from './controlClass'

export type DateRangeValue = { from: string; to: string }

// order + onOrder: shows the Newest first / Oldest first switch (every dated list has it).
type Props = { value: DateRangeValue; onChange: (v: DateRangeValue) => void; className?: string; order?: ListOrder; onOrder?: (o: ListOrder) => void }

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

// Shortcuts that shop staff use most.
function preset(kind: 'today' | 'month' | 'fy'): DateRangeValue {
  const t = today()
  const [y, m] = t.split('-').map(Number)
  if (kind === 'today') return { from: t, to: t }
  if (kind === 'month') return { from: `${y}-${String(m).padStart(2, '0')}-01`, to: t }
  const fyStart = m >= 4 ? y : y - 1 // Indian financial year starts 1 April
  return { from: `${fyStart}-04-01`, to: t }
}

// From / To date filter for document lists (both optional).
export function DateRange({ value, onChange, className, order, onOrder }: Props) {
  const box = cn(controlClass(), 'h-10 min-w-0')
  const chip = 'h-10 shrink-0 rounded-control border border-line bg-card px-3 text-xs text-ink-soft hover:bg-page'
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* From + To stay on one line, even on phones */}
      <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
        <input type="date" aria-label="From date" max={value.to || today()} value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} className={cn(box, 'flex-1 sm:w-[150px] sm:flex-none')} />
        <span className="shrink-0 text-xs text-muted">to</span>
        <input type="date" aria-label="To date" min={value.from || undefined} max={today()} value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} className={cn(box, 'flex-1 sm:w-[150px] sm:flex-none')} />
      </div>
      <button type="button" className={chip} onClick={() => onChange(preset('today'))}>Today</button>
      <button type="button" className={chip} onClick={() => onChange(preset('month'))}>This month</button>
      <button type="button" className={chip} onClick={() => onChange(preset('fy'))}>This FY</button>
      {(value.from || value.to) && (
        <button type="button" className={cn(chip, 'text-brand')} onClick={() => onChange({ from: '', to: '' })}>Clear</button>
      )}
      {order && onOrder && <SortSwitch order={order} onOrder={onOrder} />}
    </div>
  )
}

// Newest first ⇄ Oldest first.
export function SortSwitch({ order, onOrder }: { order: ListOrder; onOrder: (o: ListOrder) => void }) {
  const newest = order === 'newest'
  const Icon = newest ? IconSortDescending : IconSortAscending
  return (
    <button
      type="button"
      onClick={() => onOrder(newest ? 'oldest' : 'newest')}
      title="Change the order of the list"
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-control border border-line bg-card px-3 text-xs font-medium text-ink hover:bg-page sm:ml-auto"
    >
      <Icon size={16} aria-hidden /> {newest ? 'Newest first' : 'Oldest first'}
    </button>
  )
}
