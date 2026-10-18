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
import { financeApi } from '../api/finance.api'
import type { PaymentMode } from '../types'

type Props = { onClose: () => void; onSaved: () => void }

// Rent, electricity, tea … — what the shop spent, and how it was paid.
export function ExpenseModal({ onClose, onSaved }: Props) {
  const toast = useToast()
  const cats = useApiQuery('expense-categories', () => financeApi.categories())
  const [f, setF] = useState({ categoryId: '', amount: '', mode: 'CASH' as PaymentMode, paidTo: '', reference: '', notes: '', docDate: todayISO() })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setError('') }

  const save = async () => {
    if (!f.categoryId) return setError('Choose the expense type')
    if (!(Number(f.amount) > 0)) return setError('Enter the amount')
    setSaving(true)
    try {
      const e = await financeApi.addExpense({
        docDate: f.docDate, categoryId: Number(f.categoryId), amount: Number(f.amount), mode: f.mode,
        paidTo: f.paidTo.trim() || undefined, reference: f.reference.trim() || undefined, notes: f.notes.trim() || undefined,
      })
      toast.success(`${e.docNo} saved — ${formatINR(Number(e.amount))}`)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Add expense" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save expense</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Expense type"
          required
          placeholder="Choose"
          value={f.categoryId}
          onChange={(e) => set('categoryId', e.target.value)}
          options={(cats.data ?? []).filter((c) => c.isActive).map((c) => ({ value: String(c.id), label: c.kind === 'ASSET' ? `${c.name} (asset)` : c.name }))}
          hint={cats.data?.find((c) => String(c.id) === f.categoryId)?.kind === 'ASSET' ? 'Asset — the shop owns it (Balance sheet); it does not reduce profit' : undefined}
        />
        <Input label="Amount ₹" required type="number" inputMode="decimal" min={0} value={f.amount} onChange={(e) => set('amount', e.target.value)} autoFocus />
        <Select label="Paid by" value={f.mode} onChange={(e) => set('mode', e.target.value)} options={paymentModeOptions} hint="Cash comes out of the drawer; others from the bank" />
        <Input label="Date" type="date" max={todayISO()} value={f.docDate} onChange={(e) => set('docDate', e.target.value)} />
        <Input label="Paid to" value={f.paidTo} onChange={(e) => set('paidTo', e.target.value)} placeholder="KSEB / landlord / tea shop" />
        <Input label="Bill / reference no." value={f.reference} onChange={(e) => set('reference', e.target.value)} />
        <Input label="Note" value={f.notes} onChange={(e) => set('notes', e.target.value)} className="sm:col-span-2" />
      </div>
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
