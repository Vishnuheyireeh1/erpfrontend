import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/toast-context'
import { costCategoryApi } from '@/features/workshop/api/workshop.api'
import type { CostCategory } from '@/features/workshop/types'
import { ApiError } from '@/lib/api'

type Props = { hidden: CostCategory[]; onAdded: (categoryId: number) => void; onCreated: () => void }

// Assign workers → "+ Add work": show a work that is not on the list yet (e.g. Ironing) or create a new one
// (e.g. Aari work) right here — its row then appears on every garment of this job.
export function AddWorkInline({ hidden, onAdded, onCreated }: Props) {
  const toast = useToast()
  const [name, setName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const add = async () => {
    const n = name?.trim()
    if (!n) return
    const found = hidden.find((c) => c.name.toLowerCase() === n.toLowerCase())
    if (found) {
      onAdded(found.id)
      return setName(null)
    }
    setBusy(true)
    try {
      const c = await costCategoryApi.create({ name: n, defaultPaidBy: 'SALARIED' })
      onCreated()
      onAdded(c.id)
      setName(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add the work')
    } finally {
      setBusy(false)
    }
  }

  if (name === null) {
    return (
      <button type="button" onClick={() => setName('')} className="inline-flex items-center gap-1 self-start text-sm font-medium text-brand hover:underline">
        <IconPlus size={15} /> Add work (aari, hemming, ironing …)
      </button>
    )
  }
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input label="Work" list="add-work-options" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Aari work" autoFocus className="sm:w-60" />
      <datalist id="add-work-options">{hidden.map((c) => <option key={c.id} value={c.name} />)}</datalist>
      <Button onClick={add} loading={busy}>Add</Button>
      <Button variant="ghost" onClick={() => setName(null)}>Cancel</Button>
    </div>
  )
}
