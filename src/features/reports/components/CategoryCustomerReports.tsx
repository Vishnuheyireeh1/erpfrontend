import { useNavigate } from 'react-router-dom'
import { Card, StatCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/Feedback'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { reportsApi } from '../api/reports.api'
import { useReportRange } from '../reportUtils'
import type { CategorySales, CustomerSales } from '../types'
import { ReportToolbar } from './ReportToolbar'

const catColumns: Column<CategorySales & { share: number }>[] = [
  { key: 'category', header: 'Category', mobile: 'title', render: (c) => <span className="font-medium text-ink">{c.category}</span> },
  { key: 'qty', header: 'Qty sold', align: 'right', render: (c) => c.qty },
  { key: 'amount', header: 'Sales', align: 'right', mobile: 'badge', render: (c) => <span className="font-semibold text-ink">{formatINR(c.amount)}</span> },
  { key: 'share', header: 'Share', align: 'right', mobile: 'subtitle', render: (c) => `${c.share}% of goods` },
  { key: 'profit', header: 'Profit', align: 'right', render: (c) => <span className={c.profit < 0 ? 'text-danger' : 'text-success'}>{formatINR(c.profit)}</span> },
]

// Reports → "By category": which kind of goods sells (after returns), plus stitching charges.
export function SalesByCategoryView() {
  const { range, setRange, from, to } = useReportRange()
  const q = useApiQuery(['by-category', from, to], () => reportsApi.byCategory({ from, to }))
  const r = q.data ?? q.lastData
  const rows = (r?.items ?? []).map((c) => ({ ...c, share: r && r.goods ? Math.round((c.amount / r.goods) * 1000) / 10 : 0 }))
  return (
    <>
      <ReportToolbar range={range} onRange={setRange} exportPath="/reports/analysis/by-category/export" params={{ from, to }} />
      {r && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Goods sold" value={formatINR(r.goods)} note={`${r.items.length} categories`} />
          <StatCard label="Stitching charges" value={formatINR(r.stitching.amount)} note={`${r.stitching.jobs} jobs`} />
          <StatCard label="Total" value={formatINR(r.total)} />
        </div>
      )}
      <Card bodyClassName="p-0">
        {q.error ? <EmptyState title="Couldn't load" description={q.error} /> : <DataTable columns={catColumns} rows={rows} rowKey={(c) => c.category} loading={q.loading && !r} emptyTitle="No goods sold in these dates" />}
      </Card>
      <p className="mt-2 text-xs text-muted">Counter bills + items sold on job bills, after returns, GST included. Profit = sale before GST − stock cost.</p>
    </>
  )
}

// Reports → "By customer": who buys the most, how often, last visit. Cash sales are one row.
export function SalesByCustomerView() {
  const navigate = useNavigate()
  const { range, setRange, from, to } = useReportRange()
  const q = useApiQuery(['by-customer', from, to], () => reportsApi.byCustomer({ from, to }))
  const r = q.data ?? q.lastData
  const columns: Column<CustomerSales>[] = [
    { key: 'name', header: 'Customer', mobile: 'title', render: (c) => <span className="block min-w-0"><span className="block font-medium text-ink">{c.name}</span>{c.phone && <span className="block text-xs text-muted">{c.phone}</span>}</span> },
    { key: 'bills', header: 'Counter bills', align: 'right', mobile: 'hidden', render: (c) => formatINR(c.bills) },
    { key: 'jobs', header: 'Job bills', align: 'right', mobile: 'hidden', render: (c) => formatINR(c.jobs) },
    { key: 'returns', header: 'Returns', align: 'right', mobile: 'hidden', render: (c) => (c.returns ? <span className="text-danger">− {formatINR(c.returns)}</span> : '—') },
    { key: 'total', header: 'Total', align: 'right', mobile: 'badge', render: (c) => <span className="font-semibold text-ink">{formatINR(c.total)}</span> },
    { key: 'visits', header: 'Visits', align: 'right', mobile: 'subtitle', render: (c) => `${c.visits} visit${c.visits === 1 ? '' : 's'} · last ${formatDate(c.lastVisit)}` },
  ]
  return (
    <>
      <ReportToolbar range={range} onRange={setRange} exportPath="/reports/analysis/by-customer/export" params={{ from, to }} />
      {r && <p className="mb-3 text-sm text-muted">{r.customers} customers · total <b className="text-ink">{formatINR(r.total)}</b></p>}
      <Card bodyClassName="p-0">
        {q.error ? <EmptyState title="Couldn't load" description={q.error} /> : (
          <DataTable columns={columns} rows={r?.items ?? []} rowKey={(c) => c.customerId ?? 0} loading={q.loading && !r} emptyTitle="No sales in these dates" onRowClick={(c) => c.customerId && navigate(`/customers/${c.customerId}`)} />
        )}
      </Card>
    </>
  )
}
