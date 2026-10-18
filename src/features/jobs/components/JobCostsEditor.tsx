import { IconPlus, IconX } from '@tabler/icons-react'
import { controlClass } from '@/components/ui/controlClass'
import { cn } from '@/lib/cn'
import { newCost, type CostDraft } from '../jobDrafts'
import { chargeKinds } from '../jobUtils'

type Props = { rows: CostDraft[]; onChange: (rows: CostDraft[]) => void }

// Extra charges printed on the customer's bill (embroidery ₹500 …). What the shop spends is added on the job page.
export function JobCostsEditor({ rows, onChange }: Props) {
  const set = (key: string, patch: Partial<CostDraft>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const box = cn(controlClass(), 'h-9')
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_100px_32px] gap-2 sm:grid-cols-[150px_minmax(0,1fr)_110px_32px]">
          <select aria-label={`Charge ${i + 1} type`} value={r.kind} onChange={(e) => set(r.key, { kind: e.target.value })} className={box}>
            {chargeKinds.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input aria-label={`Charge ${i + 1} details`} placeholder="Details" value={r.description} onChange={(e) => set(r.key, { description: e.target.value })} className={cn(box, 'col-span-3 row-start-2 sm:col-span-1 sm:row-start-1')} />
          <input aria-label={`Charge ${i + 1} amount`} type="number" inputMode="decimal" min={0} placeholder="₹" value={r.charge} onChange={(e) => set(r.key, { charge: e.target.value })} className={cn(box, 'text-right')} />
          <button type="button" aria-label={`Remove charge ${i + 1}`} onClick={() => onChange(rows.filter((x) => x.key !== r.key))} className="flex h-9 w-8 items-center justify-center rounded-control text-muted hover:bg-page hover:text-ink">
            <IconX size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, newCost()])} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-brand hover:underline">
        <IconPlus size={15} /> Add charge (embroidery, lining…)
      </button>
      <p className="text-xs text-muted">Printed on the bill. What the shop spends (cutting, hand work…) is added as job costs on the job page.</p>
    </div>
  )
}
