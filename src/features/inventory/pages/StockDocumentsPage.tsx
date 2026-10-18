import { IconArrowLeft } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { inventoryApi } from '../api/inventory.api'
import { reasonLabels } from '../constants'
import type { DocKind, StockDocument } from '../types'
import { useListOrder } from '@/lib/useListOrder'

const columns: Column<StockDocument>[] = [
  { key: 'docNo', header: 'Document', mobile: 'title', render: (d) => <span className="font-medium text-brand">{d.docNo}</span> },
  { key: 'date', header: 'Date', mobile: 'subtitle', render: (d) => formatDate(d.docDate) },
  { key: 'reason', header: 'Reason', mobile: 'subtitle', render: (d) => reasonLabels[d.reason] },
  { key: 'lines', header: 'Items', align: 'right', render: (d) => d._count?.lines ?? 0 },
  {
    key: 'value',
    header: 'Value',
    align: 'right',
    render: (d) => {
      const v = Number(d.totalValue)
      return <span className={v < 0 ? 'text-warn' : ''}>{v < 0 ? '−' : ''}{formatINR(Math.abs(v))}</span>
    },
  },
  { key: 'by', header: 'By', mobile: 'hidden', render: (d) => <span className="text-ink-soft">{d.createdBy}</span> },
  {
    key: 'status',
    header: 'Status',
    mobile: 'badge',
    render: (d) => <Badge tone={d.status === 'POSTED' ? 'success' : 'neutral'}>{d.status === 'POSTED' ? 'Posted' : 'Cancelled'}</Badge>,
  },
]

// /stock/documents — every opening-stock and adjustment document.
export function StockDocumentsPage() {
  const navigate = useNavigate()
  const [kind, setKind] = useState<'ALL' | DocKind>('ALL')
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' })
  const [order, setOrder] = useListOrder('stock-documents')
  const [page, setPage] = useState(1)
  const filters = { order, kind: kind === 'ALL' ? undefined : kind, from: range.from || undefined, to: range.to || undefined }
  const q = useApiQuery({ ...filters, page }, () => inventoryApi.documents({ ...filters, page }))

  return (
    <>
      <button type="button" onClick={() => navigate('/stock')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Stock
      </button>
      <PageHeader
        title="Stock documents"
        subtitle="Opening stock and adjustments. Documents are never deleted — cancel to reverse."
        actions={<ExportButton path="/stock/documents/export" params={filters} />}
      />
      <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} order={order} onOrder={(o) => { setOrder(o); setPage(1) }} className="mb-4" />
      <div className="mb-4">
        <Tabs
          tabs={[{ key: 'ALL', label: 'All' }, { key: 'OPENING', label: 'Opening stock' }, { key: 'ADJUSTMENT', label: 'Adjustments' }]}
          active={kind}
          onChange={(k) => {
            setKind(k)
            setPage(1)
          }}
        />
      </div>
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load documents" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <>
            <DataTable
              startIndex={(page - 1) * 20 + 1}
              columns={columns}
              rows={q.data?.items ?? []}
              rowKey={(d) => d.id}
              loading={q.loading}
              emptyTitle="No documents yet"
              emptyDescription="Opening stock and adjustments you save appear here."
              onRowClick={(d) => navigate(`/stock/documents/${d.id}`)}
            />
            {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
          </>
        )}
      </Card>
    </>
  )
}
