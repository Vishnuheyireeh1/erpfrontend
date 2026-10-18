import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { tenderText } from '@/features/sales/status'
import { formatDate, formatINR } from '@/lib/format'
import type { Job } from '../types'

const money = (v: string | number) => formatINR(Number(v))
const Row = ({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) => (
  <div className={strong ? 'flex justify-between border-t border-line pt-2 text-base font-semibold' : 'flex justify-between text-sm'}>
    <span className={strong ? '' : 'text-muted'}>{label}</span>
    <span className={tone}>{value}</span>
  </div>
)

// Bill total, money received and job costing (cost vs charge = profit, SRS 8).
export function JobMoneyCard({ job }: { job: Job }) {
  const gst = Number(job.cgstTotal) + Number(job.sgstTotal) + Number(job.igstTotal)
  const c = job.cost
  return (
    <div className="flex flex-col gap-5">
      <Card title="Bill">
        <div className="flex flex-col gap-1.5">
          <Row label="Charges" value={money(job.chargeTotal)} />
          {Number(job.discount) > 0 && <Row label="Discount" value={`− ${money(job.discount)}`} tone="text-success" />}
          {Number(job.roundOff) !== 0 && <Row label="Round off" value={Number(job.roundOff).toFixed(2)} />}
          <Row label="Total" value={money(job.grandTotal)} strong />
          {gst > 0 && <p className="text-xs text-muted">Includes GST: taxable {money(job.taxableTotal)} + {money(gst)}</p>}
          <Row label="Received" value={money(job.paidAmount)} />
          {Number(job.returnedAmount) > 0 && <Row label="Items returned" value={money(job.returnedAmount)} />}
          {job.status !== 'CANCELLED' && <Row label="Balance" value={formatINR(job.dueAmount)} tone={job.dueAmount > 0 ? 'font-medium text-warn' : 'text-success'} />}
        </div>
        {(job.allocations.length > 0 || job.creditAllocations.length > 0) && (
          <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-3 text-sm">
            {job.allocations.map((a) => (
              <li key={a.id} className="flex justify-between gap-3">
                <Link to={`/sales/receipts/${a.receipt.id}`} className="text-brand hover:underline">{a.receipt.docNo}</Link>
                <span className="truncate text-ink-soft">{formatDate(a.receipt.docDate)} · {tenderText(a.receipt)}</span>
                <span className="font-medium">{money(a.amount)}</span>
              </li>
            ))}
            {job.creditAllocations.map((a) => (
              <li key={`c${a.id}`} className="flex justify-between gap-3">
                <Link to={`/sales/returns/${a.return.id}`} className="text-brand hover:underline">{a.return.docNo}</Link>
                <span className="text-ink-soft">Return credit</span>
                <span className="font-medium">{money(a.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Job costing (stitching only)">
        <div className="flex flex-col gap-1.5">
          <Row label={`Stitching charged${Number(job.discount) > 0 ? ' (after discount)' : ''}`} value={formatINR(c.charged)} />
          <Row label="Tailor pay" value={`− ${formatINR(c.labourCost)}`} />
          <Row label="Other work (cutting, embroidery…)" value={`− ${formatINR(c.otherCost)}`} />
          {c.materialCost > 0 && <Row label="Cloth given free (stock cost)" value={`− ${formatINR(c.materialCost)}`} />}
          <Row label="Job profit" value={formatINR(c.profit)} strong tone={c.profit >= 0 ? 'text-success' : 'text-danger'} />
          {c.chargedGst > 0 && <p className="text-xs text-muted">Stitching charged is before GST ({formatINR(c.chargedGst)} GST).</p>}
          {c.sold.taxable > 0 && (
            <p className="mt-2 border-t border-line pt-2 text-xs text-muted">
              Items sold on this bill (shop sale, not in the job profit): sold {formatINR(c.sold.taxable)} before GST · cost {formatINR(c.sold.cost)} · profit <span className={c.sold.profit >= 0 ? 'text-success' : 'text-danger'}>{formatINR(c.sold.profit)}</span>
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
