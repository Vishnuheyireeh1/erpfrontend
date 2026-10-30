import { IconPlus, IconX } from '@tabler/icons-react'
import { controlClass } from '@/components/ui/controlClass'
import { cn } from '@/lib/cn'
import { useApiQuery } from '@/lib/useApiQuery'
import { jobsApi } from '../api/jobs.api'
import { newCost, type CostDraft } from '../jobDrafts'
import { chargeKinds } from '../jobUtils'

type Props = { rows: CostDraft[]; onChange: (rows: CostDraft[]) => void }

// Additional charges printed on the customer's bill: charge name + amount ("Urgent charge ₹100", "Lining ₹200").
// The name box suggests names already used on bills (most used first) + the usual ones; a new name typed here
// is suggested next time once the bill is saved. What the shop spends is added on the job page.
export function JobCostsEditor({ rows, onChange }: Props) {
  const used = useApiQuery('charge-kinds', () => jobsApi.chargeKinds())
  const names = [...new Set([...(used.data ?? []), ...chargeKinds])]
  const set = (key: string, patch: Partial<CostDraft>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const box = cn(controlClass(), 'h-9')
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_110px_32px] gap-2">
          <div className="min-w-0">
            <input list="charge-kinds" aria-label={`Charge ${i + 1} name`} placeholder="Charge, e.g. Urgent charge" maxLength={40} value={r.kind} onChange={(e) => set(r.key, { kind: e.target.value })} className={cn(box, 'w-full')} />
            {r.description && <p className="mt-0.5 truncate text-xs text-muted">for {r.description} — printed as {r.kind || 'Charge'} ({r.description})</p>}
          </div>
          <input aria-label={`Charge ${i + 1} amount`} type="number" inputMode="decimal" min={0} placeholder="₹" value={r.charge} onChange={(e) => set(r.key, { charge: e.target.value })} className={cn(box, 'text-right')} />
          <button type="button" aria-label={`Remove charge ${i + 1}`} onClick={() => onChange(rows.filter((x) => x.key !== r.key))} className="flex h-9 w-8 items-center justify-center rounded-control text-muted hover:bg-page hover:text-ink">
            <IconX size={16} />
          </button>
        </div>
      ))}
      <datalist id="charge-kinds">{names.map((k) => <option key={k} value={k} />)}</datalist>
      <button type="button" onClick={() => onChange([...rows, newCost('')])} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-brand hover:underline">
        <IconPlus size={15} /> Additional charge
      </button>
      <p className="text-xs text-muted">Pick a charge or type a new one — new ones are remembered once the bill is saved. Printed on the bill.</p>
    </div>
  )
}
