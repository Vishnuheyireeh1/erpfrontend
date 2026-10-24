import { IconSearch } from '@tabler/icons-react'
import { useState, type KeyboardEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { inventoryApi } from '@/features/inventory/api/inventory.api'
import { itemTitle, qtyText } from '@/features/inventory/constants'
import type { StockItem } from '@/features/inventory/types'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'

type Props = { initial?: string; onPick: (item: StockItem) => void; onClose: () => void }

// F2 on the Fast bill: type part of a name / code → ↑ ↓ to choose → Enter adds it. Esc closes.
// Out-of-stock items are listed (in red) but can't be picked unless Settings allow selling below zero.
export function ItemSearchModal({ initial = '', onPick, onClose }: Props) {
  const [text, setText] = useState(initial)
  const [active, setActive] = useState(0)
  const debounced = useDebounce(text.trim(), 200)
  const params = { search: debounced || undefined, status: debounced ? ('all' as const) : ('available' as const), page: 1, pageSize: 30 }
  const q = useApiQuery(['fast-item-search', params], () => inventoryApi.list(params))
  const items = (q.data ?? q.lastData)?.items ?? []

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, Math.min(items.length - 1, a + (e.key === 'ArrowDown' ? 1 : -1))))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[active]) onPick(items[active])
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title="Find item (F2)" description="Type a name, code, size or colour · ↑ ↓ to move · Enter to add · Esc to close">
      <div className="mb-3 flex h-11 items-center gap-2 rounded-control border border-line px-3 focus-within:border-brand">
        <IconSearch size={18} className="text-muted" aria-hidden />
        <input
          autoFocus
          value={text}
          onChange={(e) => { setText(e.target.value); setActive(0) }}
          onKeyDown={onKeyDown}
          placeholder="e.g. silk saree, P000003, red"
          aria-label="Search items"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      <ul role="listbox" aria-label="Items" className="max-h-[50vh] overflow-y-auto rounded-control border border-line">
        {items.map((item, i) => {
          const out = Number(item.stockQty) <= 0
          return (
            <li key={item.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => onPick(item)}
                className={cn('flex w-full items-center justify-between gap-3 border-b border-line px-3 py-2 text-left text-sm last:border-b-0', i === active && 'bg-brand-tint')}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{itemTitle(item)}</span>
                  <span className="font-mono text-xs text-muted">{item.sku}{item.barcode ? ` · ${item.barcode}` : ''}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-medium">{formatINR(Number(item.sellingPrice))}</span>
                  <span className={cn('text-xs', out ? 'text-danger' : 'text-muted')}>{out ? 'Out of stock' : qtyText(item.stockQty, item.product.unit.code)}</span>
                </span>
              </button>
            </li>
          )
        })}
        {!items.length && <li className="px-3 py-6 text-center text-sm text-muted">{q.loading ? 'Searching…' : 'No items found'}</li>}
      </ul>
    </Modal>
  )
}
