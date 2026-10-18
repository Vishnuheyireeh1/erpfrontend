import { IconPlus, IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ExportButton } from '@/components/ui/ExportButton'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { supplierApi } from '../api/purchase.api'
import { SupplierFormModal } from '../components/SupplierFormModal'
import type { Supplier } from '../types'

export function BalanceText({ balance }: { balance: number }) {
  if (Math.abs(balance) < 0.005) return <span className="text-muted">Settled</span>
  return balance > 0 ? (
    <span className="font-medium text-warn">{formatINR(balance)} to pay</span>
  ) : (
    <span className="font-medium text-success">{formatINR(-balance)} advance</span>
  )
}

const columns: Column<Supplier>[] = [
  {
    key: 'name',
    header: 'Supplier',
    mobile: 'title',
    render: (s) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-ink">{s.name}</span>
        <span className="block text-xs text-muted">{s.code}{s.city ? ` · ${s.city}` : ''}</span>
      </span>
    ),
  },
  { key: 'phone', header: 'Phone', mobile: 'subtitle', render: (s) => s.phone ?? '—' },
  { key: 'gstin', header: 'GSTIN', render: (s) => <span className="font-mono text-xs">{s.gstin ?? 'Not registered'}</span> },
  { key: 'state', header: 'State', mobile: 'hidden', render: (s) => s.stateName ?? s.stateCode },
  { key: 'balance', header: 'Balance', align: 'right', mobile: 'badge', render: (s) => <BalanceText balance={s.balance} /> },
  { key: 'status', header: '', mobile: 'hidden', render: (s) => (!s.isActive ? <Badge>Inactive</Badge> : null) },
]

type Tab = 'active' | 'dues' | 'inactive'

// /suppliers — who we buy from, and how much we owe each.
export function SuppliersPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('active')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const debounced = useDebounce(search.trim())
  const params = { search: debounced || undefined, status: tab === 'inactive' ? 'inactive' : 'active', withDues: tab === 'dues', page, pageSize: 20 }
  const q = useApiQuery(params, () => supplierApi.list(params))

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle={q.data ? `Total to pay: ${formatINR(q.data.totalDue)}` : 'Who you buy from and what you owe.'}
        actions={
          <>
            <ExportButton path="/suppliers/export" params={{ search: params.search, status: params.status, withDues: params.withDues }} />
            <Button variant="primary" icon={IconPlus} onClick={() => setAdding(true)}>Add supplier</Button>
          </>
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[{ key: 'active', label: 'Active' }, { key: 'dues', label: 'To pay' }, { key: 'inactive', label: 'Inactive' }]}
          active={tab}
          onChange={(t) => { setTab(t); setPage(1) }}
        />
      </div>
      <Input icon={IconSearch} aria-label="Search suppliers" placeholder="Name, code, GSTIN or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="mb-4 md:w-96" />
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load suppliers" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <>
            <DataTable
              startIndex={(page - 1) * 20 + 1}
              columns={columns}
              rows={q.data?.items ?? []}
              rowKey={(s) => s.id}
              loading={q.loading}
              emptyTitle={tab === 'dues' ? 'Nothing to pay' : 'No suppliers yet'}
              emptyDescription={tab === 'dues' ? 'All supplier bills are paid.' : 'Add the suppliers you buy fabric and goods from.'}
              onRowClick={(s) => navigate(`/suppliers/${s.id}`)}
            />
            {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
          </>
        )}
      </Card>
      {adding && <SupplierFormModal supplier={null} onClose={() => setAdding(false)} onSaved={(s) => navigate(`/suppliers/${s.id}`)} />}
    </>
  )
}
