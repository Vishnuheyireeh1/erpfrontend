import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { paymentModeOptions } from '@/features/purchase/api/purchase.api'
import type { PaymentMode } from '@/features/purchase/types'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { brandMoneyApi } from '../api/brandMoney.api'

// orderId: received on that order (pending = the order's balance), with one-tap Half / Full.
type Props = { brandId: number; brandName: string; pending: number; suggest?: number; orderId?: number; orderNo?: string; onClose: () => void; onSaved: () => void }

// Money received from a brand — clears their oldest bills first. More than pending = advance with us.
export function BrandPaymentModal({ brandId, brandName, pending, suggest, orderId, orderNo, onClose, onSaved }: Props) {
  const toast = useToast()
  const [amount, setAmount] = useState(suggest && suggest > 0 ? String(suggest) : '')
  const [mode, setMode] = useState<PaymentMode>(orderId ? 'CASH' : 'BANK')
  const [docDate, setDocDate] = useState(todayISO)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const value = Number(amount) || 0

  const save = async () => {
    if (!(value > 0)) return toast.error('Enter the amount received')
    setBusy(true)
    try {
      await brandMoneyApi.pay({ brandId, orderId, amount: value, mode, docDate, reference: reference.trim() || undefined, notes: notes.trim() || undefined })
      toast.success(`${formatINR(value)} received from ${brandName}`)
      onSaved()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={orderNo ? `Receive money — ${brandName}` : `Money from ${brandName}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save · {formatINR(value)}</Button></>}>
      <p className="mb-4 text-sm text-ink-soft">{orderNo ? `Balance on ${orderNo}` : `Pending from ${brandName}`}: <span className="font-semibold text-ink">{formatINR(Math.max(0, pending))}</span>{pending < 0 ? ` (advance ${formatINR(-pending)})` : ''}</p>
      {orderId && pending > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {[[`Half ${formatINR(Math.ceil(pending / 2))}`, Math.ceil(pending / 2)], [`Full ${formatINR(pending)}`, pending]].map(([label, v]) => (
            <button key={label} type="button" aria-pressed={value === v} onClick={() => setAmount(String(v))} className={value === v ? 'h-9 rounded-control border border-brand bg-brand px-3 text-sm font-medium text-white' : 'h-9 rounded-control border border-line bg-card px-3 text-sm font-medium text-ink-soft hover:border-brand'}>{label}</button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Amount received ₹" type="number" inputMode="decimal" min={0} autoFocus value={amount} onChange={(e) => setAmount(e.target.value)}
          hint={value > pending && pending >= 0 ? `${formatINR(value - Math.max(0, pending))} more than pending — kept as advance` : undefined} />
        <Select label="How" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} options={paymentModeOptions} />
        <Input label="Date" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        <Input label="Reference" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque no." />
        <Input label="Note" className="sm:col-span-2" maxLength={255} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {pending > 0 && !orderId && <button type="button" onClick={() => setAmount(String(pending))} className="mt-3 text-sm font-medium text-brand">Full pending {formatINR(pending)}</button>}
    </Modal>
  )
}
