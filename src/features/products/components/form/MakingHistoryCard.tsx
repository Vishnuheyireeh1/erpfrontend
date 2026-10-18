import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { productionApi } from '@/features/production/api/production.api'
import type { Production } from '@/features/production/types'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'

type Entry = Omit<Production, 'outputs' | 'materials' | 'costs'>

const columns: Column<Entry>[] = [
  { key: 'docNo', header: 'Entry', mobile: 'title', render: (p) => <span className="font-medium text-brand">{p.docNo}</span> },
  { key: 'docDate', header: 'Made on', mobile: 'subtitle', render: (p) => formatDate(p.docDate) },
  { key: 'pieces', header: 'Pieces', align: 'right', render: (p) => Number(p.pieces) },
  { key: 'stockCost', header: 'Total cost', align: 'right', render: (p) => formatINR(Number(p.stockCost)) },
  { key: 'perPiece', header: 'Cost / piece', align: 'right', render: (p) => formatINR(Number(p.pieces) ? Number(p.stockCost) / Number(p.pieces) : 0) },
  { key: 'status', header: 'Status', mobile: 'badge', render: (p) => (p.status === 'CANCELLED' ? <Badge tone="danger">Cancelled</Badge> : <Badge tone="success">Saved</Badge>) },
]

// Own-made product page: every time pieces of it were made. Open one to see the materials, print labels or cancel.
export function MakingHistoryCard({ productId }: { productId: number }) {
  const navigate = useNavigate()
  const q = useApiQuery(['product-making', productId], () => productionApi.list({ productId, page: 1 }))
  const items = q.data?.items ?? []
  if (!q.loading && items.length === 0) return null

  return (
    <Card title="Made in the shop — history" bodyClassName="p-0">
      <DataTable columns={columns} rows={items} rowKey={(p) => p.id} loading={q.loading} onRowClick={(p) => navigate(`/production/${p.id}`)} />
      <p className="border-t border-line px-4 py-2 text-xs text-muted">Made a mistake? Open the entry and cancel it (stock is put back), then add it again below.</p>
    </Card>
  )
}
