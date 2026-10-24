import { IconPackage, IconPencil, IconPlus, IconUsers, IconX } from '@tabler/icons-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/toast-context'
import { paymentModeLabels } from '@/features/purchase/api/purchase.api'
import { ApiError } from '@/lib/api'
import { formatDate, formatINR } from '@/lib/format'
import { jobsApi } from '../api/jobs.api'
import type { Job, JobCostEntry } from '../types'

type Props = { job: Job; onAddCost: () => void; onEditCost: (e: JobCostEntry) => void; onAssign: () => void; onUseStock: () => void; onChanged: () => void }
type Line = { key: string; date: string; name: string; detail: string; amount: number; tag: string; tone: 'info' | 'neutral' | 'warn' | 'success' | 'pending'; entry?: JobCostEntry }

const entryTag = (e: JobCostEntry) => (e.paidBy === 'WORKER' ? 'Shop pays later' : e.paidBy === 'SALARIED' ? 'On salary' : `Paid ${e.mode ? paymentModeLabels[e.mode] : ''}`)
const entryTone = (e: JobCostEntry) => (e.paidBy === 'WORKER' ? ('info' as const) : e.paidBy === 'SALARIED' ? ('warn' as const) : ('success' as const))

// Job work & costs: who stitched each garment (tailor pay), other work done and by whom (embroidery, cutting …),
// stock used, and anything paid out. Filled by the workshop after billing — any time, even after hand over.
export function JobCostsCard({ job, onAddCost, onEditCost, onAssign, onUseStock, onChanged }: Props) {
  const toast = useToast()
  const lines: Line[] = [
    ...job.items.map((i): Line => (i.tailor ? {
      key: `t${i.id}`, date: job.docDate, name: `Stitching — ${i.tailor.name}`, detail: `${i.qty} × ${formatINR(Number(i.labourRate))} · ${i.description}`,
      amount: i.qty * Number(i.labourRate), tag: i.tailor.payType === 'PIECE' ? 'Shop pays later' : 'On salary', tone: i.tailor.payType === 'PIECE' ? 'info' : 'warn',
    } : {
      key: `t${i.id}`, date: job.docDate, name: 'Stitching — no tailor yet', detail: `${i.qty} × ${i.description} · tap "Assign workers"`, amount: 0, tag: 'To assign', tone: 'pending',
    })),
    ...job.materials.filter((m) => m.included).map((m) => ({
      key: `m${m.id}`, date: m.createdAt, name: 'From stock', detail: `${m.description} · ${Number(m.qty)} ${m.variant.product.unit.code}`,
      amount: Number(m.qty) * Number(m.unitCost), tag: 'Stock', tone: 'neutral' as const,
    })),
    ...job.costEntries.map((e): Line => ({
      key: `e${e.id}`, date: e.date, name: `${e.category.name} — ${e.tailor?.name ?? (e.paidBy === 'PAID' ? 'outside' : 'who? (tap ✎)')}`,
      detail: `${Number(e.qty)} × ${formatINR(Number(e.rate))}${e.description ? ` · ${e.description}` : ''}${e.auto ? ' · usual rate' : ''}`,
      amount: Number(e.amount), tag: entryTag(e), tone: entryTone(e), entry: e,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))
  const total = lines.reduce((s, l) => s + l.amount, 0)

  const remove = async (entryId: number) => {
    try {
      await jobsApi.removeCost(job.id, entryId)
      toast.success('Cost removed')
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not remove')
    }
  }

  return (
    <Card
      title={`Job work & costs · ${formatINR(total)}`}
      className="mb-5"
      actions={
        job.status !== 'CANCELLED' && (
          <div className="flex flex-wrap gap-2">
            {job.status !== 'DELIVERED' && <Button icon={IconPackage} onClick={onUseStock}>Use from stock</Button>}
            <Button variant="primary" icon={IconUsers} onClick={onAssign}>Assign workers</Button>
            <Button icon={IconPlus} onClick={onAddCost}>Add cost</Button>
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <p className="text-sm text-muted">No work yet. Assign the tailor, then add embroidery, cutting, hand work … with who did it.</p>
      ) : (
        <ul className="divide-y divide-line">
          {lines.map((l) => (
            <li key={l.key} className="flex items-start gap-3 py-2 text-sm sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{l.name} <span className="font-normal text-muted">· {formatDate(l.date)}</span></p>
                <p className="truncate text-xs text-muted">{l.detail}</p>
                <div className="mt-1 sm:hidden"><Badge tone={l.tone}>{l.tag}</Badge></div>
              </div>
              <span className="hidden shrink-0 sm:inline-flex"><Badge tone={l.tone}>{l.tag}</Badge></span>
              <span className="shrink-0 whitespace-nowrap text-right font-semibold sm:w-20">{formatINR(l.amount)}</span>
              {l.entry && job.status !== 'CANCELLED' ? (
                <span className="flex shrink-0">
                  <button type="button" onClick={() => onEditCost(l.entry!)} aria-label={`Change ${l.name}`} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-brand"><IconPencil size={16} /></button>
                  <button type="button" onClick={() => remove(l.entry!.id)} aria-label={`Remove ${l.name}`} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-danger"><IconX size={16} /></button>
                </span>
              ) : (
                <span className="w-[3.75rem] shrink-0" />
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">Shop pays later = this person gets this money from the shop once the job is Ready (paid with their salary / in Job work). On salary = no extra money, their monthly salary covers it. Paid = money already given in cash / UPI.</p>
    </Card>
  )
}
