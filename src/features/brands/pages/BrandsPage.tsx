import { IconArrowLeft, IconPlus, IconSearch } from '@tabler/icons-react'
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
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { brandApi } from '../api/brand.api'
import { BrandFormModal } from '../components/BrandFormModal'
import { gstLabel, type Brand } from '../types'

// + = the brand owes the shop.
function PendingText({ balance }: { balance: number }) {
  if (Math.abs(balance) < 0.005) return <span className="text-muted">Settled</span>
  return balance > 0 ? (
    <span className="font-medium text-warn">{formatINR(balance)} to receive</span>
  ) : (
    <span className="font-medium text-success">{formatINR(-balance)} advance</span>
  )
}

const columns: Column<Brand>[] = [
  {
    key: 'name',
    header: 'Brand',
    mobile: 'title',
    render: (b) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-ink">{b.name}</span>
        <span className="block text-xs text-muted">{b.code}{b.city ? ` · ${b.city}` : ''}</span>
      </span>
    ),
  },
  { key: 'contact', header: 'Contact', mobile: 'subtitle', render: (b) => [b.contactPerson, b.phone].filter(Boolean).join(' · ') || '—' },
  { key: 'gstin', header: 'GSTIN', mobile: 'hidden', render: (b) => <span className="font-mono text-xs">{b.gstin ?? 'Not registered'}</span> },
  { key: 'gst', header: 'Usual GST', mobile: 'hidden', render: (b) => gstLabel(b.gstRate) },
  { key: 'balance', header: 'Pending', align: 'right', mobile: 'badge', render: (b) => <PendingText balance={b.balance} /> },
  { key: 'status', header: '', mobile: 'hidden', render: (b) => (!b.isActive ? <Badge>Inactive</Badge> : null) },
]

type Tab = 'active' | 'dues' | 'inactive'

// /brands — other brands Sairandhri stitches for, and what each owes the shop.
export function BrandsPage() {
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') as Tab) || 'active'
  const setTab = (t: Tab) => setSp(t === 'active' ? {} : { tab: t })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const debounced = useDebounce(search.trim())
  const params = { search: debounced || undefined, status: tab === 'inactive' ? 'inactive' : 'active', withDues: tab === 'dues', page, pageSize: 20 }
  const q = useApiQuery(params, () => brandApi.list(params))

  return (
    <>
      <button type="button" onClick={() => navigate('/brand-orders')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Brand orders
      </button>
      <PageHeader
        title="Brands"
        subtitle={q.data ? `Pending from brands: ${formatINR(q.data.totalDue)}` : 'Other brands you stitch for, with their label.'}
        actions={
          <>
            <ExportButton path="/brands/export" params={{ search: params.search, status: params.status, withDues: params.withDues }} />
            <Button variant="primary" icon={IconPlus} onClick={() => setAdding(true)}>Add brand</Button>
          </>
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[{ key: 'active', label: 'Active' }, { key: 'dues', label: 'To receive' }, { key: 'inactive', label: 'Inactive' }]}
          active={tab}
          onChange={(t) => { setTab(t); setPage(1) }}
        />
      </div>
      <Input icon={IconSearch} aria-label="Search brands" placeholder="Name, contact, code, GSTIN or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="mb-4 md:w-96" />
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load brands" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <>
            <DataTable
              startIndex={(page - 1) * 20 + 1}
              columns={columns}
              rows={q.data?.items ?? []}
              rowKey={(b) => b.id}
              loading={q.loading}
              emptyTitle={tab === 'dues' ? 'Nothing to receive' : 'No brands yet'}
              emptyDescription={tab === 'dues' ? 'No brand owes the shop anything.' : 'Add the brands you stitch for — their orders and bills come next.'}
              onRowClick={(b) => navigate(`/brands/${b.id}`)}
            />
            {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
          </>
        )}
      </Card>
      {adding && <BrandFormModal brand={null} onClose={() => setAdding(false)} onSaved={(b) => (b ? navigate(`/brands/${b.id}`) : setAdding(false))} />}
    </>
  )
}
