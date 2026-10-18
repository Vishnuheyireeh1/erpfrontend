import { formatINR } from '@/lib/format'
import type { calcBill } from '../calc'

type Totals = ReturnType<typeof calcBill>

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between border-t border-line pt-2 text-base font-semibold text-ink' : 'flex justify-between text-sm'}>
      <span className={strong ? '' : 'text-muted'}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

// Items → bill discount → taxable → GST (items + charges) → charges → round-off → total, like the supplier's bill.
export function BillTotals({ totals, taxMode }: { totals: Totals; taxMode: 'INTRA' | 'INTER' }) {
  return (
    <div className="flex flex-col gap-1.5">
      {totals.discount > 0 && (
        <>
          <Row label="Items" value={fmt(totals.items)} />
          <Row label="Cash / bill discount" value={`− ${fmt(totals.discount)}`} />
        </>
      )}
      <Row label="Taxable value" value={fmt(totals.taxable)} />
      {taxMode === 'INTRA' ? (
        <>
          <Row label="CGST" value={fmt(totals.cgst)} />
          <Row label="SGST" value={fmt(totals.sgst)} />
        </>
      ) : (
        <Row label="IGST" value={fmt(totals.igst)} />
      )}
      {totals.other > 0 && <Row label={`Packing / other charges${totals.chargesTax > 0 ? ' (GST in total above)' : ''}`} value={fmt(totals.other)} />}
      {totals.roundOff !== 0 && <Row label="Round off" value={`${totals.roundOff > 0 ? '+' : '−'}₹${Math.abs(totals.roundOff).toFixed(2)}`} />}
      <Row label="Bill total" value={formatINR(totals.grand)} strong />
      {totals.freight > 0 && <p className="text-xs text-muted">+ Freight {fmt(totals.freight)} paid to the transporter — added to the items' cost, not to this supplier's bill.</p>}
    </div>
  )
}
