import { IconX } from '@tabler/icons-react'
import { Card } from '@/components/ui/Card'
import { controlClass } from '@/components/ui/controlClass'
import { useToast } from '@/components/ui/toast-context'
import { itemTitle, qtyText } from '@/features/inventory/constants'
import { ItemPicker } from '@/features/inventory/components/ItemPicker'
import type { StockItem } from '@/features/inventory/types'
import { cn } from '@/lib/cn'
import { startQty, unitWord } from '@/features/sales/units'
import { formatINR } from '@/lib/format'
import { newLine, type LineDraft } from '../productionDrafts'

type Props = {
  kind: 'output' | 'material'
  lines: LineDraft[]
  onChange: (lines: LineDraft[]) => void
  otherIds: number[] // items already on the other list (can't be both)
  perPiece?: number // outputs: estimated cost per piece
}

const text = {
  output: { title: 'Finished pieces made', empty: 'Scan or search the finished item (create it first in Products if new).', picker: 'Scan / search the finished item' },
  material: { title: 'Materials used from stock', empty: 'Fabric, lining, lace, buttons … used for this batch (optional).', picker: 'Scan / search fabric or material' },
}

// One list of items + quantities: what was made (stock IN) or what was used (stock OUT).
export function ProductionLinesCard({ kind, lines, onChange, otherIds, perPiece = 0 }: Props) {
  const toast = useToast()
  const t = text[kind]
  const add = (item: StockItem) => {
    if (otherIds.includes(item.id)) return toast.error(`${item.product.name} is already on the other list`)
    const found = lines.find((l) => l.item.id === item.id)
    if (found) return onChange(lines.map((l) => (l === found ? { ...l, qty: String((Number(l.qty) || 0) + 1) } : l)))
    onChange([...lines, { ...newLine(item), qty: startQty(item.product.unit.allowDecimal) }])
  }
  const set = (key: string, qty: string) => onChange(lines.map((l) => (l.key === key ? { ...l, qty } : l)))

  return (
    <Card title={t.title} bodyClassName="p-0">
      <div className="border-b border-line p-4"><ItemPicker onPick={add} placeholder={t.picker} /></div>
      {lines.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {lines.map((l) => {
            const unit = l.item.product.unit.code
            const qty = Number(l.qty) || 0
            const after = Number(l.item.stockQty) + (kind === 'output' ? qty : -qty)
            return (
              <li key={l.key} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <p className="line-clamp-2 font-medium text-ink">{itemTitle(l.item)}</p>
                  <p className="text-xs text-muted">
                    <span className="font-mono">{l.item.sku}</span> · Stock {qtyText(l.item.stockQty, unit)} → <span className={after < 0 ? 'font-medium text-danger' : ''}>{qtyText(after, unit)}</span>
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted">{kind === 'output' ? 'Pieces' : unitWord(unit)}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={l.item.product.unit.allowDecimal ? 'any' : 1}
                    aria-label={`${l.item.product.name} quantity`}
                    value={l.qty}
                    onChange={(e) => set(l.key, e.target.value)}
                    className={cn(controlClass(!(qty > 0) ? 'x' : undefined), 'h-9 w-24 text-right')}
                  />
                  <span className="w-6 text-xs text-muted">{unit}</span>
                </label>
                <span className="ml-auto w-28 text-right text-sm">
                  {kind === 'material' ? (
                    <><span className="block font-medium text-ink">{formatINR(qty * Number(l.item.avgCost))}</span><span className="block text-xs text-muted">@ {formatINR(Number(l.item.avgCost))}</span></>
                  ) : (
                    <><span className="block font-medium text-ink">{formatINR(perPiece)}</span><span className="block text-xs text-muted">cost / piece</span></>
                  )}
                </span>
                <button type="button" onClick={() => onChange(lines.filter((x) => x.key !== l.key))} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-danger" aria-label={`Remove ${l.item.product.name}`}>
                  <IconX size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
