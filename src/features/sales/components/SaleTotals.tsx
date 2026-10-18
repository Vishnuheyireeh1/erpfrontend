import { formatINR } from '@/lib/format'
import type { calcSale } from '../calc'

type Totals = ReturnType<typeof calcSale>

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className={strong ? 'flex justify-between border-t border-line pt-2 text-lg font-semibold text-ink' : 'flex justify-between text-sm'}>
      <span className={strong ? '' : 'text-muted'}>{label}</span>
      <span className={tone}>{value}</span>
    </div>
  )
}

type Props = { totals: Totals; taxMode: 'INTRA' | 'INTER'; gstRegistered: boolean }

// Prices include GST: items → discount → total; the GST inside is shown for information.
export function SaleTotals({ totals, taxMode, gstRegistered }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <Row label="Items" value={fmt(totals.grossTotal)} />
      {totals.discountTotal > 0.004 && <Row label="Discount" value={`− ${fmt(totals.discountTotal)}`} tone="text-success" />}
      {totals.roundOff !== 0 && <Row label="Round off" value={`${totals.roundOff > 0 ? '+' : '−'} ₹${Math.abs(totals.roundOff).toFixed(2)}`} />}
      <Row label="Bill total" value={formatINR(totals.grandTotal)} strong />
      {gstRegistered && totals.grandTotal > 0 && (
        <p className="mt-1 text-xs text-muted">
          Includes GST: taxable {fmt(totals.taxableTotal)} ·{' '}
          {taxMode === 'INTRA' ? `CGST ${fmt(totals.cgstTotal)} · SGST ${fmt(totals.sgstTotal)}` : `IGST ${fmt(totals.igstTotal)}`}
        </p>
      )}
    </div>
  )
}
