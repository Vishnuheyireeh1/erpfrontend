import { itemTitle } from '@/features/inventory/constants'
import { productAmount } from '@/features/jobs/jobDrafts'
import type { GarmentType } from '@/features/workshop/types'
import { formatINR } from '@/lib/format'
import { pieceAmount, type PieceDraft } from '../orderDrafts'

type Props = { brandName: string; theirOrderNo: string; expectedDate: string; pieces: PieceDraft[]; garments: GarmentType[] }

const num = (v: string | undefined) => Number(v) || 0
const Line = ({ label, value }: { label: string; value: number }) => (
  <div className="flex justify-between gap-3 text-ink-soft"><span className="min-w-0">{label}</span><span className="shrink-0 text-ink">{formatINR(value)}</span></div>
)

// Above the Save button on the brand order form: each piece's stitching fee, the items it buys, and the total.
export function BrandOrderSummary({ brandName, theirOrderNo, expectedDate, pieces, garments }: Props) {
  const total = pieces.reduce((s, d) => s + pieceAmount(d), 0)
  return (
    <div className="w-full max-w-lg text-sm">
      <p className="font-semibold text-ink">Order summary</p>
      <p className="mb-2 text-xs text-muted">{brandName || 'No brand chosen'}{theirOrderNo.trim() ? ` · Order no. ${theirOrderNo.trim()}` : ''}{expectedDate ? ` · Due ${new Date(expectedDate).toLocaleDateString('en-IN')}` : ''}</p>
      <div className="flex flex-col gap-2">
        {pieces.map((d) => {
          const garment = garments.find((g) => String(g.id) === d.garmentTypeId)?.name ?? 'Garment'
          return (
            <div key={d.key} className="flex flex-col gap-0.5">
              <Line label={`Stitching fee — ${garment}${d.endCustomer.trim() ? ` (${d.endCustomer.trim()})` : ''} · ${num(d.qty)} × ${formatINR(num(d.chargeRate))}`} value={num(d.qty) * num(d.chargeRate)} />
              {d.materials.filter((m) => !m.included).map((m) => (
                <Line key={m.key} label={`${itemTitle(m.item)} · ${num(m.qty)} ${m.item.product.unit.code} × ${formatINR(num(m.rate))}${num(m.discountPct) ? ` − ${num(m.discountPct)}%` : ''}`} value={productAmount(m)} />
              ))}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between gap-3 border-t border-line pt-1.5 text-base font-semibold text-ink"><span>Total</span><span>{formatINR(total)}</span></div>
    </div>
  )
}
