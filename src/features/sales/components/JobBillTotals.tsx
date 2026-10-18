import { formatINR } from '@/lib/format'

type Props = { items: number; stitching: number; discount: number; gst: number; gstRate: number; roundOff: number; total: number }

const Row = ({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) => (
  <div className={strong ? 'flex justify-between border-t border-line pt-2 text-lg font-semibold text-ink' : 'flex justify-between text-sm'}>
    <span className={strong ? '' : 'text-muted'}>{label}</span>
    <span className={tone}>{value}</span>
  </div>
)

// Billing page with stitching: items (paid now) + stitching (advance now, balance on delivery) = one job bill.
export function JobBillTotals({ items, stitching, discount, gst, gstRate, roundOff, total }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <Row label="Items (pay now)" value={formatINR(items)} />
      <Row label="Stitching" value={formatINR(stitching)} />
      {discount > 0.004 && <Row label="Discount on stitching" value={`− ${formatINR(discount)}`} tone="text-success" />}
      {gstRate > 0 && <Row label={`GST ${gstRate}% on stitching (included)`} value={formatINR(gst)} />}
      {roundOff !== 0 && <Row label="Round off" value={`${roundOff > 0 ? '+' : '−'} ₹${Math.abs(roundOff).toFixed(2)}`} />}
      <Row label="Job bill total" value={formatINR(total)} strong />
    </div>
  )
}
