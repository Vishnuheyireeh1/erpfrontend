import { IconPlus, IconX } from '@tabler/icons-react'
import { controlClass } from '@/components/ui/controlClass'
import type { GarmentCharge } from '@/features/workshop/types'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { itemChargeAmount, newItemCharge, type ItemCharge } from '../jobDrafts'
import { ChargeCombo } from './ChargeCombo'

type Props = { garment: string; options: GarmentCharge[]; charges: ItemCharge[]; onChange: (charges: ItemCharge[]) => void }

// Inside one garment on the bill: "+ Add charge" → charge name (the garment type's list, or typed), quantity, rate, amount.
// Picking a name fills its usual rate; changing the rate here is for this bill only — the garment type keeps its rate.
// A newly typed name joins the garment's list, with its rate, once the bill is booked. Printed as "Lining (Blouse)".
export function ItemChargesEditor({ garment, options, charges, onChange }: Props) {
  const find = (name: string) => options.find((o) => o.name.toLowerCase() === name.trim().toLowerCase())
  const set = (key: string, patch: Partial<ItemCharge>) => onChange(charges.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  const setName = (c: ItemCharge, name: string) => {
    const known = find(name)
    set(c.key, { name, other: !known, ...(known ? { rate: known.rate ? String(known.rate) : '' } : {}) })
  }
  const add = () => onChange([...charges, newItemCharge()])
  const box = cn(controlClass(), 'h-9 text-right')
  const grid = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_28px] items-center gap-2 @2xl:grid-cols-[minmax(0,1fr)_80px_100px_90px_28px]'

  return (
    <div className="mt-4">
      {charges.length > 0 && (
        <>
          <p className="mb-2 text-sm font-medium text-ink">Additional charges</p>
          <div className={cn(grid, 'mb-1 hidden text-xs text-muted @2xl:grid')}>
            <span>Charge</span><span className="text-right">Qty</span><span className="text-right">Rate ₹</span><span className="text-right">Amount</span><span />
          </div>
          <ul className="mb-2 flex flex-col gap-2">
            {charges.map((c, i) => (
              <li key={c.key} className={grid}>
                <div className="col-span-4 min-w-0 @2xl:col-span-1">
                  <ChargeCombo label={`${garment} charge ${i + 1}`} value={c.name} options={options.map((o) => o.name)} detail={(n) => { const r = find(n)?.rate; return r ? formatINR(r) : '' }} autoFocus={!c.name} onChange={(v) => setName(c, v)} />
                  {c.other && c.name.trim() && <p className="mt-0.5 text-xs text-muted">New — added to {garment}'s list when the bill is booked</p>}
                </div>
                <input aria-label={`${garment} ${c.name || `charge ${i + 1}`} quantity`} type="number" inputMode="decimal" min={0} step="any" placeholder="Qty" value={c.qty} onChange={(e) => set(c.key, { qty: e.target.value })} className={box} />
                <input aria-label={`${garment} ${c.name || `charge ${i + 1}`} rate`} type="number" inputMode="decimal" min={0} placeholder="₹" value={c.rate} onChange={(e) => set(c.key, { rate: e.target.value })} className={box} />
                <span className="truncate text-right text-sm font-medium text-ink">{formatINR(itemChargeAmount(c))}</span>
                <button type="button" aria-label={`Remove ${c.name || 'charge'}`} onClick={() => onChange(charges.filter((x) => x.key !== c.key))} className="flex h-9 w-7 items-center justify-center rounded-control text-muted hover:bg-page hover:text-ink"><IconX size={15} /></button>
              </li>
            ))}
          </ul>
        </>
      )}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        <IconPlus size={15} /> Add charge
      </button>
    </div>
  )
}
