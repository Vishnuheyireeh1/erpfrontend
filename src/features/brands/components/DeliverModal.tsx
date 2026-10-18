import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { useBusinessProfile } from '@/features/settings/hooks/useBusinessProfile'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { brandMoneyApi } from '../api/brandMoney.api'
import type { BrandBill } from '../moneyTypes'
import { GST_CHOICES, stageLabel, type BrandOrder } from '../types'

type Props = { order: BrandOrder; onClose: () => void; onDone: (bill: BrandBill) => void }

const r2 = (n: number) => Math.round(n * 100) / 100

// Deliver pieces to the brand → one bill. Ready pieces are ticked; GST comes from the brand's usual choice.
export function DeliverModal({ order, onClose, onDone }: Props) {
  const toast = useToast()
  const { profile } = useBusinessProfile()
  const open = order.items.filter((i) => i.stage !== 'DELIVERED')
  const [picked, setPicked] = useState<number[]>(() => open.filter((i) => i.stage === 'READY').map((i) => i.id))
  const [gstRate, setGstRate] = useState(String(Number(order.brand.gstRate)))
  const [docDate, setDocDate] = useState(todayISO)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const registered = profile?.gstRegistered !== false

  const amountOf = (id: number) => {
    const i = order.items.find((x) => x.id === id)!
    return i.qty * Number(i.chargeRate) + order.materials.filter((m) => m.itemId === id && m.charged).reduce((s, m) => s + Number(m.amount), 0)
  }
  const gross = r2(picked.reduce((s, id) => s + amountOf(id), 0))
  const rate = registered ? Number(gstRate) : 0
  const taxable = rate ? r2(gross / (1 + rate / 100)) : gross
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const save = async () => {
    if (!picked.length) return toast.error('Tick the pieces you are delivering')
    setBusy(true)
    try {
      const bill = await brandMoneyApi.deliver(order.id, { itemIds: picked, gstRate: rate, docDate, notes: notes.trim() || undefined })
      toast.success(`Bill ${bill.docNo} made — ${formatINR(Number(bill.grandTotal))}`)
      onDone(bill)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not make the bill')
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Deliver & bill · ${order.brandName}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Make bill · {formatINR(Math.round(gross))}</Button></>}
    >
      <p className="mb-3 text-sm text-ink-soft">Tick the pieces handed over now. The rest stay in the order for a later delivery.</p>
      <ul className="mb-4 flex flex-col gap-2">
        {open.map((i) => (
          <li key={i.id}>
            <label className={cn('flex cursor-pointer items-center gap-3 rounded-control border p-3', picked.includes(i.id) ? 'border-brand bg-brand-tint/40' : 'border-line')}>
              <input type="checkbox" checked={picked.includes(i.id)} onChange={() => toggle(i.id)} className="size-5 accent-brand" />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-ink">{i.qty} × {i.description}</span>{i.endCustomer && <span className="text-ink-soft"> · for {i.endCustomer}</span>}
                <span className={cn('block text-xs', i.stage === 'READY' ? 'text-success' : 'text-warn')}>{stageLabel[i.stage]}{i.stage === 'IN_WORK' ? ' — not marked ready yet' : ''}</span>
              </span>
              <span className="text-sm font-semibold">{formatINR(amountOf(i.id))}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select label="GST on this bill" value={registered ? gstRate : '0'} disabled={!registered} onChange={(e) => setGstRate(e.target.value)} options={GST_CHOICES}
          hint={registered ? 'Prices include GST (like customer bills)' : 'Shop is not GST registered'} />
        <Input label="Bill date" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        <Input label="Note on bill" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-control bg-page p-3 text-sm">
        <div><dt className="text-xs text-muted">Pieces</dt><dd className="font-medium">{open.filter((i) => picked.includes(i.id)).reduce((s, i) => s + i.qty, 0)}</dd></div>
        <div><dt className="text-xs text-muted">{rate ? `Before GST · GST ${formatINR(r2(gross - taxable))}` : 'No GST'}</dt><dd className="font-medium">{formatINR(taxable)}</dd></div>
        <div><dt className="text-xs text-muted">Bill total</dt><dd className="text-base font-semibold">{formatINR(Math.round(gross))}</dd></div>
      </dl>
    </Modal>
  )
}
