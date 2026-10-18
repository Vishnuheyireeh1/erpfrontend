import { IconX } from '@tabler/icons-react'
import { controlClass } from '@/components/ui/controlClass'
import { ItemPicker } from '@/features/inventory/components/ItemPicker'
import { itemTitle, qtyText } from '@/features/inventory/constants'
import type { StockItem } from '@/features/inventory/types'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { newProduct, productAmount, productError, type ProductDraft } from '../jobDrafts'

// Brand orders pass their own wording ("Charged to brand" / "Used free").
type Labels = { sold: string; used: string; usedNote: string }
const JOB_LABELS: Labels = { sold: 'Sold to customer', used: 'Used for stitching', usedNote: 'Not on the bill — stock cost counts in job costing.' }
type Props = { rows: ProductDraft[]; onChange: (rows: ProductDraft[]) => void; showErrors?: boolean; defaultIncluded?: boolean; labels?: Labels; placeholder?: string }

// Readymade items / fabric on a job. "Sold" = on the bill at its price (paid now); "Used for stitching" = not billed.
export function ProductLinesEditor({ rows, onChange, showErrors, defaultIncluded = false, labels = JOB_LABELS, placeholder = 'Scan or search readymade items, fabric, lining…' }: Props) {
  const set = (key: string, patch: Partial<ProductDraft>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  // Scanning the same item again adds 1.
  const add = (item: StockItem) => {
    const same = rows.find((r) => r.item.id === item.id)
    onChange(same ? rows.map((r) => (r === same ? { ...r, qty: String((Number(r.qty) || 0) + 1) } : r)) : [...rows, newProduct(item, defaultIncluded)])
  }
  const box = (err?: string) => cn(controlClass(err), 'h-9')

  return (
    <div className="flex flex-col gap-3">
      <ItemPicker onPick={add} placeholder={placeholder} />
      {rows.map((r) => {
        const error = showErrors ? productError(r) : undefined
        return (
          <div key={r.key} className="rounded-card border border-line p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium text-ink">{itemTitle(r.item)}</p>
                <p className="text-xs text-muted"><span className="font-mono">{r.item.sku}</span> · in stock {qtyText(r.item.stockQty, r.item.product.unit.code)}</p>
              </div>
              <button type="button" onClick={() => onChange(rows.filter((x) => x.key !== r.key))} aria-label={`Remove ${r.item.sku}`} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-ink">
                <IconX size={16} />
              </button>
            </div>
            <div className="mb-2 inline-flex rounded-control border border-line p-0.5 text-xs" role="group" aria-label="Billing">
              {[{ v: false, label: labels.sold }, { v: true, label: labels.used }].map((o) => (
                <button key={o.label} type="button" onClick={() => set(r.key, { included: o.v })} className={cn('rounded-[6px] px-2.5 py-1', r.included === o.v ? 'bg-brand text-white' : 'text-ink-soft hover:bg-page')}>
                  {o.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 items-end gap-2">
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-muted">Qty ({r.item.product.unit.code})</span>
                <input type="number" inputMode="decimal" min={0} step={r.item.product.unit.allowDecimal ? '0.001' : '1'} value={r.qty} onChange={(e) => set(r.key, { qty: e.target.value })} className={box(error)} />
              </label>
              {!r.included && (
                <>
                  <label className="flex min-w-0 flex-col gap-1">
                    <span className="text-xs text-muted">Rate ₹</span>
                    <input type="number" inputMode="decimal" min={0} value={r.rate} onChange={(e) => set(r.key, { rate: e.target.value })} className={box(error)} />
                  </label>
                  <label className="flex min-w-0 flex-col gap-1">
                    <span className="text-xs text-muted">Disc %</span>
                    <input type="number" inputMode="decimal" min={0} max={100} value={r.discountPct} onChange={(e) => set(r.key, { discountPct: e.target.value })} className={box()} />
                  </label>
                </>
              )}
              {r.included && <p className="col-span-2 pb-2 text-xs text-muted">{labels.usedNote}</p>}
            </div>
            {!r.included && <p className="mt-2 text-right text-sm font-semibold text-ink">{formatINR(productAmount(r))}</p>}
            {error && <p className="mt-1 text-xs text-danger">{error}</p>}
          </div>
        )
      })}
    </div>
  )
}
