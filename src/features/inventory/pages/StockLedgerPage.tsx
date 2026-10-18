import { IconArrowLeft, IconBarcode, IconPencil } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { ExportButton } from '@/components/ui/ExportButton'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { inventoryApi } from '../api/inventory.api'
import { itemTitle, movementLabels, qtyText, stockState } from '../constants'
import type { Movement } from '../types'
import { useListOrder } from '@/lib/useListOrder'
import { SortSwitch } from '@/components/ui/DateRange'

// Which document page a ledger row links to (purchase / bill pages added by later modules).
const docLinks: Record<string, string> = { OPN: '/stock/documents', ADJ: '/stock/documents', PUR: '/purchase', DN: '/purchase/returns', INV: '/sales', SR: '/sales/returns', JOB: '/jobs', BRO: '/brand-orders' }
const docLink = (m: Movement) => (docLinks[m.refType] ? `${docLinks[m.refType]}/${m.refId}` : null)

function columns(unit: string): Column<Movement>[] {
  const signed = (m: Movement, wantIn: boolean) => {
    const q = Number(m.qty)
    return (wantIn ? q > 0 : q < 0) ? qtyText(Math.abs(q)) : ''
  }
  return [
    { key: 'date', header: 'Date', mobile: 'subtitle', render: (m) => formatDate(m.movementDate) },
    {
      key: 'doc',
      header: 'Document',
      mobile: 'title',
      render: (m) => {
        const link = docLink(m)
        return link ? <Link to={link} className="font-medium text-brand hover:underline">{m.refNo}</Link> : m.refNo
      },
    },
    { key: 'type', header: 'Type', mobile: 'badge', render: (m) => <Badge tone={Number(m.qty) > 0 ? 'success' : 'neutral'}>{movementLabels[m.type]}</Badge> },
    { key: 'in', header: `In (${unit})`, align: 'right', render: (m) => <span className="text-success">{signed(m, true)}</span> },
    { key: 'out', header: `Out (${unit})`, align: 'right', render: (m) => <span className="text-ink-soft">{signed(m, false)}</span> },
    { key: 'cost', header: 'Cost / unit', align: 'right', render: (m) => formatINR(Number(m.unitCost)) },
    { key: 'balance', header: 'Balance', align: 'right', render: (m) => <span className="font-medium">{qtyText(m.balanceQty)}</span> },
    { key: 'note', header: 'Note', mobile: 'hidden', render: (m) => <span className="text-ink-soft">{m.note ?? '—'}</span> },
  ]
}

// /stock/items/:id — every stock change of one item, newest first.
export function StockLedgerPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [order, setOrder] = useListOrder('stock-history')
  const q = useApiQuery({ id, page, order }, () => inventoryApi.ledger(id, page, order))
  const data = q.data ?? q.lastData

  if (q.error && !data) {
    return <Card><EmptyState title="Couldn't open this item" description={q.error} action={<Button onClick={() => navigate('/stock')}>Back to stock</Button>} /></Card>
  }
  if (!data) return <div className="flex justify-center py-16"><Spinner size={28} /></div>

  const { item } = data
  const unit = item.product.unit.code
  const state = stockState(item)

  return (
    <>
      <button type="button" onClick={() => navigate('/stock')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Stock
      </button>
      <PageHeader
        title={itemTitle(item)}
        subtitle={`${item.sku} · Barcode ${item.barcode}`}
        actions={
          <>
            <ExportButton path={`/stock/items/${item.id}/ledger/export`} params={{ order }} />
            <Button icon={IconBarcode} onClick={() => navigate(`/labels?variant=${item.id}`)}>Print labels</Button>
            <Button icon={IconPencil} onClick={() => navigate(`/products/${item.product.id}`)}>Edit product</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="In stock" value={qtyText(item.stockQty, unit)} note={state.label} noteTone={state.tone === 'success' ? 'success' : 'warn'} />
        <StatCard label="Average cost" value={formatINR(Number(item.avgCost))} note="Weighted average" />
        <StatCard label="Stock value" value={formatINR(Number(item.stockValue))} />
        <StatCard label="Low-stock alert at" value={qtyText(item.minStock, unit)} note={`Selling price ${formatINR(Number(item.sellingPrice))}`} />
      </div>

      <Card title="Stock history" bodyClassName="p-0" actions={<SortSwitch order={order} onOrder={(o) => { setOrder(o); setPage(1) }} />}>
        <DataTable
          startIndex={(page - 1) * data.pageSize + 1}
          columns={columns(unit)}
          rows={data.items}
          rowKey={(m) => m.id}
          loading={q.loading && !q.lastData}
          emptyTitle="No stock movements yet"
          emptyDescription="Opening stock, purchases, sales and adjustments will appear here."
        />
        {data.total > data.pageSize && (
          <Pagination page={page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        )}
      </Card>
    </>
  )
}
