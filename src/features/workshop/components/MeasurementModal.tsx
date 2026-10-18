import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { ApiError } from '@/lib/api'
import { measurementApi } from '../api/workshop.api'
import type { GarmentType, Measurement } from '../types'

type Props = {
  customerId: number
  customerName: string
  garments: GarmentType[]
  history: Measurement[] // newest first → pre-fill from the latest of the chosen garment
  initialGarmentId?: number
  onClose: () => void
  onSaved: (m: Measurement) => void
}

// Take a new set of measurements. Starts from the customer's last set for that garment (change what differs).
export function MeasurementModal({ customerId, customerName, garments, history, initialGarmentId, onClose, onSaved }: Props) {
  const toast = useToast()
  const active = garments.filter((g) => g.isActive)
  const prefill = (gid: number) => history.find((m) => m.garmentTypeId === gid)
  const [garmentId, setGarmentId] = useState(initialGarmentId ?? active[0]?.id ?? 0)
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...(prefill(initialGarmentId ?? active[0]?.id ?? 0)?.values ?? {}) }))
  const [notes, setNotes] = useState(() => prefill(initialGarmentId ?? active[0]?.id ?? 0)?.notes ?? '')
  const [takenOn, setTakenOn] = useState(todayISO)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const garment = garments.find((g) => g.id === garmentId)
  const last = prefill(garmentId)
  // Fields of the template + any extra labels from the last set (template changed since).
  const fields = garment ? [...garment.fields, ...Object.keys(last?.values ?? {}).filter((k) => !garment.fields.includes(k))] : []

  const choose = (gid: number) => {
    setGarmentId(gid)
    setValues({ ...(prefill(gid)?.values ?? {}) })
    setNotes(prefill(gid)?.notes ?? '')
    setError('')
  }

  const save = async () => {
    if (!garmentId) return setError('Choose the garment')
    setSaving(true)
    try {
      const m = await measurementApi.create(customerId, { garmentTypeId: garmentId, takenOn, values, notes: notes.trim() || undefined })
      toast.success(`${m.garmentType.name} measurements saved`)
      onSaved(m)
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
      title={`Measurements — ${customerName}`}
      description={last ? `Started from the ${new Date(last.takenOn).toLocaleDateString('en-IN')} set — change only what differs.` : 'In inches, as on the tape.'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save measurements</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Garment" value={String(garmentId)} onChange={(e) => choose(Number(e.target.value))} options={active.map((g) => ({ value: String(g.id), label: g.name }))} />
        <Input label="Date" type="date" max={todayISO()} value={takenOn} onChange={(e) => setTakenOn(e.target.value)} />
      </div>
      {fields.length > 0 && (
        <div className="mt-4 grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {fields.map((f) => (
            <Input
              key={f}
              label={f}
              inputMode="decimal"
              maxLength={20}
              value={values[f] ?? ''}
              onChange={(e) => { setValues((v) => ({ ...v, [f]: e.target.value })); setError('') }}
            />
          ))}
        </div>
      )}
      <Textarea label="Notes / design" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Deep back neck, princess cut, loose fit…" className="mt-4" />
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
