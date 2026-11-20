import { IconTool, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ChargeCombo } from '@/features/jobs/components/ChargeCombo'
import type { TailorOption } from '@/features/workshop/api/workshop.api'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { findWork, type WorkOption } from '../workOptions'
import type { ItemDraft } from '@/features/jobs/jobDrafts'

// A job line or a brand order piece (pieces also have the brand's customer).
export type WorkLineDraft = ItemDraft & { endCustomer?: string }

type Props = {
  index: number
  draft: WorkLineDraft
  works: WorkOption[]
  showCustomer?: boolean // only older orders with a customer per piece
  tailors: TailorOption[]
  error?: string
  onChange: (patch: Partial<WorkLineDraft>) => void
  onRemove?: () => void
}

const num = (v: string | number) => String(Number(v) || 0)

// A brand order line WITHOUT a garment (Saree bleeding, Fall & pico …): the work, who it is for, pieces, amount to the
// brand, and the worker with their pay. The work list mixes saved Work charges with every garment's charges; the
// "Show" box narrows it. Picking a work fills its usual amounts; "save amounts" keeps changed ones for next time.
export function BrandWorkEditor({ index, draft, works, showCustomer = false, tailors, error, onChange, onRemove }: Props) {
  const [show, setShow] = useState('all')
  const sources = [...new Set(works.map((w) => w.source))]
  const shown = show === 'all' ? works : works.filter((w) => w.source === show)
  const known = findWork(works, draft.description)
  const saved = known?.source === 'Work charges' ? known : undefined
  const changed = !!saved && (Number(draft.chargeRate) !== saved.rate || Number(draft.labourRate || 0) !== saved.labourRate)
  const isNew = !!draft.description.trim() && !known

  const pick = (name: string) => {
    const w = findWork(works, name)
    onChange({ description: name, saveRate: false, ...(w ? { chargeRate: num(w.rate), labourRate: num(w.labourRate) } : {}) })
  }
  const tailor = tailors.find((t) => String(t.id) === draft.tailorId)
  const qty = Number(draft.qty) || 0
  const pay = qty * (Number(draft.labourRate) || 0)
  const payHint = !tailor ? 'Our cost — not on the bill' : tailor.payType === 'SALARY' ? `${tailor.name} is salaried — no extra pay` : `${tailor.name} gets ${formatINR(pay)} when it is Ready`

  return (
    <div className={cn('@container rounded-card border p-4', error ? 'border-danger' : 'border-line')}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-medium text-ink"><IconTool size={16} className="text-brand" aria-hidden /> {index + 1}. {draft.description.trim() || 'Work'} <span className="text-xs font-normal text-muted">no garment</span></p>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink">{formatINR(qty * (Number(draft.chargeRate) || 0))}</span>
          {onRemove && (
            <button type="button" onClick={onRemove} aria-label={`Remove line ${index + 1}`} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-danger"><IconX size={16} /></button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        <div className="col-span-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink">Work <span className="text-danger">*</span></span>
            {sources.length > 1 && (
              <select aria-label="Show work from" value={show} onChange={(e) => setShow(e.target.value)} className="rounded-control border border-line bg-card px-2 py-0.5 text-xs text-ink-soft">
                <option value="all">Show: all</option>
                {sources.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
          <ChargeCombo label={`Work ${index + 1}`} value={draft.description} options={shown.map((w) => w.name)} autoFocus={!draft.description && !draft.id}
            detail={(n) => { const w = findWork(shown, n); return w ? `${formatINR(w.rate)}${show === 'all' && w.source !== 'Work charges' ? ` · ${w.source}` : ''}` : '' }}
            placeholder="Pick or type, e.g. Saree bleeding" newNote="new, saved to Work charges when the order is saved" inputClassName="h-11" onChange={pick} />
        </div>
        {showCustomer && <Input label="For (their customer)" className="col-span-2" value={draft.endCustomer ?? ''} onChange={(e) => onChange({ endCustomer: e.target.value })} placeholder="e.g. Priya" maxLength={120} />}
        <Input label="Pieces" type="number" inputMode="numeric" min={1} step={1} value={draft.qty} onChange={(e) => onChange({ qty: e.target.value })} />
        <Input label="Amount / piece ₹" type="number" inputMode="decimal" min={0} value={draft.chargeRate} onChange={(e) => onChange({ chargeRate: e.target.value })} />
        <Select label="Worker" placeholder="Decide later" value={draft.tailorId} onChange={(e) => onChange({ tailorId: e.target.value })}
          options={[{ value: '', label: 'Decide later' }, ...tailors.map((t) => ({ value: String(t.id), label: `${t.name}${t.payType === 'SALARY' ? ' (salaried)' : ''}` }))]} />
        <Input label="Worker pay / piece ₹" type="number" inputMode="decimal" min={0} value={draft.labourRate} onChange={(e) => onChange({ labourRate: e.target.value })} hint={payHint} />
        <Input label="Notes (optional)" className="col-span-2 @2xl:col-span-4" value={draft.instructions} onChange={(e) => onChange({ instructions: e.target.value })} maxLength={1000} placeholder="Colour, finish, any details…" />
      </div>

      {(changed || isNew) && (
        <label className="mt-3 flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" className="mt-0.5 size-4 accent-brand" checked={isNew || !!draft.saveRate} disabled={isNew} onChange={(e) => onChange({ saveRate: e.target.checked })} />
          <span>
            {isNew ? `"${draft.description.trim()}" is new — it is saved to Work charges with these amounts` : `Save these amounts for next time (now ${formatINR(saved!.rate)} to brand, ${formatINR(saved!.labourRate)} pay)`}
            <span className="block text-xs text-muted">{isNew ? 'Change them any time in Masters → Work charges.' : 'Leave unticked to use them on this order only.'}</span>
          </span>
        </label>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  )
}
