import { Input, Textarea } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { TenderInputs } from '@/features/sales/components/TenderInputs'
import type { TenderRow } from '@/features/sales/tenders'
import { formatINR } from '@/lib/format'
import type { calcJob } from '../jobUtils'

export type JobMeta = { expectedDate: string; docDate: string; gstApplied: boolean; discount: string; notes: string; internalNotes: string }

type Props = {
  totals: ReturnType<typeof calcJob>
  meta: JobMeta
  onMeta: (patch: Partial<JobMeta>) => void
  gstRegistered: boolean
  gstRate: number
  isNew: boolean
  paid: number // already paid (edit)
  tenders: TenderRow[]
  onTenders: (rows: TenderRow[]) => void
  advanceAvailable: number
  useAdvance: boolean
  onUseAdvance: (v: boolean) => void
}

const row = (label: string, value: string, strong = false) => (
  <div className={strong ? 'flex justify-between border-t border-line pt-2 text-lg font-semibold text-ink' : 'flex justify-between text-sm'}>
    <span className={strong ? '' : 'text-muted'}>{label}</span>
    <span>{value}</span>
  </div>
)

// Right side of the job form: price, discount, GST tick, advance taken now, notes.
export function JobFormSummary({ totals, meta, onMeta, gstRegistered, gstRate, isNew, paid, tenders, onTenders, advanceAvailable, useAdvance, onUseAdvance }: Props) {
  const advanceUsed = isNew && useAdvance ? Math.min(advanceAvailable, totals.grandTotal) : 0
  const advanceNow = tenders.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const balance = Math.max(0, totals.grandTotal - paid - advanceUsed - advanceNow)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        {row('Stitching', formatINR(totals.stitchCharges))}
        <Input label="Discount on stitching ₹" type="number" inputMode="decimal" min={0} value={meta.discount} onChange={(e) => onMeta({ discount: e.target.value })} />
        {totals.itemsTotal > 0 && row('Items (GST included)', formatINR(totals.itemsTotal))}
        {totals.roundOff !== 0 && row('Round off', `${totals.roundOff > 0 ? '+' : '−'} ₹${Math.abs(totals.roundOff).toFixed(2)}`)}
        {row('Job total', formatINR(totals.grandTotal), true)}
        {totals.gst > 0 && <p className="text-xs text-muted">Includes GST {gstRate}%: taxable {formatINR(totals.taxable)} + GST {formatINR(totals.gst)}</p>}
      </div>
      {gstRegistered && (
        <Switch label={`Add GST on this job (${gstRate}%)`} hint="Charges are taken as GST-included" checked={meta.gstApplied} onChange={(v) => onMeta({ gstApplied: v })} />
      )}

      {isNew ? (
        <div className="flex flex-col gap-3">
          {advanceAvailable > 0.004 && (
            <Switch label={`Use earlier advance / credit ₹${advanceAvailable.toLocaleString('en-IN')}`} checked={useAdvance} onChange={onUseAdvance} />
          )}
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Paid now</p>
            <TenderInputs rows={tenders} onChange={onTenders} />
          </div>
        </div>
      ) : (
        paid > 0 && row('Already paid', formatINR(paid))
      )}
      <div className="flex justify-between rounded-card bg-page px-3 py-2 text-sm font-medium">
        <span>Balance — collect at hand over</span>
        <span className={balance > 0 ? 'text-warn' : 'text-success'}>{formatINR(balance)}</span>
      </div>

      <Textarea label="Note on bill" rows={2} value={meta.notes} onChange={(e) => onMeta({ notes: e.target.value })} placeholder="Trial on Saturday" />
      <Textarea label="Internal note (not printed)" rows={2} value={meta.internalNotes} onChange={(e) => onMeta({ internalNotes: e.target.value })} />
    </div>
  )
}
