import { Badge } from '@/components/ui/Badge'
import type { Column } from '@/components/ui/DataTable'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import type { ClothRow, PendingRow, ProfitRow, SummaryRow } from '../moneyTypes'

// Columns of the brand reports (Brand orders → Reports).

const qty = (n: number, unit: string) => `${Math.round(n * 1000) / 1000} ${unit}`

export const summaryCols: Column<SummaryRow>[] = [
  { key: 'name', header: 'Brand', mobile: 'title', render: (r) => <span className="font-medium">{r.name}<span className="block text-xs font-normal text-muted">{r.code}</span></span> },
  { key: 'orders', header: 'Orders', align: 'right', mobile: 'subtitle', render: (r) => `${r.orders} order${r.orders === 1 ? '' : 's'}` },
  { key: 'pieces', header: 'Pieces ordered / delivered', align: 'right', render: (r) => `${r.piecesOrdered} / ${r.piecesDelivered}` },
  { key: 'billed', header: 'Billed', align: 'right', render: (r) => formatINR(r.billed) },
  { key: 'income', header: 'Income (before GST)', align: 'right', mobile: 'hidden', render: (r) => formatINR(r.income) },
  { key: 'received', header: 'Received', align: 'right', render: (r) => <span className="text-success">{formatINR(r.received)}</span> },
  { key: 'pending', header: 'Pending today', align: 'right', mobile: 'badge', render: (r) => <span className={cn('font-semibold', r.pending > 0.004 ? 'text-warn' : 'text-success')}>{formatINR(r.pending)}</span> },
]

export const pendingCols: Column<PendingRow>[] = [
  { key: 'order', header: 'Order', mobile: 'title', render: (r) => <span className="font-medium text-brand">{r.docNo}<span className="block text-xs font-normal text-muted">{r.brand}{r.theirOrderNo ? ` · ${r.theirOrderNo}` : ''}</span></span> },
  { key: 'due', header: 'Due', mobile: 'subtitle', render: (r) => <span className={cn(r.late && 'font-medium text-danger')}>{formatDate(r.due)}{r.late ? ' · late' : ''}</span> },
  { key: 'piece', header: 'Piece', mobile: 'subtitle', render: (r) => `${r.qty} × ${r.piece}${r.endCustomer ? ` · ${r.endCustomer}` : ''}` },
  { key: 'tailor', header: 'Tailor', mobile: 'hidden', render: (r) => r.tailor ?? <span className="text-warn">not given</span> },
  { key: 'value', header: 'Value', align: 'right', mobile: 'hidden', render: (r) => formatINR(r.value) },
  { key: 'stage', header: 'Stage', mobile: 'badge', render: (r) => <Badge tone={r.stage === 'READY' ? 'success' : r.late ? 'danger' : 'pending'}>{r.stage === 'READY' ? 'Ready' : 'In work'}</Badge> },
]

export const profitCols: Column<ProfitRow>[] = [
  { key: 'order', header: 'Order', mobile: 'title', render: (r) => <span className="font-medium text-brand">{r.docNo}<span className="block text-xs font-normal text-muted">{r.brand} · {formatDate(r.docDate)}</span></span> },
  { key: 'pieces', header: 'Delivered', align: 'right', mobile: 'subtitle', render: (r) => `${r.delivered} of ${r.pieces} pcs` },
  { key: 'billed', header: 'Billed (before GST)', align: 'right', render: (r) => formatINR(r.billed) },
  { key: 'cloth', header: 'Our cloth', align: 'right', render: (r) => formatINR(r.ourCloth) },
  { key: 'pay', header: 'Tailor pay', align: 'right', render: (r) => formatINR(r.tailorPay) },
  { key: 'profit', header: 'Profit', align: 'right', mobile: 'badge', render: (r) => <span className={cn('font-semibold', r.profit < 0 ? 'text-danger' : 'text-success')}>{formatINR(r.profit)}</span> },
]

export const clothCols: Column<ClothRow>[] = [
  { key: 'order', header: 'Order', mobile: 'title', render: (r) => <span className="font-medium text-brand">{r.docNo}<span className="block text-xs font-normal text-muted">{r.brand}</span></span> },
  { key: 'cloth', header: 'Cloth', mobile: 'subtitle', render: (r) => r.description },
  { key: 'received', header: 'Received', align: 'right', render: (r) => qty(r.received, r.unit) },
  { key: 'used', header: 'Used', align: 'right', render: (r) => qty(r.used, r.unit) },
  { key: 'returned', header: 'Given back', align: 'right', mobile: 'hidden', render: (r) => qty(r.returned, r.unit) },
  { key: 'left', header: 'Left with us', align: 'right', mobile: 'badge', render: (r) => <span className={cn('font-semibold', r.left < 0 ? 'text-danger' : r.left > 0 ? 'text-warn' : 'text-success')}>{qty(r.left, r.unit)}</span> },
]
