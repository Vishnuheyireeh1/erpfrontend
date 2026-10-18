import { IconHistory, IconPlus, IconRuler2 } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Spinner } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { garmentApi, measurementApi, orderedValues } from '../api/workshop.api'
import type { Measurement } from '../types'
import { MeasurementModal } from './MeasurementModal'

type Props = { customerId: number; customerName: string }

// Customer page: latest measurements per garment, full history on demand, add a new set.
export function MeasurementsCard({ customerId, customerName }: Props) {
  const toast = useToast()
  const list = useApiQuery(['measurements', customerId], () => measurementApi.list(customerId))
  const garments = useApiQuery('garments', () => garmentApi.list())
  const [adding, setAdding] = useState<number | null | undefined>(undefined) // undefined = closed, null = any garment
  const [showAll, setShowAll] = useState(false)
  const [deleting, setDeleting] = useState<Measurement | null>(null)

  const items = list.data ?? list.lastData ?? []
  // items are newest first → the first row of each garment is its latest set.
  const seen = new Set<number>()
  const latestIds = new Set(items.filter((m) => !seen.has(m.garmentTypeId) && seen.add(m.garmentTypeId)).map((m) => m.id))
  const shown = showAll ? items : items.filter((m) => latestIds.has(m.id))
  const fieldsOf = (gid: number) => garments.data?.find((g) => g.id === gid)?.fields ?? []

  const remove = async () => {
    if (!deleting) return
    try {
      await measurementApi.remove(customerId, deleting.id)
      toast.success('Measurement deleted')
      setDeleting(null)
      list.reload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete')
    }
  }

  return (
    <Card
      title="Measurements"
      className="mb-5"
      actions={
        <div className="flex flex-wrap gap-2">
          {items.length > latestIds.size && (
            <Button icon={IconHistory} onClick={() => setShowAll((v) => !v)}>{showAll ? 'Latest' : `History (${items.length})`}</Button>
          )}
          <Button icon={IconPlus} disabled={!garments.data} onClick={() => setAdding(null)}>Measure</Button>
        </div>
      }
    >
      {!list.data && !list.lastData ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : shown.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted"><IconRuler2 size={18} /> No measurements yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shown.map((m) => (
            <li key={m.id} className="rounded-card border border-line p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{m.garmentType.name}</p>
                  <p className="text-xs text-muted">{formatDate(m.takenOn)}{latestIds.has(m.id) ? ' · latest' : ''}</p>
                </div>
                <div className="flex shrink-0 gap-3 text-sm">
                  {latestIds.has(m.id) && <button type="button" onClick={() => setAdding(m.garmentTypeId)} className="text-brand hover:underline">New set</button>}
                  <button type="button" onClick={() => setDeleting(m)} className="text-muted hover:text-danger">Delete</button>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                {orderedValues(m.values, fieldsOf(m.garmentTypeId)).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-dashed border-line">
                    <dt className="truncate text-muted">{k}</dt>
                    <dd className="font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              {m.notes && <p className="mt-2 text-sm text-ink-soft">{m.notes}</p>}
            </li>
          ))}
        </ul>
      )}
      {adding !== undefined && garments.data && (
        <MeasurementModal
          customerId={customerId}
          customerName={customerName}
          garments={garments.data}
          history={items}
          initialGarmentId={adding ?? undefined}
          onClose={() => setAdding(undefined)}
          onSaved={() => { setAdding(undefined); list.reload() }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Delete this measurement?"
        message="Use only for a wrongly entered set. Jobs keep their own copy."
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  )
}
