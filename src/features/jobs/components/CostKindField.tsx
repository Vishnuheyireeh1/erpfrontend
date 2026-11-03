import type { useCostKind } from '../hooks/useCostKind'
import { ChargeCombo } from './ChargeCombo'

type Props = { label: string; kind: ReturnType<typeof useCostKind>; onChange?: (name: string) => void }

// What a cost / work is for: pick from the list or type a new one (see useCostKind).
export function CostKindField({ label, kind, onChange }: Props) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-sm font-medium text-ink">{label} <span className="text-danger">*</span></p>
      <ChargeCombo
        label={label}
        value={kind.name}
        options={kind.names}
        placeholder={kind.loading ? 'Loading…' : 'Pick or type, e.g. Embroidery'}
        newNote="new, saved to this list for next time"
        inputClassName="h-11"
        onChange={(v) => { kind.setName(v); onChange?.(v) }}
      />
    </div>
  )
}
