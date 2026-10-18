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

type Props = { brandId: number; brandName: string; pending: number; suggest?: number; onClose: () => void; onSaved: () => void }

// Money received from a brand — clears their oldest bills first. More than pending = advance with us.
export function BrandPaymentModal({ brandId, brandName, pending, suggest, onClose, onSaved }: Props) {
  const toast = useToast()
  const [amount, setAmount] = useState(suggest && suggest > 0 ? String(suggest) : '')
  const [mode, setMode] = useState<PaymentMode>('BANK')
  const [docDate, setDocDate] = useState(todayISO)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const value = Number(amount) || 0

  const save = async () => {
    if (!(value > 0)) return toast.error('Enter the amount received')
    setBusy(true)
    try {
      await brandMoneyApi.pay({ brandId, amount: value, mode, docDate, reference: reference.trim() || undefined, notes: notes.trim() || undefined })
      toast.success(`${formatINR(value)} received from ${brandName}`)
      onSaved()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Money from ${brandName}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save · {formatINR(value)}</Button></>}>
      <p className="mb-4 text-sm text-ink-soft">Pending from {brandName}: <span className="font-semibold text-ink">{formatINR(Math.max(0, pending))}</span>{pending < 0 ? ` (advance ${formatINR(-pending)})` : ''}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Amount received ₹" type="number" inputMode="decimal" min={0} autoFocus value={amount} onChange={(e) => setAmount(e.target.value)}
          hint={value > pending && pending >= 0 ? `${formatINR(value - Math.max(0, pending))} more than pending — kept as advance` : undefined} />
        <Select label="How" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} options={paymentModeOptions} />
        <Input label="Date" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        <Input label="Reference" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque no." />
        <Input label="Note" className="sm:col-span-2" maxLength={255} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {pending > 0 && <button type="button" onClick={() => setAmount(String(pending))} className="mt-3 text-sm font-medium text-brand">Full pending {formatINR(pending)}</button>}
    </Modal>
  )
}
