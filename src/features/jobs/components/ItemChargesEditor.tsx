import { IconPlus, IconX } from '@tabler/icons-react'
import { controlClass } from '@/components/ui/controlClass'
import { cn } from '@/lib/cn'
import { newItemCharge, type ItemCharge } from '../jobDrafts'
import { ChargeCombo } from './ChargeCombo'

type Props = { garment: string; options: string[]; charges: ItemCharge[]; onChange: (charges: ItemCharge[]) => void }

// Inside one garment on the bill: "+ Add charge" → pick the charge from the garment type's list (dropdown) or type it, then the
// amount. Nothing is added unless needed. A newly typed name joins the garment's list once the bill is booked.
// Printed as "Lining (Blouse)".
export function ItemChargesEditor({ garment, options, charges, onChange }: Props) {
  const known = (name: string) => options.some((o) => o.toLowerCase() === name.trim().toLowerCase())
  const set = (key: string, patch: Partial<ItemCharge>) => onChange(charges.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  // An empty box with the garment's list open — ↑ ↓ + Enter to pick, or type a new one.
  const add = () => onChange([...charges, newItemCharge()])
  const box = cn(controlClass(), 'h-9')

  return (
    <div className="mt-4">
      {charges.length > 0 && (
        <>
          <p className="mb-2 text-sm font-medium text-ink">Additional charges</p>
          <ul className="mb-2 flex flex-col gap-2">
            {charges.map((c, i) => (
              <li key={c.key} className="grid grid-cols-[minmax(0,1fr)_100px_28px] items-center gap-2">
                <div className="min-w-0">
                  <ChargeCombo label={`${garment} charge ${i + 1}`} value={c.name} options={options} autoFocus={!c.name} onChange={(v) => set(c.key, { name: v, other: !known(v) })} />
                  {c.other && c.name.trim() && <p className="mt-0.5 text-xs text-muted">New — added to {garment}'s list when the bill is booked</p>}
                </div>
                <input aria-label={`${garment} ${c.name || `charge ${i + 1}`} amount`} type="number" inputMode="decimal" min={0} placeholder="₹" value={c.amount} onChange={(e) => set(c.key, { amount: e.target.value })} className={cn(box, 'text-right')} />
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
