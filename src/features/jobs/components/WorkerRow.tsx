import { controlClass } from '@/components/ui/controlClass'
import { Select } from '@/components/ui/Select'
import type { TailorOption } from '@/features/workshop/api/workshop.api'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'

export type WorkPick = { tailorId: string; rate: string; note: string }

type Props = {
  label: string
  empty: string // "Not decided" / "Not needed"
  people: TailorOption[]
  value: WorkPick
  qty: number
  presetFor: (tailorId: string) => string // their usual pay per piece for this work ('' = none)
  onChange: (v: WorkPick) => void
}

// One work on a garment (Stitching, Cutting, Embroidery …): who did it → per-piece people get their usual pay filled
// in (change it + write why); salaried people get no pay — the job only records who did it.
export function WorkerRow({ label, empty, people, value, qty, presetFor, onChange }: Props) {
  const who = people.find((p) => String(p.id) === value.tailorId)
  const piece = who?.payType === 'PIECE'
  const preset = presetFor(value.tailorId)
  const changed = piece && preset !== '' && Number(value.rate) !== Number(preset)
  return (
    <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[7rem_minmax(0,1fr)_6.5rem_minmax(0,1fr)]">
      <span className="col-span-2 text-sm font-medium text-ink sm:col-span-1">{label}</span>
      <Select
        aria-label={`${label} — who`}
        value={value.tailorId}
        onChange={(e) => onChange({ tailorId: e.target.value, rate: e.target.value ? String(Number(presetFor(e.target.value))) : '0', note: '' })}
        className="col-span-2 sm:col-span-1"
        placeholder={empty}
        options={people.map((p) => ({ value: String(p.id), label: `${p.name}${p.payType === 'SALARY' ? ' (salaried)' : ''}` }))}
      />
      {who && !piece && <span className="col-span-2 text-xs text-muted">Salaried — no pay, only who did it</span>}
      {piece && (
        <>
          <label className="flex items-center gap-1 text-xs text-muted">
            ₹
            <input type="number" inputMode="decimal" min={0} aria-label={`${label} pay per piece`} value={value.rate} onChange={(e) => onChange({ ...value, rate: e.target.value })} className={cn(controlClass(), 'h-10 w-full text-right')} />
          </label>
          <input
            aria-label={`${label} note`}
            maxLength={200}
            value={value.note}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
            placeholder={changed ? 'Why changed? (needed)' : 'Note'}
            className={cn(controlClass(), 'h-10', changed && !value.note.trim() && 'border-warn')}
          />
          <span className="col-span-2 text-xs text-muted sm:col-start-2 sm:col-end-5">
            {qty} pc × {formatINR(Number(value.rate) || 0)} = <b className="text-ink">{formatINR(qty * (Number(value.rate) || 0))}</b> to {who.name} when Ready
            {changed && ` · usual ${formatINR(Number(preset))}`}
          </span>
        </>
      )}
    </div>
  )
}
