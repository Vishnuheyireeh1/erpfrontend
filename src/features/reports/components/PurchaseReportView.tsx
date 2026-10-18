import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/Feedback'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { reportsApi } from '../api/reports.api'
import { useReportRange } from '../reportUtils'
import type { ItemPurchase, SupplierPurchase } from '../types'
import { ReportToolbar } from './ReportToolbar'

const supplierColumns: Column<SupplierPurchase>[] = [
  { key: 'name', header: 'Supplier', mobile: 'title', render: (s) => <span className="font-medium text-ink">{s.name}</span> },
  { key: 'bills', header: 'Bills', align: 'right', mobile: 'subtitle', render: (s) => `${s.bills} bill${s.bills === 1 ? '' : 's'}` },
  { key: 'taxable', header: 'Before GST', align: 'right', mobile: 'hidden', render: (s) => formatINR(s.taxable) },
  { key: 'gst', header: 'GST', align: 'right', mobile: 'hidden', render: (s) => formatINR(s.gst) },
  { key: 'total', header: 'Bill total', align: 'right', mobile: 'badge', render: (s) => <span className="font-semibold text-ink">{formatINR(s.total)}</span> },
  { key: 'paid', header: 'Paid', align: 'right', mobile: 'hidden', render: (s) => formatINR(s.paid) },
  { key: 'due', header: 'Still to pay', align: 'right', render: (s) => <span className={s.due > 0 ? 'font-medium text-warn' : 'text-muted'}>{formatINR(s.due)}</span> },
]
const itemColumns: Column<ItemPurchase>[] = [
  { key: 'name', header: 'Item', mobile: 'title', render: (i) => <span className="block min-w-0"><span className="block font-medium text-ink">{i.name}</span><span className="block font-mono text-xs text-muted">{i.sku}</span></span> },
  { key: 'qty', header: 'Qty bought', align: 'right', mobile: 'subtitle', render: (i) => `${i.qty} ${i.unit}` },
  { key: 'rate', header: 'Avg rate', align: 'right', render: (i) => `${formatINR(i.avgRate)}/${i.unit}` },
  { key: 'taxable', header: 'Value (before GST)', align: 'right', mobile: 'badge', render: (i) => <span className="font-semibold text-ink">{formatINR(i.taxable)}</span> },
  { key: 'suppliers', header: 'From', mobile: 'hidden', render: (i) => <span className="text-xs text-muted">{i.suppliers}</span> },
]

// Reports → "Purchases": how much was bought from each supplier (and what is still to pay), or per item.
export function PurchaseReportView() {
  const { range, setRange, from, to } = useReportRange()
  const [by, setBy] = useState<'supplier' | 'item'>('supplier')
  const sup = useApiQuery(['pur-supplier', from, to, by], () => (by === 'supplier' ? reportsApi.purchasesBySupplier({ from, to }) : Promise.resolve(null)))
  const itm = useApiQuery(['pur-item', from, to, by], () => (by === 'item' ? reportsApi.purchasesByItem({ from, to }) : Promise.resolve(null)))
  const q = by === 'supplier' ? sup : itm
  const s = sup.data ?? sup.lastData
  return (
    <>
      <ReportToolbar range={range} onRange={setRange} exportPath="/reports/analysis/purchases/export" params={{ from, to, by: by === 'item' ? 'item' : undefined }}>
        <div className="flex overflow-hidden rounded-control border border-line" role="group" aria-label="Group by">
          {(['supplier', 'item'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={by === k} onClick={() => setBy(k)} className={cn('px-4 py-2 text-sm font-medium', by === k ? 'bg-brand text-white' : 'bg-card text-ink-soft hover:bg-page')}>
              By {k}
            </button>
          ))}
        </div>
      </ReportToolbar>
      {by === 'supplier' && s && <p className="mb-3 text-sm text-muted">Bought <b className="text-ink">{formatINR(s.total.total)}</b> · paid {formatINR(s.total.paid)} · still to pay <b className="text-warn">{formatINR(s.total.due)}</b></p>}
      <Card bodyClassName="p-0">
        {q.error ? <EmptyState title="Couldn't load" description={q.error} /> : by === 'supplier' ? (
          <DataTable columns={supplierColumns} rows={s?.items ?? []} rowKey={(x) => x.supplierId} loading={sup.loading && !s} emptyTitle="No purchases in these dates" />
        ) : (
          <DataTable columns={itemColumns} rows={(itm.data ?? itm.lastData)?.items ?? []} rowKey={(x) => x.variantId} loading={itm.loading} emptyTitle="No purchases in these dates" />
        )}
      </Card>
      <p className="mt-2 text-xs text-muted">Purchase bills dated in these dates. By item: after purchase returns, top 200 on screen — Excel has all.</p>
    </>
  )
}
