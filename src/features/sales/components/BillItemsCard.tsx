import { ItemPicker } from '@/features/inventory/components/ItemPicker'
import type { StockItem } from '@/features/inventory/types'
import { cn } from '@/lib/cn'
import { SaleLineRow, saleGridClass, type SaleLineDraft } from './SaleLineRow'
import { StepCard } from './StepCard'

type Props = {
  step: number
  stitching: boolean // stitching job → items are optional; each can be "Sold" or "Used for stitching"
  lines: SaleLineDraft[]
  calc: (l: SaleLineDraft, i: number) => { amount: number; gstRate: number } | undefined
  errorOf: (l: SaleLineDraft) => string | undefined // shown after Save is pressed
  onAdd: (item: StockItem) => void
  onChange: (key: string, patch: Partial<SaleLineDraft>) => void
  onRemove: (key: string) => void
}

// Billing page: the items on the bill (scan / search, qty or metres, rate, discount).
export function BillItemsCard({ step, stitching, lines, calc, errorOf, onAdd, onChange, onRemove }: Props) {
  return (
    <StepCard
      step={step}
      title={`Items${lines.length ? ` (${lines.length})` : ''}${stitching ? ' — optional' : ''}`}
      bodyClassName="p-0"
    >
      <div className="border-b border-line p-4"><ItemPicker onPick={onAdd} placeholder="Scan barcode or type item name / code" /></div>
      {lines.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">{stitching ? 'No items — that is fine for stitching only.' : 'Scan or search an item'}</p>
      ) : (
        // Rows lay out by the items area's own width (it changes when the right side is dragged).
        <div className="@container">
          <div className={cn(saleGridClass, 'hidden px-4 py-2 text-xs font-medium text-muted @2xl:grid')}>
            <span>Item</span><span>Qty / metres</span><span>Rate ₹</span><span>Discount</span><span className="text-right">GST</span><span className="text-right">Amount</span><span />
          </div>
          {lines.map((l, i) => (
            <SaleLineRow
              key={l.key}
              line={l}
              amount={calc(l, i)?.amount ?? 0}
              gstRate={calc(l, i)?.gstRate ?? 0}
              stitching={stitching}
              error={errorOf(l)}
              onChange={(p) => onChange(l.key, p)}
              onRemove={() => onRemove(l.key)}
            />
          ))}
        </div>
      )}
    </StepCard>
  )
}
