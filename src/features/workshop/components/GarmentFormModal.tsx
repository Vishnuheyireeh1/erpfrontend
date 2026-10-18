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
import { garmentApi } from '../api/workshop.api'
import type { GarmentType } from '../types'

type Props = { garment: GarmentType | null; onClose: () => void; onSaved: () => void }

let seq = 0
type Field = { key: string; label: string }
const toFields = (labels: string[]): Field[] => labels.map((label) => ({ key: `f${++seq}`, label }))

// Garment type: name, default prices and its measurement fields (in the order they are taken).
export function GarmentFormModal({ garment, onClose, onSaved }: Props) {
  const toast = useToast()
  const [name, setName] = useState(garment?.name ?? '')
  const [charge, setCharge] = useState(String(Number(garment?.defaultCharge ?? 0)))
  const [labour, setLabour] = useState(String(Number(garment?.defaultLabour ?? 0)))
  const [active, setActive] = useState(garment?.isActive ?? true)
  const [fields, setFields] = useState<Field[]>(() => toFields(garment?.fields ?? []))
  const [error, setError] = useState('')
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
      const body = { name: name.trim(), fields: fields.map((f) => f.label.trim()).filter(Boolean), defaultCharge: Number(charge) || 0, defaultLabour: Number(labour) || 0, sortOrder: garment?.sortOrder ?? 500, isActive: active }
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
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>{garment ? 'Save changes' : 'Add garment'}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Garment" required value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="Blouse" />
        <Input label="Usual charge ₹" type="number" inputMode="decimal" min={0} value={charge} onChange={(e) => setCharge(e.target.value)} hint="To customer, GST included" />
        <Input label="Usual tailor pay ₹" type="number" inputMode="decimal" min={0} value={labour} onChange={(e) => setLabour(e.target.value)} />
      </div>

      <p className="mb-2 mt-5 text-sm font-medium text-ink">Measurements ({fields.length})</p>
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
        <IconPlus size={15} /> Add measurement
      </button>
      <div className="mt-4"><Switch label="Active" hint="Inactive garments can't be chosen on new jobs" checked={active} onChange={setActive} /></div>
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
