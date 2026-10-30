import { IconPlus, IconSearch, IconUsers } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { salesApi } from '../api/sales.api'
import { saleState, tenderText } from '../status'
import type { BillKind, BillRow, Receipt } from '../types'
import { useListOrder } from '@/lib/useListOrder'

// Sales bills = every item sold (shop bills + items sold on job bills); Job bills = stitching only; All = whole bills.
const billColumns = (view: BillKind | 'all'): Column<BillRow>[] => [
  {
    key: 'docNo',
    header: 'Bill',
    mobile: 'title',
    render: (b) => (
      <span className="flex flex-col">
        <span className="font-medium text-brand">{b.docNo}</span>
        <span className="text-xs text-muted">{b.kind === 'JOB' ? (view === 'SHOP' ? 'Items sold on a job bill' : view === 'JOB' ? 'Stitching' : 'Job bill') : 'Sales bill'}{b.bookNo ? ` · SJ ${b.bookNo}` : ''}</span>
      </span>
    ),
  },
  { key: 'customer', header: 'Customer', mobile: 'subtitle', render: (b) => `${b.customerName}${b.customerPhone ? ` · ${b.customerPhone}` : ''}` },
  { key: 'date', header: 'Date', mobile: 'subtitle', render: (b) => formatDate(b.docDate) },
  { key: 'items', header: 'Items', align: 'right', mobile: 'hidden', render: (b) => b.lines },
  {
    key: 'total', header: view === 'SHOP' ? 'Items sold' : view === 'JOB' ? 'Stitching' : 'Total', align: 'right',
    render: (b) => (
      <span className="flex flex-col items-end">
        {formatINR(view === 'all' ? Number(b.grandTotal) : b.amount)}
        {view !== 'all' && Math.abs(b.amount - Number(b.grandTotal)) > 0.004 && <span className="text-xs text-muted">bill {formatINR(Number(b.grandTotal))}</span>}
      </span>
    ),
  },
  { key: 'due', header: 'Balance', align: 'right', render: (b) => (b.status === 'CANCELLED' ? '—' : <span className={b.dueAmount > 0 ? 'font-medium text-warn' : 'text-success'}>{b.dueAmount > 0 ? formatINR(b.dueAmount) : 'Paid'}</span>) },
  { key: 'status', header: 'Status', mobile: 'badge', render: (b) => { const s = saleState(b); return <Badge tone={s.tone}>{s.label}</Badge> } },
]

const receiptColumns: Column<Receipt>[] = [
  { key: 'docNo', header: 'Receipt', mobile: 'title', render: (r) => <span className="font-medium text-brand">{r.docNo}</span> },
  { key: 'customer', header: 'Customer', mobile: 'subtitle', render: (r) => r.customer?.name ?? 'Cash customer' },
  { key: 'date', header: 'Date', mobile: 'subtitle', render: (r) => formatDate(r.docDate) },
  { key: 'mode', header: 'Received by', render: tenderText },
  { key: 'amount', header: 'Amount', align: 'right', render: (r) => formatINR(Number(r.amount)) },
  { key: 'status', header: 'Status', mobile: 'badge', render: (r) => <Badge tone={r.status === 'POSTED' ? 'success' : 'neutral'}>{r.status === 'POSTED' ? 'Received' : 'Cancelled'}</Badge> },
]

// Top line: the total the chosen view counts, highlighted, with how many bills (cancelled ones not counted).
function SalesSummary({ kind, sum, count }: { kind: BillKind | 'all'; sum: { sales: number; received: number; returned: number }; count: number }) {
  const big = (n: number) => <span className="text-lg font-semibold text-brand">{formatINR(n)}</span>
  const bills = ` · ${count} bill${count === 1 ? '' : 's'}`
  if (kind === 'JOB') return <>Job bills {big(sum.sales)} stitching (items not included){bills}</>
  if (kind === 'SHOP') return <>Sales bills {big(sum.sales)} items sold (incl. items on job bills){bills}</>
  return <>All sales {big(sum.sales)} · received {formatINR(sum.received)} · returned {formatINR(sum.returned)}{bills}</>
}

type Tab = 'all' | 'unpaid' | 'CANCELLED' | 'receipts'
const kinds: { key: BillKind | 'all'; label: string }[] = [{ key: 'all', label: 'All' }, { key: 'SHOP', label: 'Sales bills' }, { key: 'JOB', label: 'Job bills' }]

