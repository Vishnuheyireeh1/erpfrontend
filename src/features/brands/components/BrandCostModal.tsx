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
import { brandOrderApi } from '../api/brandOrder.api'
import type { BrandOrder, CostPaidBy } from '../types'

type Props = { order: BrandOrder; onClose: () => void; onDone: () => void }

const PAY: [CostPaidBy, string, string][] = [
  ['WORKER', 'Our worker — shop pays later', 'Added to what we owe them'],
  ['SALARIED', 'Salaried staff', 'For profit only — paid in salary'],
  ['PAID', 'Paid out now', 'Cash / UPI paid (e.g. outside embroidery)'],
]

// Other work / cost on a brand order (embroidery, hand work, cutting …): what, which piece, who did it, pieces × rate, how paid.
export function BrandCostModal({ order, onClose, onDone }: Props) {
  const toast = useToast()
  const cats = useApiQuery('cost-categories', () => costCategoryApi.list())
  const workers = useApiQuery('tailor-options', () => tailorApi.options())
  const [categoryId, setCategoryId] = useState('')
  const [itemId, setItemId] = useState('')
  const [tailorId, setTailorId] = useState('')
  const [qty, setQty] = useState('1')
  const [rate, setRate] = useState('')
  const [paidBy, setPaidBy] = useState<CostPaidBy>('PAID')
  const [mode, setMode] = useState('CASH')
  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const amount = Math.round((Number(qty) || 0) * (Number(rate) || 0) * 100) / 100
  const worker = (workers.data ?? []).find((w) => String(w.id) === tailorId)

  // Choosing the piece fills its pieces count; choosing the person sets how they are paid.
  const pickItem = (id: string) => {
    setItemId(id)
    const p = order.items.find((i) => String(i.id) === id)
    if (p) setQty(String(p.qty))
  }
  const pickWorker = (id: string) => {
    setTailorId(id)
    const w = (workers.data ?? []).find((x) => String(x.id) === id)
    if (w) setPaidBy(w.payType === 'PIECE' ? 'WORKER' : 'SALARIED')
    else setPaidBy('PAID')
  }
  const save = async () => {
    if (!categoryId) return toast.error('Choose the work done')
    if (!(Number(qty) > 0) || !(Number(rate) > 0)) return toast.error('Enter the pieces and rate')
    if (paidBy !== 'PAID' && !tailorId) return toast.error('Choose who did the work')
    if (paidBy === 'WORKER' && worker?.payType === 'SALARY') return toast.error(`${worker.name} is on salary — choose "Salaried staff"`)
    setBusy(true)
    try {
      await brandOrderApi.addCost(order.id, {
        categoryId: Number(categoryId), itemId: itemId ? Number(itemId) : null, date, description: description.trim() || undefined,
        qty: Number(qty), rate: Number(rate), paidBy, mode: paidBy === 'PAID' ? mode : null, tailorId: tailorId ? Number(tailorId) : null,
      })
      toast.success(`Cost ${formatINR(amount)} added`)
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Add work / cost — ${order.docNo}`}
      description="Embroidery, hand work, cutting … done for this order. The brand's bill does not change — it lowers the order's profit."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Add{amount > 0 ? ` ${formatINR(amount)}` : ''}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Work done" required placeholder={cats.loading ? 'Loading…' : 'Choose'} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
          options={(cats.data ?? []).filter((c) => c.isActive).map((c) => ({ value: String(c.id), label: c.name }))} />
        <Select label="For which piece" placeholder="Whole order" value={itemId} onChange={(e) => pickItem(e.target.value)}
          options={order.items.map((i) => ({ value: String(i.id), label: `${i.qty} × ${i.description}${i.endCustomer ? ` · ${i.endCustomer}` : ''}` }))} />
        <Select label="Who did it" placeholder="Someone outside" value={tailorId} onChange={(e) => pickWorker(e.target.value)}
          options={(workers.data ?? []).map((w) => ({ value: String(w.id), label: `${w.name}${w.speciality ? ` — ${w.speciality}` : ''}${w.payType === 'SALARY' ? ' (salary)' : ''}` }))} />
        <Input label="Date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Pieces / qty" type="number" inputMode="decimal" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
        <Input label="Rate ₹ (per piece)" type="number" inputMode="decimal" min={0} value={rate} onChange={(e) => setRate(e.target.value)} autoFocus />
        <Input label="Details (optional)" className="sm:col-span-2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. neck embroidery, bead work" />
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
      {paidBy === 'WORKER' && worker && <p className="mt-3 text-xs text-muted">The shop will owe {worker.name} {formatINR(amount)} for this from {date}.</p>}
    </Modal>
  )
}
