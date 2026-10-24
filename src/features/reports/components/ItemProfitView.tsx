import { useState } from 'react'
import { Card, StatCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/Feedback'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { reportsApi } from '../api/reports.api'
import { useReportRange } from '../reportUtils'
import type { ItemKind, ItemProfitRow } from '../types'
import { ReportToolbar } from './ReportToolbar'

const KIND: Record<ItemKind, string> = { STITCHING: 'Stitching', SALE: 'Sold', BRAND: 'Brand order' }
const qtyText = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))

// Reports → "Profit by item": every garment stitched and product sold — pieces, rate, income before GST,
// tailor pay, embroidery, other work, cloth / item cost and the profit left.
export function ItemProfitView() {
  const { range, setRange, from, to } = useReportRange()
  const [kind, setKind] = useState<'' | ItemKind>('')
  const q = useApiQuery(['item-profit', from, to, kind], () => reportsApi.itemProfit({ from, to, kind: kind || undefined }))
  const r = q.data ?? q.lastData
  const t = r?.totals

  const columns: Column<ItemProfitRow>[] = [
    { key: 'item', header: 'Item', mobile: 'title', render: (x) => <span className="font-medium text-ink">{x.item}</span> },
    { key: 'kind', header: 'Type', mobile: 'subtitle', render: (x) => KIND[x.kind] },
    { key: 'pieces', header: 'Pieces / qty', align: 'right', render: (x) => qtyText(x.pieces) },
    { key: 'rate', header: 'Avg rate', align: 'right', render: (x) => formatINR(x.avgRate) },
    { key: 'total', header: 'Total', align: 'right', render: (x) => formatINR(x.total) },
    { key: 'tailor', header: 'Tailor', align: 'right', render: (x) => formatINR(x.tailor) },
    { key: 'emb', header: 'Embroidery', align: 'right', render: (x) => formatINR(x.embroidery) },
    { key: 'other', header: 'Other cost', align: 'right', render: (x) => formatINR(x.other) },
    { key: 'cloth', header: 'Cloth / item cost', align: 'right', render: (x) => formatINR(x.cloth) },
    {
      key: 'profit', header: 'Profit', align: 'right', mobile: 'badge',
      render: (x) => <span className={cn('font-semibold', x.profit < 0 ? 'text-danger' : 'text-success')}>{formatINR(x.profit)}<span className="block text-xs font-normal text-muted">{x.marginPct}%</span></span>,
    },
  ]

  return (
    <>
      <ReportToolbar range={range} onRange={setRange} exportPath="/reports/analysis/item-profit/export" params={{ from, to, kind: kind || undefined }}>
        <Select aria-label="Type" className="sm:w-48" value={kind} onChange={(e) => setKind(e.target.value as '' | ItemKind)}
          options={[{ value: '', label: 'All types' }, ...Object.entries(KIND).map(([value, label]) => ({ value, label }))]} />
      </ReportToolbar>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total (before GST)" value={t ? formatINR(t.total) : '…'} note={t ? `${qtyText(t.pieces)} pieces / qty` : undefined} />
        <StatCard label="Tailor + embroidery + other" value={t ? formatINR(t.tailor + t.embroidery + t.other) : '…'} />
        <StatCard label="Cloth / item cost" value={t ? formatINR(t.cloth) : '…'} />
        <StatCard label="Profit" value={t ? formatINR(t.profit) : '…'} note={t && t.total > 0 ? `${Math.round((t.profit / t.total) * 100)}% of total` : undefined} noteTone="success" />
      </div>
      <Card bodyClassName="p-0">
        {q.error && !r ? <EmptyState title="Couldn't load" description={q.error} /> : (
          <DataTable columns={columns} rows={r?.rows ?? []} rowKey={(x) => `${x.kind}-${x.item}`} loading={!r} emptyTitle="Nothing stitched or sold in these dates" />
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">
        Stitching = jobs booked in these dates (same as Job profit). Sold = counter bills and items sold on jobs, less returns; cost = stock cost when sold.
        Brand order = pieces on delivery bills in these dates. Costs for a whole job or order are shared over its pieces by their charge. All before GST.
      </p>
    </>
  )
}