// /sales — every bill to customers: shop bills and stitching job bills (filter by type), and money received.
export function SalesListPage() {
  const navigate = useNavigate()
  const [query] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => (['unpaid', 'CANCELLED', 'receipts'].includes(query.get('tab') ?? '') ? (query.get('tab') as Tab) : 'all'))
  const [kind, setKind] = useState<BillKind | 'all'>(() => (query.get('kind') === 'JOB' || query.get('kind') === 'SHOP' ? (query.get('kind') as BillKind) : 'all'))
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' })
  const [order, setOrder] = useListOrder('sales')
  const [page, setPage] = useState(1)
  const debounced = useDebounce(search.trim())
  const isReceipts = tab === 'receipts'
  const filters = { order, search: debounced || undefined, status: isReceipts ? 'all' : tab, kind: isReceipts || kind === 'all' ? undefined : kind, from: range.from || undefined, to: range.to || undefined }
  const params = { ...filters, page }
  const bills = useApiQuery(['sales', params, isReceipts], () => (isReceipts ? Promise.resolve(null) : salesApi.list(params)))
  const receipts = useApiQuery(['receipts', params, isReceipts], () => (isReceipts ? salesApi.receipts(params) : Promise.resolve(null)))
  const active = isReceipts ? receipts : bills
  const total = active.data?.total ?? 0
  const sum = bills.data?.summary

  return (
    <>
      <PageHeader
        title="All bills"
        subtitle={sum && !isReceipts ? <SalesSummary kind={kind} sum={sum} count={sum.bills ?? 0} /> : 'Sales bills, job bills and money received.'}
        actions={
          <>
            <ExportButton path={isReceipts ? '/receipts/export' : '/sales/export'} params={filters} />
            <Button icon={IconUsers} onClick={() => navigate('/customers')}>Customers</Button>
            <Button variant="primary" icon={IconPlus} onClick={() => navigate('/billing')}>New bill</Button>
          </>
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[{ key: 'all', label: 'All bills' }, { key: 'unpaid', label: 'Balance due' }, { key: 'CANCELLED', label: 'Cancelled' }, { key: 'receipts', label: 'Money received' }]}
          active={tab}
          onChange={(t) => { setTab(t); setPage(1) }}
        />
      </div>
      {!isReceipts && (
        <div role="group" aria-label="Bill type" className="mb-3 inline-flex rounded-control border border-line bg-card p-1">
          {kinds.map((k) => (
            <button
              key={k.key}
              type="button"
              aria-pressed={kind === k.key}
              onClick={() => { setKind(k.key); setPage(1) }}
              className={cn('rounded-control px-3 py-1.5 text-sm', kind === k.key ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink')}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}
      <Input icon={IconSearch} aria-label="Search" placeholder={isReceipts ? 'Receipt no. or customer' : 'Bill no., customer name or phone'} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="mb-3 md:w-96" />
      <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} order={order} onOrder={(o) => { setOrder(o); setPage(1) }} className="mb-4" />
      <Card bodyClassName="p-0">
        {active.error ? (
          <EmptyState title="Couldn't load" description={active.error} action={<Button onClick={active.reload}>Try again</Button>} />
        ) : isReceipts ? (
          <DataTable startIndex={(page - 1) * 20 + 1} columns={receiptColumns} rows={receipts.data?.items ?? []} rowKey={(r) => r.id} loading={receipts.loading} emptyTitle="No money received yet" onRowClick={(r) => navigate(`/sales/receipts/${r.id}`)} />
        ) : (
          <DataTable
            startIndex={(page - 1) * 20 + 1}
            columns={billColumns(kind)}
            rows={bills.data?.items ?? []}
            rowKey={(b) => `${b.kind}${b.id}`}
            loading={bills.loading}
            emptyTitle={tab === 'unpaid' ? 'No balance due' : 'No bills yet'}
            emptyDescription={tab === 'all' ? 'Bills made at the counter appear here.' : undefined}
            onRowClick={(b) => navigate(b.kind === 'JOB' ? `/jobs/${b.id}` : `/sales/${b.id}`)}
          />
        )}
        {total > 20 && <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />}
      </Card>
    </>
  )
}
