import { IconX } from '@tabler/icons-react'
import { controlClass } from '@/components/ui/controlClass'
import { itemTitle, qtyText } from '@/features/inventory/constants'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import type { QueueEntry } from '../hooks/useLabelSeed'

type Props = {
  entries: QueueEntry[]
  onQty: (id: number, qty: number) => void
  onRemove: (id: number) => void
}

// Items to print + how many labels of each.
export function LabelQueue({ entries, onQty, onRemove }: Props) {
  return (
    <ul className="divide-y divide-line">
      {entries.map(({ item, qty }) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            {/* Name and size / colour on separate lines so the size never gets cut off on phones */}
            <p className="truncate font-medium text-ink" title={itemTitle(item)}>{item.product.name}</p>
            <p className="truncate text-sm text-ink-soft">
              {[item.size?.name, item.colour?.name].filter(Boolean).join(' · ') || 'Standard'} · {formatINR(Number(item.sellingPrice))}
            </p>
            <p className="truncate text-xs text-muted">
              <span className="font-mono">{item.barcode}</span> · in stock {qtyText(item.stockQty, item.product.unit.code)}
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs text-muted sm:inline">Labels</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              value={qty}
              aria-label={`Labels for ${item.sku}`}
              onChange={(e) => onQty(item.id, Math.min(999, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
              className={cn(controlClass(qty < 1 ? 'x' : undefined), 'h-9 w-20 text-right')}
            />
          </label>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.sku}`}
            className="shrink-0 rounded-control p-1.5 text-muted hover:bg-page hover:text-ink"
          >
            <IconX size={16} />
          </button>
        </li>
      ))}
    </ul>
  )
}
