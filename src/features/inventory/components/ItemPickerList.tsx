import { IconCheck } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { itemTitle, qtyText } from '../constants'
import type { StockItem } from '../types'

type Props = {
  heading: string
  items: StockItem[]
  loading: boolean
  loaded: boolean
  emptyText: string
  moreCount: number
  active: number
  selected: Map<number, StockItem>
  onHover: (index: number) => void
  onToggle: (item: StockItem) => void
  onMore: () => void
  onAdd: () => void
  onCancel: () => void
}

const keep = (e: React.MouseEvent) => e.preventDefault() // don't steal focus from the search box

// The open list of the item picker: tick items (several, even across searches), then Add — or Cancel.
export function ItemPickerList(p: Props) {
  const count = p.selected.size
  return (
    <div className="absolute inset-x-0 top-12 z-40 flex max-h-[26rem] flex-col rounded-card border border-line bg-card shadow-lg">
      <p className="border-b border-line px-3 py-1.5 text-xs text-muted">{p.heading} · tick the items, then Add</p>
      <ul className="min-h-0 flex-1 overflow-y-auto p-1" role="listbox" aria-multiselectable="true">
        {!p.loaded && p.loading && <li className="px-3 py-2 text-sm text-muted">Loading…</li>}
        {p.loaded && p.items.length === 0 && <li className="px-3 py-2 text-sm text-muted">{p.emptyText}</li>}
        {p.items.map((i, idx) => {
          const on = p.selected.has(i.id)
          return (
            <li key={i.id} role="option" aria-selected={on}>
              <button
                type="button"
                onMouseDown={keep}
                onMouseEnter={() => p.onHover(idx)}
                onClick={() => p.onToggle(i)}
                className={cn('flex w-full items-center gap-3 rounded-control px-3 py-2 text-left', on ? 'bg-brand-tint' : idx === p.active ? 'bg-page' : 'hover:bg-page')}
              >
                <span className={cn('flex size-5 shrink-0 items-center justify-center rounded border', on ? 'border-brand bg-brand text-white' : 'border-line bg-card')} aria-hidden>
                  {on && <IconCheck size={14} stroke={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{itemTitle(i)}</span>
                  <span className="block truncate font-mono text-xs text-muted">{i.sku} · {i.barcode}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm text-ink">{formatINR(Number(i.sellingPrice))}</span>
                  <span className={cn('block text-xs', Number(i.stockQty) > 0 ? 'text-ink-soft' : 'text-danger')}>{qtyText(i.stockQty, i.product.unit.code)}</span>
                </span>
              </button>
            </li>
          )
        })}
        {p.moreCount > 0 && (
          <li>
            <button type="button" onMouseDown={keep} onClick={p.onMore} className="w-full rounded-control px-3 py-2 text-center text-sm font-medium text-brand hover:bg-page">
              {p.loading ? 'Loading…' : `Show more (${p.moreCount} more)`}
            </button>
          </li>
        )}
      </ul>
      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2" onMouseDown={keep}>
        <span className="text-sm text-ink-soft">{count ? `${count} selected` : 'Nothing selected'}</span>
        <span className="flex gap-2">
          <Button size="sm" onClick={p.onCancel}>Cancel</Button>
          <Button size="sm" variant="primary" disabled={!count} onClick={p.onAdd}>{count ? `Add (${count})` : 'Add'}</Button>
        </span>
      </div>
    </div>
  )
}
