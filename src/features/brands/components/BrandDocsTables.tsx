import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { paymentModeLabels } from '@/features/purchase/api/purchase.api'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { brandMoneyApi } from '../api/brandMoney.api'
import type { BrandBillSummary, BrandPayment } from '../moneyTypes'

type Props = { brandId?: number; version: number; onChanged?: () => void }

const billCols: Column<BrandBillSummary>[] = [
  { key: 'doc', header: 'Bill', mobile: 'title', render: (b) => <span className="font-medium text-brand">{b.docNo}</span> },
  { key: 'date', header: 'Date', mobile: 'subtitle', render: (b) => formatDate(b.docDate) },
  { key: 'brand', header: 'Brand', mobile: 'subtitle', render: (b) => b.brandName },
  { key: 'order', header: 'Order', mobile: 'hidden', render: (b) => b.order.docNo },
  { key: 'gst', header: 'GST', mobile: 'hidden', render: (b) => (Number(b.gstRate) ? `${Number(b.gstRate)}%` : 'No GST') },
  { key: 'total', header: 'Total', align: 'right', render: (b) => formatINR(Number(b.grandTotal)) },
  {
    key: 'due', header: 'Status', mobile: 'badge',
    render: (b) => (b.status === 'CANCELLED' ? <Badge>Cancelled</Badge> : b.dueAmount > 0.004 ? <Badge tone={b.dueAmount < Number(b.grandTotal) ? 'pending' : 'warn'}>{formatINR(b.dueAmount)} due</Badge> : <Badge tone="success">Paid</Badge>),
  },
]

// Delivery bills (all brands or one), with what is still due on each.
export function BrandBillsTable({ brandId, version }: Props) {
  const navigate = useNavigate()
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' })
  const p = { brandId, from: range.from || undefined, to: range.to || undefined }
  const q = useApiQuery(['brand-bills', p, version], () => brandMoneyApi.bills(p))
  if (q.error) return <EmptyState title="Couldn't load bills" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <DateRange value={range} onChange={setRange} />
        <ExportButton path="/brand-bills/export" params={p} />
      </div>
      <DataTable columns={billCols} rows={q.data ?? []} rowKey={(b) => b.id} loading={q.loading} emptyTitle="No delivery bills" emptyDescription="Bills are made from a brand order → Deliver & bill." onRowClick={(b) => navigate(`/brand-bills/${b.id}`)} />
    </>
  )
}

// Money received from brands; a wrong entry can be cancelled (with a reason).
export function BrandPaymentsTable({ brandId, version, onChanged }: Props) {
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' })
  const [cancel, setCancel] = useState<BrandPayment | null>(null)
  const p = { brandId, from: range.from || undefined, to: range.to || undefined }
  const q = useApiQuery(['brand-payments', p, version], () => brandMoneyApi.payments(p))
  const cols: Column<BrandPayment>[] = [
    { key: 'doc', header: 'No.', mobile: 'title', render: (x) => <span className="font-medium">{x.docNo}</span> },
    { key: 'date', header: 'Date', mobile: 'subtitle', render: (x) => formatDate(x.docDate) },
    { key: 'brand', header: 'Brand', mobile: 'subtitle', render: (x) => x.brand.name },
    { key: 'mode', header: 'How', mobile: 'hidden', render: (x) => `${paymentModeLabels[x.mode]}${x.reference ? ` · ${x.reference}` : ''}` },
    { key: 'amount', header: 'Amount', align: 'right', mobile: 'badge', render: (x) => (x.status === 'CANCELLED' ? <span className="text-muted line-through">{formatINR(Number(x.amount))}</span> : <span className="font-medium text-success">{formatINR(Number(x.amount))}</span>) },
    { key: 'act', header: '', mobile: 'hidden', render: (x) => (x.status === 'POSTED' ? <button type="button" onClick={(e) => { e.stopPropagation(); setCancel(x) }} className="text-sm text-muted hover:text-danger">Cancel</button> : <Badge>Cancelled</Badge>) },
  ]
  if (q.error) return <EmptyState title="Couldn't load payments" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <DateRange value={range} onChange={setRange} />
        <ExportButton path="/brand-payments/export" params={p} />
      </div>
      <DataTable columns={cols} rows={q.data ?? []} rowKey={(x) => x.id} loading={q.loading} emptyTitle="No money received yet" />
      {cancel && (
        <CancelDocModal docNo={cancel.docNo} effect="The brand will owe this amount again." onCancel={(reason) => brandMoneyApi.cancelPayment(cancel.id, reason)}
          onClose={() => setCancel(null)} onDone={() => { setCancel(null); q.reload(); onChanged?.() }} />
      )}
    </>
  )
}
