import { IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { customerApi } from '../api/sales.api'
import { CustomerBalance } from '../components/CustomerBalance'
import type { Customer } from '../types'

const columns: Column<Customer>[] = [
  {
    key: 'name',
    header: 'Customer',
    mobile: 'title',
    render: (c) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-ink">{c.name}</span>
        <span className="block text-xs text-muted">{c.code}{c.city ? ` · ${c.city}` : ''}</span>
      </span>
    ),
  },
  { key: 'phone', header: 'Phone', mobile: 'subtitle', render: (c) => c.phone ?? '—' },
  {
    key: 'jobs', header: 'Stitching jobs', mobile: 'row',
    render: (c) => (c.jobs ? <span>{c.jobs} job{c.jobs > 1 ? 's' : ''}{c.openJobs ? <span className="font-medium text-brand"> · {c.openJobs} in work</span> : ''}</span> : <span className="text-muted">Shop only</span>),
  },
  { key: 'billed', header: 'Total billed', align: 'right', mobile: 'hidden', render: (c) => formatINR(c.billed ?? 0) },
  { key: 'balance', header: 'Balance', align: 'right', mobile: 'badge', render: (c) => <CustomerBalance balance={c.balance} /> },
  { key: 'status', header: '', mobile: 'hidden', render: (c) => (!c.isActive ? <Badge>Inactive</Badge> : null) },
]

type Tab = 'all' | 'stitching' | 'shop' | 'dues'

// /customers — everyone who buys (saved from Billing): stitching customers (have jobs — tap → their page with the jobs
// first), sales customers (only bought items), who still has a balance to pay. All also lists any made inactive (badge).
export function CustomersPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debounced = useDebounce(search.trim())
  const kind = tab === 'stitching' || tab === 'shop' ? tab : undefined
  const params = { search: debounced || undefined, status: tab === 'all' ? 'all' : 'active', withDues: tab === 'dues', kind, page, pageSize: 20 }
  const q = useApiQuery(params, () => customerApi.list(params))

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={q.data?.totalDue !== undefined ? `Total balance to collect: ${formatINR(q.data.totalDue)}` : 'Saved automatically from Billing and Stitching jobs — their bills and balances.'}
        actions={
          <>
            <ExportButton path="/customers/export" params={{ search: params.search, status: params.status, withDues: params.withDues, kind }} />
          </>
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[{ key: 'all', label: 'All customers' }, { key: 'stitching', label: 'Stitching customers' }, { key: 'shop', label: 'Sales customers' }, { key: 'dues', label: 'Balance due' }]}
          active={tab}
          onChange={(t) => { setTab(t); setPage(1) }}
        />
      </div>
      <Input icon={IconSearch} aria-label="Search customers" placeholder="Name, phone, code or GSTIN" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="mb-4 md:w-96" />
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load customers" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <>
            <DataTable
              startIndex={(page - 1) * 20 + 1}
              columns={columns}
              rows={q.data?.items ?? []}
              rowKey={(c) => c.id}
              loading={q.loading}
              emptyTitle={tab === 'dues' ? 'Nobody owes a balance' : tab === 'stitching' ? 'No stitching customers yet' : tab === 'shop' ? 'No sales customers yet' : 'No customers'}
              emptyDescription={tab === 'dues' ? 'All bills are fully paid.' : 'Customers are saved from Billing — type their name (and phone) on the bill.'}
              onRowClick={(c) => navigate(`/customers/${c.id}`)}
            />
            {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
          </>
        )}
      </Card>
    </>
  )
}
