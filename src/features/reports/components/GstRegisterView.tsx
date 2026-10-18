import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/Feedback'
import { Switch } from '@/components/ui/Switch'
import { formatDate, formatINR2 as formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { docKindLabels, docLinks, reportsApi } from '../api/reports.api'
import { taxColumns, useReportRange } from '../reportUtils'
import type { GstDoc, HsnRow, Tax } from '../types'
import { ReportToolbar } from './ReportToolbar'

const TotalBar = ({ t, count }: { t: Tax; count: number }) => (
  <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-4 py-3 text-sm">
    <span className="text-muted">{count} rows</span>
    <span>Taxable <b>{formatINR(t.taxable)}</b></span>
    <span>CGST <b>{formatINR(t.cgst)}</b></span>
    <span>SGST <b>{formatINR(t.sgst)}</b></span>
    {t.igst !== 0 && <span>IGST <b>{formatINR(t.igst)}</b></span>}
    <span>Total GST <b>{formatINR(t.tax)}</b></span>
  </div>
)

// Reports → "GST sales" / "GST purchases": one row per bill (returns as minus), with GSTIN.
export function GstRegisterView({ kind }: { kind: 'sales' | 'purchases' }) {
  const navigate = useNavigate()
  const { range, setRange, from, to } = useReportRange()
  const [b2b, setB2b] = useState(false)
  const sales = kind === 'sales'
  const q = useApiQuery(['gst-register', kind, from, to, b2b], () => (sales ? reportsApi.gstSales({ from, to, b2b }) : reportsApi.gstPurchases({ from, to })))
  const r = q.data ?? q.lastData
  const columns: Column<GstDoc>[] = [
    {
      key: 'doc',
      header: 'Document',
      mobile: 'title',
      render: (d) => (
        <span className="block min-w-0">
          <span className="block font-medium text-ink">{d.docNo}</span>
          <span className="block text-xs text-muted">{formatDate(d.date)} · {docKindLabels[d.kind] ?? d.kind}{d.billNo ? ` · ${d.billNo}` : ''}</span>
        </span>
      ),
    },
    {
      key: 'party',
      header: sales ? 'Customer' : 'Supplier',
      mobile: 'subtitle',
      render: (d) => <span className="block min-w-0"><span className="block truncate">{d.party}</span>{d.gstin && <span className="block font-mono text-xs text-muted">{d.gstin}</span>}</span>,
    },
    { key: 'rates', header: 'GST %', mobile: 'hidden', render: (d) => d.rates.replace(/\.0\b/g, '') },
    ...taxColumns<GstDoc>(),
    { key: 'total', header: 'Total', align: 'right', mobile: 'badge', render: (d) => <span className={d.total < 0 ? 'font-medium text-danger' : 'font-medium text-ink'}>{formatINR(d.total)}</span> },
  ]

  return (
    <>
      <ReportToolbar range={range} onRange={setRange} exportPath={sales ? '/reports/gst/sales/export' : '/reports/gst/purchases/export'} params={{ from, to, b2b: sales && b2b }}>
        {sales && <Switch label="Only GST customers (B2B)" checked={b2b} onChange={setB2b} />}
      </ReportToolbar>
      <Card bodyClassName="p-0">
        {q.error ? <EmptyState title="Couldn't load" description={q.error} /> : (
          <>
            <DataTable
              columns={columns}
              rows={r?.items ?? []}
              rowKey={(d) => `${d.kind}-${d.refId}`}
              loading={q.loading && !r}
              emptyTitle={b2b ? 'No bills to customers with GSTIN' : 'No bills in these dates'}
              onRowClick={(d) => docLinks[d.kind] && navigate(docLinks[d.kind](d.refId))}
            />
            {r && r.items.length > 0 && <TotalBar t={r.total} count={r.items.length} />}
          </>
        )}
      </Card>
      {!sales && <p className="mt-2 text-xs text-muted">Packing / other charges with GST are included in each bill. Freight paid separately has no GST here.</p>}
    </>
  )
}

const hsnColumns: Column<HsnRow>[] = [
  { key: 'hsn', header: 'HSN / SAC', mobile: 'title', render: (h) => (h.hsn ? <span className="font-medium text-ink">{h.hsn}{h.hsn === '9988' ? ' · stitching' : ''}</span> : <span className="font-medium text-warn">Missing HSN</span>) },
  { key: 'rate', header: 'GST %', mobile: 'subtitle', render: (h) => `${h.rate}%` },
  { key: 'qty', header: 'Qty', align: 'right', render: (h) => h.qty },
  ...taxColumns<HsnRow>(),
  { key: 'tax', header: 'Total GST', align: 'right', mobile: 'badge', render: (h) => <span className="font-medium text-ink">{formatINR(h.tax)}</span> },
]

// Reports → "HSN summary": sales grouped by HSN code and rate (for GSTR-1 table 12).
export function HsnView() {
  const { range, setRange, from, to } = useReportRange()
  const q = useApiQuery(['gst-hsn', from, to], () => reportsApi.gstHsn({ from, to }))
  const r = q.data ?? q.lastData
  return (
    <>
      <ReportToolbar range={range} onRange={setRange} exportPath="/reports/gst/hsn/export" params={{ from, to }} />
      {r && r.missingHsn > 0 && (
        <p className="mb-3 rounded-control bg-warn-tint px-3 py-2 text-sm text-warn">Some items have no HSN code. Add it on the product (Products → edit) so new bills carry it.</p>
      )}
      <Card bodyClassName="p-0">
        {q.error ? <EmptyState title="Couldn't load" description={q.error} /> : (
          <>
            <DataTable columns={hsnColumns} rows={r?.items ?? []} rowKey={(h) => `${h.hsn}-${h.rate}`} loading={q.loading && !r} emptyTitle="No sales in these dates" />
            {r && r.items.length > 0 && <TotalBar t={r.total} count={r.items.length} />}
          </>
        )}
      </Card>
      <p className="mt-2 text-xs text-muted">9988 = stitching (tailoring) service — confirm the code with your accountant.</p>
    </>
  )
}
