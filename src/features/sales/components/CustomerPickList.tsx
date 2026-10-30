import { IconUserCheck, IconUserPlus } from '@tabler/icons-react'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import type { Customer } from '../types'

export const Money = ({ c }: { c: Customer }) => (
  <>
    {c.balance > 0.004 && <span className="text-warn"> · owes {formatINR(c.balance)}</span>}
    {c.balance < -0.004 && <span className="text-success"> · advance {formatINR(-c.balance)}</span>}
  </>
)

type Props = {
  items: Customer[]
  loading: boolean
  searching: boolean // something typed → "no results" means a new customer
  hasMore: boolean
  moreLoading: boolean
  highlight: number
  onPick: (c: Customer) => void
  onMore: () => void
}

// Drop-down under the customer name / phone: saved customers (scrolls), "Show more" loads the next lot in place.
// mousedown + preventDefault keeps the typing box focused while a row / button is clicked.
export function CustomerPickList({ items, loading, searching, hasMore, moreLoading, highlight, onPick, onMore }: Props) {
  return (
    <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-control border border-line bg-card shadow-lg" onMouseDown={(e) => e.preventDefault()}>
      <p className="border-b border-line px-3 py-1.5 text-xs text-muted">{searching ? 'Matching customers' : 'Latest customers'}</p>
      <ul className="max-h-64 overflow-y-auto p-1" role="listbox">
        {loading && <li className="px-3 py-2 text-sm text-muted">Loading…</li>}
        {!loading && items.length === 0 && (
          <li className="flex items-center gap-2 px-3 py-2 text-sm text-muted">
            <IconUserPlus size={16} className="shrink-0 text-brand" aria-hidden />
            {searching ? 'No results — will be saved as a new customer' : 'No saved customers yet'}
          </li>
        )}
        {items.map((c, i) => (
          <li key={c.id} role="option" aria-selected={i === highlight}>
            <button type="button" onClick={() => onPick(c)}
              className={cn('flex w-full items-center gap-2 rounded-control px-2 py-2 text-left text-sm hover:bg-page', i === highlight && 'bg-page')}>
              <IconUserCheck size={16} className="shrink-0 text-brand" aria-hidden />
              <span className="min-w-0 truncate">
                <span className="font-medium text-ink">{c.name}</span>
                <span className="text-xs text-muted"> · {c.phone || 'no phone'} · {c.code}<Money c={c} /></span>
              </span>
            </button>
          </li>
        ))}
        {hasMore && (
          <li>
            <button type="button" onClick={onMore} disabled={moreLoading} className="w-full rounded-control px-2 py-2 text-center text-sm font-medium text-brand hover:bg-page disabled:text-muted">
              {moreLoading ? 'Loading…' : 'Show more'}
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}
