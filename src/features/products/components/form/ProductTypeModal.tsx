import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { mastersApi } from '@/features/masters/api/masters.api'
import { ApiError } from '@/lib/api'
import { productKindOptions } from '../../constants'
import type { Option, ProductType } from '../../types'

type Props = { onClose: () => void; onCreated: (type: Option) => void }

// Product form → "+ New type": a name (Saree, Kids wear …) and how it works (stock / raw material / own-made / service).
// Also listed and editable in Masters → Product types.
export function ProductTypeModal({ onClose, onCreated }: Props) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ProductType | ''>('READY_MADE')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return setError('Enter the type name')
    if (!kind) return setError('Choose how it works')
    setSaving(true)
    try {
      const row = await mastersApi.create('productTypes', { name: name.trim(), kind, isActive: true })
      toast.success(`Product type "${row.name}" added`)
      onCreated({ id: row.id, name: row.name, kind: row.kind as ProductType })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add the type')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="New product type" description="It shows in the Type list on products and the products filter."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Add type</Button></>}>
      <div className="flex flex-col gap-4">
        <Input label="Type name" required autoFocus maxLength={60} placeholder="Kids wear" value={name} onChange={(e) => { setName(e.target.value); setError('') }} />
        <Select label="How it works" required value={kind} onChange={(e) => setKind(e.target.value as ProductType)} options={productKindOptions}
          hint="Service = no stock. Own-made = made in the shop. The others are counted in stock." />
        {error && <p role="alert" className="rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
