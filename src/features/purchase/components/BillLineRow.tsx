import { IconX } from '@tabler/icons-react'
import { controlClass } from '@/components/ui/controlClass'
import { itemTitle } from '@/features/inventory/constants'
import type { StockItem } from '@/features/inventory/types'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'

export type BillLine = { key: string; item: StockItem; qty: string; rate: string; discountPct: string; gstRate: string }

// Grid shared with the header row in PurchaseFormPage: table row on laptop+, card on phone.
export const billGridClass =
  'grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-[minmax(0,2fr)_90px_110px_80px_80px_110px_32px] lg:items-center lg:gap-2'

type Props = { line: BillLine; total: number; error?: string; onChange: (patch: Partial<BillLine>) => void; onRemove: () => void }

export function BillLineRow({ line, total, error, onChange, onRemove }: Props) {
  const { item } = line
  const unit = item.product.unit.code
  const box = (err?: string) => cn(controlClass(err), 'h-9')
  const field = (label: string, key: 'qty' | 'rate' | 'discountPct' | 'gstRate', props: { step?: string; max?: number } = {}) => (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted lg:sr-only">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        {...props}
        value={line[key]}
        onChange={(e) => onChange({ [key]: e.target.value })}
        className={box(key === 'qty' || key === 'rate' ? error : undefined)}
      />
    </label>
  )

  return (
    <div className={cn(billGridClass, 'relative border-t border-line px-4 py-3 first:border-t-0')}>
      <div className="col-span-2 min-w-0 pr-8 sm:col-span-4 lg:col-span-1 lg:pr-0">
        <p className="truncate font-medium text-ink">{itemTitle(item)}</p>
        <p className="truncate text-xs text-muted">
          <span className="font-mono">{item.sku}</span>
          {item.product.hsnCode && <> · HSN {item.product.hsnCode}</>} · last cost {formatINR(Number(item.purchasePrice))}
        </p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      {field(`Qty (${unit})`, 'qty', { step: item.product.unit.allowDecimal ? '0.001' : '1' })}
      {field('Rate ₹', 'rate', { step: '0.01' })}
      {field('Disc %', 'discountPct', { max: 100 })}
      {field('GST %', 'gstRate', { max: 40 })}
      <div className="flex flex-col gap-1 lg:text-right">
        <span className="text-xs text-muted lg:sr-only">Amount (incl. GST)</span>
        <span className="flex h-9 items-center text-sm font-medium text-ink lg:justify-end">{formatINR(total)}</span>
      </div>
      <button type="button" onClick={onRemove} aria-label={`Remove ${item.sku}`} className="absolute right-3 top-3 rounded-control p-1.5 text-muted hover:bg-page hover:text-ink lg:static">
        <IconX size={16} />
      </button>
    </div>
  )
}
