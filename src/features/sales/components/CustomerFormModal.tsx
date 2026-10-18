import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { customerApi } from '../api/sales.api'
import type { Customer } from '../types'

type Props = { customer: Customer; onClose: () => void; onSaved: (c: Customer) => void }

// Only name, phone, advance and notes are asked. Old fields (GSTIN, state, address …) are kept as they are when editing.
const blank = { name: '', phone: '', email: '', gstin: '', stateCode: '32', address: '', city: '', pincode: '', openingBalance: '0', advance: '', notes: '', isActive: true }

// Edit a customer (new customers are saved from Billing / Stitching jobs). Mount with a key so it resets per customer.
export function CustomerFormModal({ customer, onClose, onSaved }: Props) {
  const toast = useToast()
  const [f, setF] = useState(() => ({
    ...blank,
    ...Object.fromEntries(Object.entries(customer).map(([k, v]) => [k, v ?? ''])),
    openingBalance: String(Number(customer.openingBalance)),
    advance: Number(customer.openingBalance) < 0 ? String(-Number(customer.openingBalance)) : '',
    isActive: customer.isActive,
  }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof blank, v: string | boolean) => {
    setF((x) => ({ ...x, [k]: v }))
    setError('')
  }

  const save = async () => {
    if (!String(f.name).trim()) return setError('Enter the customer name')
    const advance = Number(f.advance) || 0
    if (advance < 0) return setError('Advance cannot be minus')
    setSaving(true)
    try {
      // Advance is kept as a minus opening balance. An old "they owed us" balance (plus) stays unless an advance is typed.
      const old = Number(f.openingBalance) || 0
      const { advance: _a, ...rest } = f
      const body = { ...rest, openingBalance: advance > 0 ? -advance : old > 0 ? old : 0 }
      const saved = await customerApi.update(customer.id, body)
      toast.success('Customer updated')
      onSaved(saved)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Edit ${customer.name}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save changes</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Customer name" required value={String(f.name)} onChange={(e) => set('name', e.target.value)} autoFocus />
        <Input label="Phone" inputMode="tel" value={String(f.phone)} onChange={(e) => set('phone', e.target.value)} hint="Used to find the customer at billing" />
        <Input
          label="Advance ₹"
          type="number"
          inputMode="decimal"
          min={0}
          value={String(f.advance)}
          onChange={(e) => set('advance', e.target.value)}
          placeholder="0"
          hint="Only an advance paid BEFORE this software. New advance today → 'Receive money' on the customer page (so it counts in cash)."
        />
        <Textarea label="Notes" rows={2} value={String(f.notes)} onChange={(e) => set('notes', e.target.value)} className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <Switch label="Active" hint="Inactive customers can't be chosen on new bills" checked={Boolean(f.isActive)} onChange={(v) => set('isActive', v)} />
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
