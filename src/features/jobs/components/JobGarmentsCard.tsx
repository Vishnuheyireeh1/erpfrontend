import { IconPhoto, IconTrash } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/toast-context'
import { staffApi } from '@/features/staff/api/staff.api'
import { orderedValues } from '@/features/workshop/api/workshop.api'
import { useApiQuery } from '@/lib/useApiQuery'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { jobsApi } from '../api/jobs.api'
import type { Job } from '../types'

type Props = { job: Job; onChanged: () => void }

// Each garment: price, tailor, the measurements copied at booking, design notes and a reference photo.
export function JobGarmentsCard({ job, onChanged }: Props) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadFor, setUploadFor] = useState<number | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const canPhoto = job.status !== 'CANCELLED'
  const staff = useApiQuery('staff-options', () => staffApi.options())
  // Who took the measurements — can be filled any time after booking.
  const setMeasurer = async (itemId: number, value: string) => {
    setBusy(itemId)
    try {
      await jobsApi.setMeasuredBy(job.id, itemId, value ? Number(value) : null)
      toast.success('Saved')
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  const pick = (itemId: number) => {
    setUploadFor(itemId)
    fileRef.current?.click()
  }
  const upload = async (file: File | undefined) => {
    if (!file || !uploadFor) return
    setBusy(uploadFor)
    try {
      await jobsApi.uploadPhoto(job.id, uploadFor, file)
      toast.success('Design photo saved')
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not upload')
    } finally {
      setBusy(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  const removePhoto = async (itemId: number) => {
    setBusy(itemId)
    try {
      await jobsApi.removePhoto(job.id, itemId)
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not remove')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card title={`Garments (${job.items.length})`} className="mb-5">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <ul className="flex flex-col gap-4">
        {job.items.map((i) => {
          const values = orderedValues(i.measurements, i.garmentType.fields)
          return (
            <li key={i.id} className="grid grid-cols-1 gap-4 rounded-card border border-line p-3 md:grid-cols-[minmax(0,1fr)_140px]">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">{i.qty} × {i.description}</p>
                  <p className="text-sm font-semibold">{formatINR(i.qty * Number(i.chargeRate))}</p>
                </div>
                <p className="mb-2 text-sm text-ink-soft">
                  {formatINR(Number(i.chargeRate))} per piece · Tailor: {i.tailor ? `${i.tailor.name} (pay ${formatINR(Number(i.labourRate))}/pc)` : <span className="text-warn">not given yet</span>}
                  {i.ownFabric && <> · <Badge tone="info">Customer's cloth</Badge></>}
                </p>
                <label className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted">Measured by</span>
                  <Select compact aria-label="Measured by" className="min-w-44" value={String(i.measuredById ?? '')} disabled={!canPhoto || busy === i.id} onChange={(e) => setMeasurer(i.id, e.target.value)} placeholder="Not recorded"
                    options={[...(i.measuredBy && !(staff.data ?? []).some((s) => s.id === i.measuredBy!.id) ? [{ value: String(i.measuredBy.id), label: i.measuredBy.name }] : []), ...(staff.data ?? []).map((s) => ({ value: String(s.id), label: s.name }))]} />
                </label>
                {values.length > 0 ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-4">
                    {values.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 border-b border-dashed border-line">
                        <dt className="truncate text-muted">{k}</dt>
                        <dd className="font-medium text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-muted">No measurements.</p>
                )}
                {i.instructions && <p className="mt-2 whitespace-pre-line text-sm text-ink">{i.instructions}</p>}
              </div>
              <div className="flex flex-col items-start gap-2 md:items-stretch">
                {i.imagePath ? (
                  <a href={`/api/uploads/${i.imagePath}`} target="_blank" rel="noreferrer" className="block">
                    <img src={`/api/uploads/${i.imagePath}`} alt={`Design for ${i.description}`} className="h-32 w-32 rounded-control border border-line object-cover md:w-full" />
                  </a>
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-control border border-dashed border-line text-muted md:w-full"><IconPhoto size={28} /></div>
                )}
                {canPhoto && (
                  <div className="flex gap-3 text-sm">
                    <button type="button" disabled={busy === i.id} onClick={() => pick(i.id)} className="text-brand hover:underline">{i.imagePath ? 'Change photo' : 'Add design photo'}</button>
                    {i.imagePath && (
                      <button type="button" disabled={busy === i.id} onClick={() => removePhoto(i.id)} aria-label="Remove photo" className="text-muted hover:text-danger"><IconTrash size={16} /></button>
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
