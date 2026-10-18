import { IconPlus, IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { paymentModeOptions } from '@/features/purchase/api/purchase.api'
import type { TailorOption } from '@/features/workshop/api/workshop.api'
import { formatINR } from '@/lib/format'
import { costKindLabels } from '../api/production.api'
import { costAmount, newCost, type CostDraft } from '../productionDrafts'
import type { CostKind } from '../types'

type Props = { costs: CostDraft[]; onChange: (c: CostDraft[]) => void; tailors: TailorOption[]; pieces: number }

// Making costs: per-piece tailor (balance), paid out now (day book), salaried staff (costing only).
export function ProductionCostsCard({ costs, onChange, tailors, pieces }: Props) {
  const set = (key: string, patch: Partial<CostDraft>) => onChange(costs.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  const pieceTailors = tailors.filter((t) => t.payType === 'PIECE')

  return (
    <Card
      title="Making costs"
      actions={
        <div className="flex flex-wrap gap-2">
          {(['TAILOR', 'PAID', 'SALARIED'] as CostKind[]).map((k) => (
            <Button key={k} size="sm" icon={IconPlus} onClick={() => onChange([...costs, newCost(k, pieces)])}>{k === 'TAILOR' ? 'Tailor' : k === 'PAID' ? 'Paid out' : 'Salaried'}</Button>
          ))}
        </div>
      }
    >
      {costs.length === 0 && <p className="text-sm text-muted">Add the tailor's stitching charge, outside work paid (embroidery …) and salaried staff time.</p>}
      <div className="flex flex-col gap-4">
        {costs.map((c) => (
          <div key={c.key} className="rounded-card border border-line p-3">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink">{costKindLabels[c.kind].label}</p>
                <p className="text-xs text-muted">{costKindLabels[c.kind].hint}</p>
              </div>
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{formatINR(costAmount(c))}</span>
                <button type="button" onClick={() => onChange(costs.filter((x) => x.key !== c.key))} className="rounded-control p-1 text-muted hover:text-danger" aria-label="Remove cost"><IconX size={18} /></button>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="What" value={c.description} onChange={(e) => set(c.key, { description: e.target.value })} placeholder={c.kind === 'PAID' ? 'Embroidery, dyeing …' : ''} />
              {c.kind === 'TAILOR' ? (
                <>
                  <Select
                    label="Tailor"
                    value={c.tailorId}
                    onChange={(e) => set(c.key, { tailorId: e.target.value })}
                    options={[{ value: '', label: pieceTailors.length ? 'Choose…' : 'No per-piece tailors' }, ...pieceTailors.map((t) => ({ value: String(t.id), label: t.name }))]}
                  />
                  <Input label="Pieces" type="number" inputMode="decimal" min={0} value={c.qty} onChange={(e) => set(c.key, { qty: e.target.value })} />
                  <Input label="Rate / piece ₹" type="number" inputMode="decimal" min={0} value={c.rate} onChange={(e) => set(c.key, { rate: e.target.value })} />
                </>
              ) : (
                <>
                  <Input label="Amount ₹" type="number" inputMode="decimal" min={0} value={c.amount} onChange={(e) => set(c.key, { amount: e.target.value })} />
                  {c.kind === 'PAID' && (
                    <>
                      <Select label="Paid by" value={c.mode} onChange={(e) => set(c.key, { mode: e.target.value as CostDraft['mode'] })} options={paymentModeOptions} />
                      <Input label="Reference" value={c.reference} onChange={(e) => set(c.key, { reference: e.target.value })} placeholder="UPI ref / bill no." />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
