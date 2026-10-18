import { IconChartBar, IconPlus, IconSearch } from '@tabler/icons-react'
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
import { jobsApi } from '../api/jobs.api'
import { dueText, garmentsText, isOpen, statusLabels, statusTones } from '../jobUtils'
import type { JobSummary } from '../types'
import { useListOrder } from '@/lib/useListOrder'

const columns: Column<JobSummary>[] = [
  {
    key: 'job',
    header: 'Job',
    mobile: 'title',
    render: (j) => (
      <span className="block min-w-0">
        <span className="block font-medium text-brand">{j.docNo}{j.bookNo && <span className="ml-1.5 text-xs font-normal text-muted">Book {j.bookNo}</span>}</span>
        <span className="block truncate text-xs text-muted">{garmentsText(j.items)}</span>
      </span>
    ),
  },
  { key: 'customer', header: 'Customer', mobile: 'subtitle', render: (j) => `${j.customerName}${j.customerPhone ? ` · ${j.customerPhone}` : ''}` },
  {
    key: 'delivery',
    header: 'Ready by',
    mobile: 'subtitle',
    render: (j) => (
      <span className={cn(j.overdue && 'font-medium text-danger')}>
        {formatDate(j.expectedDate)}
        {isOpen(j.status) && <span className="block text-xs">{dueText(j.expectedDate, true)}</span>}
      </span>
    ),
  },
  { key: 'tailor', header: 'Tailor', mobile: 'hidden', render: (j) => [...new Set(j.items.map((i) => i.tailor?.name).filter(Boolean))].join(', ') || <span className="text-muted">Not assigned</span> },
  { key: 'total', header: 'Total', align: 'right', render: (j) => formatINR(Number(j.grandTotal)) },
  { key: 'due', header: 'Balance', align: 'right', render: (j) => (j.status === 'CANCELLED' ? '—' : <span className={j.dueAmount > 0 ? 'font-medium text-warn' : 'text-success'}>{j.dueAmount > 0 ? formatINR(j.dueAmount) : 'Paid'}</span>) },
  { key: 'status', header: 'Stage', mobile: 'badge', render: (j) => <Badge tone={j.overdue ? 'danger' : statusTones[j.status]}>{statusLabels[j.status]}</Badge> },
]

type View = 'open' | 'due' | 'overdue' | 'ready' | 'unpaid' | 'delivered' | 'cancelled' | 'all'

// /jobs — stitching jobs by what needs doing: due today, late, ready to hand over …
export function JobsListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = (params.get('view') as View) || 'open'
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' })
  const [order, setOrder] = useListOrder('jobs')
  const [page, setPage] = useState(1)
  const debounced = useDebounce(search.trim())
  const filters = { order, view, search: debounced || undefined, from: range.from || undefined, to: range.to || undefined }
  const q = useApiQuery(['jobs', filters, page], () => jobsApi.list({ ...filters, page }))
  const counts = (q.data ?? q.lastData)?.counts
  const badge = (label: string, n?: number) => (n ? `${label} (${n})` : label)

  return (
    <>
      <PageHeader
        title="Stitching jobs"
        subtitle={counts ? `${counts.dueToday} due today · ${counts.overdue} late · ${counts.ready} ready to hand over` : 'Orders from booking to hand over.'}
        actions={
          <>
            <ExportButton path="/jobs/export" params={filters} />
            <Button icon={IconChartBar} onClick={() => navigate('/workshop-reports')}>Reports</Button>
            <Button variant="primary" icon={IconPlus} onClick={() => navigate('/billing?kind=job')}>New job</Button>
          </>
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[
            { key: 'open', label: 'In progress' },
            { key: 'due', label: badge('Due today', counts ? counts.dueToday + counts.overdue : undefined) },
            { key: 'overdue', label: badge('Late', counts?.overdue) },
            { key: 'ready', label: badge('Ready', counts?.ready) },
            { key: 'unpaid', label: 'Balance due' },
            { key: 'delivered', label: 'Handed over' },
            { key: 'cancelled', label: 'Cancelled' },
            { key: 'all', label: 'All' },
          ]}
          active={view}
          onChange={(v) => { setParams(v === 'open' ? {} : { view: v }); setPage(1) }}
        />
      </div>
      <Input icon={IconSearch} aria-label="Search jobs" placeholder="Job no., customer name or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="mb-3 md:w-96" />
      <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} order={order} onOrder={(o) => { setOrder(o); setPage(1) }} className="mb-4" />
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load jobs" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <>
            <DataTable
              startIndex={(page - 1) * 20 + 1}
              columns={columns}
              rows={q.data?.items ?? []}
              rowKey={(j) => j.id}
              loading={q.loading}
              emptyTitle={view === 'overdue' ? 'Nothing is late' : view === 'due' ? 'Nothing due today' : 'No jobs here'}
              emptyDescription={view === 'open' ? 'Book a stitching job — measurements, tailor, ready-by date and advance.' : undefined}
              onRowClick={(j) => navigate(`/jobs/${j.id}`)}
            />
            {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
          </>
        )}
      </Card>
    </>
  )
}
