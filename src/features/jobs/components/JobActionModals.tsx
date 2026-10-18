import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { customerApi } from '@/features/sales/api/sales.api'
import { TenderInputs } from '@/features/sales/components/TenderInputs'
import { newTender, tenderInput, tenderTotal, type TenderRow } from '@/features/sales/tenders'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { jobsApi } from '../api/jobs.api'
import { stages, statusLabels } from '../jobUtils'
import type { Job, JobStatus } from '../types'

type Props = { job: Job; onClose: () => void; onDone: () => void }

// Move the job to another workshop stage (any direction), with an optional note.
export function StageModal({ job, onClose, onDone, to }: Props & { to?: JobStatus }) {
  const toast = useToast()
  const [status, setStatus] = useState<JobStatus>(to ?? stages[Math.min(stages.indexOf(job.status) + 1, stages.length - 1)])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      await jobsApi.setStatus(job.id, status, note.trim() || undefined)
      toast.success(`${job.docNo} → ${statusLabels[status]}`)
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} size="sm" title={`Stage of ${job.docNo}`} description="Ready = stitching finished; the workers' pay is counted now." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="mb-4 grid grid-cols-1 gap-2">
        {stages.map((s) => (
          <button
            key={s}
            type="button"
            disabled={s === job.status}
            onClick={() => setStatus(s)}
            className={cn('rounded-control border px-3 py-2 text-left text-sm', s === status ? 'border-brand bg-brand-tint font-medium text-brand' : 'border-line text-ink hover:bg-page', s === job.status && 'opacity-50')}
          >
            {statusLabels[s]}{s === job.status ? ' (now)' : ''}
          </button>
        ))}
      </div>
      <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Trial done, sleeve to shorten" />
    </Modal>
  )
}

// Hand over the garments: use advance / credit, take the balance, mark Handed over.
export function DeliverModal({ job, onClose, onDone }: Props) {
  const toast = useToast()
  const advance = useApiQuery(['advance', job.customerId], () => customerApi.advance(job.customerId))
  const [useAdvance, setUseAdvance] = useState(true)
  const available = advance.data?.total ?? 0
  const fromAdvance = useAdvance ? Math.min(available, job.dueAmount) : 0
  const toCollect = Math.round((job.dueAmount - fromAdvance) * 100) / 100
  const [typed, setTenders] = useState<TenderRow[] | null>(null)
  const tenders = typed ?? [newTender('CASH', toCollect > 0 ? String(toCollect) : '')]
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const paying = tenderTotal(tenders)
  const left = Math.max(0, Math.round((toCollect - paying) * 100) / 100)

  const save = async () => {
    if (paying > toCollect + 0.004) return toast.error(`Only ${formatINR(toCollect)} is to be collected`)
    setBusy(true)
    try {
      await jobsApi.deliver(job.id, { docDate: todayISO(), tenders: tenderInput(tenders), useAdvance: useAdvance && available > 0, note: note.trim() || undefined })
      toast.success(`${job.docNo} handed over`)
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={`Hand over ${job.docNo} to customer`} description={`${job.customerName} · total ${formatINR(Number(job.grandTotal))}, received ${formatINR(Number(job.paidAmount))}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Mark handed over</Button></>}>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between rounded-card bg-page px-3 py-2 text-base font-semibold"><span>{toCollect > 0 ? 'Collect from the customer' : 'Nothing to collect'}</span><span>{formatINR(toCollect)}</span></div>
        {available > 0.004 && job.dueAmount > 0 && (
          <Switch label={`Use advance / credit ₹${available.toLocaleString('en-IN')}`} hint={`${formatINR(fromAdvance)} of it goes on this job`} checked={useAdvance} onChange={setUseAdvance} />
        )}
        {toCollect > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Collect now</p>
              <button type="button" onClick={() => setTenders(null)} className="text-sm font-medium text-brand hover:underline">Full {formatINR(toCollect)}</button>
            </div>
            <TenderInputs rows={tenders} onChange={setTenders} />
          </div>
        )}
        {left > 0 && <p className="text-sm text-warn">{formatINR(left)} stays on the customer's account.</p>}
        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Collected by her sister" />
      </div>
    </Modal>
  )
}
