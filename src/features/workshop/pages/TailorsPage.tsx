import { IconChartBar, IconSearch, IconUserPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { todayISO } from '@/features/inventory/constants'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { costCategoryApi, payTypeLabels, tailorApi } from '../api/workshop.api'
import { GarmentList } from '../components/GarmentList'
import { TailorPaymentsList } from '../components/TailorPaymentsList'
import { WaitingJobsList } from '../components/WaitingJobsList'
import type { Tailor } from '../types'

const columns: Column<Tailor>[] = [
  {
    key: 'name',
    header: 'Worker',
    mobile: 'title',
    render: (t) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-ink">{t.name}</span>
        <span className="block text-xs text-muted">{t.staff?.role ?? t.speciality ?? ''}{t.staff ? ` · ${t.staff.code}` : ''}</span>
      </span>
    ),
  },
  { key: 'does', header: 'Does', mobile: 'subtitle', render: (t) => <span className="text-ink-soft">{t.does?.join(', ') || '—'}</span> },
  { key: 'pay', header: 'Paid', render: (t) => payTypeLabels[t.payType] },
  { key: 'jobs', header: 'Jobs', align: 'right', render: (t) => t.period?.jobs ?? 0 },
  { key: 'pieces', header: 'Pieces done', align: 'right', render: (t) => <span className="font-medium text-ink">{t.period?.pieces ?? 0}</span> },
  { key: 'earned', header: 'Pay earned', align: 'right', mobile: 'hidden', render: (t) => (t.payType === 'PIECE' ? formatINR(t.period?.earned ?? 0) : <span className="text-muted">Salary</span>) },
  { key: 'balance', header: 'To pay now', align: 'right', mobile: 'badge', render: (t) => (t.payType === 'PIECE' ? <span className={t.balance > 0.004 ? 'font-medium text-warn' : 'text-muted'}>{formatINR(t.balance)}</span> : '—') },
  { key: 'status', header: '', mobile: 'hidden', render: (t) => (!t.isActive ? <Badge>Inactive</Badge> : null) },
]

type Tab = 'waiting' | 'active' | 'inactive' | 'payments' | 'garments'

// /tailors — "Job work": jobs waiting for workers, the workers (tailors, embroidery, cutting … — people are added in
// Staff & salary), what they earned and were paid, garment types and work types.
export function TailorsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'waiting'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debounced = useDebounce(search.trim())
  const [work, setWork] = useState('') // '' = everyone · 'STITCHING' · work type id
  const [range, setRange] = useState<DateRangeValue>(() => ({ from: `${todayISO().slice(0, 8)}01`, to: todayISO() }))
  const cats = useApiQuery('cost-categories', () => costCategoryApi.list())
  const people = useApiQuery('tailor-options', () => tailorApi.options())
  // Filter buttons only for work someone actually does.
  const doneWorks = (cats.data ?? []).filter((c) => c.isActive && (people.data ?? []).some((p) => p.works.some((w) => w.categoryId === c.id)))
  const filters = { search: debounced || undefined, status: tab === 'inactive' ? 'inactive' : 'active', work: work || undefined, from: range.from || undefined, to: range.to || undefined }
  const lists = tab === 'active' || tab === 'inactive'
  const q = useApiQuery(['tailors', filters, page, tab], () => (lists ? tailorApi.list({ ...filters, page, pageSize: 20 }) : Promise.resolve(null)))

  return (
    <>
      <PageHeader
        title="Job work"
        subtitle="Give each job its tailor and workers (embroidery, cutting, hand work …), see what each person earned and pay them."
        actions={
          <>
            <Button icon={IconChartBar} onClick={() => navigate('/workshop-reports')}>Reports</Button>
            {lists && <ExportButton path="/tailors/export" params={filters} />}
            <Button icon={IconUserPlus} onClick={() => navigate('/employees')}>Add person (Staff)</Button>
          </>
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[{ key: 'waiting', label: 'Waiting for workers' }, { key: 'active', label: 'Workers' }, { key: 'inactive', label: 'Inactive' }, { key: 'payments', label: 'Payments' }, { key: 'garments', label: 'Garment types' }]}
          active={tab}
          onChange={(t) => { setParams(t === 'waiting' ? {} : { tab: t }); setPage(1) }}
        />
      </div>
      {tab === 'waiting' ? (
        <WaitingJobsList />
      ) : tab === 'garments' ? (
        <GarmentList />
      ) : tab === 'payments' ? (
        <TailorPaymentsList />
      ) : (
        <>
          <div role="group" aria-label="Work" className="mb-3 flex flex-wrap gap-1 rounded-control border border-line bg-card p-1 sm:inline-flex">
            {[{ value: '', label: 'Everyone' }, { value: 'STITCHING', label: 'Stitching (tailors)' }, ...doneWorks.map((c) => ({ value: String(c.id), label: c.name }))].map((w) => (
              <button key={w.value || 'all'} type="button" aria-pressed={work === w.value} onClick={() => { setWork(w.value); setPage(1) }}
                className={cn('rounded-control px-3 py-1.5 text-sm', work === w.value ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink')}>
                {w.label}
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input icon={IconSearch} aria-label="Search workers" placeholder="Name, code or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="lg:w-80" />
            <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} />
          </div>
          <p className="mb-2 text-xs text-muted">Jobs, pieces and pay earned are for these dates (when the job was Ready). "To pay now" is today's balance.</p>
          <Card bodyClassName="p-0">
            {q.error ? (
              <EmptyState title="Couldn't load workers" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
            ) : (
              <>
                <DataTable
                  startIndex={(page - 1) * 20 + 1}
                  columns={columns}
                  rows={q.data?.items ?? []}
                  rowKey={(t) => t.id}
                  loading={q.loading}
                  emptyTitle={tab === 'inactive' ? 'No inactive workers' : 'No workers yet'}
                  emptyDescription={tab === 'active' ? 'Add people in Staff & salary and turn on "Does job work".' : undefined}
                  onRowClick={(t) => navigate(`/tailors/${t.id}`)}
                />
                {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
              </>
            )}
          </Card>
        </>
      )}
    </>
  )
}
