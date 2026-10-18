import { IconChartBar, IconPlus, IconSearch, IconTag } from '@tabler/icons-react'
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
import { dueText } from '@/features/jobs/jobUtils'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { useListOrder } from '@/lib/useListOrder'
import { brandOrderApi } from '../api/brandOrder.api'
import type { BrandOrderSummary } from '../types'

const late = (o: BrandOrderSummary) => o.status === 'OPEN' && o.expectedDate.slice(0, 10) < new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

// Pieces by stage, e.g. "2 ready · 3 in work".
function PiecesText({ o }: { o: BrandOrderSummary }) {
  const parts = [o.ready && `${o.ready} ready`, o.inWork && `${o.inWork} in work`, o.delivered && `${o.delivered} delivered`].filter(Boolean)
  return <span className="text-sm">{o.pieces} pc{o.pieces === 1 ? '' : 's'}<span className="block text-xs text-muted">{parts.join(' · ')}</span></span>
}

const columns: Column<BrandOrderSummary>[] = [
  {
    key: 'order',
    header: 'Order',
    mobile: 'title',
    render: (o) => (
      <span className="block min-w-0">
        <span className="block font-medium text-brand">{o.docNo}</span>
        <span className="block truncate text-xs text-muted">{o.theirOrderNo ? `Their no. ${o.theirOrderNo}` : `Received ${formatDate(o.docDate)}`}</span>
      </span>
    ),
  },
  { key: 'brand', header: 'Brand', mobile: 'subtitle', render: (o) => o.brandName },
  {
    key: 'due',
    header: 'Due',
    mobile: 'subtitle',
    render: (o) => (
      <span className={cn(late(o) && 'font-medium text-danger')}>
        {formatDate(o.expectedDate)}
        {o.status === 'OPEN' && <span className="block text-xs">{dueText(o.expectedDate, true)}</span>}
      </span>
    ),
  },
  { key: 'pieces', header: 'Pieces', mobile: 'hidden', render: (o) => <PiecesText o={o} /> },
  { key: 'value', header: 'Order value', align: 'right', render: (o) => formatINR(o.value) },
  {
    key: 'status',
    header: 'Status',
    mobile: 'badge',
    render: (o) =>
      o.status === 'CANCELLED' ? <Badge tone="neutral">Cancelled</Badge>
        : o.status === 'COMPLETED' ? <Badge tone="info">Delivered</Badge>
          : late(o) ? <Badge tone="danger">Late</Badge>
            : o.ready ? <Badge tone="success">{o.ready} ready</Badge>
              : <Badge tone="pending">In work</Badge>,
  },
]

type View = 'open' | 'ready' | 'late' | 'completed' | 'cancelled' | 'all'

// /brand-orders — orders from other brands (stitched with their label), by what needs doing.
export function BrandOrdersPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = (params.get('view') as View) || 'open'
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' })
  const [order, setOrder] = useListOrder('brand-orders')
  const [page, setPage] = useState(1)
  const debounced = useDebounce(search.trim())
  const filters = { order, view, search: debounced || undefined, from: range.from || undefined, to: range.to || undefined }
  const q = useApiQuery(['brand-orders', filters, page], () => brandOrderApi.list({ ...filters, page }))

  return (
    <>
      <PageHeader
        title="Brand orders"
        subtitle="Orders from other brands — stitched here with their label."
        actions={
          <>
            <ExportButton path="/brand-orders/export" params={filters} />
            <Button icon={IconChartBar} onClick={() => navigate('/brand-reports')}>Reports</Button>
            <Button icon={IconTag} onClick={() => navigate('/brands')}>Brands</Button>
            <Button variant="primary" icon={IconPlus} onClick={() => navigate('/brand-orders/new')}>New order</Button>
          </>
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[
            { key: 'open', label: 'In progress' },
            { key: 'ready', label: 'Ready to deliver' },
            { key: 'late', label: 'Late' },
            { key: 'completed', label: 'Delivered' },
            { key: 'cancelled', label: 'Cancelled' },
            { key: 'all', label: 'All' },
          ]}
          active={view}
          onChange={(v) => { setParams(v === 'open' ? {} : { view: v }); setPage(1) }}
        />
      </div>
      <Input icon={IconSearch} aria-label="Search brand orders" placeholder="Order no., brand, their order no. or customer name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="mb-3 md:w-96" />
      <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} order={order} onOrder={(o) => { setOrder(o); setPage(1) }} className="mb-4" />
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load brand orders" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <>
            <DataTable
              startIndex={(page - 1) * 20 + 1}
              columns={columns}
              rows={q.data?.items ?? []}
              rowKey={(o) => o.id}
              loading={q.loading}
              emptyTitle={view === 'late' ? 'Nothing is late' : view === 'ready' ? 'Nothing ready yet' : 'No brand orders here'}
              emptyDescription={view === 'open' ? 'Add an order a brand gave you — each piece with its measurements, rate and tailor.' : undefined}
              onRowClick={(o) => navigate(`/brand-orders/${o.id}`)}
            />
            {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
          </>
        )}
      </Card>
    </>
  )
}
