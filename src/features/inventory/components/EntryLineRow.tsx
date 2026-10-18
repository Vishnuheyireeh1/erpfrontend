import { IconMinus, IconPlus, IconX } from '@tabler/icons-react'
import { controlClass } from '@/components/ui/controlClass'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { itemTitle, qtyText } from '../constants'
import type { StockItem } from '../types'

export type EntryLine = { key: string; item: StockItem; direction: 'in' | 'out'; qty: string; unitCost: string }

type Props = {
  line: EntryLine
  allowDirection: boolean // adjustments can add or remove; opening only adds
  error?: string
  onChange: (patch: Partial<EntryLine>) => void
  onRemove: () => void
}

// Grid shared with the header in StockEntryPage: a row on laptop+, a card on phone.
export const entryGridClass =
  'grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,2fr)_110px_120px_120px_110px_36px] lg:items-center lg:gap-3'

export function EntryLineRow({ line, allowDirection, error, onChange, onRemove }: Props) {
  const { item } = line
  const unit = item.product.unit.code
  const qty = Number(line.qty) || 0
  const cost = line.direction === 'in' ? Number(line.unitCost) || 0 : Number(item.avgCost)
  const after = Number(item.stockQty) + (line.direction === 'in' ? qty : -qty)
  const input = (err?: string) => cn(controlClass(err), 'h-9')

  return (
    <div className={cn(entryGridClass, 'relative border-t border-line px-4 py-3 first:border-t-0')}>
      <div className="col-span-2 min-w-0 pr-8 lg:col-span-1 lg:pr-0">
        <p className="truncate font-medium text-ink">{itemTitle(item)}</p>
        <p className="text-xs text-muted">
          <span className="font-mono">{item.sku}</span> · In stock {qtyText(item.stockQty, unit)} → after{' '}
          <span className={after < 0 ? 'font-medium text-danger' : 'text-ink-soft'}>{qtyText(after, unit)}</span>
        </p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted lg:sr-only">Add / remove</span>
        {allowDirection ? (
          <div className="flex h-9 overflow-hidden rounded-control border border-line" role="group" aria-label="Direction">
            {(['in', 'out'] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={line.direction === d}
                onClick={() => onChange({ direction: d })}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 text-xs font-medium',
                  line.direction === d ? (d === 'in' ? 'bg-success-tint text-success' : 'bg-warn-tint text-warn') : 'text-muted hover:bg-page',
                )}
              >
                {d === 'in' ? <IconPlus size={14} /> : <IconMinus size={14} />}
                {d === 'in' ? 'Add' : 'Remove'}
              </button>
            ))}
          </div>
        ) : (
          <span className="flex h-9 items-center text-sm text-success">+ Add</span>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted lg:sr-only">Qty ({unit})</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={item.product.unit.allowDecimal ? '0.001' : '1'}
          value={line.qty}
          placeholder={`Qty (${unit})`}
          onChange={(e) => onChange({ qty: e.target.value })}
          className={input(error)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted lg:sr-only">Cost / unit ₹</span>
        {line.direction === 'in' ? (
          <input type="number" inputMode="decimal" min={0} step="0.01" value={line.unitCost} onChange={(e) => onChange({ unitCost: e.target.value })} className={input()} />
        ) : (
          <span className="flex h-9 items-center text-sm text-ink-soft" title="Stock going out uses the average cost">
            {formatINR(Number(item.avgCost))} avg
          </span>
        )}
      </label>

      <div className="flex flex-col gap-1 lg:text-right">
        <span className="text-xs text-muted lg:sr-only">Value</span>
        <span className={cn('flex h-9 items-center text-sm font-medium lg:justify-end', line.direction === 'out' ? 'text-warn' : 'text-ink')}>
          {line.direction === 'out' ? '−' : ''}{formatINR(qty * cost)}
        </span>
      </div>

      <button type="button" onClick={onRemove} aria-label={`Remove ${item.sku}`} className="absolute right-3 top-3 rounded-control p-1.5 text-muted hover:bg-page hover:text-ink lg:static">
        <IconX size={16} />
      </button>
    </div>
  )
}
