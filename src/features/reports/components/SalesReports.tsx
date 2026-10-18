import { useNavigate } from 'react-router-dom'
import { Card, StatCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/Feedback'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { reportsApi } from '../api/reports.api'
import { useReportRange } from '../reportUtils'
import type { DaySales, ItemSold } from '../types'
import { ReportToolbar } from './ReportToolbar'

const dayColumns: Column<DaySales>[] = [
  { key: 'date', header: 'Date', mobile: 'title', render: (d) => <span className="font-medium text-ink">{formatDate(d.date)}</span> },
  { key: 'bills', header: 'Counter sales', align: 'right', render: (d) => `${formatINR(d.bills)}${d.billCount ? ` · ${d.billCount}` : ''}` },
  { key: 'jobs', header: 'Job bills', align: 'right', render: (d) => `${formatINR(d.jobs)}${d.jobCount ? ` · ${d.jobCount}` : ''}` },
  { key: 'returns', header: 'Returns', align: 'right', render: (d) => (d.returns ? <span className="text-danger">− {formatINR(d.returns)}</span> : '—') },
  { key: 'net', header: 'Net sales', align: 'right', mobile: 'badge', render: (d) => <span className="font-semibold text-ink">{formatINR(d.net)}</span> },
]

// Reports → "Sales by day": counter bills + stitching job bills − returns, per day (GST included).
export function SalesByDayView() {
  const { range, setRange, from, to } = useReportRange()
  const q = useApiQuery(['sales-by-day', from, to], () => reportsApi.salesByDay({ from, to }))
  const r = q.data ?? q.lastData
  const days = (r?.days ?? []).filter((d) => d.billCount || d.jobCount || d.returns).reverse()
  const active = days.length || 1

  return (
    <>
      <ReportToolbar range={range} onRange={setRange} exportPath="/reports/sales/by-day/export" params={{ from, to }} />
      {r && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Net sales" value={formatINR(r.total.net)} note={`Avg ${formatINR(r.total.net / active)} per selling day`} />
          <StatCard label="Counter sales" value={formatINR(r.total.bills)} note={`${r.total.billCount} bills`} />
          <StatCard label="Job bills" value={formatINR(r.total.jobs)} note={`${r.total.jobCount} jobs booked`} />
          <StatCard label="Returns" value={formatINR(r.total.returns)} noteTone={r.total.returns ? 'warn' : 'muted'} note="Taken off sales" />
        </div>
      )}
      <Card bodyClassName="p-0">
        {q.error ? <EmptyState title="Couldn't load" description={q.error} /> : (
          <DataTable columns={dayColumns} rows={days} rowKey={(d) => d.date} loading={q.loading && !r} emptyTitle="No sales in these dates" />
        )}
      </Card>
      <p className="mt-2 text-xs text-muted">Amounts as billed (GST included). Job bills count on the booking day.</p>
    </>
  )
}

// Reports → "Items sold": best sellers by sales value, with profit (before GST).
export function ItemsSoldView() {
  const navigate = useNavigate()
  const { range, setRange, from, to } = useReportRange()
  const q = useApiQuery(['items-sold', from, to], () => reportsApi.itemsSold({ from, to }))
  const items = (q.data ?? q.lastData)?.items ?? []
  const columns: Column<ItemSold>[] = [
    { key: 'name', header: 'Item', mobile: 'title', render: (i) => <span className="font-medium text-ink">{i.name}</span> },
    { key: 'qty', header: 'Qty sold', align: 'right', render: (i) => i.qty },
    { key: 'amount', header: 'Sales', align: 'right', mobile: 'badge', render: (i) => <span className="font-semibold text-ink">{formatINR(i.amount)}</span> },
    { key: 'profit', header: 'Profit', align: 'right', render: (i) => <span className={i.profit < 0 ? 'text-danger' : 'text-success'}>{formatINR(i.profit)}</span> },
  ]
  return (
    <>
      <ReportToolbar range={range} onRange={setRange} exportPath="/reports/sales/items/export" params={{ from, to }} />
      <Card bodyClassName="p-0">
        {q.error ? <EmptyState title="Couldn't load" description={q.error} /> : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(i) => i.productId}
            loading={q.loading && !items.length}
            emptyTitle="Nothing sold in these dates"
            onRowClick={(i) => navigate(`/products/${i.productId}`)}
          />
        )}
      </Card>
      <p className="mt-2 text-xs text-muted">Counter + items sold on job bills, after returns. Top 100 on screen — Excel has all. Profit = sale before GST − stock cost.</p>
    </>
  )
}
