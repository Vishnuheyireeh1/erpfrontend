import { IconChevronDown, IconX } from '@tabler/icons-react'
import { useState, type ReactNode } from 'react'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import type { TailorOption } from '@/features/workshop/api/workshop.api'
import type { GarmentType } from '@/features/workshop/types'
import { staffApi } from '@/features/staff/api/staff.api'
import { cn } from '@/lib/cn'
import { useApiQuery } from '@/lib/useApiQuery'
import { formatINR } from '@/lib/format'
import { garmentPatch, labourFor, type ItemDraft } from '../jobDrafts'

type Props = {
  index: number
  draft: ItemDraft
  garments: GarmentType[]
  tailors: TailorOption[]
  latestFor: (garmentTypeId: number) => Record<string, string> | undefined // customer's last measurements
  error?: string
  onChange: (patch: Partial<ItemDraft>) => void
  onRemove?: () => void
  // Billing page (counter): only pieces, price and measurements — the tailor and workers are given later in Job work.
  simple?: boolean
  // Brand orders: "Brand's own cloth" instead of the customer's, and extra fields (e.g. who the piece is for).
  ownFabricLabel?: string
  extra?: ReactNode
  showMeasuredBy?: boolean // job garments: who took the measurements (staff, optional)
}

// One garment on the job: type, pieces, price, tailor, measurements and design notes.
export function JobItemEditor({ index, draft, garments, tailors, latestFor, error, onChange, onRemove, simple, ownFabricLabel = "Customer's own cloth", extra, showMeasuredBy = false }: Props) {
  const staff = useApiQuery(showMeasuredBy ? 'staff-options' : 'staff-options-off', () => (showMeasuredBy ? staffApi.options() : Promise.resolve([])))
  const [open, setOpen] = useState(!draft.id)
  const [more, setMore] = useState(false)
  const garment = garments.find((g) => String(g.id) === draft.garmentTypeId)
  const fields = garment ? [...garment.fields, ...Object.keys(draft.measurements).filter((k) => !garment.fields.includes(k))] : []
  const filled = Object.values(draft.measurements).filter(Boolean).length
  const lineTotal = (Number(draft.qty) || 0) * (Number(draft.chargeRate) || 0)
  const fromLastTime = garment && filled > 0 ? !!latestFor(garment.id) : false

  const chooseGarment = (gid: string) => {
    onChange(garmentPatch(gid, garments, tailors, draft.tailorId, latestFor(Number(gid))))
    setOpen(true)
  }
  const garmentSelect = (
    <Select label="Garment" className="col-span-2" placeholder="Choose" value={draft.garmentTypeId} onChange={(e) => chooseGarment(e.target.value)} options={garments.filter((g) => g.isActive || String(g.id) === draft.garmentTypeId).map((g) => ({ value: String(g.id), label: g.name }))} />
  )
  const nameInput = <Input label="Name printed on bill" className="col-span-2" value={draft.description} onChange={(e) => onChange({ description: e.target.value })} placeholder={garment?.name} />
  const tailorSelect = (
    <Select
      label="Tailor"
      placeholder="Decide later"
      value={draft.tailorId}
      onChange={(e) => onChange({ tailorId: e.target.value, labourRate: String(Number(labourFor(tailors, garments, e.target.value, draft.garmentTypeId))) })}
      options={[{ value: '', label: 'Decide later' }, ...tailors.map((t) => ({ value: String(t.id), label: `${t.name}${t.payType === 'SALARY' ? ' (salaried)' : ''}` }))]}
    />
  )
  // Filled from the tailor's own rate (else the garment's usual pay) when the tailor is chosen — can be changed here.
  const tailor = tailors.find((t) => String(t.id) === draft.tailorId)
  const pay = (Number(draft.qty) || 0) * (Number(draft.labourRate) || 0)
  const labourHint = tailor ? `${tailor.name} gets ${formatINR(pay)} when the job is Ready — not on the bill` : 'Our cost — not on the bill'
  const labourInput = <Input label="Tailor pay / piece ₹" type="number" inputMode="decimal" min={0} value={draft.labourRate} onChange={(e) => onChange({ labourRate: e.target.value })} hint={labourHint} />
  const piecesInput = <Input label="Pieces" type="number" inputMode="numeric" min={1} step={1} value={draft.qty} onChange={(e) => onChange({ qty: e.target.value })} />
  const priceInput = <Input label="Price / piece ₹" type="number" inputMode="decimal" min={0} value={draft.chargeRate} onChange={(e) => onChange({ chargeRate: e.target.value })} />
  const showMeasures = garment && (simple || open)

  return (
    <div className={cn('@container rounded-card border p-4', error ? 'border-danger' : 'border-line')}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-medium text-ink">{index + 1}. {garment ? garment.name : 'Garment'}{draft.ownFabric && <span className="ml-2 text-xs font-normal text-muted">{ownFabricLabel.toLowerCase()}</span>}</p>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink">{formatINR(lineTotal)}</span>
          {onRemove && (
            <button type="button" onClick={onRemove} aria-label={`Remove garment ${index + 1}`} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-danger">
              <IconX size={16} />
            </button>
          )}
        </div>
      </div>

      {simple ? (
        <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
          {!garment && garmentSelect}
          {piecesInput}
          {priceInput}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
          {garmentSelect}
          {piecesInput}
          {priceInput}
          {nameInput}
          {extra}
          {tailorSelect}
          {labourInput}
        </div>
      )}

      {garment && !simple && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand">
          <IconChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} /> Measurements & design ({filled} filled)
        </button>
      )}
      {showMeasures && (
        <div className="mt-4 flex flex-col gap-3">
          {fields.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">
                Measurements <span className="font-normal text-muted">({filled} of {fields.length} filled)</span>
                {fromLastTime && <span className="ml-2 rounded-full bg-success-tint px-2 py-0.5 text-xs font-normal text-success">From last time</span>}
              </p>
              <div className="grid grid-cols-3 items-end gap-2 @md:grid-cols-4 @2xl:grid-cols-6">
                {fields.map((f) => (
                  <Input key={f} label={f} inputMode="decimal" maxLength={20} value={draft.measurements[f] ?? ''} onChange={(e) => onChange({ measurements: { ...draft.measurements, [f]: e.target.value } })} />
                ))}
              </div>
            </div>
          )}
          {showMeasuredBy && (
            <Select label="Measured by (optional)" className="max-w-xs" value={draft.measuredById ?? ''} onChange={(e) => onChange({ measuredById: e.target.value })}
              options={[{ value: '', label: 'Not recorded' }, ...(staff.data ?? []).map((s) => ({ value: String(s.id), label: `${s.name}${s.role ? ` · ${s.role}` : ''}` }))]} />
          )}
          <Textarea label="How to stitch (design)" rows={2} value={draft.instructions} onChange={(e) => onChange({ instructions: e.target.value })} placeholder="Boat neck, puff sleeve, lining inside…" />
          <Switch label={ownFabricLabel} checked={draft.ownFabric} onChange={(v) => onChange({ ownFabric: v })} />
        </div>
      )}

      {simple && garment && (
        <>
          <button type="button" onClick={() => setMore((m) => !m)} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand">
            <IconChevronDown size={16} className={cn('transition-transform', more && 'rotate-180')} /> More (change garment, name on bill)
          </button>
          {more && <div className="mt-3 grid grid-cols-2 gap-3 @2xl:grid-cols-4">{garmentSelect}{nameInput}</div>}
        </>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  )
}
