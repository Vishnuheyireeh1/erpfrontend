import { IconCopy, IconPackage } from '@tabler/icons-react'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { JobItemEditor } from '@/features/jobs/components/JobItemEditor'
import { ProductLinesEditor } from '@/features/jobs/components/ProductLinesEditor'
import type { TailorOption } from '@/features/workshop/api/workshop.api'
import type { GarmentType } from '@/features/workshop/types'
import { formatINR } from '@/lib/format'
import { BRAND_LINE_LABELS, pieceAmount, type PieceDraft } from '../orderDrafts'

type Props = {
  index: number
  draft: PieceDraft
  garments: GarmentType[]
  tailors: TailorOption[]
  error?: string
  onChange: (patch: Partial<PieceDraft>) => void
  onRemove?: () => void
  onCopy: () => void
}

// One piece of a brand order: the job garment editor (measurements, rate, tailor, brand's cloth) + who it is for +
// cloth / lining from OUR stock (leaves stock when the order is saved).
export function BrandPieceEditor({ index, draft, garments, tailors, error, onChange, onRemove, onCopy }: Props) {
  const [showStock, setShowStock] = useState(draft.materials.length > 0)
  const forInput = (
    <Input label="For (their customer)" className="col-span-2" value={draft.endCustomer} onChange={(e) => onChange({ endCustomer: e.target.value })} placeholder="e.g. Priya" maxLength={120} />
  )
  const extraTotal = pieceAmount(draft) - (Number(draft.qty) || 0) * (Number(draft.chargeRate) || 0)

  return (
    <div className="flex flex-col gap-2">
      <JobItemEditor
        index={index}
        draft={draft}
        garments={garments}
        tailors={tailors}
        latestFor={() => undefined}
        error={error}
        onChange={onChange}
        onRemove={onRemove}
        ownFabricLabel="Brand's own cloth"
        extra={forInput}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm">
        {!draft.id && (
          <button type="button" onClick={() => setShowStock((s) => !s)} className="inline-flex items-center gap-1 font-medium text-brand">
            <IconPackage size={16} /> {showStock ? 'Hide' : 'Cloth / items from our stock'}{draft.materials.length ? ` (${draft.materials.length})` : ''}
          </button>
        )}
        {draft.id && <span className="text-xs text-muted">Stock items of this piece are changed on the order page.</span>}
        <button type="button" onClick={onCopy} className="inline-flex items-center gap-1 font-medium text-ink-soft hover:text-brand">
          <IconCopy size={16} /> Add another like this
        </button>
        {extraTotal > 0 && <span className="ml-auto text-xs text-muted">+ items {formatINR(extraTotal)}</span>}
      </div>
      {showStock && !draft.id && (
        <div className="rounded-card border border-dashed border-line p-3">
          <ProductLinesEditor
            rows={draft.materials}
            onChange={(materials) => onChange({ materials })}
            showErrors={!!error}
            labels={BRAND_LINE_LABELS}
            placeholder="Scan or search our cloth, lining, buttons…"
          />
        </div>
      )}
    </div>
  )
}
