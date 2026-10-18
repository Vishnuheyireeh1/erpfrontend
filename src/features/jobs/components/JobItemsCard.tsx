import { IconArrowBackUp, IconPlus, IconX } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/toast-context'
import { qtyText } from '@/features/inventory/constants'
import { ApiError } from '@/lib/api'
import { formatDate, formatINR } from '@/lib/format'
import { jobsApi } from '../api/jobs.api'
import type { Job } from '../types'

type Props = { job: Job; open: boolean; onAdd: () => void; onReturn: () => void; onChanged: () => void }

// Shop items on the job: sold (on the bill) and used for the stitching (cost only), plus returns.
export function JobItemsCard({ job, open, onAdd, onReturn, onChanged }: Props) {
  const toast = useToast()
  const canReturn = job.status !== 'CANCELLED' && job.materials.some((m) => !m.included && Number(m.qty) > Number(m.returnedQty))
  const remove = async (id: number) => {
    try {
      await jobsApi.removeItem(job.id, id)
      toast.success('Back in stock')
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not remove')
    }
  }
  if (!open && job.materials.length === 0) return null

  return (
    <Card
      title="Readymade items & fabric"
      className="mb-5"
      actions={
        <div className="flex flex-wrap gap-2">
          {canReturn && <Button icon={IconArrowBackUp} onClick={onReturn}>Items returned</Button>}
          {open && <Button icon={IconPlus} onClick={onAdd}>Add items</Button>}
        </div>
      }
    >
      {job.materials.length === 0 ? (
        <p className="text-sm text-muted">No items yet. Add readymade items the customer buys, or fabric used for the stitching.</p>
      ) : (
        <ul className="divide-y divide-line">
          {job.materials.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{m.description}</p>
                <p className="text-xs text-muted">
                  {qtyText(m.qty, m.variant.product.unit.code)}
                  {m.included ? ` · used for stitching · cost ${formatINR(Number(m.qty) * Number(m.unitCost))}` : ` × ${formatINR(Number(m.rate))}${Number(m.discountPct) ? ` −${Number(m.discountPct)}%` : ''} · GST ${Number(m.gstRate)}%`}
                  {Number(m.returnedQty) > 0 && <span className="text-warn"> · {qtyText(m.returnedQty)} returned</span>}
                </p>
              </div>
              {m.included ? <Badge>Used</Badge> : <span className="shrink-0 font-semibold">{formatINR(Number(m.amount))}</span>}
              {open && m.included && (
                <button type="button" onClick={() => remove(m.id)} aria-label={`Remove ${m.description}`} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-ink"><IconX size={16} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {job.returns.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
          {job.returns.map((r) => (
            <li key={r.id} className="flex justify-between gap-3">
              <Link to={`/sales/returns/${r.id}`} className="text-brand hover:underline">{r.docNo}</Link>
              <span className="text-ink-soft">{formatDate(r.docDate)} · return{Number(r.refundAmount) > 0 ? `, refunded ${formatINR(Number(r.refundAmount))}` : ''}{r.status === 'CANCELLED' ? ' (cancelled)' : ''}</span>
              <span className="font-medium">{formatINR(Number(r.grandTotal))}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
