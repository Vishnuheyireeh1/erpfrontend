import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'

type Props = {
  title: string // "Blouse — Priya"
  fields: string[] // the garment's measurement fields, in order
  values: Record<string, string> // what the line already has
  note?: string
  onClose: () => void
  onSave: (values: Record<string, string>) => Promise<unknown>
}

// Add or correct the measurements of one garment after the bill — also after delivery. Only measurements change.
export function ItemMeasurementsModal({ title, fields, values, note, onClose, onSave }: Props) {
  const toast = useToast()
  const all = [...fields, ...Object.keys(values).filter((k) => !fields.includes(k))]
  const [form, setForm] = useState<Record<string, string>>(() => ({ ...values }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await onSave(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)))
      toast.success('Measurements saved')
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title={`Measurements — ${title}`} description={note ?? 'In inches, as on the tape. Only the measurements change — the bill stays the same.'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save measurements</Button></>}>
      {all.length === 0 ? (
        <p className="text-sm text-muted">This garment has no measurement fields. Add them in Workshop → Garment types.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {all.map((k, n) => (
            <Input key={k} label={k} inputMode="decimal" maxLength={20} autoFocus={n === 0} value={form[k] ?? ''} onChange={(e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError('') }} />
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
