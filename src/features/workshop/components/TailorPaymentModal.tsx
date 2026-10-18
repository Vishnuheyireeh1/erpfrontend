import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { paymentModeOptions } from '@/features/purchase/api/purchase.api'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { tailorPaymentApi } from '../api/workshop.api'
import type { Tailor } from '../types'

type Props = { tailor: Tailor; onClose: () => void; onSaved: () => void }

// Pay a per-piece tailor. Paying more than the balance leaves an advance with the tailor.
export function TailorPaymentModal({ tailor, onClose, onSaved }: Props) {
  const toast = useToast()
  const [amount, setAmount] = useState(tailor.balance > 0 ? String(tailor.balance) : '')
  const [mode, setMode] = useState('CASH')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [docDate, setDocDate] = useState(todayISO)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const n = Number(amount) || 0

  const save = async () => {
    if (n <= 0) return setError('Enter the amount paid')
    setSaving(true)
    try {
      const p = await tailorPaymentApi.create({ tailorId: tailor.id, docDate, amount: n, mode, reference: reference.trim() || undefined, notes: notes.trim() || undefined })
      toast.success(`${p.docNo} saved — ${formatINR(n)} paid to ${tailor.name}`)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Pay ${tailor.name}`}
      description={`Balance now ${formatINR(Math.max(0, tailor.balance))}${tailor.balance < 0 ? ` (they already have ${formatINR(-tailor.balance)} advance)` : ''}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save payment</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Amount ₹" required type="number" inputMode="decimal" min={0} value={amount} onChange={(e) => { setAmount(e.target.value); setError('') }} autoFocus />
        <Input label="Date" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        <Select label="Paid by" value={mode} onChange={(e) => setMode(e.target.value)} options={paymentModeOptions} />
        <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ref / week" />
        <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} className="sm:col-span-2" />
      </div>
      {n > Math.max(0, tailor.balance) + 0.004 && <p className="mt-3 text-sm text-warn">{formatINR(n - Math.max(0, tailor.balance))} more than earned — kept as an advance to them.</p>}
      {error && <p role="alert" className="mt-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
