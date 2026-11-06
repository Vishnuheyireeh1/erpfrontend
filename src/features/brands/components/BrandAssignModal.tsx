import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { useWorkPeople } from '@/features/jobs/hooks/useWorkPeople'
import { labourFor } from '@/features/jobs/jobDrafts'
import { AddWorkInline } from '@/features/jobs/components/AddWorkInline'
import { WorkerRow, type WorkPick } from '@/features/jobs/components/WorkerRow'
import { costCategoryApi, garmentApi, tailorApi } from '@/features/workshop/api/workshop.api'
import { ApiError } from '@/lib/api'
import { useApiQuery } from '@/lib/useApiQuery'
import { brandOrderApi } from '../api/brandOrder.api'
import type { BrandOrder } from '../types'

type Row = { id: number; stitch: WorkPick; works: Record<number, WorkPick> }
type Props = { order: BrandOrder; onClose: () => void; onDone: () => void }

const none: WorkPick = { tailorId: '', rate: '0', note: '' }

// Order page → "Assign workers", same as stitching jobs: per piece, who stitches it and who did each other work
// (Cutting, Embroidery …). Per-piece people: their usual pay fills in (can be changed). Salaried people: no pay.
export function BrandAssignModal({ order, onClose, onDone }: Props) {
  const toast = useToast()
  const workers = useApiQuery('tailor-options', () => tailorApi.options())
  const garments = useApiQuery('garments', () => garmentApi.list())
  const cats = useApiQuery('cost-categories', () => costCategoryApi.list())
  const left = order.items.filter((i) => i.stage !== 'DELIVERED')
  const [rows, setRows] = useState<Row[]>(() => left.map((i) => ({
    id: i.id,
    stitch: { tailorId: i.tailorId ? String(i.tailorId) : '', rate: String(Number(i.labourRate)), note: '' },
    works: Object.fromEntries(order.costs.filter((c) => c.itemId === i.id && c.tailorId && c.paidBy !== 'PAID').map((c) => [c.categoryId, { tailorId: String(c.tailorId), rate: String(Number(c.rate)), note: '' }])),
  })))
  const [busy, setBusy] = useState(false)
  const [extra, setExtra] = useState<number[]>([])
  const all = workers.data ?? []
  const staffList = useWorkPeople(all)
  const setRow = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const usual = (tailorId: string, categoryId: number) => all.find((w) => String(w.id) === tailorId)?.works.find((x) => x.categoryId === categoryId)?.rate ?? ''
  const saved = new Set([...extra, ...rows.flatMap((r) => Object.keys(r.works).map(Number))])
  const doers = (categoryId: number) => all.filter((w) => w.works.some((x) => x.categoryId === categoryId))
  const workTypes = (cats.data ?? []).filter((c) => saved.has(c.id) || (c.isActive && doers(c.id).length > 0))
  const hidden = (cats.data ?? []).filter((c) => c.isActive && !workTypes.includes(c))

  const save = async () => {
    setBusy(true)
    try {
      await brandOrderApi.setWorkers(order.id, await Promise.all(rows.map(async (r) => ({
        id: r.id,
        tailorId: (await staffList.resolve(r.stitch.tailorId)),
        labourRate: Number(r.stitch.rate) || 0,
        works: await Promise.all(Object.entries(r.works).filter(([, p]) => p.tailorId).map(async ([c, p]) => ({ categoryId: Number(c), tailorId: (await staffList.resolve(p.tailorId))!, rate: Number(p.rate) || 0 }))),
      }))))
      toast.success('Workers saved')
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title={`Assign workers — ${order.docNo}`} description={order.brandName}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="flex flex-col gap-3">
        {all.length === 0 && !workers.loading && <p className="rounded-control bg-warn-tint px-3 py-2 text-sm text-warn">No workers yet — in Staff & salary, tick the work your tailors do.</p>}
        {left.map((i, n) => {
          const r = rows.find((x) => x.id === i.id)!
          return (
            <div key={i.id} className="flex flex-col gap-3 rounded-card border border-line p-3">
              <p className="font-medium text-ink">{n + 1}. {i.qty} × {i.description}{i.endCustomer ? ` · for ${i.endCustomer}` : ''}</p>
              <WorkerRow label="Designer" empty="Not decided" noNote people={staffList.people} value={r.stitch} qty={i.qty}
                presetFor={(t) => labourFor(all, garments.data ?? [], t, String(i.garmentTypeId))} onChange={(v) => setRow(i.id, { stitch: v })} />
              {workTypes.map((c) => (
                <WorkerRow key={c.id} label={c.name} salariedPay={/^cutting$/i.test(c.name)} empty="Not needed" noNote people={staffList.people}
                  value={r.works[c.id] ?? none} qty={i.qty} presetFor={(t) => usual(t, c.id)} onChange={(v) => setRow(i.id, { works: { ...r.works, [c.id]: v } })} />
              ))}
            </div>
          )
        })}
        {left.length > 0 && <AddWorkInline hidden={hidden} onAdded={(id) => setExtra((x) => [...x, id])} onCreated={cats.reload} />}
      </div>
    </Modal>
  )
}
