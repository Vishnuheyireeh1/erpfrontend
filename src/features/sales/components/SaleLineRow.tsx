import { IconX } from '@tabler/icons-react'
import { useEffect, useRef, type Ref } from 'react'
import { controlClass } from '@/components/ui/controlClass'
import { itemTitle, qtyText } from '@/features/inventory/constants'
import type { StockItem } from '@/features/inventory/types'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { unitWord } from '../units'

// included = shop material used for the stitching on this bill (not charged); only when the bill has stitching.
export type SaleLineDraft = { key: string; item: StockItem; qty: string; rate: string; discountPct: string; focus?: boolean; included?: boolean }

// Grid shared with the header row on the billing page: table row on laptop+, card on phone.
export const saleGridClass =
  'grid grid-cols-3 gap-3 @2xl:grid-cols-[minmax(0,1fr)_88px_100px_60px_40px_92px_28px] @2xl:items-center @2xl:gap-2'

type Props = { line: SaleLineDraft; amount: number; gstRate: number; error?: string; stitching?: boolean; onChange: (patch: Partial<SaleLineDraft>) => void; onRemove: () => void }

// One bill line. The quantity box shows the item's own unit (m for fabric, pc for garments),
// and a metre item gets the cursor straight away so staff type how many metres the customer wants.
export function SaleLineRow({ line, amount, gstRate, error, stitching, onChange, onRemove }: Props) {
  const { item } = line
  const unit = item.product.unit.code
  const decimal = item.product.unit.allowDecimal
  const qtyRef = useRef<HTMLInputElement>(null)
  // Newly added (or picked again) metre item → cursor into its quantity box.
  useEffect(() => {
    if (line.focus) qtyRef.current?.focus()
  }, [line.focus])
  const field = (label: string, key: 'qty' | 'rate' | 'discountPct', suffix?: string, props: { step?: string; max?: number; placeholder?: string; ref?: Ref<HTMLInputElement> } = {}) => (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted @2xl:sr-only">{label}</span>
      <span className="relative block">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          {...props}
          aria-label={label}
          value={line[key]}
          onChange={(e) => onChange(key === 'qty' ? { qty: e.target.value, focus: false } : { [key]: e.target.value })}
          onFocus={(e) => e.target.select()}
          className={cn(controlClass(key !== 'discountPct' ? error : undefined), 'h-9', suffix && 'pr-9')}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted">{suffix}</span>}
      </span>
    </label>
  )

  return (
    <div className={cn(saleGridClass, 'relative border-t border-line px-4 py-3 first:border-t-0')}>
      <div className="col-span-3 min-w-0 pr-8 @2xl:col-span-1 @2xl:pr-0">
        <p className="line-clamp-2 font-medium text-ink">{itemTitle(item)}</p>
        <p className="truncate text-xs text-muted">
          <span className="font-mono">{item.sku}</span> · in stock {qtyText(item.stockQty, unit)}
        </p>
        {decimal && !line.qty && !error && <p className="mt-1 text-xs font-medium text-brand">Type how many {unitWord(unit).toLowerCase()} the customer wants</p>}
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {stitching && (
          <div className="mt-1.5 inline-flex overflow-hidden rounded-control border border-line text-xs" role="group" aria-label="Customer pays or free for stitching">
            {([[false, 'Customer pays'], [true, 'Free — for stitching']] as const).map(([v, label]) => (
              <button key={label} type="button" aria-pressed={!!line.included === v} onClick={() => onChange({ included: v })} className={cn('px-2.5 py-1', !!line.included === v ? 'bg-brand text-white' : 'text-ink-soft hover:bg-page')}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {field(unitWord(unit), 'qty', unit, { step: decimal ? '0.01' : '1', placeholder: decimal ? '0.0' : '1', ref: qtyRef })}
      {field(`Rate ₹ per ${unit}`, 'rate', `/${unit}`, { step: '0.01' })}
      {field('Disc %', 'discountPct', undefined, { max: 100 })}
      <div className="hidden text-right text-xs text-muted @2xl:block">{gstRate}%</div>
      <div className="col-span-3 flex items-center justify-between @2xl:col-span-1 @2xl:justify-end">
        <span className="text-xs text-muted @2xl:hidden">Amount · GST {gstRate}% included</span>
        <span className="text-sm font-semibold text-ink">{line.included ? <span className="text-xs font-normal text-success">Free</span> : formatINR(amount)}</span>
      </div>
      <button type="button" onClick={onRemove} aria-label={`Remove ${item.sku}`} className="absolute right-3 top-3 rounded-control p-1.5 text-muted hover:bg-page hover:text-ink @2xl:static">
        <IconX size={16} />
      </button>
    </div>
  )
}
