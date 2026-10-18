import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { paymentModeOptions, purchaseApi } from '../api/purchase.api'
import type { Bill } from '../types'

type Props = { bill: Bill; onClose: () => void; onSaved: () => void }

// Purchase bill → "Pay freight": the lorry / transporter was paid for bringing these goods ("To pay").
// Cash / bank goes down (day book "Freight paid"); the amount is already in the items' cost.
export function FreightPayModal({ bill, onClose, onSaved }: Props) {
  const toast = useToast()
  const [mode, setMode] = useState('CASH')
  const [date, setDate] = useState(todayISO)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await purchaseApi.freightPaid(bill.id, { mode, date })
      toast.success(`Freight ${formatINR(Number(bill.freightSeparate))} paid`)
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
      title={`Pay freight — ${formatINR(Number(bill.freightSeparate))}`}
      description={`Paid to the transporter for ${bill.docNo}${bill.freightNote ? ` (${bill.freightNote})` : ''}.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save — paid</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Paid by" value={mode} onChange={(e) => setMode(e.target.value)} options={paymentModeOptions} />
        <Input label="Paid on" type="date" min={bill.docDate.slice(0, 10)} max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
