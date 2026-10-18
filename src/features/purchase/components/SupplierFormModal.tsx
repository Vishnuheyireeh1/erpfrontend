import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { stateOptions } from '@/lib/gst'
import { supplierApi } from '../api/purchase.api'
import type { Supplier } from '../types'

type Props = { supplier: Supplier | null; onClose: () => void; onSaved: (s: Supplier) => void }

const blank = { name: '', contactPerson: '', phone: '', email: '', gstin: '', stateCode: '32', address: '', city: '', pincode: '', openingBalance: '0', notes: '', isActive: true }

// Add / edit supplier. Mount with a key so it resets per supplier.
export function SupplierFormModal({ supplier, onClose, onSaved }: Props) {
  const toast = useToast()
  const [f, setF] = useState(() =>
    supplier
      ? { ...blank, ...Object.fromEntries(Object.entries(supplier).map(([k, v]) => [k, v ?? ''])), openingBalance: String(Number(supplier.openingBalance)), isActive: supplier.isActive }
      : blank,
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof blank, v: string | boolean) => {
    setF((x) => ({ ...x, [k]: v }))
    setError('')
  }
  const setGstin = (raw: string) => {
    const gstin = raw.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15)
    const st = gstin.slice(0, 2)
    setF((x) => ({ ...x, gstin, stateCode: stateOptions.some((o) => o.value === st) ? st : x.stateCode }))
  }

  const save = async () => {
    if (!String(f.name).trim()) return setError('Enter the supplier name')
    setSaving(true)
    try {
      const body = { ...f, openingBalance: Number(f.openingBalance) || 0 }
      const saved = supplier ? await supplierApi.update(supplier.id, body) : await supplierApi.create(body)
      toast.success(supplier ? 'Supplier updated' : `Supplier ${saved.code} added`)
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
      title={supplier ? `Edit ${supplier.name}` : 'Add supplier'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>{supplier ? 'Save changes' : 'Add supplier'}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Supplier name" required value={String(f.name)} onChange={(e) => set('name', e.target.value)} className="sm:col-span-2" autoFocus />
        <Input label="Contact person" value={String(f.contactPerson)} onChange={(e) => set('contactPerson', e.target.value)} />
        <Input label="Phone" inputMode="tel" value={String(f.phone)} onChange={(e) => set('phone', e.target.value)} />
        <Input label="GSTIN" value={String(f.gstin)} onChange={(e) => setGstin(e.target.value)} placeholder="32ABCDE1234F1Z5" hint="Leave empty if not GST registered" />
        <Select label="State" value={String(f.stateCode)} onChange={(e) => set('stateCode', e.target.value)} options={stateOptions} hint="Other state → IGST on bills" />
        <Input label="Address" value={String(f.address)} onChange={(e) => set('address', e.target.value)} className="sm:col-span-2" />
        <Input label="City" value={String(f.city)} onChange={(e) => set('city', e.target.value)} />
        <Input label="PIN code" inputMode="numeric" maxLength={6} value={String(f.pincode)} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} />
        <Input label="Email" type="email" value={String(f.email)} onChange={(e) => set('email', e.target.value)} />
        <Input
          label="Opening balance ₹"
          type="number"
          inputMode="decimal"
          value={String(f.openingBalance)}
          onChange={(e) => set('openingBalance', e.target.value)}
          hint="Amount you already owed them on the go-live date (minus if they owe you)"
        />
        <Textarea label="Notes" rows={2} value={String(f.notes)} onChange={(e) => set('notes', e.target.value)} className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <Switch label="Active" hint="Inactive suppliers can't be chosen on new bills" checked={Boolean(f.isActive)} onChange={(v) => set('isActive', v)} />
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
