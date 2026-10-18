import { Badge } from '@/components/ui/Badge'
import type { Column } from '@/components/ui/DataTable'
import { ColourSwatch } from '../components/ColourSwatch'
import type { MasterKey, MasterRow } from '../types'

type Col = Column<MasterRow>

const nameCol: Col = { key: 'name', header: 'Name', mobile: 'title' }

const statusCol: Col = {
  key: 'isActive',
  header: 'Status',
  mobile: 'badge',
  render: (r) => <Badge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
}

// Table columns per master (on phones: title / subtitle / badge / rows).
export const masterColumns: Record<MasterKey, Col[]> = {
  categories: [
    nameCol,
    {
      key: 'parent',
      header: 'Type',
      mobile: 'subtitle',
      render: (r) => (r.parent ? `Sub of ${r.parent.name}` : 'Main category'),
    },
    {
      key: 'children',
      header: 'Subcategories',
      align: 'right',
      render: (r) => (r.parent ? '—' : (r._count?.children ?? 0)),
    },
    statusCol,
  ],
  brands: [nameCol, statusCol],
  units: [
    nameCol,
    { key: 'code', header: 'Code', mobile: 'subtitle' },
    { key: 'allowDecimal', header: 'Decimals', render: (r) => (r.allowDecimal ? 'Allowed (2.5)' : 'Whole numbers') },
    statusCol,
  ],
  sizes: [nameCol, { key: 'sortOrder', header: 'Sort order', align: 'right' }, statusCol],
  colours: [
    {
      key: 'name',
      header: 'Name',
      mobile: 'title',
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <ColourSwatch hex={r.hexCode} />
          {r.name}
        </span>
      ),
    },
    { key: 'hexCode', header: 'Code', mobile: 'subtitle', render: (r) => r.hexCode ?? 'Multicolour' },
    statusCol,
  ],
  taxRates: [
    nameCol,
    { key: 'rate', header: 'Rate', align: 'right', mobile: 'subtitle', render: (r) => `${Number(r.rate)}%` },
    statusCol,
  ],
}
