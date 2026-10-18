import { IconFileImport, IconPackage, IconPlus, IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ExportButton } from '@/components/ui/ExportButton'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/cn'
import { useDebounce } from '@/lib/useDebounce'
import { ownMadeColumns } from '../config/ownMadeColumns'
import { productColumns } from '../config/productColumns'
import { productTypeMeta, productTypeOptions } from '../constants'
import { useProductList } from '../hooks/useProductList'
import { useProductOptions } from '../hooks/useProductOptions'
import type { ProductListParams, ProductType } from '../types'

const PAGE_SIZE = 20

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

// Product list: search by name / code / SKU / barcode, filter by type (buttons), open to edit.
// "Own-made" shows cost / profit per piece and how often made (making is recorded on the product page).
export function ProductListPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') ?? '')
  const [type, setType] = useState(() => (params.get('type') && params.get('type')! in productTypeMeta ? params.get('type')! : ''))
  const ownMade = type === 'FINISHED'
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState<ProductListParams['status']>('all')
  const [page, setPage] = useState(1)
  const { options } = useProductOptions()

  const debounced = useDebounce(search.trim())
  const list = useProductList({
    search: debounced || undefined,
    type: (type || undefined) as ProductType | undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    status,
    page,
    pageSize: PAGE_SIZE,
  })

  // Any filter change → back to page 1.
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }
  const mainCategories = options.categories.filter((c) => !c.parent)
  const filtered = Boolean(debounced || type || categoryId || status !== 'all')

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Everything you sell, stitch with or make."
        actions={
          <>
            <ExportButton path="/products/export" params={{ search: debounced || undefined, type: type || undefined, categoryId: categoryId || undefined, status }} />
            <Button icon={IconFileImport} onClick={() => navigate('/products/import')}>
              Import
            </Button>
            <Button variant="primary" icon={IconPlus} onClick={() => navigate(ownMade ? '/products/new?type=FINISHED&from=own-made' : '/products/new')}>
              {ownMade ? 'Add own-made product' : 'Add product'}
            </Button>
          </>
        }
      />

      <div role="group" aria-label="Product type" className="mb-3 flex flex-wrap gap-1 rounded-control border border-line bg-card p-1 sm:inline-flex">
        {[{ value: '', label: 'All' }, ...productTypeOptions].map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={type === t.value}
            onClick={() => reset(setType)(t.value)}
            className={cn('rounded-control px-3 py-1.5 text-sm', type === t.value ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink')}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">
        <Input
          icon={IconSearch}
          aria-label="Search products"
          placeholder="Name, code, SKU or barcode"
          value={search}
          onChange={(e) => reset(setSearch)(e.target.value)}
        />
        <Select
          aria-label="Category"
          placeholder="All categories"
          value={categoryId}
          onChange={(e) => reset(setCategoryId)(e.target.value)}
          options={mainCategories.map((c) => ({ value: String(c.id), label: c.name }))}
        />
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => reset(setStatus)(e.target.value as ProductListParams['status'])}
          options={statusOptions}
        />
      </div>

      <Card bodyClassName="p-0">
        {list.error ? (
          <EmptyState
            title="Couldn't load products"
            description={list.error}
            action={<Button onClick={list.reload}>Try again</Button>}
          />
        ) : !list.loading && list.total === 0 && !filtered ? (
          <EmptyState
            icon={IconPackage}
            title="Add your first product"
            description="Products are what you sell, stitch with or make. Each one can have sizes and colours."
            action={
              <Button variant="primary" icon={IconPlus} onClick={() => navigate('/products/new')}>
                Add product
              </Button>
            }
          />
        ) : (
          <>
            <DataTable
              startIndex={(page - 1) * PAGE_SIZE + 1}
              columns={ownMade ? ownMadeColumns : productColumns}
              rows={list.items}
              rowKey={(p) => p.id}
              loading={list.loading}
              emptyTitle="No matching products"
              emptyDescription="Try a different search or filter."
              onRowClick={(p) => navigate(`/products/${p.id}${ownMade ? '?from=own-made' : ''}`)}
            />
            {list.total > PAGE_SIZE && (
              <Pagination page={page} pageSize={PAGE_SIZE} total={list.total} onPageChange={setPage} />
            )}
          </>
        )}
      </Card>
      {ownMade && <p className="mt-3 text-xs text-muted">Cost / piece = average cost of the pieces in stock (cloth + tailor + paid out). Open a product to record more pieces made.</p>}
    </>
  )
}
