import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { paymentModeOptions } from '@/features/purchase/api/purchase.api'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { trainingApi } from '../api/training.api'
import { usePrintFee } from '../print/usePrintFee'
import type { PaymentMode } from '../types'

type Props = { enrolmentId: number; title: string; due: number; onClose: () => void; onSaved: () => void }

const PRINT_KEY = 'sairandhri.training.printFee'
const readPrint = () => { try { return localStorage.getItem(PRINT_KEY) !== '0' } catch { return true } }

// Collect a fee instalment (never more than the balance), then print the receipt.
export function FeeModal({ enrolmentId, title, due, onClose, onSaved }: Props) {
  const toast = useToast()
  const printFee = usePrintFee()
  const [amount, setAmount] = useState(due > 0 ? String(due) : '')
  const [mode, setMode] = useState<PaymentMode>('CASH')
  const [docDate, setDocDate] = useState(todayISO)
  const [reference, setReference] = useState('')
  const [print, setPrint] = useState(readPrint)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const n = Number(amount) || 0

  const save = async () => {
    if (n <= 0) return setError('Enter the amount received')
    if (n > due + 0.004) return setError(`Only ${formatINR(due)} is due`)
    setBusy(true)
    try {
      const r = await trainingApi.pay({ enrolmentId, docDate, amount: n, mode, reference: reference.trim() || undefined })
      toast.success(`${r.docNo} — ${formatINR(n)} received`)
      try { localStorage.setItem(PRINT_KEY, print ? '1' : '0') } catch { /* private mode */ }
      if (print) await printFee(r.id).catch(() => toast.error('Saved, but the receipt could not be printed'))
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Receive fee" description={`${title} · due ${formatINR(due)}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Amount ₹" required type="number" inputMode="decimal" min={0} value={amount} onChange={(e) => { setAmount(e.target.value); setError('') }} autoFocus />
        <Select label="Paid by" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} options={paymentModeOptions} />
        <Input label="Date" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ref" />
      </div>
      <div className="mt-4"><Switch label="Print receipt" checked={print} onChange={setPrint} /></div>
      {error && <p role="alert" className="mt-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
