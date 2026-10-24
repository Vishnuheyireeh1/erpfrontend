import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { paymentModeOptions } from '@/features/purchase/api/purchase.api'
import { costCategoryApi, tailorApi } from '@/features/workshop/api/workshop.api'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { jobsApi } from '../api/jobs.api'
import type { CostPaidBy, Job, JobCostEntry } from '../types'

type Props = { job: Job; entry?: JobCostEntry | null; onClose: () => void; onDone: () => void }

const PAY: [CostPaidBy, string, string][] = [
  ['WORKER', 'Our worker — shop pays later', 'They get this money once the job is Ready'],
  ['SALARIED', 'Salaried staff', 'Cost for job profit only — paid in salary'],
  ['PAID', 'Paid out now', 'Cash / UPI paid (e.g. outside embroidery)'],
]

// Job work line: what was done (embroidery, cutting, hand work …), WHO did it, pieces × rate and how it is paid.
// Opened from the job page (Job work card) — add a new line or change one (e.g. set who did the cutting).
export function AddCostModal({ job, entry, onClose, onDone }: Props) {
  const toast = useToast()
  const cats = useApiQuery('cost-categories', () => costCategoryApi.list())
  const workers = useApiQuery('tailor-options', () => tailorApi.options())
  const active = (cats.data ?? []).filter((c) => c.isActive || c.id === entry?.categoryId)
  const pieces = job.items.reduce((s, i) => s + i.qty, 0)
  const [categoryId, setCategoryId] = useState(entry ? String(entry.categoryId) : '')
  const [tailorId, setTailorId] = useState(entry?.tailorId ? String(entry.tailorId) : '')
  const [qty, setQty] = useState(entry ? String(Number(entry.qty)) : String(pieces || 1))
  // A paid-out cost is edited as one amount (qty 1).
  const [rate, setRate] = useState(entry ? String(Number(entry.paidBy === 'PAID' ? entry.amount : entry.rate)) : '')
  const [paidBy, setPaidBy] = useState<CostPaidBy>(entry?.paidBy ?? 'WORKER')
  const [mode, setMode] = useState<string>(entry?.mode ?? 'CASH')
  const [date, setDate] = useState(entry?.date.slice(0, 10) ?? todayISO())
  const [description, setDescription] = useState(entry?.description ?? '')
  const [busy, setBusy] = useState(false)
  // New cost / a paid-out line → the simple form: what, amount, how paid. Work by our people is set in Assign workers.
  const simple = !entry || entry.paidBy === 'PAID'
  const amount = Math.round((Number(qty) || 0) * (Number(rate) || 0) * 100) / 100
  const worker = (workers.data ?? []).find((w) => String(w.id) === tailorId)

  const choose = (id: string) => {
    setCategoryId(id)
    const c = active.find((x) => String(x.id) === id)
    if (c && !worker) setPaidBy(c.defaultPaidBy)
  }
  // Choosing the person sets how they are paid: per-piece worker → owed to them; salaried → cost only.
  const pickWorker = (id: string) => {
    setTailorId(id)
    const w = (workers.data ?? []).find((x) => String(x.id) === id)
    if (w) setPaidBy(w.payType === 'PIECE' ? 'WORKER' : 'SALARIED')
  }
  const save = async () => {
    if (!categoryId) return toast.error('Choose what the cost is for')
    if (simple) {
      if (!(Number(rate) > 0)) return toast.error('Enter the amount')
      setBusy(true)
      try {
        const body = { categoryId: Number(categoryId), date, description: description.trim() || undefined, qty: 1, rate: Number(rate), paidBy: 'PAID' as CostPaidBy, mode, tailorId: null }
        if (entry) await jobsApi.updateCost(job.id, entry.id, body)
        else await jobsApi.addCost(job.id, body)
        toast.success(entry ? 'Cost saved' : `Cost ${formatINR(Number(rate))} added`)
        onDone()
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not save')
        setBusy(false)
      }
      return
    }
    if (!(Number(qty) > 0) || rate === '') return toast.error('Enter the pieces and rate')
    if (paidBy === 'WORKER' && !tailorId) return toast.error('Choose who did the work')
    if (paidBy === 'WORKER' && worker?.payType === 'SALARY') return toast.error(`${worker.name} is on salary — choose "Salaried staff"`)
    setBusy(true)
    try {
      const body = { categoryId: Number(categoryId), date, description: description.trim() || undefined, qty: Number(qty), rate: Number(rate), paidBy, mode: paidBy === 'PAID' ? mode : null, tailorId: tailorId ? Number(tailorId) : null }
      if (entry) await jobsApi.updateCost(job.id, entry.id, body)
      else await jobsApi.addCost(job.id, body)
      toast.success(entry ? 'Work line saved' : `Work ${formatINR(amount)} added`)
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  if (simple) return (
    <Modal open onClose={onClose} title={`${entry ? 'Change cost' : 'Add cost'} — ${job.docNo}`} description="Money the shop paid for this job (e.g. outside embroidery). The customer's bill does not change."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>{entry ? 'Save' : `Add${Number(rate) > 0 ? ` ${formatINR(Number(rate))}` : ''}`}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="For" required placeholder={cats.loading ? 'Loading…' : 'Choose'} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} options={active.map((c) => ({ value: String(c.id), label: c.name }))} />
        <Input label="Amount ₹" type="number" inputMode="decimal" min={0} value={rate} onChange={(e) => setRate(e.target.value)} autoFocus={!entry} />
        <Select label="Paid by" value={mode} onChange={(e) => setMode(e.target.value)} options={paymentModeOptions} />
        <Input label="Date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Details (optional)" className="sm:col-span-2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. neck embroidery by Ramla" />
      </div>
    </Modal>
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={`${entry ? 'Change work' : 'Other cost'} — ${job.docNo}`}
      description="Who did what on this job and what it costs. The customer's bill does not change."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>{entry ? 'Save' : `Add ${amount > 0 ? formatINR(amount) : ''}`}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Work done" required placeholder={cats.loading ? 'Loading…' : 'Choose'} value={categoryId} onChange={(e) => choose(e.target.value)} options={active.map((c) => ({ value: String(c.id), label: c.name }))} />
        <Select label="Who did it" placeholder="Someone outside / not decided" value={tailorId} onChange={(e) => pickWorker(e.target.value)}
          options={(workers.data ?? []).map((w) => ({ value: String(w.id), label: `${w.name}${w.speciality ? ` — ${w.speciality}` : ''}${w.payType === 'SALARY' ? ' (salary)' : ''}` }))} />
        <Input label="Pieces / qty" type="number" inputMode="decimal" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
        <Input label="Rate ₹" type="number" inputMode="decimal" min={0} value={rate} onChange={(e) => setRate(e.target.value)} autoFocus={!entry} />
        <Input label="Details" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Neck embroidery, bead work …" />
        <Input label="Date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="How it is paid">
        {PAY.map(([v, t, h]) => (
          <button key={v} type="button" onClick={() => setPaidBy(v)} className={cn('rounded-control border px-3 py-2 text-left', paidBy === v ? 'border-brand bg-brand-tint' : 'border-line hover:bg-page')}>
            <span className={cn('block text-sm font-medium', paidBy === v ? 'text-brand' : 'text-ink')}>{t}</span>
            <span className="block text-xs text-muted">{h}</span>
          </button>
        ))}
      </div>
      {paidBy === 'PAID' && <Select label="Paid by" value={mode} onChange={(e) => setMode(e.target.value)} options={paymentModeOptions} className="mt-4 sm:w-60" />}
      {paidBy === 'WORKER' && worker && <p className="mt-3 text-xs text-muted">The shop will pay {worker.name} {formatINR(amount)} for this, once the job is Ready.</p>}
    </Modal>
  )
}
