import { IconArrowDown, IconArrowUp, IconPlus, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/controlClass'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { chargeKinds } from '@/features/jobs/jobUtils'
import { garmentApi } from '../api/workshop.api'
import { MeasurementPresets } from './MeasurementPresets'
import type { GarmentType } from '../types'

type Props = { garment: GarmentType | null; onClose: () => void; onSaved: () => void; onDelete?: () => void }

let seq = 0
type Field = { key: string; label: string }
const toFields = (labels: string[]): Field[] => labels.map((label) => ({ key: `f${++seq}`, label }))


// Garment type: name, default prices, its additional charge options (shown inside the garment on the bill, where
// the amount is typed) and its measurement fields (in the order they are taken).
export function GarmentFormModal({ garment, onClose, onSaved, onDelete }: Props) {
  const toast = useToast()
  const [name, setName] = useState(garment?.name ?? '')
  const [charge, setCharge] = useState(String(Number(garment?.defaultCharge ?? 0)))
  const [labour, setLabour] = useState(String(Number(garment?.defaultLabour ?? 0)))
  const [active, setActive] = useState(garment?.isActive ?? true)
  const [fields, setFields] = useState<Field[]>(() => toFields(garment?.fields ?? []))
  const [charges, setCharges] = useState<Field[]>(() => toFields(garment?.charges ?? []))
  const [error, setError] = useState('')
  const [presets, setPresets] = useState(() => !garment?.fields.length) // open for a new garment
  const same = (f: Field, label: string) => f.label.trim().toLowerCase() === label.toLowerCase()
  const togglePreset = (label: string) =>
    setFields((fs) => (fs.some((f) => same(f, label)) ? fs.filter((f) => !same(f, label)) : [...fs.filter((f) => f.label.trim()), ...toFields([label])]))
  const [saving, setSaving] = useState(false)

  const move = (i: number, d: -1 | 1) =>
    setFields((fs) => {
      const j = i + d
      if (j < 0 || j >= fs.length) return fs
      const copy = [...fs]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })

  const save = async () => {
    if (!name.trim()) return setError('Enter the garment name')
    setSaving(true)
    try {
      const body = { name: name.trim(), fields: fields.map((f) => f.label.trim()).filter(Boolean), defaultCharge: Number(charge) || 0, defaultLabour: Number(labour) || 0,
        charges: charges.map((c) => c.label.trim()).filter(Boolean),
        costDefaults: (garment?.costDefaults ?? []).map((c) => ({ categoryId: c.categoryId, rate: Number(c.rate) })), // kept as saved
        sortOrder: garment?.sortOrder ?? 500, isActive: active }
      if (garment) await garmentApi.update(garment.id, body)
      else await garmentApi.create(body)
      toast.success(garment ? 'Garment updated' : `${body.name} added`)
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
      size="lg"
      title={garment ? `Edit ${garment.name}` : 'Add garment type'}
      description="Measurements are asked in this order. Changing them never alters measurements already saved."
      footer={<>{onDelete && <Button variant="danger" className="mr-auto" onClick={onDelete}>Delete</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>{garment ? 'Save changes' : 'Add garment'}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Garment" required value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="Blouse" />
        <Input label="Usual charge ₹" type="number" inputMode="decimal" min={0} value={charge} onChange={(e) => setCharge(e.target.value)} hint="To customer, GST included" />
        <Input label="Usual tailor pay ₹" type="number" inputMode="decimal" min={0} value={labour} onChange={(e) => setLabour(e.target.value)} />
      </div>

      <p className="mb-1 mt-5 text-sm font-medium text-ink">Additional charges ({charges.length})</p>
      <p className="mb-2 text-xs text-muted">Just the names (Lining, Piping …). On the bill they show inside this garment — staff type the amount there.</p>
      <ul className="flex flex-col gap-2">
        {charges.map((c, i) => (
          <li key={c.key} className="flex items-center gap-2">
            <input list="garment-charge-kinds" aria-label={`Charge ${i + 1} name`} placeholder="Charge, e.g. Lining" maxLength={40} value={c.label} onChange={(e) => setCharges((cs) => cs.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)))} className={cn(controlClass(), 'h-9 min-w-0 flex-1')} />
            <button type="button" aria-label={`Remove charge ${i + 1}`} onClick={() => setCharges((cs) => cs.filter((x) => x.key !== c.key))} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-ink"><IconX size={16} /></button>
          </li>
        ))}
      </ul>
      <datalist id="garment-charge-kinds">{chargeKinds.map((k) => <option key={k} value={k} />)}</datalist>
      <button type="button" onClick={() => setCharges((cs) => [...cs, ...toFields([''])])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        <IconPlus size={15} /> Add charge
      </button>

      <div className="mb-2 mt-5 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">Measurements ({fields.length})</p>
        <button type="button" onClick={() => setPresets((v) => !v)} className="text-sm font-medium text-brand hover:underline">{presets ? 'Hide order book list' : 'Pick from order book'}</button>
      </div>
      {presets && <MeasurementPresets chosen={fields.map((f) => f.label)} onToggle={togglePreset} onAddAll={(labels) => setFields((fs) => [...fs.filter((f) => f.label.trim()), ...toFields(labels)])} />}
      <ul className="flex flex-col gap-2">
        {fields.map((f, i) => (
          <li key={f.key} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right text-xs text-muted">{i + 1}</span>
            <input
              aria-label={`Measurement ${i + 1}`}
              value={f.label}
              maxLength={40}
              onChange={(e) => setFields((fs) => fs.map((x) => (x.key === f.key ? { ...x, label: e.target.value } : x)))}
              className={cn(controlClass(), 'h-9 min-w-0 flex-1')}
            />
            <button type="button" aria-label="Move up" onClick={() => move(i, -1)} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-ink"><IconArrowUp size={16} /></button>
            <button type="button" aria-label="Move down" onClick={() => move(i, 1)} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-ink"><IconArrowDown size={16} /></button>
            <button type="button" aria-label={`Remove ${f.label}`} onClick={() => setFields((fs) => fs.filter((x) => x.key !== f.key))} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-ink"><IconX size={16} /></button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setFields((fs) => [...fs, ...toFields([''])])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        <IconPlus size={15} /> Type a measurement
      </button>
      <div className="mt-4"><Switch label="Active" hint="Inactive garments can't be chosen on new jobs" checked={active} onChange={setActive} /></div>
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
