import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { costCategoryApi, garmentApi, tailorApi } from '@/features/workshop/api/workshop.api'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { jobsApi } from '../api/jobs.api'
import { labourFor } from '../jobDrafts'
import type { Job } from '../types'
import { AddWorkInline } from './AddWorkInline'
import { WorkerRow, type WorkPick } from './WorkerRow'

type Row = { id: number; stitch: WorkPick; works: Record<number, WorkPick> }
type Props = { job: Job; onClose: () => void; onDone: () => void }

const none: WorkPick = { tailorId: '', rate: '0', note: '' }

// Job work → "Assign workers" (workshop, after the counter billed the job). Per garment: who stitches it, and who did
// each other work (Cutting, Lining, Embroidery … — the work the staff do, ticked in Staff & salary). Per-piece people:
// their usual pay fills in (change + note). Salaried people: no pay. "+ Add work" shows / creates another work here.
// Money paid out for the job is added on the job page (Job work & costs → Add cost), not here.
export function AssignWorkersModal({ job, onClose, onDone }: Props) {
  const toast = useToast()
  const workers = useApiQuery('tailor-options', () => tailorApi.options())
  const garments = useApiQuery('garments', () => garmentApi.list())
  const cats = useApiQuery('cost-categories', () => costCategoryApi.list())
  const [rows, setRows] = useState<Row[]>(() => job.items.map((i) => ({
    id: i.id,
    stitch: { tailorId: i.tailorId ? String(i.tailorId) : '', rate: String(Number(i.labourRate)), note: i.labourNote ?? '' },
    works: Object.fromEntries(job.costEntries.filter((e) => e.jobItemId === i.id && e.tailorId && (e.paidBy === 'WORKER' || e.paidBy === 'SALARIED'))
      .map((e) => [e.categoryId, { tailorId: String(e.tailorId), rate: String(Number(e.rate)), note: e.description ?? '' }])),
  })))
  const [busy, setBusy] = useState(false)
  const [extra, setExtra] = useState<number[]>([]) // work added with "+ Add work"
  const all = workers.data ?? []
  const setRow = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  // Their usual pay for this work ('' = this person doesn't normally do it → no preset, no note needed).
  const usual = (tailorId: string, categoryId: number) => all.find((w) => String(w.id) === tailorId)?.works.find((x) => x.categoryId === categoryId)?.rate ?? ''
  // Work shown on every garment: what at least one active person does, added here, or already saved on this job.
  const saved = new Set([...extra, ...rows.flatMap((r) => Object.keys(r.works).map(Number))])
  const doers = (categoryId: number) => all.filter((w) => w.works.some((x) => x.categoryId === categoryId))
  const workTypes = (cats.data ?? []).filter((c) => saved.has(c.id) || (c.isActive && doers(c.id).length > 0))
  const hidden = (cats.data ?? []).filter((c) => c.isActive && !workTypes.includes(c))
  const keep = (list: typeof all, current: string) => all.filter((w) => list.includes(w) || String(w.id) === current)

  const save = async () => {
    const isChanged = (p: WorkPick, preset: string) => preset !== '' && all.find((w) => String(w.id) === p.tailorId)?.payType === 'PIECE' && Number(p.rate) !== Number(preset)
    const missingNote = rows.some((r) => {
      const g = job.items.find((i) => i.id === r.id)!
      return (isChanged(r.stitch, labourFor(all, garments.data ?? [], r.stitch.tailorId, String(g.garmentTypeId))) && !r.stitch.note.trim()) ||
        Object.entries(r.works).some(([c, p]) => isChanged(p, usual(p.tailorId, Number(c))) && !p.note.trim())
    })
    if (missingNote) return toast.error('Pay was changed — write why in the note box')
    setBusy(true)
    try {
      await jobsApi.setWorkers(job.id, rows.map((r) => ({
        id: r.id,
        tailorId: r.stitch.tailorId ? Number(r.stitch.tailorId) : null,
        labourRate: Number(r.stitch.rate) || 0,
        labourNote: r.stitch.note.trim() || null,
        works: Object.entries(r.works).filter(([, p]) => p.tailorId).map(([c, p]) => ({ categoryId: Number(c), tailorId: Number(p.tailorId), rate: Number(p.rate) || 0, note: p.note.trim() || null })),
      })))
      toast.success('Workers saved')
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title={`Assign workers — ${job.docNo}`} description={`${job.customerName} · ready by ${new Date(job.expectedDate).toLocaleDateString('en-IN')}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="flex flex-col gap-3">
        {all.length === 0 && !workers.loading && <p className="rounded-control bg-warn-tint px-3 py-2 text-sm text-warn">No workers yet — in Staff & salary, turn on "Does job work" for your tailors.</p>}
        {job.items.map((i, n) => {
          const r = rows.find((x) => x.id === i.id)!
          return (
            <div key={i.id} className="flex flex-col gap-3 rounded-card border border-line p-3">
              <div>
                <p className="font-medium text-ink">{n + 1}. {i.description}</p>
                <p className="text-xs text-muted">{i.qty} pc · stitching charge {formatINR(i.qty * Number(i.chargeRate))}{i.ownFabric ? " · customer's cloth" : ''}</p>
              </div>
              <WorkerRow label="Stitching" empty="Not decided" people={keep(all.filter((w) => w.stitches), r.stitch.tailorId)} value={r.stitch} qty={i.qty}
                presetFor={(t) => labourFor(all, garments.data ?? [], t, String(i.garmentTypeId))} onChange={(v) => setRow(i.id, { stitch: v })} />
              {workTypes.map((c) => (
                <WorkerRow key={c.id} label={c.name} empty="Not needed" people={doers(c.id).length ? keep(doers(c.id), r.works[c.id]?.tailorId ?? '') : all}
                  value={r.works[c.id] ?? none} qty={i.qty} presetFor={(t) => usual(t, c.id)} onChange={(v) => setRow(i.id, { works: { ...r.works, [c.id]: v } })} />
              ))}
            </div>
          )
        })}
        {job.items.length > 0 && <AddWorkInline hidden={hidden} onAdded={(id) => setExtra((x) => [...x, id])} onCreated={cats.reload} />}
      </div>
    </Modal>
  )
}
