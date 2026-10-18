import { IconAdjustmentsHorizontal, IconAlertTriangle, IconBox, IconCurrencyRupee, IconFileDescription, IconPackageImport, IconPackageOff, IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { ExportButton } from '@/components/ui/ExportButton'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { useProductOptions } from '@/features/products/hooks/useProductOptions'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { inventoryApi } from '../api/inventory.api'
import { stockColumns } from '../config/stockColumns'
import type { StockStatus } from '../types'

const PAGE_SIZE = 20
const n = (v: number) => v.toLocaleString('en-IN')

// Inventory → Stock: current stock of every item, with value and low / out alerts.
export function StockPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [query] = useSearchParams()
  const [status, setStatus] = useState<StockStatus>(() => (['in', 'low', 'out'].includes(query.get('status') ?? '') ? (query.get('status') as StockStatus) : 'all'))
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const debounced = useDebounce(search.trim())
  const { options } = useProductOptions()

  const params = { search: debounced || undefined, status, categoryId: categoryId ? Number(categoryId) : undefined, page, pageSize: PAGE_SIZE }
  const list = useApiQuery(params, () => inventoryApi.list(params))
  const summary = useApiQuery('summary', inventoryApi.summary)
  const s = summary.data ?? summary.lastData

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Stock"
        subtitle="Current stock of every size / colour, kept by the stock ledger."
        actions={
          <>
            <ExportButton path="/stock/export" params={{ search: params.search, status, categoryId: params.categoryId }} />
            <Button icon={IconFileDescription} onClick={() => navigate('/stock/documents')}>Documents</Button>
            <Button icon={IconPackageImport} onClick={() => navigate('/stock/new?kind=opening')}>Opening stock</Button>
            <Button variant="primary" icon={IconAdjustmentsHorizontal} onClick={() => navigate('/stock/new?kind=adjustment')}>Adjust stock</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Stock value" value={s ? formatINR(s.stockValue) : '—'} note="At average cost" icon={IconCurrencyRupee} />
        <StatCard label="In stock" value={s ? n(s.inStock) : '—'} note="Items above alert level" icon={IconBox} />
        <StatCard label="Low stock" value={s ? n(s.low) : '—'} note="At or below alert level" noteTone={s?.low ? 'warn' : 'muted'} icon={IconAlertTriangle} />
        <StatCard label="Out of stock" value={s ? n(s.out) : '—'} note="Zero or less" noteTone={s?.out ? 'warn' : 'muted'} icon={IconPackageOff} />
      </div>

      <div className="mb-4">
        <Tabs
          tabs={[
            { key: 'all', label: 'All items' },
            { key: 'in', label: 'In stock' },
            { key: 'low', label: `Low stock${s ? ` (${n(s.low)})` : ''}` },
            { key: 'out', label: `Out of stock${s ? ` (${n(s.out)})` : ''}` },
          ]}
          active={status}
          onChange={reset(setStatus)}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Input icon={IconSearch} aria-label="Search stock" placeholder="Name, SKU or scan barcode" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
        <Select
          aria-label="Category"
          placeholder="All categories"
          value={categoryId}
          onChange={(e) => reset(setCategoryId)(e.target.value)}
          options={options.categories.filter((c) => !c.parent).map((c) => ({ value: String(c.id), label: c.name }))}
        />
      </div>

      <Card bodyClassName="p-0">
        {list.error ? (
          <EmptyState title="Couldn't load stock" description={list.error} action={<Button onClick={list.reload}>Try again</Button>} />
        ) : (
          <>
            <DataTable
              startIndex={(page - 1) * PAGE_SIZE + 1}
              columns={stockColumns}
              rows={list.data?.items ?? []}
              rowKey={(i) => i.id}
              loading={list.loading}
              emptyTitle={status === 'all' && !debounced ? 'No items yet' : 'No matching items'}
              emptyDescription={status === 'all' && !debounced ? 'Add products first, then enter opening stock.' : 'Try another search or tab.'}
              onRowClick={(i) => navigate(`/stock/items/${i.id}`)}
            />
            {(list.data?.total ?? 0) > PAGE_SIZE && (
              <Pagination page={page} pageSize={PAGE_SIZE} total={list.data!.total} onPageChange={setPage} />
            )}
          </>
        )}
      </Card>
    </>
  )
}
