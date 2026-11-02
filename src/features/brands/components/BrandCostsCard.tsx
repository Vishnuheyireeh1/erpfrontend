import { IconPlus, IconTrash, IconUsers } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { brandOrderApi } from '../api/brandOrder.api'
import type { BrandCost, BrandOrder } from '../types'
import { BrandCostModal } from './BrandCostModal'

const PAID_LABEL: Record<BrandCost['paidBy'], string> = { WORKER: 'owed to worker', SALARIED: 'salaried', PAID: 'paid out' }

// Brand order page, like a job's work card: who did what (Assign workers), money paid out (Add cost);
// the order's profit stays closed at the bottom — only the owner needs it.
export function BrandCostsCard({ order, onChanged, onAssign }: { order: BrandOrder; onChanged: () => void; onAssign: () => void }) {
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<BrandCost | null>(null)
  const canAdd = order.status !== 'CANCELLED'
  const p = order.profit
  const total = order.costs.reduce((s, c) => s + Number(c.amount), 0)

  const remove = async () => {
    if (!removing) return
    try {
      await brandOrderApi.removeCost(order.id, removing.id)
      toast.success('Cost removed')
      setRemoving(null)
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not remove')
    }
  }

  return (
    <>
      <Card title="Job work & costs" className="mb-5"
        actions={canAdd && <div className="flex flex-wrap gap-2"><Button size="sm" icon={IconUsers} onClick={onAssign} disabled={order.status !== 'OPEN'}>Assign workers</Button><Button size="sm" icon={IconPlus} onClick={() => setAdding(true)}>Add cost</Button></div>}>
        {order.costs.length > 0 ? (
          <ul className="mb-4 flex flex-col divide-y divide-line text-sm">
            {order.costs.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="font-medium">{c.category.name}</span>
                  <span className="text-ink-soft"> · {Number(c.qty)} × {formatINR(Number(c.rate))}{c.tailor ? ` · ${c.tailor.name}` : ''}</span>
                  <span className="block text-xs text-muted">
                    {formatDate(c.date)} · {PAID_LABEL[c.paidBy]}{c.mode ? ` (${c.mode.toLowerCase()})` : ''}{c.item ? ` · ${c.item.description}${c.item.endCustomer ? ` · ${c.item.endCustomer}` : ''}` : ''}{c.description ? ` · ${c.description}` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{formatINR(Number(c.amount))}</span>
                  {canAdd && <button type="button" onClick={() => setRemoving(c)} aria-label={`Remove ${c.category.name}`} className="rounded-control p-1 text-muted hover:text-danger"><IconTrash size={15} /></button>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-muted">No other work yet. Assign the workers, then add any money paid out.</p>
        )}
        {p && (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-ink-soft">Profit so far: <span className={p.profit < 0 ? 'text-danger' : 'text-success'}>{formatINR(p.profit)}</span></summary>
          <div className="mt-2 grid grid-cols-2 gap-3 rounded-control bg-page p-3 text-sm sm:grid-cols-5">
            <div><p className="text-xs text-muted">Billed (before GST)</p><p className="font-semibold">{formatINR(p.billed)}</p></div>
            <div><p className="text-xs text-muted">Our cloth / items</p><p className="font-semibold">− {formatINR(p.ourCloth)}</p></div>
            <div><p className="text-xs text-muted">Stitching pay</p><p className="font-semibold">− {formatINR(p.tailorPay)}</p></div>
            <div><p className="text-xs text-muted">Other work / costs</p><p className="font-semibold">− {formatINR(total)}</p></div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs text-muted">Profit so far</p>
              <p className={cn('text-lg font-semibold', p.profit < 0 ? 'text-danger' : 'text-success')}>{formatINR(p.profit)}</p>
            </div>
          </div>
            <p className="mt-2 text-xs text-muted">Billed counts delivery bills made so far; stitching pay counts per-piece tailors for pieces that are ready or delivered.</p>
          </details>
        )}
      </Card>
      {adding && <BrandCostModal order={order} onClose={() => setAdding(false)} onDone={() => { setAdding(false); onChanged() }} />}
      <ConfirmDialog open={!!removing} title="Remove this cost?" message={removing ? `${removing.category.name} ${formatINR(Number(removing.amount))} comes off this order (and off the worker's / day book).` : ''}
        confirmLabel="Remove" danger onConfirm={remove} onCancel={() => setRemoving(null)} />
    </>
  )
}
