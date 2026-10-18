import { Badge } from '@/components/ui/Badge'
import type { Column } from '@/components/ui/DataTable'
import { ProductThumb } from '@/features/products/components/ProductThumb'
import { formatINR } from '@/lib/format'
import { qtyText, stockState } from '../constants'
import type { StockItem } from '../types'

const variantText = (i: StockItem) => [i.size?.name, i.colour?.name].filter(Boolean).join(' · ')

export const stockColumns: Column<StockItem>[] = [
  {
    key: 'item',
    header: 'Item',
    mobile: 'title',
    render: (i) => (
      <span className="flex items-center gap-3">
        <ProductThumb imagePath={i.product.imagePath} size={36} />
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">
            {i.product.name}
            {variantText(i) && <span className="font-normal text-ink-soft"> · {variantText(i)}</span>}
          </span>
          <span className="block font-mono text-xs text-muted">{i.sku}</span>
        </span>
      </span>
    ),
  },
  {
    key: 'category',
    header: 'Category',
    mobile: 'hidden',
    render: (i) => (i.product.category.parent ? `${i.product.category.parent.name} › ${i.product.category.name}` : i.product.category.name),
  },
  {
    key: 'qty',
    header: 'In stock',
    align: 'right',
    mobile: 'subtitle',
    render: (i) => <span className="font-medium text-ink">{qtyText(i.stockQty, i.product.unit.code)}</span>,
  },
  { key: 'avgCost', header: 'Avg cost', align: 'right', render: (i) => formatINR(Number(i.avgCost)) },
  { key: 'price', header: 'Selling price', align: 'right', render: (i) => <span className="font-medium text-ink">{formatINR(Number(i.sellingPrice))}</span> },
  { key: 'value', header: 'Stock value', align: 'right', render: (i) => formatINR(Number(i.stockValue)) },
  {
    key: 'status',
    header: 'Status',
    mobile: 'badge',
    render: (i) => {
      const s = stockState(i)
      return <Badge tone={s.tone}>{s.label}</Badge>
    },
  },
]
