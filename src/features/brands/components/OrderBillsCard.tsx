import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatDate, formatINR } from '@/lib/format'
import type { BrandOrder } from '../types'

// Delivery bills made for this order (each delivery = one bill).
export function OrderBillsCard({ order }: { order: BrandOrder }) {
  if (!order.bills.length) return null
  const billed = order.bills.filter((b) => b.status === 'POSTED').reduce((s, b) => s + Number(b.grandTotal), 0)
  return (
    <Card title={`Delivery bills (${order.bills.length})`} actions={<span className="text-sm font-semibold">{formatINR(billed)}</span>} className="mb-5">
      <ul className="flex flex-col divide-y divide-line text-sm">
        {order.bills.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>
              <Link to={`/brand-bills/${b.id}`} className="font-medium text-brand hover:underline">{b.docNo}</Link>
              <span className="text-ink-soft"> · {formatDate(b.docDate)} · {Number(b.gstRate) ? `${Number(b.gstRate)}% GST` : 'No GST'}</span>
            </span>
            <span className="flex items-center gap-2">
              {b.status === 'CANCELLED' && <Badge>Cancelled</Badge>}
              <span className={b.status === 'CANCELLED' ? 'text-muted line-through' : 'font-medium'}>{formatINR(Number(b.grandTotal))}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
