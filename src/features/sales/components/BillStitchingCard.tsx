import { useEffect } from 'react'
import { Spinner } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { todayISO } from '@/features/inventory/constants'
import { JobItemEditor } from '@/features/jobs/components/JobItemEditor'
import { garmentPatch, itemError, newItem, type ItemDraft } from '@/features/jobs/jobDrafts'
import { garmentApi, measurementApi, tailorApi } from '@/features/workshop/api/workshop.api'
import { cn } from '@/lib/cn'
import { useApiQuery } from '@/lib/useApiQuery'
import { StepCard } from './StepCard'

type Props = {
  step: number
  drafts: ItemDraft[]
  onChange: (d: ItemDraft[]) => void
  customerId?: number
  deliveryDate: string
  minDate: string
  onDelivery: (d: string) => void
  showErrors: boolean
}

const addDays = (from: string, n: number) => new Date(Date.parse(`${from}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
const quickDays = [[3, '3 days'], [7, '1 week'], [10, '10 days'], [14, '2 weeks']] as const

// Billing page → Stitching job → "What to stitch?": choose a garment from the list to add it (usual price, tailor pay and
// the customer's last measurements fill in), then the delivery date.
export function BillStitchingCard({ step, drafts, onChange, customerId, deliveryDate, minDate, onDelivery, showErrors }: Props) {
  const garments = useApiQuery('garments', () => garmentApi.list())
  const tailors = useApiQuery('tailor-options', () => tailorApi.options())
  const measures = useApiQuery(['bill-measures', customerId], () => (customerId ? measurementApi.list(customerId) : Promise.resolve([])))
  // The customer's latest measurements for this garment (list is newest first) — filled in automatically.
  const latestFor = (gid: number) => measures.data?.find((m) => m.garmentTypeId === gid)?.values
  const set = (key: string, patch: Partial<ItemDraft>) => onChange(drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  const ready = garments.data && tailors.data
  const add = (gid: string) => onChange([...drafts, { ...newItem(), ...garmentPatch(gid, garments.data!, tailors.data!, '', latestFor(Number(gid))) }])
  const base = minDate > todayISO() ? minDate : todayISO()
  // Customer chosen after the garments: fill their last measurements into garments that are still empty.
  useEffect(() => {
    if (!measures.data?.length) return
    const empty = (d: ItemDraft) => d.garmentTypeId && !Object.values(d.measurements).some(Boolean)
    const fill = drafts.filter((d) => empty(d) && measures.data!.some((m) => String(m.garmentTypeId) === d.garmentTypeId))
    if (!fill.length) return
    onChange(drafts.map((d) => (fill.includes(d) ? { ...d, measurements: { ...(measures.data!.find((m) => String(m.garmentTypeId) === d.garmentTypeId)?.values ?? {}) } } : d)))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the customer's measurements arrive
  }, [measures.data])

  return (
    <StepCard step={step} title={drafts.length ? `Stitching (${drafts.length})` : 'Stitching — optional'}>
      {!ready ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-4">
          <Select
            label={drafts.length ? 'Add another garment' : 'Garment to stitch'}
            placeholder="Choose the garment…"
            value=""
            onChange={(e) => e.target.value && add(e.target.value)}
            options={garments.data!.filter((g) => g.isActive).map((g) => ({ value: String(g.id), label: g.name }))}
            className="sm:max-w-sm"
          />

          {drafts.map((d, i) => (
            <JobItemEditor showMeasuredBy
              key={d.key}
              simple
              index={i}
              draft={d}
              garments={garments.data!}
              tailors={tailors.data!}
              latestFor={latestFor}
              error={showErrors ? itemError(d) : undefined}
              onChange={(p) => set(d.key, p)}
              onRemove={() => onChange(drafts.filter((x) => x.key !== d.key))}
            />
          ))}

          {drafts.length > 0 && (
            <div className="rounded-card bg-page p-3">
              <p className="mb-2 text-sm font-medium text-ink">Ready by</p>
              <div className="flex flex-wrap items-end gap-2">
                {quickDays.map(([n, label]) => {
                  const d = addDays(base, n)
                  return (
                    <button key={n} type="button" aria-pressed={deliveryDate === d} onClick={() => onDelivery(d)} className={cn('h-10 rounded-control border px-3 text-sm font-medium', deliveryDate === d ? 'border-brand bg-brand text-white' : 'border-line bg-card text-ink-soft hover:border-brand')}>
                      {label}
                    </button>
                  )
                })}
                <Input aria-label="Ready by date" type="date" min={minDate} value={deliveryDate} onChange={(e) => onDelivery(e.target.value)} className="w-44" />
              </div>
            </div>
          )}
        </div>
      )}
    </StepCard>
  )
}
