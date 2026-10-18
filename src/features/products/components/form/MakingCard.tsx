import { Card } from '@/components/ui/Card'
import { controlClass } from '@/components/ui/controlClass'
import { Input } from '@/components/ui/Input'
import { qtyText, todayISO } from '@/features/inventory/constants'
import { ProductionCostsCard } from '@/features/production/components/ProductionCostsCard'
import { ProductionLinesCard } from '@/features/production/components/ProductionLinesCard'
import { calcProduction } from '@/features/production/productionDrafts'
import { tailorApi } from '@/features/workshop/api/workshop.api'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { comboKey, makingPieces, type MakingState } from '../../form/making'
import type { VariantRow } from '../../form/productForm'
import type { Option } from '../../types'

type Props = {
  making: MakingState
  onChange: (m: MakingState) => void
  rows: VariantRow[]
  sizes: Option[]
  colours: Option[]
  unit?: Option
  isEdit: boolean
}

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className={cn('flex justify-between gap-3 text-sm', strong ? 'border-t border-line pt-2 font-semibold text-ink' : 'text-ink-soft')}>
    <span>{label}</span><span>{value}</span>
  </div>
)

// Own-made product: pieces made now (per size / colour), materials used from stock, making costs.
// Left empty → the product is only saved. Filled → saved together as one making entry.
export function MakingCard({ making, onChange, rows, sizes, colours, unit, isEdit }: Props) {
  const tailors = useApiQuery('tailor-options', () => tailorApi.options())
  const set = (patch: Partial<MakingState>) => onChange({ ...making, ...patch })
  const c = calcProduction(makingPieces(making, rows), making.materials, making.costs)
  const name = (r: VariantRow) => [sizes.find((s) => s.id === r.sizeId)?.name, colours.find((x) => x.id === r.colourId)?.name].filter(Boolean).join(' · ') || 'Pieces made'
  const code = unit?.code ?? 'pcs'

  return (
    <>
      <Card title={isEdit ? 'Made in the shop — add new pieces' : 'Made in the shop'}>
        <p className="mb-4 text-sm text-muted">
          Made here from our own materials? Enter the pieces made and the fabric / materials used — the materials come out of stock, the pieces go in at their real cost.
          {isEdit ? ' Every time more are made, add them here.' : ' Not made yet? Leave this empty and add it later from this page.'}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rows.map((r) => (
              <label key={comboKey(r)} className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{name(r)}</span>
                  {r.stockQty !== undefined && <span className="block text-xs text-muted">In stock {qtyText(r.stockQty, code)}</span>}
                </span>
                <span className="flex items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={unit?.allowDecimal ? 'any' : 1}
                    placeholder="0"
                    aria-label={r.sizeId || r.colourId ? `${name(r)} pieces made` : 'Pieces made'}
                    value={making.pieces[comboKey(r)] ?? ''}
                    onChange={(e) => set({ pieces: { ...making.pieces, [comboKey(r)]: e.target.value } })}
                    className={cn(controlClass(), 'h-9 w-20! shrink-0 text-right')}
                  />
                  <span className="w-7 text-xs text-muted">{code}</span>
                </span>
              </label>
            ))}
          </div>
          <Input label="Made on" type="date" max={todayISO()} value={making.docDate} onChange={(e) => set({ docDate: e.target.value })} />
        </div>
      </Card>

      <ProductionLinesCard kind="material" lines={making.materials} onChange={(materials) => set({ materials })} otherIds={rows.map((r) => r.id ?? 0).filter(Boolean)} />
      <ProductionCostsCard costs={making.costs} onChange={(costs) => set({ costs })} tailors={tailors.data ?? []} pieces={c.pieces} />

      {c.pieces > 0 && (
        <Card title="Cost of these pieces">
          <div className="flex flex-col gap-1.5 sm:max-w-sm">
            <Row label="Materials from stock" value={formatINR(c.material)} />
            <Row label="Tailor (per piece)" value={formatINR(c.labour)} />
            <Row label="Paid out" value={formatINR(c.paid)} />
            <Row label={`Total for ${c.pieces} ${code}`} value={formatINR(c.stockCost)} strong />
            <Row label="Cost per piece" value={formatINR(c.perPiece)} strong />
            {c.salaried > 0 && <Row label="Full cost per piece (with salaried time)" value={formatINR(c.fullPerPiece)} />}
          </div>
          <p className="mt-3 text-xs text-muted">Use this to fix the selling price above.</p>
        </Card>
      )}
    </>
  )
}
