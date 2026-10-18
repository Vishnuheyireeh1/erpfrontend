import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { todayISO } from '@/features/inventory/constants'
import { paymentModeOptions } from '@/features/purchase/api/purchase.api'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { trainingApi } from '../api/training.api'
import type { EnrolDraft } from '../enrolDraft'

type Props = { value: EnrolDraft; onChange: (d: EnrolDraft) => void; excludeBatchIds?: number[] }

// Batch + agreed fee (pre-filled from the course) + optional fee paid at joining.
export function EnrolFields({ value: d, onChange, excludeBatchIds = [] }: Props) {
  const batches = useApiQuery('batches-active', () => trainingApi.batches({ status: 'active' }))
  const list = (batches.data ?? []).filter((b) => !excludeBatchIds.includes(b.id))
  const set = (patch: Partial<EnrolDraft>) => onChange({ ...d, ...patch })
  const pickBatch = (id: string) => {
    const b = list.find((x) => String(x.id) === id)
    set({ batchId: id, fee: b ? String(Number(b.course.fee)) : d.fee })
  }
  const due = Math.max(0, (Number(d.fee) || 0) - (Number(d.payNow) || 0))

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Select
        label="Batch"
        required
        value={d.batchId}
        onChange={(e) => pickBatch(e.target.value)}
        options={[{ value: '', label: batches.loading ? 'Loading…' : list.length ? 'Choose…' : 'No running batches — add one in Batches' }, ...list.map((b) => ({ value: String(b.id), label: `${b.course.name} · ${b.name}${b.timing ? ` (${b.timing})` : ''}` }))]}
        className="sm:col-span-2"
      />
      <Input label="Course fee ₹" required type="number" inputMode="decimal" min={0} value={d.fee} onChange={(e) => set({ fee: e.target.value })} hint="Lower it for a discount" />
      <Input label="Joined on" type="date" max={todayISO()} value={d.joinedOn} onChange={(e) => set({ joinedOn: e.target.value })} />
      <Input label="Fee paid now ₹" type="number" inputMode="decimal" min={0} value={d.payNow} onChange={(e) => set({ payNow: e.target.value })} placeholder="0" hint={`Balance after this: ${formatINR(due)}`} />
      {Number(d.payNow) > 0 && <Select label="Paid by" value={d.mode} onChange={(e) => set({ mode: e.target.value as EnrolDraft['mode'] })} options={paymentModeOptions} />}
    </div>
  )
}
