import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { stateOptions } from '@/lib/gst'
import { brandApi } from '../api/brand.api'
import { GST_CHOICES, type Brand } from '../types'

type Props = { brand: Brand | null; onClose: () => void; onSaved: (b: Brand | null) => void }

const blank = { name: '', contactPerson: '', phone: '', email: '', gstin: '', stateCode: '32', address: '', city: '', pincode: '', gstRate: '0', openingBalance: '0', notes: '', isActive: true }

// Add / edit a brand we stitch for. Mount with a key so it resets per brand. onSaved(null) = deleted.
export function BrandFormModal({ brand, onClose, onSaved }: Props) {
  const toast = useToast()
  const [f, setF] = useState(() =>
    brand
      ? { ...blank, ...Object.fromEntries(Object.entries(brand).map(([k, v]) => [k, v ?? ''])), gstRate: String(Number(brand.gstRate)), openingBalance: String(Number(brand.openingBalance)), isActive: brand.isActive }
      : blank,
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
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
    if (!String(f.name).trim()) return setError('Enter the brand name')
    setSaving(true)
    try {
      const body = { ...f, gstRate: Number(f.gstRate), openingBalance: Number(f.openingBalance) || 0 }
      const saved = brand ? await brandApi.update(brand.id, body) : await brandApi.create(body)
      toast.success(brand ? 'Brand updated' : `Brand ${saved.code} added`)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setSaving(false)
    }
  }
  const remove = async () => {
    if (!brand) return
    setSaving(true)
    try {
      await brandApi.remove(brand.id)
      toast.success(`${brand.name} deleted`)
      onSaved(null)
    } catch (err) {
      setConfirmDelete(false)
      setError(err instanceof ApiError ? err.message : 'Could not delete')
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={brand ? `Edit ${brand.name}` : 'Add brand'}
      footer={
        <>
          {brand && <Button variant="danger" className="mr-auto" disabled={saving} onClick={() => setConfirmDelete(true)}>Delete</Button>}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>{brand ? 'Save changes' : 'Add brand'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Brand name" required value={String(f.name)} onChange={(e) => set('name', e.target.value)} className="sm:col-span-2" autoFocus />
        <Input label="Contact person" value={String(f.contactPerson)} onChange={(e) => set('contactPerson', e.target.value)} />
        <Input label="Phone" inputMode="tel" value={String(f.phone)} onChange={(e) => set('phone', e.target.value)} />
        <Input label="GSTIN" value={String(f.gstin)} onChange={(e) => setGstin(e.target.value)} placeholder="32ABCDE1234F1Z5" hint="Leave empty if not GST registered" />
        <Select label="State" value={String(f.stateCode)} onChange={(e) => set('stateCode', e.target.value)} options={stateOptions} hint="Other state → IGST on bills" />
        <Select
          label="Usual GST on their bills"
          value={String(f.gstRate)}
          onChange={(e) => set('gstRate', e.target.value)}
          options={GST_CHOICES}
          hint="Comes pre-selected on each delivery bill — you can change it there"
        />
        <Input
          label="Opening balance ₹"
          type="number"
          inputMode="decimal"
          value={String(f.openingBalance)}
          onChange={(e) => set('openingBalance', e.target.value)}
          hint="What they already owed the shop before starting the ERP (minus if the shop owes them)"
        />
        <Input label="Address" value={String(f.address)} onChange={(e) => set('address', e.target.value)} className="sm:col-span-2" />
        <Input label="City" value={String(f.city)} onChange={(e) => set('city', e.target.value)} />
        <Input label="PIN code" inputMode="numeric" maxLength={6} value={String(f.pincode)} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} />
        <Input label="Email" type="email" value={String(f.email)} onChange={(e) => set('email', e.target.value)} className="sm:col-span-2" />
        <Textarea label="Notes" rows={2} value={String(f.notes)} onChange={(e) => set('notes', e.target.value)} className="sm:col-span-2" placeholder="e.g. label at back neck, packing in polybag" />
        <div className="sm:col-span-2">
          <Switch label="Active" hint="Inactive brands can't be chosen on new orders" checked={Boolean(f.isActive)} onChange={(v) => set('isActive', v)} />
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete brand?"
        message={`${brand?.name ?? ''} will be removed. This can't be undone.`}
        confirmLabel="Delete"
        danger
        loading={saving}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </Modal>
  )
}
