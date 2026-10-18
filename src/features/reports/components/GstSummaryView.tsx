import { Card, StatCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { cn } from '@/lib/cn'
import { formatINR2 as formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { reportsApi } from '../api/reports.api'
import { rateLabel, taxColumns, useReportRange } from '../reportUtils'
import type { RateRow, Tax } from '../types'
import { ReportToolbar } from './ReportToolbar'

type Line = Tax & { name: string; strong?: boolean }
const columns: Column<Line>[] = [
  { key: 'name', header: '', mobile: 'title', render: (r) => <span className={cn(r.strong ? 'font-semibold text-ink' : 'text-ink-soft')}>{r.name}</span> },
  ...taxColumns<Line>(),
  { key: 'tax', header: 'Total GST', align: 'right', mobile: 'badge', render: (r) => <span className={cn(r.strong && 'font-semibold text-ink')}>{formatINR(r.tax)}</span> },
]
const byRate = (rows: RateRow[], total: Tax, totalName: string): Line[] => [
  ...rows.filter((r) => r.taxable || r.tax).map((r) => ({ ...r, name: rateLabel(r.rate) })),
  { ...total, name: totalName, strong: true },
]

// Reports → "GST summary": output GST on sales − input GST on purchases = GST to pay (like GSTR-3B).
export function GstSummaryView() {
  const { range, setRange, from, to } = useReportRange()
  const q = useApiQuery(['gst-summary', from, to], () => reportsApi.gstSummary({ from, to }))
  const s = q.data ?? q.lastData

  return (
    <>
      <ReportToolbar range={range} onRange={setRange} exportPath="/reports/gst/summary/export" params={{ from, to }} />
      {q.error ? (
        <Card><EmptyState title="Couldn't load" description={q.error} /></Card>
      ) : !s ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Sales (before GST)" value={formatINR(s.outwardTotal.taxable)} note="Net of returns" />
            <StatCard label="GST collected" value={formatINR(s.outwardTotal.tax)} note="On sales & stitching" />
            <StatCard label="GST paid on purchases" value={formatINR(s.inwardTotal.tax)} note="Input credit" />
            <StatCard label="GST to pay" value={formatINR(Math.max(0, s.payable.total))} note={s.payable.total < 0 ? `${formatINR(-s.payable.total)} credit carried forward` : 'Collected − paid'} noteTone={s.payable.total > 0 ? 'warn' : 'success'} />
          </div>
          <div className="flex flex-col gap-4">
            <Card title="Sales — GST collected" bodyClassName="p-0">
              <DataTable
                columns={columns}
                rows={[
                  ...byRate(s.outward, s.outwardTotal, 'Total sales'),
                  { ...s.split.b2b, name: '  of which to GST customers (B2B)' },
                  { ...s.split.b2c, name: '  of which to others (B2C)' },
                  { ...s.split.returns, name: '  of which returns (credit notes)' },
                ]}
                rowKey={(r) => r.name}
              />
            </Card>
            <Card title="Purchases — GST paid (input credit)" bodyClassName="p-0">
              <DataTable columns={columns} rows={byRate(s.inward, s.inwardTotal, 'Total purchases')} rowKey={(r) => r.name} emptyTitle="No purchases in these dates" />
            </Card>
            <Card title="GST to pay">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {(['cgst', 'sgst', 'igst', 'total'] as const).map((k) => (
                  <div key={k}>
                    <p className="text-muted">{k === 'total' ? 'Total' : k.toUpperCase()}</p>
                    <p className={cn('text-lg font-semibold', s.payable[k] < 0 ? 'text-success' : 'text-ink')}>{formatINR(s.payable[k])}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted">
                Simple difference (collected − paid). A minus figure is credit to carry forward. Your accountant applies the IGST / CGST / SGST set-off order when filing — please check these figures with them before filing.
              </p>
            </Card>
          </div>
        </>
      )}
    </>
  )
}
