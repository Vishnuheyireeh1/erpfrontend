import { IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, StatCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { todayISO } from '@/features/inventory/constants'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { reportsApi } from '../api/reports.api'
import type { Owes, StockRow } from '../types'

const owesColumns: Column<Owes>[] = [
  { key: 'name', header: 'Customer', mobile: 'title', render: (o) => <span className="block min-w-0"><span className="block font-medium text-ink">{o.name}</span><span className="block text-xs text-muted">{o.code}{o.phone ? ` · ${o.phone}` : ''}</span></span> },
  { key: 'd0', header: 'Up to 30 days', align: 'right', mobile: 'hidden', render: (o) => (o.upTo30 ? formatINR(o.upTo30) : '—') },
  { key: 'd30', header: '31–60', align: 'right', mobile: 'hidden', render: (o) => (o.d31to60 ? formatINR(o.d31to60) : '—') },
  { key: 'd60', header: '61–90', align: 'right', mobile: 'hidden', render: (o) => (o.d61to90 ? <span className="text-warn">{formatINR(o.d61to90)}</span> : '—') },
  { key: 'd90', header: 'Over 90', align: 'right', mobile: 'subtitle', render: (o) => (o.over90 ? <span className="font-medium text-danger">Over 90 days {formatINR(o.over90)}</span> : '') },
  { key: 'other', header: 'Old bal. / advance', align: 'right', mobile: 'hidden', render: (o) => (o.other ? formatINR(o.other) : '—') },
  { key: 'owed', header: 'Total owed', align: 'right', mobile: 'badge', render: (o) => <span className="font-semibold text-warn">{formatINR(o.owed)}</span> },
]

// Reports → "Who owes": customers' unpaid bills by age (old balance + advance included → same as their statement).
export function WhoOwesView() {
  const navigate = useNavigate()
  const q = useApiQuery('who-owes', () => reportsApi.whoOwes())
  const r = q.data ?? q.lastData
  return (
    <>
      <div className="mb-4 flex justify-end"><ExportButton path="/reports/analysis/who-owes/export" /></div>
      {r && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total owed" value={formatINR(r.total.owed)} note={`${r.items.length} customers`} noteTone={r.total.owed ? 'warn' : 'success'} />
          <StatCard label="Up to 30 days" value={formatINR(r.total.upTo30)} />
          <StatCard label="31–90 days" value={formatINR(r.total.d31to60 + r.total.d61to90)} noteTone="warn" note="Remind them" />
          <StatCard label="Over 90 days" value={formatINR(r.total.over90)} noteTone={r.total.over90 ? 'warn' : 'muted'} note="Follow up now" />
        </div>
      )}
      <Card bodyClassName="p-0">
        {q.error ? <EmptyState title="Couldn't load" description={q.error} /> : <DataTable columns={owesColumns} rows={r?.items ?? []} rowKey={(o) => o.customerId} loading={q.loading && !r} emptyTitle="Nobody owes the shop" emptyDescription="All bills and job balances are paid." onRowClick={(o) => navigate(`/customers/${o.customerId}`)} />}
      </Card>
      <p className="mt-2 text-xs text-muted">Age = days since the bill / job date. "Old balance / advance" = balance from before the ERP minus any unused advance. Total matches the customer's statement.</p>
    </>
  )
}

const stockColumns = (slow: boolean): Column<StockRow>[] => [
  { key: 'name', header: 'Item', mobile: 'title', render: (s) => <span className="block min-w-0"><span className="block font-medium text-ink">{s.name}</span><span className="block font-mono text-xs text-muted">{s.sku} · {s.category}</span></span> },
  { key: 'qty', header: 'Stock', align: 'right', mobile: 'subtitle', render: (s) => `${s.qty} ${s.unit}` },
  slow
    ? { key: 'idle', header: 'Last sold / used', align: 'right', render: (s) => (s.lastSold ? `${formatDate(s.lastSold)} · ${s.idleDays} days` : `Never sold · ${s.idleDays ?? '—'} days in stock`) }
    : { key: 'avg', header: 'Avg cost', align: 'right', mobile: 'hidden', render: (s) => formatINR(s.avgCost ?? 0) },
  { key: 'value', header: 'Value', align: 'right', mobile: 'badge', render: (s) => <span className="font-semibold text-ink">{formatINR(s.value)}</span> },
]

// Reports → "Stock value" (as on any date — e.g. 31 March for the accountant) and "Slow-moving" (money stuck on the shelf).
export function StockReportView({ slow }: { slow: boolean }) {
  const navigate = useNavigate()
  const [date, setDate] = useState(todayISO)
  const [days, setDays] = useState('90')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debounced = useDebounce(search.trim())
  const q = useApiQuery(['stock-report', slow, date, days, debounced, page], () =>
    slow ? reportsApi.slowMoving({ days: Number(days), search: debounced || undefined, page }) : reportsApi.stockOnDate({ date, search: debounced || undefined, page }),
  )
  const r = q.data ?? q.lastData
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[12rem_minmax(0,1fr)] md:w-[36rem]">
          {slow ? (
            <Select label="Not sold for" value={days} onChange={(e) => { setDays(e.target.value); setPage(1) }} options={['30', '60', '90', '180', '365'].map((d) => ({ value: d, label: `${d}+ days` }))} />
          ) : (
            <Input label="Stock on" type="date" max={todayISO()} value={date} onChange={(e) => { setDate(e.target.value || todayISO()); setPage(1) }} />
          )}
          <Input label="Search" icon={IconSearch} placeholder="Item, SKU or category" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <ExportButton path={slow ? '/reports/analysis/slow-moving/export' : '/reports/analysis/stock-on-date/export'} params={slow ? { days, search: debounced || undefined } : { date, search: debounced || undefined }} />
      </div>
      {r && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:w-[30rem]">
          <StatCard label={slow ? 'Items not moving' : 'Items in stock'} value={String(r.total)} />
          <StatCard label={slow ? 'Money stuck' : 'Stock value'} value={formatINR(r.value)} note={slow ? 'At stock cost' : `As on ${formatDate(date)}`} noteTone={slow && r.value ? 'warn' : 'muted'} />
        </div>
      )}
      <Card bodyClassName="p-0">
        {q.error ? <EmptyState title="Couldn't load" description={q.error} /> : (
          <>
            <DataTable startIndex={(page - 1) * 50 + 1} columns={stockColumns(slow)} rows={r?.items ?? []} rowKey={(s) => s.variantId} loading={q.loading && !r} emptyTitle={slow ? 'Every item in stock sold recently' : 'No stock on this date'} onRowClick={(s) => navigate(`/stock/items/${s.variantId}`)} />
            {(r?.total ?? 0) > 50 && <Pagination page={page} pageSize={50} total={r!.total} onPageChange={setPage} />}
          </>
        )}
      </Card>
      <p className="mt-2 text-xs text-muted">{slow ? 'Items with stock that were not sold, used on a job or used in production in this many days — think of a discount or stop buying them.' : 'Quantity on that date × the average cost on that date. Use 31 March for the year-end closing stock.'}</p>
    </>
  )
}
