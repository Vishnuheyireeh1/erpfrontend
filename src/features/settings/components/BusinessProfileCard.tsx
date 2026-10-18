import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { api, ApiError } from '@/lib/api'
import { stateOptions, type BusinessProfile } from '@/lib/gst'

type Props = { profile: BusinessProfile; onSaved: () => void }

// Shop details printed on bills, labels and GST documents. Server validates (incl. GSTIN check digit).
export function BusinessProfileCard({ profile, onSaved }: Props) {
  const toast = useToast()
  const [form, setForm] = useState<BusinessProfile>(profile)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof BusinessProfile>(k: K, v: BusinessProfile[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setError('')
  }

  // Typing a GSTIN fills the state from its first two digits.
  const setGstin = (raw: string) => {
    const gstin = raw.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15)
    const state = gstin.slice(0, 2)
    setForm((f) => ({ ...f, gstin, stateCode: stateOptions.some((o) => o.value === state) ? state : f.stateCode }))
    setError('')
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/settings', { 'business.profile': form })
      toast.success('Business profile saved')
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="Business profile" className="lg:col-span-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Shop name" required value={form.shopName} onChange={(e) => set('shopName', e.target.value)} hint="Printed on labels and bills" />
        <Input label="Legal / registered name" value={form.legalName} onChange={(e) => set('legalName', e.target.value)} hint="If different from the shop name" />
        <div className="flex flex-col justify-center rounded-control bg-page px-3 py-2 text-xs text-muted">
          <span className="font-medium text-ink">Bill number letters & layout</span>
          Set in Document numbers (below), for every document type.
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Switch
            label="GST registered"
            hint="On: GST on purchases is claimed back (not part of stock cost) and bills show GST. Off: GST paid becomes part of the cost."
            checked={form.gstRegistered}
            onChange={(v) => set('gstRegistered', v)}
          />
        </div>
        <Input label="GSTIN" value={form.gstin} onChange={(e) => setGstin(e.target.value)} placeholder="32ABCDE1234F1Z5" className="font-mono" required={form.gstRegistered} />
        <Select label="State" required value={form.stateCode} onChange={(e) => set('stateCode', e.target.value)} options={stateOptions} hint="Decides CGST + SGST vs IGST" />
        <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" />
        <Input label="Address line 1" value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} className="sm:col-span-2" />
        <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <Input label="Address line 2" value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} className="sm:col-span-2" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <Input label="PIN code" value={form.pincode} inputMode="numeric" maxLength={6} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} />
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex justify-end">
        <Button variant="primary" loading={saving} onClick={save}>Save profile</Button>
      </div>
    </Card>
  )
}
