import { Badge } from '@/components/ui/Badge'
import type { Column } from '@/components/ui/DataTable'
import { formatDate, formatINR } from '@/lib/format'
import { ProductThumb } from '../components/ProductThumb'
import type { ProductListItem } from '../types'

const range = (a: number, b: number) => (a === b ? formatINR(a) : `${formatINR(a)} – ${formatINR(b)}`)
const qty = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 3 })

// Products → "Own-made" filter: stock, cost and profit per piece, how often made.
export const ownMadeColumns: Column<ProductListItem>[] = [
  {
    key: 'name',
    header: 'Product',
    mobile: 'title',
    render: (p) => (
      <span className="flex items-center gap-3">
        <ProductThumb imagePath={p.imagePath} />
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{p.name}</span>
          <span className="block text-xs text-muted">{p.code}{p.variantCount > 1 ? ` · ${p.variantCount} sizes / colours` : ''}</span>
        </span>
      </span>
    ),
  },
  { key: 'category', header: 'Category', mobile: 'subtitle', render: (p) => (p.category.parent ? `${p.category.parent.name} › ${p.category.name}` : p.category.name) },
  { key: 'stock', header: 'Stock', align: 'right', render: (p) => `${qty(p.totalStock)} ${p.unit.code}` },
  { key: 'cost', header: 'Cost / piece', align: 'right', render: (p) => (p.costPerPiece === null ? <span className="text-muted">—</span> : formatINR(p.costPerPiece)) },
  { key: 'price', header: 'Selling price', align: 'right', render: (p) => range(p.minPrice, p.maxPrice) },
  {
    key: 'profit',
    header: 'Profit / piece',
    align: 'right',
    render: (p) => {
      if (p.costPerPiece === null) return <span className="text-muted">—</span>
      const lo = p.minPrice - p.costPerPiece, hi = p.maxPrice - p.costPerPiece
      return <span className={lo < 0 ? 'text-danger' : 'text-success'}>{range(lo, hi)}</span>
    },
  },
  { key: 'made', header: 'Times made', align: 'right', render: (p) => (p.timesMade ? `${p.timesMade} (${qty(p.piecesMade ?? 0)} pcs)` : <span className="text-muted">Not yet</span>) },
  { key: 'lastMade', header: 'Last made', render: (p) => (p.lastMade ? formatDate(p.lastMade) : '—') },
  { key: 'isActive', header: 'Status', mobile: 'badge', render: (p) => <Badge tone={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'Active' : 'Inactive'}</Badge> },
]
