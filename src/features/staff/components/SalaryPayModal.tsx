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
import { useApiQuery } from '@/lib/useApiQuery'
import { monthLabel, salaryApi, staffApi } from '../api/staff.api'

type Props = { staffId?: number; month?: string; onClose: () => void; onSaved: () => void }

// Salary advance: money given before the month's salary. It is cut automatically when the month is paid
// (Monthly salary → Pay). Shows what is already given for that month.
export function SalaryPayModal({ staffId, month: forMonth, onClose, onSaved }: Props) {
  const toast = useToast()
  const people = useApiQuery('staff-options', () => staffApi.options())
  const [who, setWho] = useState(staffId ? String(staffId) : '')
  const [month, setMonth] = useState(() => forMonth ?? todayISO().slice(0, 7))
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('CASH')
  const [docDate, setDocDate] = useState(todayISO)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const person = people.data?.find((p) => p.id === Number(who))
  const paid = useApiQuery(['salary-paid', who, month], () => (who && month ? salaryApi.list({ staffId: Number(who), month, status: 'POSTED', page: 1, pageSize: 1 }) : Promise.resolve(null)))
  const salary = Number(person?.salary ?? 0)
  const already = paid.data?.totalPaid ?? 0
  const left = Math.max(0, salary - already)
  const n = Number(amount) || 0

  const save = async () => {
    if (!person) return setError('Choose the staff member')
    if (!month) return setError('Choose the salary month')
    if (n <= 0) return setError('Enter the amount paid')
    setSaving(true)
    try {
      const p = await salaryApi.create({ staffId: person.id, month, docDate, amount: n, mode, reference: reference.trim() || undefined, notes: notes.trim() || undefined })
      toast.success(`${p.docNo} saved — ${formatINR(n)} advance to ${person.name}`)
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
      title={person && staffId ? `Advance — ${person.name}` : 'Give advance'}
      description="Cut automatically when you pay this month's salary (Monthly salary → Pay)."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save advance</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!staffId && (
          <Select
            label="Staff"
            required
            value={who}
            onChange={(e) => { setWho(e.target.value); setAmount(''); setError('') }}
            options={[{ value: '', label: people.loading ? 'Loading…' : 'Choose…' }, ...(people.data ?? []).map((p) => ({ value: String(p.id), label: `${p.name} · ${p.role}` }))]}
            className="sm:col-span-2"
          />
        )}
        <Input label="Salary for month" type="month" required max={todayISO().slice(0, 7)} value={month} onChange={(e) => { setMonth(e.target.value); setError('') }} />
        <Input label="Amount ₹" required type="number" inputMode="decimal" min={0} value={amount} onChange={(e) => { setAmount(e.target.value); setError('') }} placeholder={left ? String(left) : ''} />
        <Select label="Paid by" value={mode} onChange={(e) => setMode(e.target.value)} options={paymentModeOptions} />
        <Input label="Paid on" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ref / cheque no." />
        <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Advance, bonus, overtime …" />
      </div>
      {person && month && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-control bg-page px-3 py-2 text-sm">
          <span className="text-muted">{monthLabel(month)}:</span>
          <span>Salary <b>{formatINR(salary)}</b></span>
          <span>Paid <b>{formatINR(already)}</b></span>
          <span>Left <b className={left > 0 ? 'text-warn' : 'text-success'}>{formatINR(left)}</b></span>
          {left > 0 && !amount && <button type="button" onClick={() => setAmount(String(left))} className="text-brand underline-offset-2 hover:underline">Pay {formatINR(left)}</button>}
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
