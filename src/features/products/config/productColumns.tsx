import { Badge } from '@/components/ui/Badge'
import type { Column } from '@/components/ui/DataTable'
import { formatINR } from '@/lib/format'
import { ProductThumb } from '../components/ProductThumb'
import { productTypeMeta } from '../constants'
import type { ProductListItem } from '../types'

function priceRange(p: ProductListItem) {
  if (p.minPrice === p.maxPrice) return formatINR(p.minPrice)
  return `${formatINR(p.minPrice)} – ${formatINR(p.maxPrice)}`
}

export const productColumns: Column<ProductListItem>[] = [
  {
    key: 'name',
    header: 'Product',
    mobile: 'title',
    render: (p) => (
      <span className="flex items-center gap-3">
        <ProductThumb imagePath={p.imagePath} />
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{p.name}</span>
          <span className="block text-xs text-muted">{p.code}</span>
        </span>
      </span>
    ),
  },
  {
    key: 'category',
    header: 'Category',
    mobile: 'subtitle',
    render: (p) => (p.category.parent ? `${p.category.parent.name} › ${p.category.name}` : p.category.name),
  },
  {
    key: 'type',
    header: 'Type',
    render: (p) => <Badge tone={productTypeMeta[p.type].tone}>{productTypeMeta[p.type].label}</Badge>,
  },
  { key: 'variantCount', header: 'Variants', align: 'right' },
  {
    key: 'stock',
    header: 'Stock',
    align: 'right',
    render: (p) => (p.type === 'SERVICE' ? '—' : `${p.totalStock.toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${p.unit.code}`),
  },
  { key: 'price', header: 'Selling price', align: 'right', render: (p) => `${priceRange(p)} / ${p.unit.code}` },
  {
    key: 'isActive',
    header: 'Status',
    mobile: 'badge',
    render: (p) => <Badge tone={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>,
  },
]
